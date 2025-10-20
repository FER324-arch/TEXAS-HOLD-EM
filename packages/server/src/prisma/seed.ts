import { prisma } from '../services/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@neon' },
    update: {},
    create: {
      email: 'admin@neon',
      nickname: 'Admin',
      passwordHash: adminPassword,
      role: 'admin',
      account: { create: { balance: 1_000_000 } }
    }
  });

  await prisma.user.upsert({
    where: { email: 'user@demo' },
    update: {},
    create: {
      email: 'user@demo',
      nickname: 'DemoUser',
      passwordHash: userPassword,
      role: 'user',
      account: { create: { balance: 10_000 } }
    }
  });

  console.log('Seeded users:', admin.email, 'user@demo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
