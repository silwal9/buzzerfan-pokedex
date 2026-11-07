import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, output
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { PokemonStore } from '../../state/pokemon.store';
import { PokemonSelectors } from '../../state/pokemon.selectors';
import { Pokemon } from '../../models/pokemon.model';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PAGE_SIZE_OPTIONS } from '../../../common/constants/app.constants';

@Component({
  selector: 'app-pokedex-table',
  imports: [
    SkeletonComponent,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './pokedex-table.component.html',
  styleUrl: './pokedex-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexTableComponent implements OnInit {
  private readonly store     = inject(PokemonStore);
  private readonly selectors = inject(PokemonSelectors);
  private readonly destroyRef = inject(DestroyRef);

  readonly pokemonSelected = output<Pokemon>();

  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  readonly displayedColumns = ['sprite', 'name', 'types', 'hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed', 'total'];

  // Bridge observables to signals for OnPush-friendly templates
  readonly loading = toSignal(this.selectors.loading$, { initialValue: false });
  readonly error = toSignal(this.selectors.error$, { initialValue: null });
  readonly pokemons = toSignal(this.selectors.sortedPokemons$, { initialValue: [] });
  readonly totalCount = toSignal(this.selectors.totalCount$, { initialValue: 0 });
  readonly page = toSignal(this.selectors.page$, { initialValue: 0 });
  readonly pageSize = toSignal(this.selectors.pageSize$, { initialValue: 10 });
  readonly isEmpty = toSignal(this.selectors.isEmpty$, { initialValue: false });

  private readonly searchInput$ = new Subject<string>();

  ngOnInit(): void {
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => { this.store.setSearch(term); return of(null); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe();
  }

  onSearch(term: string): void { 
    this.searchInput$.next(term);
  }

  onTypeFilter(type: string): void { 
    this.store.setTypeFilter(type);
  }

  onSort(sort: Sort): void { 
    this.store.setSort(sort.active as any, sort.direction as any);
  }

  onPage(event: PageEvent): void {
    if (event.pageSize !== this.pageSize()) {
       this.store.setPageSize(event.pageSize); 
    }
     else {
       this.store.setPage(event.pageIndex); 
    }
  }

  onRowClick(pokemon: Pokemon): void { 
    this.pokemonSelected.emit(pokemon);
  }

  retry(): void { 
    this.store.retry();
  }
}