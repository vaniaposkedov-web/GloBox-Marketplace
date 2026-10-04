const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  await p.user.deleteMany({ where: { email: "mediator@test.local", role: "MEDIATOR" } });
  console.log("Mediator user deleted, re-running seed...");
  await p.$disconnect();
}

main().catch(console.error);
