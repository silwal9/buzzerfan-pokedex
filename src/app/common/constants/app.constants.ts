/** PokéAPI public GraphQL endpoint — no auth required */
export const POKEAPI_GRAPHQL_URL = 'https://beta.pokeapi.co/graphql/v1beta';

/** Local mock server endpoint — run with: npx json-graphql-server db.js --port 4000 */
export const MOCK_SERVER_URL = 'http://localhost:4000/graphql';

/** Number of times to retry a failed PokéAPI call before surfacing the error */
export const RETRY_COUNT = 3;

/** Milliseconds between retry attempts */
export const RETRY_DELAY_MS = 1000;

/** Page size options for the Pokédex table paginator */
export const PAGE_SIZE_OPTIONS = [10, 25, 50];

/** Default page size */
export const DEFAULT_PAGE_SIZE = 10;

/** Base URL for official Pokémon artwork/sprites */
export const POKEMON_SPRITE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Returns the official sprite URL for a given Pokémon ID */
export function getPokemonSpriteUrl(id: number): string {
  return `${POKEMON_SPRITE_BASE_URL}/${id}.png`;
}