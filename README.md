# Mini Pokédex

A responsive single-page Angular application for browsing Pokémon, inspecting detailed base stats with interactive radar charts, and building custom teams with optimistic updates and GraphQL.

---

## Setup & Running

### Prerequisites
- Node.js ≥ 18.19.1
- npm ≥ 10

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Start the Mock Server (Required for Teams feature)
```bash
npx json-graphql-server db.js --port 4000
```
> **Interactive GraphiQL Playground**: Test team queries and mutations directly in your browser at [http://localhost:4000/graphql](http://localhost:4000/graphql).

### 3. Start the Angular Dev Server
```bash
ng serve
```
Open **[http://localhost:4200](http://localhost:4200)** in your browser.

### 4. Running Unit Tests
```bash
npm test
```

---

## GraphQL Endpoints

- **Public PokéAPI GraphQL**: `https://beta.pokeapi.co/graphql/v1beta`
  - Interactive Playground: [https://beta.pokeapi.co/graphql/console](https://beta.pokeapi.co/graphql/console)
  - Provides paginated Pokémon listings, type filtering, debounced name search, and ability details.
- **Local Teams Mock Server**: `http://localhost:4000/graphql`
  - Interactive GraphiQL IDE: [http://localhost:4000/graphql](http://localhost:4000/graphql)
  - Provides team CRUD mutations (`createTeam`, `removeTeam`) and queries (`allTeams`, `allTrainers`).

---

## Architecture & Key Decisions

### 1. State Management & In-Memory Caching
The application uses custom `BehaviorSubject`-based stores (`PokemonStore`, `TeamStore`) paired with derived selector services (`PokemonSelectors`).

- **Single Source of Truth**: The store holds an immutable state tree (`PokemonState`) and exposes an observable stream.
- **Page Caching with `Map`**: To prevent redundant network requests and avoid skeleton layout flicker, `PokemonStore` caches loaded pages in a `Map<string, Pokemon[]>` keyed by `${pageSize}-${offset}`. If a user visits Page 1, switches to Page 2, and returns to Page 1, the store serves the cached data immediately without triggering a loading state.
- **Search & Filter Flow**: When search or type filters are active, the page cache is bypassed to fetch fresh query matches. The search pipeline uses `debounceTime(300)` and `distinctUntilChanged()` to minimize network requests.
- **Signals Integration**: Store selectors use RxJS operators with `shareReplay(1)` for multicasting and are bridged into templates using Angular 21's `toSignal()`, maintaining clean `OnPush` change detection throughout.

### 2. GraphQL Transport Layer (`HttpClient` vs Apollo)
Instead of bringing in Apollo Client (whose internal `InMemoryCache` would conflict with our custom BehaviorSubject store), all GraphQL requests are executed through a lightweight `GraphqlService` built on Angular's native `HttpClient`. This keeps the bundle small and gives full control over the RxJS stream pipeline and retry handling.

### 3. Pagination & Client-Side Stat Sorting
PokéAPI's Hasura endpoint does not support `order_by` sorting on deep nested relations (such as `pokemon_v2_pokemonstats.base_stat`). Therefore, pagination is handled via GraphQL `$limit` and `$offset` parameters, while column sorting (by HP, Attack, Defense, Speed, etc.) is performed client-side on the active page dataset.

### 4. Optimistic UI Mutations & Rollback
Creating or deleting a team updates the local state immediately:
- A new team appears in the list instantly with a temporary ID and an optimistic indicator.
- When the GraphQL mutation succeeds, the temporary ID is replaced with the real server-generated ID.
- If the mutation fails (e.g. mock server is stopped), the store automatically rolls back to the previous state snapshot and triggers an error notification toast.
- The pure rollback functions (`buildOptimisticTeam`, `applyOptimisticCreate`) are decoupled from Angular DI for clean unit testing.

### 5. Skeleton Shimmers, Micro-Animations & Toasts
- **Skeleton Shimmer**: Reusable `app-skeleton` component provides smooth loading feedback across the table, detail panel, and team lists.
- **Micro-Animations**: Smooth slide-in/slide-out animations on the detail panel and live animated transitions on the 6-axis ECharts radar polygon when switching Pokémon.
- **Toast Feedback**: Customized top-right `MatSnackBar` notifications with emerald green (success) and crimson red (failure) themes for team creations and deletions.

### 6. Deterministic Sprite URLs
The raw PokéAPI GraphQL response returns `pokemon_v2_pokemonsprites.sprites` as a stringified JSON object containing over 30 sprite variant keys. To keep the mapping fast and resilient against upstream schema changes, sprite URLs are constructed deterministically from the Pokémon ID:
`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

### 7. Reactive Forms & Async Uniqueness Validation
The team builder form uses Reactive Forms with typed form controls:
- **Async Unique Name Validator**: Debounces user input and validates the team name against the live list of teams in the store.
- **Autocomplete State Handling**: Explicitly handles all 4 UI states (Loading, Empty, Error, Success) and automatically resets selection state upon adding a chip.

---

## What I'd Improve with More Time

- **Bonus Features**:
  - Implement **Virtual Scrolling** (`@angular/cdk/scrolling`) for the Pokédex table for smooth scrolling across the full Pokédex dataset.
  - Add **Drag-and-Drop** (`@angular/cdk/drag-drop`) allowing users to drag Pokémon directly from the table into team slots.
  - Implement a **Type Matchup Highlight Directive** (`[appTypeHighlight]`) that visually highlights Pokémon strong or weak against a selected type.
- **Enterprise State Management**:
  - For a large production scale application, migrate the custom stores to **NgRx** for standardized state management, devtools time-travel debugging, and unified caching patterns.
- **Persistent Database**:
  - Replace the local in-memory `json-graphql-server` mock with a persistent database like **PostgreSQL** to retain team data permanently across restarts.
- **Detailed Error Handling**:
  - Parse specific GraphQL error codes from the response `errors` array to provide even more granular feedback for validation or rate-limit issues.