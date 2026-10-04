const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const prisma = new PrismaClient();
  try {
    const email = "seller@test.local";
    const password = (process.env.SEED_SELLER_PASSWORD || "change-me");

    const existing = await prisma.user.findFirst({ where: { email, role: "SUPPLIER" } });
    if (existing) {
      console.log("Test seller already exists:", existing.id);
      return;
    }

    const passwordHash = await argon2.hash(password, { type: 2 });

    const locations = await prisma.dictLocation.findMany({ take: 1 });
    const categories = await prisma.supplierTopCategory.findMany({ take: 2 });

    if (!locations.length || !categories.length) {
      console.log("ERROR: No locations or categories in DB. Start API first to seed dicts.");
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        emailVerified: true,
        passwordHash,
        phone: "+79001112233",
        phoneVerified: false,
        firstName: "Test",
        lastName: "Seller",
        role: "SUPPLIER",
      },
    });

    const profile = await prisma.supplierProfile.create({
      data: {
        userId: user.id,
        phone: "+79001112233",
        phoneVerifiedViaMax: false,
        firstName: "Test",
        lastName: "Seller",
        middleName: null,
        locationId: locations[0].id,
        pavilionNumber: "A-101",
        entityType: "SELF_EMPLOYED",
        inn: "123456789012",
        ogrnip: null,
        status: "APPROVED",
        submittedAt: new Date(),
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    for (const cat of categories) {
      await prisma.supplierCategoryLink.create({
        data: { supplierId: profile.id, categoryId: cat.id },
      });
    }

    console.log("Test seller created:");
    console.log("  ID:", user.id);
    console.log("  Email:", email);
    console.log("  Password:", password);
    console.log("  Status: APPROVED");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
