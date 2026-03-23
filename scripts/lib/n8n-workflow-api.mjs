import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** @typedef {{ N8N_BASE_URL: string, N8N_API_KEY: string }} N8nEnv */

/** Keys accepted by Public API for workflow settings on PUT (see n8n docs / schema). */
const ALLOWED_SETTINGS_KEYS = new Set([
  "saveExecutionProgress",
  "saveManualExecutions",
  "saveDataErrorExecution",
  "saveDataSuccessExecution",
  "executionTimeout",
  "errorWorkflow",
  "timezone",
  "executionOrder",
]);

export function loadEnvFile(envPath = ".env") {
  const path = resolve(process.cwd(), envPath);
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // rely on process.env / --env-file
  }
}

/** @returns {N8nEnv} */
export function requireN8nEnv() {
  loadEnvFile();
  const base = process.env.N8N_BASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.N8N_API_KEY?.trim();
  if (!base) throw new Error("N8N_BASE_URL не задан (см. .env).");
  if (!key) throw new Error("N8N_API_KEY не задан (см. .env).");
  return { N8N_BASE_URL: base, N8N_API_KEY: key };
}

export function filterSettingsForPut(settings) {
  if (!settings || typeof settings !== "object") return undefined;
  const out = {};
  for (const k of Object.keys(settings)) {
    if (ALLOWED_SETTINGS_KEYS.has(k)) out[k] = settings[k];
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Body for PUT /api/v1/workflows/:id (Public API ограничен; pinData/meta через API не задаются).
 * @param {object} workflow — объект как в ответе GET /workflows/:id
 */
export function buildWorkflowPutBody(workflow) {
  const body = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: filterSettingsForPut(workflow.settings),
  };
  if (workflow.staticData !== undefined) body.staticData = workflow.staticData;
  return body;
}

export async function fetchWorkflow(base, key, id) {
  const url = `${base}/api/v1/workflows/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { accept: "application/json", "X-N8N-API-KEY": key },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data?.message ? data.message : text;
    throw new Error(`GET workflow ${id}: ${res.status} ${msg}`);
  }
  return data;
}

export async function putWorkflow(base, key, id, body) {
  const url = `${base}/api/v1/workflows/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "X-N8N-API-KEY": key,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data?.message ? data.message : text;
    throw new Error(`PUT workflow ${id}: ${res.status} ${msg}`);
  }
  return data;
}
