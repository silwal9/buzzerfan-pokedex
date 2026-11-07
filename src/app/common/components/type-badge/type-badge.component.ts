import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const TYPE_COLORS: Record<string, string> = {
  fire: '#f08030', 
  water: '#6890f0', 
  grass: '#78c850', 
  electric: '#f8d030',
  psychic: '#f85888', 
  ice: '#98d8d8', 
  dragon: '#7038f8', 
  dark: '#705848',
  fighting: '#c03028', 
  poison: '#a040a0', 
  ground: '#e0c068', 
  flying: '#a890f0',
  bug: '#a8b820', 
  rock: '#b8a038', 
  ghost: '#705898', 
  steel: '#b8b8d0',
  normal: '#a8a878', 
  fairy: '#ee99ac',
};

@Component({
  selector: 'app-type-badge',
  imports: [],
  templateUrl: './type-badge.component.html',
  styleUrl: './type-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeBadgeComponent {
  typeName = input.required<string>();
  color    = computed(() => TYPE_COLORS[this.typeName()] ?? '#888');
}
