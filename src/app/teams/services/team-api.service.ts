import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from '../../core/services/graphql.service';
import { MOCK_SERVER_URL } from '../../common/constants/app.constants';
import { Team, Trainer } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly gql = inject(GraphqlService);

  /** Fetches all teams from the mock server. */
  getTeams$(): Observable<Team[]> {
    const query = `query { 
      allTeams { 
        id 
        name 
        trainer_id
        pokemon_ids
        created_at 
      } 
    }`;
    return this.gql.query<{ allTeams: Team[] }>(MOCK_SERVER_URL, query).pipe(map((d) => d.allTeams));
  }

  /** Fetches all trainers from the mock server. */
  getTrainers$(): Observable<Trainer[]> {
    const query = `query { 
      allTrainers { 
        id 
        name 
        region 
        avatar_url 
      } 
    }`;
    return this.gql.query<{ allTrainers: Trainer[] }>(MOCK_SERVER_URL, query).pipe(map((d) => d.allTrainers));
  }

  /** Deletes a team by ID. */
  deleteTeam$(id: number): Observable<{ id: number }> {
    const mutation = `
      mutation DeleteTeam($id: ID!) { 
        removeTeam(id: $id) { 
          id 
        } 
      }
    `;
    return this.gql.query<{ removeTeam: { id: number } }>(MOCK_SERVER_URL, mutation, { id })
      .pipe(map((d) => d.removeTeam));
  }

  /** Creates a new team. */
  createTeam$(name: string, trainer_id: number, pokemon_ids: number[], created_at: string): Observable<Team> {
    const mutation = `
      mutation CreateTeam($name: String!, $trainer_id: Int!, $pokemon_ids: [Int!]!, $created_at: String!) {
        createTeam(name: $name, trainer_id: $trainer_id, pokemon_ids: $pokemon_ids, created_at: $created_at) {
          id 
          name 
          trainer_id 
          pokemon_ids 
          created_at
        }
      }
    `;
    return this.gql.query<{ createTeam: Team }>(MOCK_SERVER_URL, mutation, { name, trainer_id, pokemon_ids, created_at })
      .pipe(map((d) => d.createTeam));
  }
}