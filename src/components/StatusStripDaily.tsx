import React, { useContext, useEffect } from "react";
import { GraphContext } from "./GraphProvider";
import { getLocalDateString, getTargetForDate } from "../utilities/dailyTarget";
import { logTargetPaths } from "../utilities/logTargetPaths";

export const StatusStripDaily = () => {
  const today = getLocalDateString();
  const target = getTargetForDate(today);
  const { graph } = useContext(GraphContext);

  useEffect(() => {
    logTargetPaths("daily", target);
  }, [target]);

  const moveCount = Math.max(0, graph.nodes.length - 1);
  const solved = graph.nodes.some((node: { id: string }) => node.id === target);

  return (
    <div className="wj-status">
      <div className="wj-status__target">
        <span className="wj-status__label">Today's word</span>
        <span className="wj-status__word">{target}</span>
      </div>
      <div className="wj-status__meta">
        {solved ? (
          <span className="wj-status__solved">
            ✓ Solved in {moveCount} {moveCount === 1 ? "move" : "moves"}
          </span>
        ) : (
          <span>
            <strong>{moveCount}</strong>{" "}
            {moveCount === 1 ? "move" : "moves"} so far
          </span>
        )}
      </div>
    </div>
  );
};
