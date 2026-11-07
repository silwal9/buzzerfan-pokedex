import { describe, it, expect } from 'vitest';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// Import the ACTUAL exported function from the real application file.
import { selectCurrentPokemons } from './pokemon.selectors';
import { PokemonState } from './pokemon.store';
import { Pokemon } from '../models/pokemon.model';

function makeState(overrides: Partial<PokemonState> = {}): BehaviorSubject<PokemonState> {
  return new BehaviorSubject<PokemonState>({
    cache: new Map(), searchResults: null, totalCount: 0,
    loading: false, error: null, page: 0, pageSize: 10,
    search: '', typeFilter: '', sortField: 'name', sortDirection: '',
    ...overrides,
  } as PokemonState);
}

function makePokemon(id: number): Pokemon {
  return {
    id, name: `pokemon-${id}`, height: 10, weight: 100, types: ['normal'],
    stats: { hp: id, attack: id, defense: id, spAtk: id, spDef: id, speed: id, total: id * 6 },
    spriteUrl: `https://example.com/${id}.png`,
  };
}

describe('selectCurrentPokemons (imported from pokemon.selectors.ts)', () => {
  it('returns the correct page slice from cache for page 1 / pageSize 10', async () => {
    const cache = new Map<string, Pokemon[]>([
      ['10-0',  Array.from({ length: 10 }, (_, i) => makePokemon(i + 1))],
      ['10-10', Array.from({ length: 10 }, (_, i) => makePokemon(i + 11))],
    ]);
    const state$ = makeState({ cache, page: 1, pageSize: 10 });

    const result = await firstValueFrom(selectCurrentPokemons(state$));

    expect(result).toHaveLength(10);
    expect(result[0].id).toBe(11);
    expect(result[9].id).toBe(20);
  });

  it('returns [] when the page is not cached', async () => {
    const state$ = makeState({ cache: new Map(), page: 5, pageSize: 10 });
    const result = await firstValueFrom(selectCurrentPokemons(state$));
    expect(result).toEqual([]);
  });

  it('returns searchResults when a search is active, ignoring cache', async () => {
    const cache = new Map<string, Pokemon[]>([['10-0', [makePokemon(1)]]]);
    const searchResults = [makePokemon(42), makePokemon(43)];
    const state$ = makeState({ cache, page: 0, pageSize: 10, searchResults });

    const result = await firstValueFrom(selectCurrentPokemons(state$));

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(42);
  });
});