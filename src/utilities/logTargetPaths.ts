import { findShortestPathInDictionary } from "./findPath";
import { legitimateWords } from "../dictionaryData/legitimate";

/**
 * Logs both shortest paths from 'a' to a target word:
 *   - using only words in dict A ('legitimate')
 *   - using any valid input word (full A ∪ B graph)
 * Useful for debugging target difficulty / feasibility.
 */
export const logTargetPaths = (label: string, target: string): void => {
  const legitPath = findShortestPathInDictionary(
    "a",
    target,
    legitimateWords
  );
  const anyPath = findShortestPathInDictionary("a", target);

  const fmt = (path: string[] | null) =>
    path ? `${path.join(" → ")}  (${path.length - 1} moves)` : "(none)";

  console.log(
    `%c[${label}] target = ${target}\n` +
      `  legitimate-only: ${fmt(legitPath)}\n` +
      `  any-word:        ${fmt(anyPath)}`,
    "color: #c25a2a; font-weight: 600;"
  );
};
