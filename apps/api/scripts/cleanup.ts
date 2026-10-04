import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const del = async (fn: () => Promise<any>, name: string) => {
    try { const r = await fn(); console.log(`${name}: deleted ${r?.count ?? "ok"}`); }
    catch { console.log(`${name}: skipped (table may not exist)`); }
  };

  await del(() => p.supportMessage.deleteMany({}), "supportMessage");
  await del(() => p.supportTicket.deleteMany({}), "supportTicket");
  await del(() => p.mediatorChangeRequest.deleteMany({}), "mediatorChangeRequest");
  await del(() => p.notificationSubscription.deleteMany({}), "notificationSubscription");
  await del(() => p.mediatorProfile.deleteMany({}), "mediatorProfile");
  await del(() => p.user.deleteMany({ where: { role: "MEDIATOR" } }), "mediator users");

  try {
    const m = await p.mediatorProfile.count();
    const u = await p.user.count({ where: { role: "MEDIATOR" } });
    console.log(`\nRemaining: Mediator profiles: ${m}, Mediator users: ${u}`);
  } catch { console.log("Could not count remaining"); }
}

main().catch(console.error).finally(() => p.$disconnect());
