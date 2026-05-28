# Contributing to GamePulseTracker

Thanks for thinking about contributing. This is a community project — every
fix, new game integration, doc tweak, or design polish helps. This document
is opinionated about a few things; the rest is up to good taste.

## Quick links

- [Issues](https://github.com/NekoSuneProjects/GamePulseTracker/issues) — feel free to open one before writing code, especially for non-trivial changes.
- [Discussions](https://github.com/NekoSuneProjects/GamePulseTracker/discussions) — for "should we…?" questions and game-API tips.
- See [`LICENSE`](LICENSE) for the legal terms — by submitting a PR you license your contribution under the same terms.

## Repo layout

```
backend/             NestJS API + workers
  src/games/integrations/    one folder per supported game
frontend/            Next.js 14 + Tailwind
shared/              TypeScript types + GAME_CATALOG (single source of truth)
overwolf-app/        Overwolf companion (HTML/JS)
docker/              nginx config
docs/                API.md, DEPLOYMENT.md, CLIENT.md
.github/workflows/   CI + multi-arch Docker
```

## Setup

```bash
cp .env.example .env
# edit JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD

npm install
npm run db:migrate     # local Postgres required (or use docker-compose up postgres redis)
npm run db:seed
npm run dev            # backend on :4000, frontend on :3000
```

Run `npm run docker:up` for the full stack if you prefer Docker.

## Adding a new game integration

Each game is one file under
`backend/src/games/integrations/<slug>/<slug>.integration.ts` that implements
the [`GameIntegration`](backend/src/games/integrations/integration.interface.ts) interface.

1. **Pick a slug** that matches the URL you want (lowercase, kebab-case). Add
   it to [`shared/src/games.ts`](shared/src/games.ts) `GAME_CATALOG` with
   `platforms`, `provider`, and `live` fields.
2. **Implement the integration.** For a stub, extend
   [`StubIntegration`](backend/src/games/integrations/stub.base.ts) — that's
   ~6 lines. For a live integration, look at
   [`osrs.integration.ts`](backend/src/games/integrations/osrs/osrs.integration.ts)
   or [`hypixel.integration.ts`](backend/src/games/integrations/hypixel/hypixel.integration.ts) as templates.
3. **Register it** by importing the class in
   [`integrations.module.ts`](backend/src/games/integrations/integrations.module.ts)
   and adding it to the constructor list.
4. **Add a credential env var** to `.env.example` if needed. Use the same
   prefix style as existing ones.
5. **Write a one-line entry** in the README's "Game catalog" table.

If a game has no public API, you have two options:
- Mark it as `ingestOnly: true` and document an Overwolf handler in
  [`overwolf-app/js/games.js`](overwolf-app/js/games.js).
- Ship it as a stub with a comment pointing at the community options.

## API guidelines

- Every controller method must use the `ApiResponse` envelope: success →
  `{ ok: true, data: T }`, error → throw a Nest exception so the global
  filter formats it.
- Validate input with `class-validator` DTOs. Don't trust query params.
- New endpoints get an entry in [`docs/API.md`](docs/API.md) and a Swagger
  decorator.
- New WS events get a typed entry in
  [`shared/src/ws-events.ts`](shared/src/ws-events.ts).

## Code style

- TypeScript strict mode is on; please keep it that way.
- Prefer plain functions over classes for stateless helpers. Use NestJS
  classes (`@Injectable`) only when you need DI or lifecycle hooks.
- No `any` unless you're at the very edge (HTTP boundaries, untyped libs).
  Cast to `unknown` first and narrow.
- Comments only when WHY isn't obvious from the code. Don't restate WHAT.
- Tailwind classes only — no inline styles, no separate CSS modules unless
  unavoidable.

## Commits

- Use the imperative present tense: "Add Beat Saber integration", not
  "Added".
- One topic per commit if possible.
- Reference the issue id in the commit body when relevant.

## Testing what you wrote

The scaffold doesn't ship a heavy test suite yet — that's a contribution slot
that would be very welcome. Until then:

- `npm run build` should succeed.
- For a live integration, hit the new endpoint via curl or the Swagger UI and
  confirm the `NormalizedProfile` shape is reasonable.
- For frontend changes, run `npm run dev` and click through the page.

## What's in scope

- New game integrations (live OR stub).
- Better Overwolf handlers.
- UI polish, accessibility, mobile responsiveness.
- Caching, queue tuning, scalability.
- Docs.
- New WebSocket event types where they reduce client polling.

## What's out of scope

- Anything that violates a game's ToS (scraping authenticated endpoints,
  hooking anti-cheat, memory reading, etc.). See [`LICENSE`](LICENSE) §4.
- Closed-source commercial features.
- "Cosmetic-only" frameworks swaps (don't replace Next.js with X just because
  X is shinier).

## When in doubt

Open an issue. We'd rather catch a scope mismatch on day one than after you
spent a weekend implementing it. Thanks again for being here.
