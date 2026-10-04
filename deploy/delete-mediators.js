const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const del1 = await p.mediatorProfile.deleteMany();
  const del2 = await p.user.deleteMany({ where: { role: "MEDIATOR" } });
  console.log("profiles deleted:", del1.count, "| users deleted:", del2.count);
  await p.$disconnect();
})();
