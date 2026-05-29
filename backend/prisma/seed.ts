import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Seed reproducible demo data for a fresh deployment.
 *
 * Idempotent — re-running the seed only fills in rows that don't yet exist;
 * existing rows are left alone (we never overwrite passwords/usernames).
 *
 * Default credentials (override via env):
 *   admin / SEED_ADMIN_PASSWORD (default ChangeMe!2026)
 *   demo  / DemoPass!2026
 *   plus 6 sample players (alice, bob, ...) each with DemoPass!2026
 *
 * Set SEED_DEMO_DATA=off to skip everything except admin.
 */
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
  console.log(`Seeded admin: ${admin.email} (password not logged)`);

  if (process.env.SEED_DEMO_DATA === 'off') return;

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

  // Extra sample users — gives the follow/follower flows something to land
  // on out of the box.
  const samples = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank'];
  const sampleUsers = [];
  for (const u of samples) {
    sampleUsers.push(await prisma.user.upsert({
      where: { email: `${u}@gamepulse.local` },
      update: {},
      create: {
        email: `${u}@gamepulse.local`,
        username: u,
        passwordHash: demoHash,
        role: Role.USER,
        emailVerified: true,
        bio: `Sample player ${u}.`,
      },
    }));
  }

  // A small follow graph so the side panels and counts look populated.
  const followPairs: Array<[string, string]> = [
    [demo.id, sampleUsers[0].id],
    [demo.id, sampleUsers[1].id],
    [sampleUsers[0].id, demo.id],
    [sampleUsers[1].id, demo.id],
    [sampleUsers[2].id, demo.id],
    [sampleUsers[2].id, sampleUsers[0].id],
    [sampleUsers[3].id, sampleUsers[0].id],
  ];
  for (const [a, b] of followPairs) {
    if (a === b) continue;
    await prisma.follow.upsert({
      where: { followerId_followedId: { followerId: a, followedId: b } },
      update: {},
      create: { followerId: a, followedId: b },
    });
  }

  // A handful of tracked profiles per user.
  const trackedSeeds: Array<{ user: string; game: string; platform: string; providerId: string; displayName: string }> = [
    { user: demo.id,           game: 'hypixel',   platform: 'minecraft', providerId: 'demo-uuid',  displayName: 'DemoPlayer' },
    { user: demo.id,           game: 'wynncraft', platform: 'minecraft', providerId: 'demo-uuid',  displayName: 'DemoWynn' },
    { user: sampleUsers[0].id, game: 'osrs',      platform: 'main',      providerId: 'alice_main', displayName: 'Alice' },
    { user: sampleUsers[1].id, game: 'runescape', platform: 'main',      providerId: 'bob_main',   displayName: 'Bob' },
    { user: sampleUsers[2].id, game: 'beat-saber',platform: 'pcvr',      providerId: 'carol-bs',   displayName: 'Carol' },
    { user: sampleUsers[3].id, game: 'roblox',    platform: 'roblox',    providerId: 'dave-rbx',   displayName: 'Dave' },
  ];
  for (const t of trackedSeeds) {
    await prisma.trackedProfile.upsert({
      where: { game_platform_providerId: { game: t.game, platform: t.platform, providerId: t.providerId } },
      update: {},
      create: {
        game: t.game, platform: t.platform, providerId: t.providerId,
        displayName: t.displayName, userId: t.user,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${1 + samples.length} demo user(s), ${followPairs.length} follow(s), ${trackedSeeds.length} tracked profile(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
