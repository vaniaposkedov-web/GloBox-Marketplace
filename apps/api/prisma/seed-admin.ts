import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@globox.local";
  const password = (process.env.SEED_ADMIN_PASSWORD || "change-me");

  const existing = await prisma.user.findFirst({
    where: { email, role: "ADMIN" },
  });

  if (existing) {
    console.log(`[seed] Admin user already exists: ${existing.id}`);
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

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

  console.log(`[seed] Admin user created: ${user.id}`);
  console.log(`[seed] Email: ${email}`);
  console.log(`[seed] Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
