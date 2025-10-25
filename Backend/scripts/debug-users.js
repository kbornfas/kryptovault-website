const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        walletBalance: true,
      },
      orderBy: { email: 'asc' },
    });

    console.table(
      users.map((u) => ({
        email: u.email,
        role: u.role,
        verified: u.isEmailVerified,
        balance: u.walletBalance?.toString?.() ?? '0',
      })),
    );
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();
