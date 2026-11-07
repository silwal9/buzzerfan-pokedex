import { Injectable, inject } from '@angular/core';
import { Observable, map, retry } from 'rxjs';
import { GraphqlService } from '../../core/services/graphql.service';
import { POKEAPI_GRAPHQL_URL, RETRY_COUNT, RETRY_DELAY_MS } from '../../common/constants/app.constants';
import { Pokemon, PokemonDetail, RawAbility, RawPokemon } from '../models/pokemon.model';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

function mapRawPokemon(raw: RawPokemon): Pokemon {
  const statsMap: Record<string, number> = {};
  for (const s of raw.pokemon_v2_pokemonstats) {
    statsMap[s.pokemon_v2_stat.name] = s.base_stat;
  }
  const hp = statsMap['hp'] ?? 0;
  const attack = statsMap['attack'] ?? 0;
  const defense = statsMap['defense'] ?? 0;
  const spAtk = statsMap['special-attack'] ?? 0;
  const spDef = statsMap['special-defense'] ?? 0;
  const speed = statsMap['speed'] ?? 0;

  return {
    id: raw.id,
    name: raw.name,
    height: raw.height,
    weight: raw.weight,
    types: raw.pokemon_v2_pokemontypes.map((t) => t.pokemon_v2_type.name),
    stats: { hp, attack, defense, spAtk, spDef, speed, total: hp + attack + defense + spAtk + spDef + speed },
    spriteUrl: `${SPRITE_BASE}/${raw.id}.png`,
  };
}

@Injectable({
  providedIn: 'root'
})
export class PokemonApiService {
  private readonly gql = inject(GraphqlService);

  private readonly pokemonFields = `
    id 
    name 
    height 
    weight
    pokemon_v2_pokemontypes { 
      pokemon_v2_type { 
        name 
      } 
    }
    pokemon_v2_pokemonstats { 
      base_stat 
      pokemon_v2_stat { 
        name 
      } 
    }
    pokemon_v2_pokemonsprites { 
      sprites 
    }
  `;

  /** Fetches a page of Pokémon. Retries up to RETRY_COUNT times on failure. */
  getPokemons$(limit: number, offset: number): Observable<Pokemon[]> {
    const query = `
      query GetPokemon($limit: Int, $offset: Int) {
        pokemon_v2_pokemon(limit: $limit, offset: $offset) { ${this.pokemonFields} }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { limit, offset })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_v2_pokemon.map(mapRawPokemon)),
      );
  }

  /** Searches Pokémon by name (case-insensitive). Retries on failure. */
  searchPokemons$(name: string, limit = 50): Observable<Pokemon[]> {
    const query = `
      query SearchPokemon($name: String, $limit: Int) {
        pokemon_v2_pokemon(where: { name: { _ilike: $name } }, limit: $limit) { ${this.pokemonFields} }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { name: `%${name}%`, limit })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_v2_pokemon.map(mapRawPokemon)),
      );
  }

  /** Filters Pokémon by type. Retries on failure. */
  filterByType$(type: string, limit: number, offset: number): Observable<Pokemon[]> {
    const query = `
      query FilterByType($type: String, $limit: Int, $offset: Int) {
        pokemon_v2_pokemon(
          where: { pokemon_v2_pokemontypes: { pokemon_v2_type: { name: { _eq: $type } } } }
          limit: $limit, offset: $offset
        ) { ${this.pokemonFields} }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { type, limit, offset })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_v2_pokemon.map(mapRawPokemon)),
      );
  }

  /** Fetches the total Pokémon count once (for the paginator). */
  getTotalCount$(): Observable<number> {
    const query = `
      query GetTotalCount {
        pokemon_v2_pokemon_aggregate { aggregate { count } }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemon_aggregate: { aggregate: { count: number } } }>(POKEAPI_GRAPHQL_URL, query)
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_v2_pokemon_aggregate.aggregate.count),
      );
  }

  /** Fetches abilities for one Pokémon (used by the detail panel). */
  getAbilities$(pokemonId: number): Observable<PokemonDetail['abilities']> {
    const query = `
      query GetAbilities($pokemonId: Int) {
        pokemon_v2_pokemonability(where: { pokemon_id: { _eq: $pokemonId } }) {
          pokemon_v2_ability {
            name
            pokemon_v2_abilityeffecttexts(where: { language_id: { _eq: 9 } }) { short_effect }
          }
          is_hidden
        }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemonability: RawAbility[] }>(POKEAPI_GRAPHQL_URL, query, { pokemonId })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) =>
          data.pokemon_v2_pokemonability.map((a) => ({
            name: a.pokemon_v2_ability.name,
            shortEffect: a.pokemon_v2_ability.pokemon_v2_abilityeffecttexts[0]?.short_effect ?? '',
            isHidden: a.is_hidden,
          })),
        ),
      );
  }

  /** Fetches a set of Pokémon by their IDs in one query — used by the team expanded view. */
  getPokemonsByIds$(ids: number[]): Observable<Pokemon[]> {
    const query = `
      query GetPokemonsByIds($ids: [Int!]) {
        pokemon_v2_pokemon(where: {
          id: { _in: $ids }
        }) {
          ${this.pokemonFields}
        }
      }
    `;
    return this.gql
      .query<{ pokemon_v2_pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { ids })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_v2_pokemon.map(mapRawPokemon)),
      );
  }
}