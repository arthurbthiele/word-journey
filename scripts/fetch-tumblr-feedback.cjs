#!/usr/bin/env node

/*
 * Fetches the latest Tumblr notes for the Wayword launch post and writes
 * a markdown digest to ~/wayword-feedback/YYYY-MM-DD-tumblr.md.
 *
 * Uses Tumblr's v2 API with a consumer key for read-only public access.
 * Key file: ~/.config/wayword/tumblr-api-key (single line, key only).
 *
 *   node scripts/fetch-tumblr-feedback.cjs
 *
 * Pulls down: replies, reblogs (with their added text and tags), and a
 * count of silent reblogs. Throttled at ~50ms between API calls, so a
 * full run on the current post (~700 notes) takes ~30-60 seconds.
 *
 * V1 simplification: doesn't render the "Quoting earlier rebloger" chain
 * from the reblog trail — each rebloger's own addition + tags are
 * captured, but the multi-hop conversation context isn't reconstructed.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const BLOG = "a-thousand-pots";
const POST_ID = "816915529371615233";
const KEY_PATH = path.join(os.homedir(), ".config/wayword/tumblr-api-key");
const OUTPUT_DIR = path.join(os.homedir(), "wayword-feedback");
const THROTTLE_MS = 50;

const apiKey = (() => {
  try {
    return fs.readFileSync(KEY_PATH, "utf8").trim();
  } catch (e) {
    console.error(`Cannot read API key from ${KEY_PATH}`);
    console.error(`Create that file with the OAuth consumer key on a single line.`);
    process.exit(1);
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_RATE_LIMIT_ATTEMPTS = 5;

/**
 * Fetch JSON with bounded retry on 429 (rate-limit). Throws on other non-2xx.
 *
 * Tumblr's documented limit is 1000 reqs/hr per consumer per IP, but
 * newly-registered apps often see tighter early-quota throttling. If we
 * exhaust attempts, the message tells the user to wait and try again
 * later — usually clears within ~1 hour.
 */
const fetchJson = async (url, attempt = 1) => {
  const r = await fetch(url);
  if (r.status === 429) {
    if (attempt > MAX_RATE_LIMIT_ATTEMPTS) {
      throw new Error(
        `Rate-limited by Tumblr after ${MAX_RATE_LIMIT_ATTEMPTS} retries. ` +
          `Wait ~1 hour and re-run. (Tumblr's bucket usually refills within ` +
          `that window for newly-registered consumer keys.)`
      );
    }
    const wait = Math.min(attempt * 2000, 30000);
    console.warn(`  rate limited, waiting ${wait}ms (attempt ${attempt})...`);
    await sleep(wait);
    return fetchJson(url, attempt + 1);
  }
  if (!r.ok) {
    throw new Error(`HTTP ${r.status} ${r.statusText} on ${url}`);
  }
  return r.json();
};

/**
 * Paginate through the /notes endpoint, yielding each note.
 * mode: "all" (everything, no per-note content), "conversation" (replies +
 * reblogs with content, includes content inline).
 */
const fetchAllNotes = async (mode) => {
  const all = [];
  let beforeTimestamp = null;
  let page = 0;
  while (true) {
    const url = new URL(`https://api.tumblr.com/v2/blog/${BLOG}/notes`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("id", POST_ID);
    url.searchParams.set("mode", mode);
    if (beforeTimestamp) {
      url.searchParams.set("before_timestamp", beforeTimestamp);
    }

    const data = await fetchJson(url.toString());
    const notes = data?.response?.notes ?? [];
    if (notes.length === 0) break;
    all.push(...notes);
    page++;
    process.stdout.write(
      `\r  [${mode}] page ${page} — total ${all.length} notes  `
    );
    const next = data?.response?._links?.next?.query_params;
    if (!next?.before_timestamp) break;
    beforeTimestamp = next.before_timestamp;
    await sleep(THROTTLE_MS);
  }
  process.stdout.write("\n");
  return all;
};

/**
 * Fetch a single reblog post to extract tags and the canonical post URL.
 * Returns null if the post is unreachable (deleted, blog-private, etc).
 */
const fetchPostDetail = async (blogName, postId) => {
  const url = new URL(`https://api.tumblr.com/v2/blog/${blogName}/posts`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("id", postId);
  try {
    const data = await fetchJson(url.toString());
    const post = data?.response?.posts?.[0];
    if (!post) return null;
    return {
      tags: post.tags ?? [],
      post_url: post.post_url,
    };
  } catch (e) {
    return null;
  }
};

const fmtDate = (epochSeconds) => {
  const d = new Date(epochSeconds * 1000);
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m} UTC`;
};

const fmtToday = () => {
  const d = new Date();
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, "0");
  const D = String(d.getUTCDate()).padStart(2, "0");
  return `${Y}-${M}-${D}`;
};

const profileUrl = (handle) => `https://${handle}.tumblr.com/`;
const reblogPostUrl = (handle, postId) =>
  `https://www.tumblr.com/${handle}/${postId}`;

const blockquote = (text) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

const main = async () => {
  console.log("Fetching mode=all (everything — replies, reblogs, likes)...");
  const allNotes = await fetchAllNotes("all");

  console.log("Fetching mode=conversation (content-bearing notes)...");
  const conversationNotes = await fetchAllNotes("conversation");

  // Build a map of post_id → added_text for reblogs with commentary.
  const addedTextByPostId = new Map();
  for (const n of conversationNotes) {
    if (n.type === "reblog" && n.post_id) {
      addedTextByPostId.set(n.post_id, n.added_text ?? "");
    }
  }

  // Replies are most reliably read from mode=conversation (has reply_text).
  const replies = conversationNotes
    .filter((n) => n.type === "reply")
    .map((n) => ({
      blog_name: n.blog_name,
      timestamp: n.timestamp,
      reply_text: n.reply_text ?? "",
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Every reblog (silent or otherwise) comes from mode=all.
  const reblogs = allNotes
    .filter((n) => n.type === "reblog")
    .map((n) => ({
      blog_name: n.blog_name,
      timestamp: n.timestamp,
      post_id: n.post_id,
      added_text: addedTextByPostId.get(n.post_id) ?? "",
    }));

  // Fetch tags for each reblog post.
  console.log(
    `\nFetching post details for ${reblogs.length} reblogs (tags)...`
  );
  let fetched = 0;
  for (const r of reblogs) {
    const detail = r.post_id
      ? await fetchPostDetail(r.blog_name, r.post_id)
      : null;
    r.tags = detail?.tags ?? [];
    r.reblog_post_url =
      detail?.post_url ?? reblogPostUrl(r.blog_name, r.post_id);
    fetched++;
    if (fetched % 25 === 0) {
      process.stdout.write(`\r  ${fetched}/${reblogs.length}  `);
    }
    await sleep(THROTTLE_MS);
  }
  process.stdout.write("\n");

  reblogs.sort((a, b) => a.timestamp - b.timestamp);

  // Categorise reblogs.
  const reblogsWithText = [];
  const reblogsTagsOnly = [];
  const reblogsSilent = [];
  for (const r of reblogs) {
    const hasText = r.added_text && r.added_text.trim().length > 0;
    const hasTags = r.tags && r.tags.length > 0;
    if (hasText) reblogsWithText.push(r);
    else if (hasTags) reblogsTagsOnly.push(r);
    else reblogsSilent.push(r);
  }

  // Snapshot timestamps.
  const allTimestamps = [...reblogs, ...replies].map((x) => x.timestamp);
  const firstTs = Math.min(...allTimestamps);
  const latestTs = Math.max(...allTimestamps);

  // ------ Generate the markdown digest ------

  const out = [];
  out.push("# Wayword on Tumblr — comment digest");
  out.push("");
  out.push(`Source: <https://www.tumblr.com/${BLOG}/${POST_ID}>`);
  out.push("");
  out.push("## Snapshot");
  out.push("");
  out.push(`- **${reblogs.length} reblogs**, **${replies.length} replies**`);
  out.push(`- ${reblogsWithText.length} reblogs added their own text on top`);
  out.push(`- ${reblogsTagsOnly.length} reblogs added tags only`);
  out.push(`- ${reblogsSilent.length} reblogs were silent (no tags, no text)`);
  out.push(`- First note: ${fmtDate(firstTs)}`);
  out.push(`- Latest note in this snapshot: ${fmtDate(latestTs)}`);
  out.push("");
  out.push("---");
  out.push("");

  // Replies.
  out.push(`## Replies (${replies.length})`);
  out.push("");
  out.push("Direct comments on the post (chronological).");
  out.push("");
  for (const r of replies) {
    out.push(
      `### [@${r.blog_name}](${profileUrl(r.blog_name)}) — ${fmtDate(r.timestamp)}`
    );
    out.push("");
    out.push(blockquote(r.reply_text));
    out.push("");
  }
  out.push("---");
  out.push("");

  // Reblogs with text.
  out.push(`## Reblogs with added commentary (${reblogsWithText.length})`);
  out.push("");
  out.push("Sorted chronologically.");
  out.push("");
  for (const r of reblogsWithText) {
    out.push(
      `### [@${r.blog_name}](${profileUrl(r.blog_name)}) — ${fmtDate(r.timestamp)}`
    );
    out.push("");
    out.push(`[their reblog post](${r.reblog_post_url})`);
    out.push("");
    out.push("**Their addition:**");
    out.push("");
    out.push(blockquote(r.added_text));
    out.push("");
    if (r.tags.length > 0) {
      out.push(`**Tags:** ${r.tags.map((t) => `#${t}`).join(" · ")}`);
      out.push("");
    }
  }
  out.push("---");
  out.push("");

  // Tags only.
  out.push(`## Reblogs with tags only (${reblogsTagsOnly.length})`);
  out.push("");
  out.push("Sorted chronologically.");
  out.push("");
  for (const r of reblogsTagsOnly) {
    out.push(
      `- [@${r.blog_name}](${profileUrl(r.blog_name)}) — ${r.tags.map((t) => `#${t}`).join(" · ")}`
    );
  }
  out.push("");
  out.push("---");
  out.push("");

  // Silent.
  out.push(`## Silent reblogs (${reblogsSilent.length})`);
  out.push("");
  out.push("These rebloggers added no tags and no text — just amplified the post.");
  out.push("");
  out.push(reblogsSilent.map((r) => `@${r.blog_name}`).join(", "));
  out.push("");

  // ------ Write to disk ------

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${fmtToday()}-tumblr.md`);
  fs.writeFileSync(outPath, out.join("\n"));

  console.log(`\nWrote ${outPath}`);
  console.log(
    `  ${reblogs.length} reblogs, ${replies.length} replies — ` +
      `${reblogsWithText.length} text, ${reblogsTagsOnly.length} tags-only, ` +
      `${reblogsSilent.length} silent`
  );
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
