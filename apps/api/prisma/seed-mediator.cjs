const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = "mediator@test.local";
    const password = (process.env.SEED_MEDIATOR_PASSWORD || "change-me");
    const phone = "+79002345678";

    const existing = await prisma.user.findFirst({
      where: { email, role: "MEDIATOR" },
    });
    if (existing) {
      console.log("Test mediator already exists:", existing.id);
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
        lastName: "Mediator",
        role: "MEDIATOR",
      },
    });

    const profile = await prisma.mediatorProfile.create({
      data: {
        userId: user.id,
        lastName: "Mediator",
        firstName: "Test",
        middleName: null,
        commissionRate: 10,
        minOrderAmount: 1000,
        avatarKey: "",
        passportKey: "",
        passSelfieKey: "",
        status: "APPROVED",
        submittedAt: new Date(),
        decidedAt: new Date(),
      },
    });

    console.log("Test mediator created:");
    console.log("  ID:", user.id);
    console.log("  Email:", email);
    console.log("  Password:", password);
    console.log("  Phone:", phone);
    console.log("  Mediator ID:", profile.id);
    console.log("  Status: APPROVED (commission 10%, min 1000 ₽)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
