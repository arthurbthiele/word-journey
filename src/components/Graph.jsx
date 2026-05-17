import GraphVis from "react-graph-vis";
import React, { useState, useContext, useRef, useEffect } from "react";
import { GraphContext } from "./GraphProvider";

export const Graph = () => {
  const { selectedWord, setSelectedWord, graph } = useContext(GraphContext);

  const [network, setNetwork] = useState();
  const containerRef = useRef(null);

  // Keep vis-network's canvas in sync with its container. Triggered by both
  // window resize and dynamic in-page layout changes (e.g. the victory panel
  // appearing and squeezing the graph row in our CSS grid).
  useEffect(() => {
    if (!network || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        network.setSize(`${Math.round(width)}px`, `${Math.round(height)}px`);
        network.redraw();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [network]);

  const events = {
    select: (event) => {
      setSelectedWord(event.nodes[0]);
    },
    afterDrawing: () => {
      if (selectedWord && selectedWord !== network?.getSelectedNodes()[0]) {
        network?.setSelection({ nodes: [selectedWord] });
        network?.fit({
          minZoomLevel: 1.0,
          maxZoomLevel: 2,
          animation: { duration: 300 },
        });
      }
    },
    doubleClick: () => {
      network?.fit({
        minZoomLevel: 1.0,
        animation: { duration: 300 },
      });
    },
  };

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <GraphVis
        graph={graph}
        options={options}
        events={events}
        getNetwork={setNetwork}
        id={graph.edges.length}
      />
    </div>
  );
};

// Themed to match the warm-papery look. Nodes are paper-tone pills with ink
// text; the selected one gets the accent colour.
const options = {
  nodes: {
    shape: "box",
    shapeProperties: { borderRadius: 999 },
    color: {
      background: "#efe8db",
      border: "#d9d0bd",
      highlight: { background: "#c25a2a", border: "#c25a2a" },
    },
    font: {
      face: "Fraunces, Georgia, serif",
      size: 18,
      color: "#1f2533",
      strokeWidth: 0,
    },
    margin: { top: 10, right: 14, bottom: 10, left: 14 },
    chosen: {
      label: function (values) {
        values.color = "#ffffff";
        values.face = "Fraunces, Georgia, serif";
      },
    },
    borderWidth: 1,
    borderWidthSelected: 2,
  },
  edges: {
    color: { color: "#c1b8a4", highlight: "#5d6273", hover: "#5d6273" },
    width: 1.5,
    smooth: { type: "continuous" },
    arrows: { to: false },
  },
  interaction: {
    hover: true,
    zoomView: true,
  },
};
