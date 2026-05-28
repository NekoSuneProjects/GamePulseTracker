import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { GameSlug } from '@gpt/shared';
import type { GameIntegration } from './integration.interface';

@Injectable()
export class IntegrationRegistry {
  private readonly log = new Logger(IntegrationRegistry.name);
  private readonly map = new Map<string, GameIntegration>();

  register(integration: GameIntegration) {
    if (this.map.has(integration.slug)) {
      this.log.warn(`Integration ${integration.slug} re-registered`);
    }
    this.map.set(integration.slug, integration);
    this.log.log(`Registered integration: ${integration.slug} (live=${integration.live}, enabled=${integration.isEnabled()})`);
  }

  get(slug: string): GameIntegration {
    const found = this.map.get(slug);
    if (!found) throw new NotFoundException({ code: 'INTEGRATION_NOT_FOUND', message: `No integration for "${slug}"` });
    return found;
  }

  has(slug: string): boolean { return this.map.has(slug); }

  list(): GameIntegration[] { return Array.from(this.map.values()); }

  enabled(): GameIntegration[] { return this.list().filter(i => i.isEnabled()); }

  bySlug(): Record<string, GameIntegration> {
    return Object.fromEntries(this.map.entries());
  }

  /** Convenience: typed lookup of slug-supported games. */
  getTyped(slug: GameSlug): GameIntegration { return this.get(slug); }
}
