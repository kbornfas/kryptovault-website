import { KYCStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const ensureWalletAmount = new Prisma.Decimal(5000);

async function ensurePrivilegedUser({
  email,
  password,
  name,
  role,
  kycStatus,
}: {
  email: string;
  password: string;
  name: string;
  role: Role;
  kycStatus: KYCStatus;
}) {
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
      } as any,
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
    } as any,
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

  const preservedEmails = [adminEmail, vipEmail.toLowerCase()];

  const result = await prisma.user.updateMany({
    where: {
      email: {
        notIn: preservedEmails,
      },
    },
    data: {
      walletBalance: { set: new Prisma.Decimal(0) },
    } as any,
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
