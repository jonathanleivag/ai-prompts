import { render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("@/lib/data/projects", () => ({ listProjects: vi.fn().mockResolvedValue({ items: [], total: 0 }) }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

test("renders the project dashboard heading", async () => {
  render(await HomePage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByRole("heading", { name: "Proyectos" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Nuevo proyecto" })).toHaveAttribute("href", "/projects/new");
});
