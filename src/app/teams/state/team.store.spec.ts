import { describe, it, expect, vi } from 'vitest';
import { BehaviorSubject, of, throwError } from 'rxjs';

// Import the ACTUAL exported functions from the real application file.
// If the logic in team.store.ts changes, this test catches it.
import {
  buildOptimisticTeam,
  applyOptimisticCreate,
  TeamState,
  TEAM_INITIAL_STATE,
} from './team.store';
import { Team } from '../models/team.model';

function makeState(teams: Team[] = []): BehaviorSubject<TeamState> {
  return new BehaviorSubject<TeamState>({ ...TEAM_INITIAL_STATE, teams });
}

describe('buildOptimisticTeam', () => {
  it('returns a negative tempId and optimistic: true', () => {
    const result = buildOptimisticTeam('My Team', 1, [25, 6], []);
    expect(result.tempId).toBeLessThan(0);
    expect(result.optimisticTeam.optimistic).toBe(true);
    expect(result.optimisticTeam.id).toBe(result.tempId);
    expect(result.optimisticTeam.name).toBe('My Team');
    expect(result.previousTeams).toEqual([]);
  });
});

describe('applyOptimisticCreate — rollback on failure', () => {
  it('adds the optimistic entry then rolls back when the API errors', () => {
    const state$ = makeState([]);
    const payload = buildOptimisticTeam('My Team', 1, [25], []);
    const onError = vi.fn();

    applyOptimisticCreate(state$, throwError(() => new Error('fail')), payload, onError);

    expect(state$.getValue().teams).toHaveLength(0); // rolled back
    expect(onError).toHaveBeenCalledOnce();
  });

  it('replaces the optimistic entry with the real team on success', () => {
    const state$ = makeState([]);
    const payload = buildOptimisticTeam('My Team', 1, [25], []);
    const realTeam: Team = { id: 99, name: 'My Team', trainer_id: 1, pokemon_ids: [25], created_at: '2024-01-01T00:00:00Z' };

    applyOptimisticCreate(state$, of(realTeam), payload);

    const teams = state$.getValue().teams;
    expect(teams).toHaveLength(1);
    expect(teams[0].id).toBe(99);
    expect(teams[0].optimistic).toBeUndefined();
  });
});