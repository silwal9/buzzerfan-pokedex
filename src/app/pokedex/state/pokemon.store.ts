import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { PokemonApiService } from '../services/pokemon-api.service';
import { Pokemon } from '../models/pokemon.model';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/app.constants';

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

const INITIAL_STATE: PokemonState = {
  cache: new Map(),
  searchResults: null,
  totalCount: 0,
  loading: false,
  error: null,
  page: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  search: '',
  typeFilter: '',
  sortField: 'name',
  sortDirection: 'asc',
};

@Injectable({
  providedIn: 'root'
})
export class PokemonStore {
  private readonly api = inject(PokemonApiService);
  private readonly state$ = new BehaviorSubject<PokemonState>({ ...INITIAL_STATE, cache: new Map() });
  private readonly destroyRef = inject(DestroyRef);

  readonly state = this.state$.asObservable();

  private get snap(): PokemonState {
    return this.state$.getValue();
  }

  private patch(partial: Partial<PokemonState>): void {
    this.state$.next({ ...this.snap, ...partial });
  }

  /** Loads the total count once for paginator accuracy. */
  loadTotalCount(): void {
    this.api.getTotalCount$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (totalCount) => this.patch({ totalCount }),
    });
  }

  /**
   * Loads the current page. Checks the cache first — cache hit means no API call
   * and no loading state. Delegates to executeCombinedFilter when search or type filter is active.
   */
  loadPage(): void {
    const { page, pageSize, search, typeFilter } = this.snap;

    if (search || typeFilter) {
      this.executeCombinedFilter(search, typeFilter, pageSize, page * pageSize);
      return;
    }

    const cacheKey = `${pageSize}-${page * pageSize}`;
    if (this.snap.cache.has(cacheKey)) {
      this.patch({ searchResults: null, error: null });
      return;
    }

    this.patch({ loading: true, error: null, searchResults: null });
    this.api.getPokemons$(pageSize, page * pageSize).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pokemons) => {
        const cache = new Map(this.snap.cache);
        cache.set(cacheKey, pokemons);
        this.patch({ cache, loading: false });
      },
      error: (err: Error) => this.patch({ loading: false, error: err.message || 'Failed to load Pokémon' }),
    });
  }

  /** Sets name search while preserving active type filter. */
  setSearch(search: string): void {
    this.patch({ search, page: 0, error: null });
    this.loadPage();
  }

  /** Sets type filter while preserving active name search. */
  setTypeFilter(typeFilter: string): void {
    this.patch({ typeFilter, page: 0, error: null });
    this.loadPage();
  }

  /** Clears both search and type filters. */
  clearFilters(): void {
    this.patch({ search: '', typeFilter: '', page: 0, error: null });
    this.loadPage();
  }

  setSort(field: SortField, direction: SortDirection): void {
    this.patch({
      sortField: field,
      sortDirection: direction,
    });
  }

  setPageSize(pageSize: number): void {
    this.patch({
      pageSize,
      page: 0
    });
    this.loadPage();
  }

  setPage(page: number): void {
    this.patch({ page });
    this.loadPage();
  }

  retry(): void {
    this.patch({ error: null });
    this.loadPage();
  }

  private executeCombinedFilter(name: string, type: string, limit: number, offset: number): void {
    this.patch({ loading: true, error: null });
    this.api.getFilteredPokemons$(name || undefined, type || undefined, limit, offset).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (searchResults) => this.patch({ loading: false, searchResults }),
      error: (err: Error) => this.patch({ loading: false, error: err.message || 'Filter failed' }),
    });
  }
}