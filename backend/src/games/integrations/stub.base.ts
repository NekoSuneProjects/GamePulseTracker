import type { GameSlug, NormalizedProfile } from '@gpt/shared';
import type { GameIntegration, ProfileQuery, SearchHit } from './integration.interface';

/**
 * Base class for stub integrations.
 *
 * Each stub describes:
 *  - which env var needs to be set to enable it
 *  - which platforms the UI should expose
 *  - which provider is suggested (the constructor's `providerLabel`)
 *
 * Replace `getProfile()` with real provider calls when wiring up. The base
 * implementation returns a minimal-but-valid NormalizedProfile so downstream
 * persistence and UI rendering keeps working even before wiring is done.
 */
export abstract class StubIntegration implements GameIntegration {
  abstract readonly slug: GameSlug;
  abstract readonly name: string;
  abstract readonly providerLabel: string;
  abstract readonly envKey: string | null;
  abstract readonly platforms: readonly string[];
  readonly live = false;
  readonly ingestOnly?: boolean;

  isEnabled(): boolean {
    if (this.ingestOnly) return true; // ingest-only games are always "enabled"
    if (!this.envKey) return false;
    return Boolean(process.env[this.envKey]);
  }

  async search(q: { query: string; platform?: string }): Promise<SearchHit[]> {
    if (!this.isEnabled()) return [];
    return [{ providerId: q.query, displayName: q.query, platform: q.platform }];
  }

  async getProfile(q: ProfileQuery): Promise<NormalizedProfile> {
    if (!this.isEnabled()) {
      throw new Error(`${this.name} integration is not configured. Set ${this.envKey ?? 'the relevant env variable'}.`);
    }
    return {
      game: this.slug,
      providerId: q.identifier,
      displayName: q.identifier,
      platform: q.platform,
      headline: {},
      details: {
        _stub: true,
        _note: `Implement ${this.name} integration here (provider: ${this.providerLabel}).`,
      },
      fetchedAt: new Date().toISOString(),
    };
  }
}
