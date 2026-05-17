import React, { forwardRef } from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    const classes = ["wj-input", className ?? ""].filter(Boolean).join(" ");
    return <input ref={ref} className={classes} {...rest} />;
  }
);

Input.displayName = "Input";
