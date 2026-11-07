
# Mini Pokédex

## Setup

### Prerequisites
- Node.js ≥ 18.19.1
- npm ≥ 10

### Running the app

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the mock server (Teams feature requires this):
   ```bash
   npx json-graphql-server db.js --port 4000
   ```

3. Start the Angular dev server:
   ```bash
   ng serve
   ```

4. Open http://localhost:4200

### Running tests
```bash
npm test
```

---

## Architecture

### State management

Custom BehaviorSubject-based stores — one per feature (`PokemonStore`, `TeamStore`). The task
requires this approach explicitly:

> "Build a custom store (no NgRx/Akita/NgXS): `BehaviorSubject` as the core state holder;
> selectors as derived streams using `map`, `distinctUntilChanged`, `combineLatest`"
> — Task §2 RxJS State Management

`PokemonSelectors` derives filtered, sorted, and paged streams from `PokemonStore`. Selectors
use `shareReplay(1)` where consumed by more than one subscriber. The store caches fetched
pages in a `Map<string, Pokemon[]>` keyed by `${pageSize}-${offset}` — navigating to a
previously visited page is instant.

### GraphQL transport — why `HttpClient` and not Apollo or AWS Amplify

**AWS Amplify** is explicitly excluded by the task:
> "Ignore the AWS Amplify parts — this task uses no auth and the APIs below instead."
> — Task §Required reading

Beyond the task exclusion, Amplify's `generateClient()` requires an AppSync endpoint and
cannot connect to the public PokéAPI or to `localhost:4000`.

**Apollo Client** adds its own `InMemoryCache`. The task requires a custom BehaviorSubject
store as the single source of truth for cached Pokémon data. Running Apollo's cache alongside
the store would create two caches for the same data, producing undefined behaviour when the
same Pokémon ID is fetched twice. `HttpClient` provides full Observable control with no
conceptual overlap.

### Pagination — resolving a conflict in the task

The task contains two statements that appear to contradict each other:

> "Paginated Pokémon list with types, stats, and sprites" — Task §1 GraphQL Integration

> "Client-side pagination: 10 / 25 / 50 per page" — Task §4 Pokédex Table

Both are true and compatible. The paginator drives `$limit`/`$offset` API parameters — each
page is fetched from PokéAPI with the appropriate offset. Each fetched page is cached in the
store. If the user navigates back to a page they've visited, the cache returns it immediately
with no loading state. Sort is always client-side on the loaded page because PokéAPI's Hasura
GraphQL endpoint does not support `order_by` on nested stat fields
(`pokemon_v2_pokemonstats`).

### Sprite URLs

The PokéAPI GraphQL response includes `pokemon_v2_pokemonsprites.sprites` — a stringified JSON
object with 30+ sprite variant keys. Parsing it adds complexity for no benefit. The sprite URL
is constructed directly from the Pokémon ID:

```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png
```

This is simpler, predictable, and never breaks when the sprites JSON shape changes.

### Selected team and localStorage persistence

The task requires:
> "`effect()` to persist the selected team to `localStorage`" — Task §3 Angular Signals

This implies a concept of a "selected team" but does not describe the UX. Implementation:
clicking a team card marks it as selected — the card expands slightly and the ID is written to
localStorage by an `effect()`. On page refresh, the `selectedTeamId` signal initialises from
localStorage, restoring the selection without an API call.

---

## What I'd improve with more time

- **Better error messages** — currently shows the raw error message string; could parse
  the GraphQL `errors` array for more specific feedback
- **Virtual scroll** (`@angular/cdk/scroll`) in place of pagination for the Pokédex table —
  smoother UX for long lists
