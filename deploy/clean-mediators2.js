const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const d1 = await p.mediatorProfile.deleteMany();
  const d2 = await p.user.deleteMany({ where: { role: "MEDIATOR" } });
  console.log("profiles:", d1.count, "users:", d2.count);
  await p.$disconnect();
})();
