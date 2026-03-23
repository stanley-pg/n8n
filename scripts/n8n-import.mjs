#!/usr/bin/env node
/**
 * Откат / загрузка воркфлоу из JSON в n8n (PUT существующего id).
 * Использование:
 *   npm run n8n:push -- workflows/Monthly-Finance-Report.json
 *   node --env-file=.env scripts/n8n-import.mjs workflows/Monthly-Finance-Report.json
 *
 * Включение/выключение воркфлоу и pinData через Public API не задаются — при необходимости вручную в UI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildWorkflowPutBody, putWorkflow, requireN8nEnv } from "./lib/n8n-workflow-api.mjs";

const args = process.argv.slice(2).filter((a) => a !== "--");

async function main() {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`Загрузка воркфлоу из JSON в n8n (обновляет существующий воркфлоу по id).

  npm run n8n:push -- workflows/Monthly-Finance-Report.json
`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const file = resolve(process.cwd(), args[0]);
  const raw = readFileSync(file, "utf8");
  const doc = JSON.parse(raw);

  const workflow = doc.workflow ?? doc;
  if (!workflow?.id || !workflow?.nodes) {
    throw new Error("Файл должен содержать объект workflow (или экспорт из n8n-export с полем workflow).");
  }

  const { N8N_BASE_URL: base, N8N_API_KEY: key } = requireN8nEnv();

  if (workflow.pinData && Object.keys(workflow.pinData).length > 0) {
    console.warn(
      "Предупреждение: в файле есть pinData — Public API при PUT их не задаёт; при откате проверьте пины в UI."
    );
  }

  const body = buildWorkflowPutBody(workflow);
  await putWorkflow(base, key, workflow.id, body);
  console.log("Обновлено в n8n:", workflow.id, workflow.name);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
