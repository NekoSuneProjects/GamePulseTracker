import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@gamepulse.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
  const passwordHash = await argon2.hash(adminPassword);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      username: 'admin',
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Seeded admin: ${admin.email} (password from SEED_ADMIN_PASSWORD env or documented default — NOT logged here for safety)`);

  const demoHash = await argon2.hash('DemoPass!2026');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@gamepulse.local' },
    update: {},
    create: {
      email: 'demo@gamepulse.local',
      username: 'demo',
      passwordHash: demoHash,
      role: Role.USER,
      emailVerified: true,
      bio: 'Demo account for GamePulseTracker.',
      socials: [
        { kind: 'twitter', value: 'https://twitter.com/example' },
        { kind: 'twitch',  value: 'https://twitch.tv/example' },
      ],
    },
  });

  await prisma.trackedProfile.upsert({
    where: { game_platform_providerId: { game: 'hypixel', platform: 'minecraft', providerId: 'demo-uuid' } },
    update: {},
    create: { game: 'hypixel', platform: 'minecraft', providerId: 'demo-uuid', displayName: 'DemoPlayer', userId: demo.id },
  });
  await prisma.trackedProfile.upsert({
    where: { game_platform_providerId: { game: 'wynncraft', platform: 'minecraft', providerId: 'demo-uuid' } },
    update: {},
    create: { game: 'wynncraft', platform: 'minecraft', providerId: 'demo-uuid', displayName: 'DemoWynn', userId: demo.id },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
