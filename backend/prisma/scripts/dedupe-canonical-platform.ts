/**
 * One-shot data migration: merge stale TrackedProfile rows with
 * platform='_' into the canonical row for the same (game, providerId)
 * where one exists.
 *
 * Why this exists
 * ----------------
 * Before the canonical-platform fix, integrations like Wynncraft / Hypixel
 * created rows with platform='_' (the "no platform supplied" placeholder)
 * AND, after the fix, started writing platform='minecraft'. Both rows
 * survive: the user sees duplicates in /profile/<user> and the upsert path
 * occasionally races between them. This script deletes the `_` row when a
 * canonical (non-underscore) sibling exists.
 *
 * StatSnapshot / MatchRecord rows that pointed at the `_` row are reparented
 * to the canonical row first, so we don't lose history.
 *
 * How to run
 * -----------
 *   cd backend
 *   npx ts-node prisma/scripts/dedupe-canonical-platform.ts
 *
 * Dry-run by default. Pass --apply to actually mutate.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  // Find every (game, providerId) where we have BOTH a `_` row and at least
  // one non-`_` row.
  const stale = await prisma.trackedProfile.findMany({
    where: { platform: '_' },
    select: { id: true, game: true, providerId: true },
  });

  let merged = 0;
  let skipped = 0;

  for (const s of stale) {
    const canonical = await prisma.trackedProfile.findFirst({
      where: { game: s.game, providerId: s.providerId, platform: { not: '_' } },
      select: { id: true, platform: true },
    });
    if (!canonical) {
      // The `_` row is the only row — leave it alone, integration may not
      // have a canonical platform yet (e.g. ingest-only games).
      skipped++;
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(
      `merge: game=${s.game} providerId=${s.providerId} ` +
      `_  row=${s.id} → canonical(${canonical.platform}) row=${canonical.id}` +
      (APPLY ? '' : '  [dry-run]'),
    );

    if (APPLY) {
      await prisma.$transaction([
        // Reparent any descendant rows so history is preserved.
        prisma.statSnapshot.updateMany({ where: { profileId: s.id }, data: { profileId: canonical.id } }),
        prisma.matchRecord.updateMany({ where: { profileId: s.id }, data: { profileId: canonical.id } }),
        prisma.seasonRecord.updateMany({ where: { profileId: s.id }, data: { profileId: canonical.id } }),
        prisma.trackedProfile.delete({ where: { id: s.id } }),
      ]);
    }
    merged++;
  }

  // eslint-disable-next-line no-console
  console.log(`Done. merged=${merged} skipped=${skipped} (apply=${APPLY ? 'YES' : 'no — re-run with --apply'})`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
