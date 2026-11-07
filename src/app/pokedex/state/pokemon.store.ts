import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';
import { DEFAULT_PAGE_SIZE } from '../../common/constants/app.constants';
import { PokemonState, SortDirection, SortField } from '../models/pokemon-state.model';
import { PokemonApiService } from '../services/pokemon-api.service';
import { getFriendlyErrorMessage } from '../../common/utils/error.utils';

export type { PokemonState, SortDirection, SortField };

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
      error: (err: unknown) => this.patch({ loading: false, error: getFriendlyErrorMessage(err, 'Failed to load Pokémon. Please try again.') }),
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
    this.api.searchPokemons$(name, limit, offset, type || undefined).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (searchResults) => this.patch({ loading: false, searchResults }),
      error: (err: unknown) => this.patch({ loading: false, error: getFriendlyErrorMessage(err, 'Filter failed. Please try again.') }),
    });
  }
}