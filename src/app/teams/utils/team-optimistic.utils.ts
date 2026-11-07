import { BehaviorSubject, Observable } from 'rxjs';
import { Team } from '../models/team.model';
import { TeamState, OptimisticCreatePayload } from '../models/team-state.model';

/**
 * Builds the optimistic team object and temp ID.
 * Pure — no side effects, no Angular dependencies.
 */
export function buildOptimisticTeam(
  name: string,
  trainer_id: number,
  pokemon_ids: number[],
  currentTeams: Team[],
  created_at = new Date().toISOString(),
): OptimisticCreatePayload {
  const tempId = -Date.now();
  return {
    tempId,
    optimisticTeam: { id: tempId, name, trainer_id, pokemon_ids, created_at, optimistic: true },
    previousTeams: currentTeams,
  };
}

/**
 * Applies the optimistic add to `state$`, then subscribes to `api$`.
 * On success: replaces the temp entry with the real server response and calls `onSuccess`.
 * On failure: rolls back to `previousTeams` and calls `onError`.
 */
export function applyOptimisticCreate(
  state$: BehaviorSubject<TeamState>,
  api$: Observable<Team>,
  { tempId, optimisticTeam, previousTeams }: OptimisticCreatePayload,
  onError?: () => void,
  onSuccess?: (team: Team) => void,
): void {
  state$.next({ ...state$.getValue(), teams: [optimisticTeam, ...previousTeams] });
  api$.subscribe({
    next: (real) => {
      const s = state$.getValue();
      state$.next({ ...s, teams: s.teams.map((t) => (t.id === tempId ? { ...real } : t)) });
      onSuccess?.(real);
    },
    error: () => {
      state$.next({ ...state$.getValue(), teams: previousTeams });
      onError?.();
    },
  });
}
