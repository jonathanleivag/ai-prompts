import { render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("@/lib/data/projects", () => ({ listProjects: vi.fn().mockResolvedValue([]) }));

test("renders the project dashboard heading", async () => {
  render(await HomePage());
  expect(screen.getByRole("heading", { name: "Proyectos" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Nuevo proyecto" })).toHaveAttribute("href", "/projects/new");
});
