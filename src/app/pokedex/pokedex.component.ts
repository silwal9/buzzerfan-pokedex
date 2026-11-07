import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { PokemonStore } from './state/pokemon.store';
import { Pokemon } from './models/pokemon.model';
import { PokedexTableComponent } from './components/pokedex-table/pokedex-table.component';

@Component({
  selector: 'app-pokedex',
  imports: [PokedexTableComponent],
  templateUrl: './pokedex.component.html',
  styleUrl: './pokedex.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PokedexComponent implements OnInit{
   private readonly store = inject(PokemonStore);

  readonly selectedPokemon = signal<Pokemon | null>(null);
  readonly panelOpen = signal(false);

  ngOnInit(): void {
    this.store.loadTotalCount();
    this.store.loadPage();
  }

  onPokemonSelected(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.panelOpen.set(true);
  }

  onPanelClose(): void {
    this.panelOpen.set(false);
  }
}
