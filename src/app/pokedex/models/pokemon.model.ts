export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    spAtk: number;
    spDef: number;
    speed: number;
    total: number;
  };
  spriteUrl: string;
}

export interface PokemonDetail extends Pokemon {
  abilities: {
    name: string;
    shortEffect: string;
    isHidden: boolean;
  }[];
}

// Raw shapes from the GraphQL response — transformed in the API service
export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemon_v2_pokemontypes: { pokemon_v2_type: { name: string } }[];
  pokemon_v2_pokemonstats: { base_stat: number; pokemon_v2_stat: { name: string } }[];
  pokemon_v2_pokemonsprites: { sprites: string }[];
}

export interface RawAbility {
  pokemon_v2_ability: {
    name: string;
    pokemon_v2_abilityeffecttexts: { short_effect: string }[];
  };
  is_hidden: boolean;
}