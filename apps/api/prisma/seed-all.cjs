/**
 * Единый сид: запускает все сиды подряд.
 * Использование: node apps/api/prisma/seed-all.cjs
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const scripts = [
  "seed-admin.cjs",
  "seed-buyer.cjs",
  "seed-seller.cjs",
  "seed-mediator.cjs",
];

for (const s of scripts) {
  console.log(`\n=== Running ${s} ===`);
  const result = spawnSync("node", [path.join(__dirname, s)], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    console.error(`Seed ${s} failed with status ${result.status}`);
    process.exit(result.status ?? 1);
  }
}
console.log("\n✅ All seeds completed successfully");
