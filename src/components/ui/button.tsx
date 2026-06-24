import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  return <button className={`button button--${variant} ${className}`.trim()} {...props} />;
}
