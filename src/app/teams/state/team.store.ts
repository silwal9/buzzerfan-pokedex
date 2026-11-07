import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject } from 'rxjs';
import { OptimisticCreatePayload, TeamState } from '../models/team-state.model';
import { TeamApiService } from '../services/team-api.service';
import { applyOptimisticCreate, buildOptimisticTeam } from '../utils/team-optimistic.utils';

export { applyOptimisticCreate, buildOptimisticTeam };
export type { OptimisticCreatePayload, TeamState };

export const TEAM_INITIAL_STATE: TeamState = { teams: [], trainers: [], loading: false, error: null };

const SELECTED_TEAM_KEY = 'pokedex_selected_team_id';

@Injectable({ providedIn: 'root' })
export class TeamStore {
  private readonly api = inject(TeamApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly state$ = new BehaviorSubject<TeamState>({ ...TEAM_INITIAL_STATE });
  private readonly destroyRef = inject(DestroyRef);

  readonly state = this.state$.asObservable();

  /** Restored from localStorage; every change is persisted automatically. */
  readonly selectedTeamId = signal<number | null>(
    (() => { const s = localStorage.getItem(SELECTED_TEAM_KEY); return s ? Number(s) : null; })(),
  );

  constructor() {
    effect(() => {
      const id = this.selectedTeamId();
      if (id === null) localStorage.removeItem(SELECTED_TEAM_KEY);
      else localStorage.setItem(SELECTED_TEAM_KEY, String(id));
    });
  }

  private get snap() { return this.state$.getValue(); }
  private patch(p: Partial<TeamState>) { this.state$.next({ ...this.snap, ...p }); }

  /** Loads all teams from the mock server. */
  loadTeams(): void {
    this.patch({ loading: true, error: null });
    this.api.getTeams$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (teams) => this.patch({ teams, loading: false }),
      error: (err: Error) => this.patch({ loading: false, error: err.message || 'Failed to load teams. Is the mock server running?' }),
    });
  }

  /** Loads trainers (for the form dropdown and list display). */
  loadTrainers(): void {
    this.api.getTrainers$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (trainers) => this.patch({ trainers }),
    });
  }

  selectTeam(id: number | null): void { this.selectedTeamId.set(id); }

  retry(): void { this.loadTeams(); }

  /**
   * Optimistic delete — removes the team immediately. Rolls back on failure.
   */
  deleteTeam(id: number): void {
    const previousTeams = this.snap.teams;
    this.patch({ teams: previousTeams.filter((t) => t.id !== id) });
    if (this.selectedTeamId() === id) this.selectedTeamId.set(null);

    this.api.deleteTeam$(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.snackBar.open('Team deleted successfully.', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['snackbar-success'],
        });
      },
      error: () => {
        this.patch({ teams: previousTeams });
        this.snackBar.open('Failed to delete team. Please try again.', 'Dismiss', {
          duration: 4000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  /**
   * Optimistic create — delegates to `buildOptimisticTeam` and `applyOptimisticCreate`.
   * Those functions are exported and unit-tested independently.
   * `created_at` is generated once here and shared between the optimistic entry and the API call,
   * so both the UI preview and the server record carry the same timestamp.
   */
  createTeam(name: string, trainer_id: number, pokemon_ids: number[]): void {
    const created_at = new Date().toISOString();
    const payload = buildOptimisticTeam(name, trainer_id, pokemon_ids, this.snap.teams, created_at);
    applyOptimisticCreate(
      this.state$,
      this.api.createTeam$(name, trainer_id, pokemon_ids, created_at).pipe(
        takeUntilDestroyed(this.destroyRef)
      ),
      payload,
      () => this.snackBar.open('Failed to create team. Please try again.', 'Dismiss', {
        duration: 4000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snackbar-error'],
      }),
      (created) => this.snackBar.open(`Team "${created.name}" created successfully!`, 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top',
        panelClass: ['snackbar-success'],
      }),
    );
  }
}