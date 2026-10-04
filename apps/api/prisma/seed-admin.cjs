const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = "admin@globox.local";
    const existing = await prisma.user.findFirst({ where: { email, role: "ADMIN" } });
    if (existing) {
      console.log("Admin already exists:", existing.id);
      return;
    }
    const passwordHash = await argon2.hash((process.env.SEED_ADMIN_PASSWORD || "change-me"), { type: 2 });
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        passwordHash,
        firstName: "Admin",
        lastName: "GloBox",
        role: "ADMIN",
      },
    });
    console.log("Admin created:", user.id);
    console.log("Email: admin@globox.local");
    console.log("Password: из SEED_ADMIN_PASSWORD");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
