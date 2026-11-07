import { Pokemon } from './pokemon.model';

export type SortField = 'name' | 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed' | 'total';
export type SortDirection = 'asc' | 'desc' | '';

export interface PokemonState {
  /** Cached pages — key is `${pageSize}-${offset}` */
  cache: Map<string, Pokemon[]>;
  /** Non-null when a search or type filter is active */
  searchResults: Pokemon[] | null;
  totalCount: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  search: string;
  typeFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
}
