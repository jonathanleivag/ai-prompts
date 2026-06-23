export type ProjectSummary = {
  id: string;
  name: string;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  return [];
}
