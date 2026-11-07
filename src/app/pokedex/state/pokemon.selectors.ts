import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { PokemonStore, PokemonState } from './pokemon.store';
import { Pokemon } from '../models/pokemon.model';

export function selectCurrentPokemons(state$: Observable<PokemonState>): Observable<Pokemon[]> {
  return state$.pipe(
    map((s) => {
      if (s.searchResults !== null) return s.searchResults;
      return s.cache.get(`${s.pageSize}-${s.page * s.pageSize}`) ?? [];
    }),
    shareReplay(1),
  );
}

@Injectable({ 
    providedIn: 'root' 
})
export class PokemonSelectors {
  private readonly store = inject(PokemonStore);
  private readonly state$ = this.store.state;

  /** The Pokémon list for the current view — search results or the cached page. */
  readonly currentPokemons$ = selectCurrentPokemons(this.state$);

  /** Current list sorted client-side on the active sort field and direction. */
  readonly sortedPokemons$ = combineLatest([
    this.currentPokemons$,
    this.state$.pipe(
      map((s) => ({ field: s.sortField, dir: s.sortDirection })),
      distinctUntilChanged((a, b) => a.field === b.field && a.dir === b.dir),
    ),
  ]).pipe(
    map(([pokemons, sort]) => {
      if (!sort.dir) return pokemons;
      return [...pokemons].sort((a, b) => {
        if (sort.field === 'name') {
          return sort.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        }
        const av = a.stats[sort.field as keyof typeof a.stats] as number;
        const bv = b.stats[sort.field as keyof typeof b.stats] as number;
        return sort.dir === 'asc' ? av - bv : bv - av;
      });
    }),
    shareReplay(1),
  );

  readonly loading$   = this.state$.pipe(map((s) => s.loading), distinctUntilChanged());
  readonly error$     = this.state$.pipe(map((s) => s.error), distinctUntilChanged());
  readonly totalCount$ = this.state$.pipe(map((s) => s.totalCount), distinctUntilChanged(), shareReplay(1));
  readonly page$      = this.state$.pipe(map((s) => s.page), distinctUntilChanged());
  readonly pageSize$  = this.state$.pipe(map((s) => s.pageSize), distinctUntilChanged());

  readonly isEmpty$ = combineLatest([this.sortedPokemons$, this.loading$, this.error$]).pipe(
    map(([pokemons, loading, error]) => !loading && !error && pokemons.length === 0),
    distinctUntilChanged(),
  );
}