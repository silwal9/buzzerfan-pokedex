import { Injectable, inject } from '@angular/core';
import { Observable, map, retry } from 'rxjs';
import { GraphqlService } from '../../core/services/graphql.service';
import {
  POKEAPI_GRAPHQL_URL,
  RETRY_COUNT,
  RETRY_DELAY_MS,
  getPokemonSpriteUrl,
} from '../../common/constants/app.constants';
import { Pokemon, PokemonDetail, RawAbility, RawPokemon } from '../models/pokemon.model';

function mapRawPokemon(raw: RawPokemon): Pokemon {
  const statsMap: Record<string, number> = {};
  // In PokéAPI v1beta2, 'pokemon_v2_pokemonstats' is renamed to 'pokemonstats' and 'pokemon_v2_stat' to 'stat'
  for (const s of raw.pokemonstats) {
    statsMap[s.stat.name] = s.base_stat;
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
    // In PokéAPI v1beta2, 'pokemon_v2_pokemontypes' is renamed to 'pokemontypes' and 'pokemon_v2_type' to 'type'
    types: raw.pokemontypes.map((t) => t.type.name),
    stats: { hp, attack, defense, spAtk, spDef, speed, total: hp + attack + defense + spAtk + spDef + speed },
    spriteUrl: getPokemonSpriteUrl(raw.id),
  };
}

@Injectable({
  providedIn: 'root'
})
export class PokemonApiService {
  private readonly gql = inject(GraphqlService);

  // Updated for PokéAPI v1beta2 schema where the 'pokemon_v2_' prefix is stripped from relations
  private readonly pokemonFields = `
    id 
    name 
    height 
    weight
    pokemontypes { 
      type { 
        name 
      } 
    }
    pokemonstats { 
      base_stat 
      stat { 
        name 
      } 
    }
    pokemonsprites { 
      sprites 
    }
  `;

  /** Fetches a page of Pokémon (Task §GraphQL APIs query). Retries up to RETRY_COUNT times on failure. */
  getPokemons$(limit: number, offset: number): Observable<Pokemon[]> {
    // In PokéAPI v1beta2, root query uses 'pokemon' instead of legacy 'pokemon_v2_pokemon'
    const query = `
      query GetPokemon($limit: Int, $offset: Int) {
        pokemon(limit: $limit, offset: $offset) { ${this.pokemonFields} }
      }
    `;
    return this.gql
      .query<{ pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { limit, offset })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon.map(mapRawPokemon)),
      );
  }

  /** Searches by name and/or filters by type. Retries on failure. */
  searchPokemons$(
    name: string,
    limit = 50,
    offset = 0,
    type?: string,
  ): Observable<{ pokemons: Pokemon[]; totalCount: number }> {
    const whereConditions: Record<string, any> = {};
    if (name) {
      whereConditions['name'] = { _ilike: `%${name}%` };
    }
    if (type) {
      // In PokéAPI v1beta2, relational filter drops the 'pokemon_v2_' prefix: pokemontypes -> type
      whereConditions['pokemontypes'] = {
        type: { name: { _eq: type } },
      };
    }

    // In PokéAPI v1beta2, root queries are 'pokemon' and 'pokemon_aggregate', using 'pokemon_bool_exp'
    const query = `
      query SearchPokemon($where: pokemon_bool_exp, $limit: Int, $offset: Int) {
        pokemon(where: $where, limit: $limit, offset: $offset) { ${this.pokemonFields} }
        pokemon_aggregate(where: $where) { aggregate { count } }
      }
    `;

    return this.gql
      .query<{
        pokemon: RawPokemon[];
        pokemon_aggregate: { aggregate: { count: number } };
      }>(POKEAPI_GRAPHQL_URL, query, {
        where: whereConditions,
        limit,
        offset,
      })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => ({
          pokemons: data.pokemon.map(mapRawPokemon),
          totalCount: data.pokemon_aggregate.aggregate.count,
        })),
      );
  }

  /** Filters by type with pagination. Retries on failure. */
  filterByType$(type: string, limit = 50, offset = 0): Observable<{ pokemons: Pokemon[]; totalCount: number }> {
    return this.searchPokemons$('', limit, offset, type);
  }

  /** Fetches the total Pokémon count once (for the paginator). */
  getTotalCount$(): Observable<number> {
    // In PokéAPI v1beta2, aggregate query is 'pokemon_aggregate' instead of 'pokemon_v2_pokemon_aggregate'
    const query = `
      query GetTotalCount {
        pokemon_aggregate { aggregate { count } }
      }
    `;
    return this.gql
      .query<{ pokemon_aggregate: { aggregate: { count: number } } }>(POKEAPI_GRAPHQL_URL, query)
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon_aggregate.aggregate.count),
      );
  }

  /** Fetches abilities for one Pokémon (used by the detail panel). */
  getAbilities$(pokemonId: number): Observable<PokemonDetail['abilities']> {
    // In PokéAPI v1beta2, 'pokemonability', 'ability', and 'abilityeffecttexts' drop 'pokemon_v2_' prefixes
    const query = `
      query GetAbilities($pokemonId: Int) {
        pokemonability(where: { pokemon_id: { _eq: $pokemonId } }) {
          ability {
            name
            abilityeffecttexts(where: { language_id: { _eq: 9 } }) { short_effect }
          }
          is_hidden
        }
      }
    `;
    return this.gql
      .query<{ pokemonability: RawAbility[] }>(POKEAPI_GRAPHQL_URL, query, { pokemonId })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) =>
          data.pokemonability.map((a) => ({
            name: a.ability.name,
            shortEffect: a.ability.abilityeffecttexts[0]?.short_effect ?? '',
            isHidden: a.is_hidden,
          })),
        ),
      );
  }

  /** Fetches a set of Pokémon by their IDs in one query — used by the team expanded view. */
  getPokemonsByIds$(ids: number[]): Observable<Pokemon[]> {
    // In PokéAPI v1beta2, root query uses 'pokemon' instead of 'pokemon_v2_pokemon'
    const query = `
      query GetPokemonsByIds($ids: [Int!]) {
        pokemon(where: {
          id: { _in: $ids }
        }) {
          ${this.pokemonFields}
        }
      }
    `;
    return this.gql
      .query<{ pokemon: RawPokemon[] }>(POKEAPI_GRAPHQL_URL, query, { ids })
      .pipe(
        retry({ count: RETRY_COUNT, delay: RETRY_DELAY_MS }),
        map((data) => data.pokemon.map(mapRawPokemon)),
      );
  }
}