const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        walletBalance: true,
      },
      orderBy: { email: 'asc' },
    });
    console.log(users.map((user) => ({
      ...user,
      walletBalance: user.walletBalance?.toString?.() ?? '0',
    })));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
