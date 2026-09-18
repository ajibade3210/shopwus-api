import dotenv from "dotenv";
import { basePrisma as prisma } from "../src/lib/prisma";
import { seedBusiness } from "./seeds/seedBusiness";
import { seedFeaturedStudios } from "./seeds/seedFeaturedStudios";
import { seedProductsForEmail } from "./seeds/seedProducts";

dotenv.config();

async function main() {
  console.info("🌱 Seeding database...\n");

  await seedBusiness(prisma);
  await seedProductsForEmail("elena@atelierforma.design");
  await seedFeaturedStudios(prisma);

  console.info("✅ All seeders complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
