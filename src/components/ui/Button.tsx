import React from "react";

type Variant = "primary" | "outlined" | "ghost";
type Size = "regular" | "small";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({
  variant = "outlined",
  size = "regular",
  className,
  children,
  ...rest
}: ButtonProps) => {
  const classes = [
    "wj-button",
    `wj-button--${variant}`,
    size === "small" ? "wj-button--small" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};
