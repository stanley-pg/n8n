#!/usr/bin/env node
/**
 * Экспорт воркфлоу из n8n в JSON (для git).
 * Использование:
 *   npm run n8n:export
 *   node --env-file=.env scripts/n8n-export.mjs --id <workflowId> --file workflows/My.json
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fetchWorkflow, requireN8nEnv } from "./lib/n8n-workflow-api.mjs";

const args = process.argv.slice(2);

function parseArgs() {
  const out = { id: null, file: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      out.id = args[++i];
    } else if (args[i] === "--file" && args[i + 1]) {
      out.file = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      out.help = true;
    }
  }
  return out;
}

function loadManifest() {
  const p = resolve(process.cwd(), "workflows/manifest.json");
  const raw = readFileSync(p, "utf8");
  const m = JSON.parse(raw);
  if (!m.workflows || !Array.isArray(m.workflows)) {
    throw new Error("workflows/manifest.json: ожидается поле workflows[]");
  }
  return m;
}

async function main() {
  const parsed = parseArgs();
  if (parsed.help) {
    console.log(`Экспорт воркфлоу в JSON.

  npm run n8n:export
      — все записи из workflows/manifest.json

  node --env-file=.env scripts/n8n-export.mjs --id <id> --file workflows/Name.json
      — один воркфлоу в указанный файл
`);
    return;
  }

  const { N8N_BASE_URL: base, N8N_API_KEY: key } = requireN8nEnv();
  const jobs = [];

  if (parsed.id && parsed.file) {
    jobs.push({ id: parsed.id, file: parsed.file });
  } else if (!parsed.id && !parsed.file) {
    const manifest = loadManifest();
    for (const w of manifest.workflows) {
      if (!w.id || !w.file) throw new Error("Каждая запись в manifest нуждается в id и file");
      jobs.push({ id: w.id, file: w.file });
    }
  } else {
    throw new Error("Укажите оба флага --id и --file, либо запустите без аргументов (manifest).");
  }

  const exportedAt = new Date().toISOString();

  for (const job of jobs) {
    const workflow = await fetchWorkflow(base, key, job.id);
    const outPath = resolve(process.cwd(), job.file);
    mkdirSync(dirname(outPath), { recursive: true });

    const doc = {
      exportMeta: {
        exportedAt,
        workflowId: workflow.id,
        workflowName: workflow.name,
        sourceBaseUrl: base,
        formatVersion: 1,
      },
      workflow,
    };

    writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log("Записано:", job.file, `(${workflow.name})`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
