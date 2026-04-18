import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const year = new Date().getFullYear();
  await prisma.taxConfig.upsert({
    where: { year },
    create: {
      year,
      hebesatz: 400,
      estRatePartner1: 35,
      estRatePartner2: 35,
      profitSplitP1: 50,
    },
    update: {},
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
