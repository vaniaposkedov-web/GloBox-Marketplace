const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = "buyer@test.local";
    const password = (process.env.SEED_BUYER_PASSWORD || "change-me");
    const phone = "+79001234567";

    const existing = await prisma.user.findFirst({
      where: { email, role: "BUYER" },
    });
    if (existing) {
      console.log("Test buyer already exists:", existing.id);
      console.log("  Email:", email);
      console.log("  Password:", password);
      return;
    }

    const passwordHash = await argon2.hash(password, { type: 2 });
    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        passwordHash,
        phone,
        phoneVerified: false,
        firstName: "Test",
        lastName: "Buyer",
        role: "BUYER",
      },
    });
    console.log("Test buyer created:");
    console.log("  ID:", user.id);
    console.log("  Email:", email);
    console.log("  Password:", password);
    console.log("  Phone:", phone);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
