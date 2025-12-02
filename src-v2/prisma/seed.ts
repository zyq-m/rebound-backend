import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const condition = [
    { name: 'Not yet expired' },
    { name: 'Sealed' },
    { name: 'Partially used' },
    { name: 'Fresh' },
    { name: 'Frozen' },
  ];

  for (const category of condition) {
    await prisma.condition.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  console.log('Categories seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
