/**
 * Скрипт загрузки документов посредника
 * Запуск: node upload-docs/upload.js
 *
 * Перед запуском:
 *  1. Добавь файлы в папку upload-docs/ (см. имена ниже)
 *  2. Укажи email и пароль аккаунта посредника ниже
 */

const fs = require("fs");
const path = require("path");

// ─── НАСТРОЙКИ ──────────────────────────────────────────────────────────────
const API = "https://glo-box.ru/api";

const EMAIL    = "";   // ← вставь email посредника
const PASSWORD = "";   // ← вставь пароль посредника

// Файлы в папке upload-docs/
const FILES = {
  passportPhotoUrl:    "passport.jpg",    // Разворот паспорта (стр. 2–3)
  passSelfiePhotoUrl:  "selfie.jpg",      // Селфи с паспортом в руке
  passPhotoUrl:        "pass.jpg",        // Пропуск из Садовода
};
// ────────────────────────────────────────────────────────────────────────────

const DIR = path.join(__dirname);

async function login() {
  const res = await fetch(`${API}/mediator/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Ошибка входа: ${err.message ?? res.status}`);
  }
  const { accessToken } = await res.json();
  return accessToken;
}

async function uploadFile(token, filePath) {
  const data = fs.readFileSync(filePath);
  const base64 = "data:image/jpeg;base64," + data.toString("base64");

  const res = await fetch(`${API}/mediator/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data: base64, ext: "jpg" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Ошибка загрузки ${path.basename(filePath)}: ${err.message ?? res.status}`);
  }

  const { url } = await res.json();
  return url.startsWith("http") ? url : `https://glo-box.ru${url}`;
}

async function submitProfile(token, urls) {
  const res = await fetch(`${API}/mediator/profile/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      commissionRate: 7,
      minOrderAmount: 0,
      ...urls,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Ошибка отправки профиля: ${err.message ?? res.status}`);
  }

  return res.json();
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("❌  Укажи EMAIL и PASSWORD в начале скрипта!");
    process.exit(1);
  }

  // Проверяем наличие файлов
  const missing = [];
  for (const [, filename] of Object.entries(FILES)) {
    if (!fs.existsSync(path.join(DIR, filename))) missing.push(filename);
  }
  if (missing.length) {
    console.error("❌  Не найдены файлы:\n" + missing.map(f => "   " + f).join("\n"));
    console.error("\nДобавь их в папку upload-docs/");
    process.exit(1);
  }

  console.log("🔐  Вход в аккаунт...");
  const token = await login();
  console.log("✅  Авторизован\n");

  const urls = {};
  for (const [field, filename] of Object.entries(FILES)) {
    const filePath = path.join(DIR, filename);
    const sizeMB = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
    process.stdout.write(`📤  Загружаю ${filename} (${sizeMB} МБ)... `);
    const url = await uploadFile(token, filePath);
    urls[field] = url;
    console.log("✅");
    console.log(`    → ${url}`);
  }

  console.log("\n📝  Отправляю профиль на проверку...");
  await submitProfile(token, urls);
  console.log("✅  Профиль отправлен! Статус: PENDING");
  console.log("\n📋  Итоговые URL:");
  for (const [field, url] of Object.entries(urls)) {
    console.log(`   ${field}: ${url}`);
  }
}

main().catch((err) => {
  console.error("\n❌  Ошибка:", err.message);
  process.exit(1);
});
