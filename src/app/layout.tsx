import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Prompt Workflow",
  description: "Gestiona proyectos y plantillas de prompts.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <header className="site-header">
          <nav aria-label="Navegación principal" className="site-nav">
            <Link className="brand" href="/">
              AI Prompt Workflow
            </Link>
            <div className="nav-links">
              <Link href="/">Proyectos</Link>
              <Link href="/templates">Plantillas</Link>
            </div>
          </nav>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
