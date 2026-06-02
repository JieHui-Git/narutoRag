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

export type AppError = "network" | "rate_limit" | "server";

export interface StreamMetadata {
  sources: string[];
  spoiler_boundary_hit: boolean;
  no_answer?: boolean;
}

export class QueryError extends Error {
  constructor(public type: AppError) {
    super(type);
  }
}

export async function askQuestion(req: QueryRequest): Promise<QueryResponse> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new QueryError("network");
  }

  if (res.status === 429) throw new QueryError("rate_limit");
  if (!res.ok) throw new QueryError("server");

  return res.json();
}

export async function askQuestionStream(
  req: QueryRequest,
  onMetadata: (meta: StreamMetadata) => void,
  onToken: (token: string) => void,
): Promise<void> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}/query/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    throw new QueryError("network");
  }

  if (res.status === 429) throw new QueryError("rate_limit");
  if (!res.ok) throw new QueryError("server");

  const reader = res.body?.getReader();
  if (!reader) throw new QueryError("server");

  const decoder = new TextDecoder();
  let buffer = "";
  let metadataParsed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line) continue;
      if (!metadataParsed) {
        onMetadata(JSON.parse(line));
        metadataParsed = true;
      } else {
        onToken(line);
      }
    }
  }

  // Flush any remaining buffer
  if (buffer && metadataParsed) onToken(buffer);
}
