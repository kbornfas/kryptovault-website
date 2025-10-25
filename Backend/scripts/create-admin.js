const path = require('node:path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { PrismaClient, Role, KYCStatus, Prisma } = require('@prisma/client');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (!process.env.DATABASE_URL) {
  const dbPassword = process.env.DB_PASSWORD || 'changeme';
  process.env.DATABASE_URL = `postgresql://kryptovault:${dbPassword}@localhost:5432/kryptovault`;
}

const prisma = new PrismaClient();

const ensureWalletAmount = new Prisma.Decimal(5000);

async function ensurePrivilegedUser({ email, password, name, role, kycStatus }) {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role,
        kycStatus,
        walletBalance: { set: ensureWalletAmount },
        isEmailVerified: true,
        verifiedAt: new Date(),
        verificationCode: null,
        verificationExpiresAt: null,
      },
    });

    console.log(`Updated ${email} wallet balance to $5000.00`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      kycStatus,
      walletBalance: ensureWalletAmount,
      isEmailVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log(`Created ${email} with initial balance $5000.00`);
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kryptovault.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const adminName = process.env.ADMIN_NAME || 'KryptoVault Admin';

  const vipEmail = (process.env.VIP_USER_EMAIL || 'vip@kryptovault.demo').toLowerCase();
  const vipPassword = process.env.VIP_USER_PASSWORD || 'TraderPass123!';
  const vipName = process.env.VIP_USER_NAME || 'QA Trader';

  await ensurePrivilegedUser({
    email: adminEmail,
    password: adminPassword,
    name: adminName,
    role: Role.ADMIN,
    kycStatus: KYCStatus.APPROVED,
  });

  await ensurePrivilegedUser({
    email: vipEmail,
    password: vipPassword,
    name: vipName,
    role: Role.USER,
    kycStatus: KYCStatus.APPROVED,
  });

  const preservedEmails = [adminEmail, vipEmail];

  const result = await prisma.user.updateMany({
    where: {
      email: {
        notIn: preservedEmails,
      },
    },
    data: {
      walletBalance: { set: new Prisma.Decimal(0) },
    },
  });

  const demotedAdmins = await prisma.user.updateMany({
    where: {
      email: {
        not: adminEmail,
      },
      role: Role.ADMIN,
    },
    data: {
      role: Role.USER,
    },
  });

  if (result.count > 0) {
    console.log(`Reset wallet balances to $0.00 for ${result.count} other user(s).`);
  } else {
    console.log('No other user balances required resetting.');
  }

  if (demotedAdmins.count > 0) {
    console.log(`Demoted ${demotedAdmins.count} admin user(s) to regular accounts.`);
  }

  console.log('Privileged balances ensured successfully.');
  console.log(`Admin login -> Email: ${adminEmail}, Password: ${adminPassword}`);
  console.log(`VIP login   -> Email: ${vipEmail}, Password: ${vipPassword}`);
}

main()
  .catch((error) => {
    console.error('Failed to create admin user', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
