import React, { useState } from "react";
import { HelpModal } from "./HelpModal";

export const HelpFab = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="wj-help-fab"
        onClick={() => setOpen(true)}
        aria-label="How to play"
        title="How to play"
      >
        ?
      </button>
      <HelpModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
