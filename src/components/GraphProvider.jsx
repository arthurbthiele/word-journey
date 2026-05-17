import React, { useEffect, useMemo } from "react";
import { computeDepths } from "../utilities/wordDepths";
import { useLocalStorage } from "../utilities/useLocalStorage";

export const GraphContext = React.createContext();

export const GraphProvider = ({
  children,
  keyPrefix,
  initialGraph,
  initialSelectedWord,
}) => {
  const [selectedWord, setSelectedWord] = useLocalStorage(
    `${keyPrefix}:selectedWord`,
    initialSelectedWord
  );
  const [graph, setGraph] = useLocalStorage(
    `${keyPrefix}:graph`,
    initialGraph
  );

  // One-time self-heal for saved state from older versions that allowed
  // duplicate node ids (the closed-loop feature appended a node even when
  // an entry with the same id already existed). vis-network crashes on
  // duplicate ids, so we dedupe here on mount.
  useEffect(() => {
    const seen = new Set();
    const dedupedNodes = [];
    let hadDuplicates = false;
    for (const node of graph.nodes) {
      if (seen.has(node.id)) {
        hadDuplicates = true;
        continue;
      }
      seen.add(node.id);
      dedupedNodes.push(node);
    }
    if (hadDuplicates) {
      setGraph({ ...graph, nodes: dedupedNodes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const depths = useMemo(() => computeDepths(graph.nodes), [graph.nodes]);

  return (
    <GraphContext.Provider
      value={{ selectedWord, setSelectedWord, graph, setGraph, depths }}
    >
      {children}
    </GraphContext.Provider>
  );
};
