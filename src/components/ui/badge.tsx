import type { ReactNode } from "react";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "active" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
