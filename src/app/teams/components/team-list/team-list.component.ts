import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { TeamStore } from '../../state/team.store';
import { Team } from '../../models/team.model';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { PokemonApiService } from '../../../pokedex/services/pokemon-api.service';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TitleCasePipe } from '@angular/common';
import { getPokemonSpriteUrl } from '../../../common/constants/app.constants';

@Component({
  selector: 'app-team-list',
  imports: [SkeletonComponent, TitleCasePipe],
  templateUrl: './team-list.component.html',
  styleUrl: './team-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamListComponent implements OnInit {
  private readonly store      = inject(TeamStore);
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly spriteUrl = getPokemonSpriteUrl;

  readonly teams      = toSignal(this.store.state.pipe(map((s) => s.teams)),    { initialValue: [] as Team[] });
  readonly trainers   = toSignal(this.store.state.pipe(map((s) => s.trainers)), { initialValue: [] });
  readonly loading    = toSignal(this.store.state.pipe(map((s) => s.loading)),  { initialValue: false });
  readonly error      = toSignal(this.store.state.pipe(map((s) => s.error)),    { initialValue: null });
  readonly selectedId = this.store.selectedTeamId;

  /** Pokémon details for the selected team — fetched once per selection change. */
  readonly selectedTeamPokemon = signal<Pokemon[]>([]);
  readonly pokemonLoading = signal(false);
  readonly pokemonError = signal<string | null>(null);

  /** Observable stream of selectedTeamId initialized in injection context */
  private readonly selectedTeamId$ = toObservable(this.store.selectedTeamId);

  /**
   * Type distribution for the selected team — e.g. "2 Fire, 2 Water, 1 Grass, 1 Electric".
   * Uses computed() so it updates automatically when selectedTeamPokemon changes.
   */
  readonly typeDistribution = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.selectedTeamPokemon()) {
      for (const type of p.types) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, n]) => `${n} ${type.charAt(0).toUpperCase() + type.slice(1)}`)
      .join(', ');
  });

  /** Sum of all base stats for all Pokémon in the selected team. */
  readonly totalBaseStats = computed(() =>
    this.selectedTeamPokemon().reduce((sum, p) => sum + p.stats.total, 0),
  );

  ngOnInit(): void {
    this.setupSelectedTeamListener();
  }

  trainerName(trainerId: number): string {
    return this.trainers().find((t) => t.id === trainerId)?.name ?? '—';
  }

  selectTeam(team: Team): void {
    this.store.selectTeam(team.id);
  }

  deleteTeam(event: Event, id: number): void {
    event.stopPropagation(); this.store.deleteTeam(id);
  }

  retry(): void {
    this.store.retry();
  }

  retryExpandedView(): void {
    const id = this.selectedId();
    if (!id) return;

    const team = this.teams().find((t) => t.id === id);
    if (!team) return;
    
    this.pokemonLoading.set(true);
    this.pokemonError.set(null);
    this.pokemonApi.getPokemonsByIds$(team.pokemon_ids).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (pokemons) => { this.selectedTeamPokemon.set(pokemons); this.pokemonLoading.set(false); },
      error: (err: Error) => { this.pokemonError.set(err.message || 'Failed to load Pokémon details'); this.pokemonLoading.set(false); },
    });
  }

  private setupSelectedTeamListener(): void {
    this.selectedTeamId$.pipe(
      switchMap((id) => {
        if (!id) { this.selectedTeamPokemon.set([]); this.pokemonError.set(null); return of(null); }
        const team = this.teams().find((t) => t.id === id);
        if (!team) { this.selectedTeamPokemon.set([]); this.pokemonError.set(null); return of(null); }
        this.pokemonLoading.set(true);
        this.pokemonError.set(null);
        return this.pokemonApi.getPokemonsByIds$(team.pokemon_ids).pipe(
          catchError((err: Error) => {
            this.pokemonError.set(err.message || 'Failed to load Pokémon details');
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((pokemons) => {
      if (pokemons !== null) this.selectedTeamPokemon.set(pokemons);
      this.pokemonLoading.set(false);
    });
  }
}