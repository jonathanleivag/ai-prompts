import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  titleLabel?: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, titleLabel, description, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 aria-label={titleLabel}>{title}</h1>
      </div>
      <div className="page-header__aside">
        <p>{description}</p>
        {action}
      </div>
    </header>
  );
}
