import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Prompt Workflow",
  description: "Gestiona proyectos y plantillas de prompts.",
  icons: {
    icon: [{ url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  const user = session?.user;

  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <header className="site-header">
          <nav aria-label="Navegación principal" className="site-nav">
            <Link className="brand" href="/">
              <Image src="/logo.webp" alt="Prompt Pipeline" width={32} height={32} className="brand__logo" unoptimized />
              <span>Prompt Pipeline</span>
            </Link>
            <div className="nav-links">
              {user ? (
                <>
                  <Link href="/">Proyectos</Link>
                  <Link href="/templates">Plantillas</Link>
                </>
              ) : null}
              <span className="nav-status"><i aria-hidden="true" /> Sistema listo</span>
              {user ? (
                <div className="nav-user">
                  {user.image ? (
                    <Image className="nav-user__avatar" src={user.image} alt={user.name ?? "Usuario"} width={28} height={28} />
                  ) : null}
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                    <button className="nav-user__signout" type="submit">Salir</button>
                  </form>
                </div>
              ) : null}
            </div>
          </nav>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
