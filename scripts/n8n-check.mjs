const base = process.env.N8N_BASE_URL?.trim().replace(/\/$/, "");
const key = process.env.N8N_API_KEY?.trim();

if (!base) {
  console.error("Задайте N8N_BASE_URL в .env (URL инстанса n8n без завершающего /).");
  process.exit(1);
}
if (!key) {
  console.error("Задайте N8N_API_KEY в .env.");
  process.exit(1);
}

const url = `${base}/api/v1/workflows?limit=1`;
const res = await fetch(url, {
  headers: {
    accept: "application/json",
    "X-N8N-API-KEY": key,
  },
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = text;
}

if (!res.ok) {
  console.error("Ошибка API:", res.status, res.statusText);
  console.error(body);
  process.exit(1);
}

console.log("Подключение к n8n OK. Ответ /api/v1/workflows:", JSON.stringify(body, null, 2));
