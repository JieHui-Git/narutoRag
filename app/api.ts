// Change this to your backend URL when deploying
// For local dev: your machine's LAN IP so the phone can reach it
// e.g. "http://192.168.1.5:8000" — find it with `ipconfig getifaddr en0`
export const API_BASE = "http://192.168.1.4:8000";

export type SpoilerMode = "safe" | "full" | "custom";

export interface QueryRequest {
  question: string;
  spoiler_mode: SpoilerMode;
  max_episode: number;
}

export interface QueryResponse {
  answer: string;
  sources: string[];
  spoiler_boundary_hit: boolean;
}

export async function askQuestion(req: QueryRequest): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json();
}
