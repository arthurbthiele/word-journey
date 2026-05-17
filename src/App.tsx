import React from "react";
import { GraphProvider } from "./components/GraphProvider";
import { Header, type GameMode } from "./components/Header";
import { StatusStripDaily } from "./components/StatusStripDaily";
import { StatusStripFreePlay } from "./components/StatusStripFreePlay";
import { Graph } from "./components/Graph";
import { InputBar } from "./components/InputBar";
import { VictoryPanelDaily } from "./components/VictoryPanelDaily";
import { HelpFab } from "./components/HelpFab";
import {
  useLocalStorage,
  migrateLegacyFreePlayKeys,
} from "./utilities/useLocalStorage";
import { getLocalDateString } from "./utilities/dailyTarget";

migrateLegacyFreePlayKeys();

const dailyInitialGraph = {
  nodes: [{ id: "a", label: "a" }],
  edges: [] as { from: string; to: string }[],
};

const freeplayInitialGraph = {
  nodes: [
    { id: "a", label: "a" },
    { id: "at", label: "at" },
    { id: "art", label: "art" },
  ],
  edges: [
    { from: "a", to: "at" },
    { from: "at", to: "art" },
  ],
};

const App = () => {
  const [mode, setMode] = useLocalStorage<GameMode>("mode", "daily");
  const today = getLocalDateString();

  return (
    <div className="wj-app">
      <Header mode={mode} setMode={setMode} />
      {mode === "daily" ? (
        <GraphProvider
          keyPrefix={`daily:${today}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord="a"
        >
          <StatusStripDaily />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <VictoryPanelDaily />
          <InputBar />
        </GraphProvider>
      ) : (
        <GraphProvider
          keyPrefix="freeplay"
          initialGraph={freeplayInitialGraph}
          initialSelectedWord="art"
        >
          <StatusStripFreePlay />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <InputBar />
        </GraphProvider>
      )}
      <HelpFab />
    </div>
  );
};

export default App;
