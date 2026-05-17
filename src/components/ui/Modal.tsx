import React, { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

export const Modal = ({ open, onClose, children, ariaLabel }: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="wj-modal-backdrop"
      onClick={onClose}
    >
      <div className="wj-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="wj-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="wj-modal__content">{children}</div>
      </div>
    </div>
  );
};
