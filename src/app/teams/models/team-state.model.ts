import { Team, Trainer } from './team.model';

export interface TeamState {
  teams: Team[];
  trainers: Trainer[];
  loading: boolean;
  error: string | null;
}

export interface OptimisticCreatePayload {
  tempId: number;
  optimisticTeam: Team;
  previousTeams: Team[];
}
