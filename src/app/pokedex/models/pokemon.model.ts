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

// Raw shapes from the GraphQL response — transformed in the API service.
// In PokéAPI v1beta2, the legacy 'pokemon_v2_' prefix was stripped upstream from all relational types.
export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  pokemontypes: { type: { name: string } }[];
  pokemonstats: { base_stat: number; stat: { name: string } }[];
  pokemonsprites?: { sprites: string }[];
}

export interface RawAbility {
  ability: {
    name: string;
    abilityeffecttexts: { short_effect: string }[];
  };
  is_hidden: boolean;
}