// Use same-origin API calls in production. Local development can still point
// at the standalone FastAPI service through VITE_PLATFORM_API_URL.
const baseUrl = (import.meta.env.VITE_PLATFORM_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  if (!response.ok) throw new Error((await response.text()) || `请求失败 (${response.status})`);
  return response.json();
}

export const platformApi = {
  validateWorkflow: (graph) => request("/api/workflows/validate", { method: "POST", body: JSON.stringify(graph) }),
  saveWorkflow: (payload) => request("/api/workflows", { method: "POST", body: JSON.stringify(payload) }),
  startRun: (payload) => request("/api/runs", { method: "POST", body: JSON.stringify(payload) }),
  confirmRun: (runId, preview_hash) => request(`/api/runs/${runId}/confirm`, { method: "POST", body: JSON.stringify({ preview_hash }) }),
  uploadKnowledge: async (file) => {
    const form = new FormData(); form.append("file", file);
    const response = await fetch(`${baseUrl}/api/knowledge/documents`, { method: "POST", body: form });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
  events(runId, onEvent, onError) {
    const stream = new EventSource(`${baseUrl}/api/runs/${runId}/events`);
    ["run.started", "node.started", "node.completed", "node.failed", "run.awaiting_confirmation", "run.completed", "run.failed", "cad.write_completed"].forEach((name) => stream.addEventListener(name, (event) => onEvent(name, JSON.parse(event.data))));
    stream.onerror = (error) => { stream.close(); onError?.(error); };
    return stream;
  },
};

