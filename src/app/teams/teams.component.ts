import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TeamStore } from './state/team.store';
import { TeamListComponent } from './components/team-list/team-list.component';

@Component({
  selector: 'app-teams',
  imports: [
    TeamListComponent,
  ],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamsComponent implements OnInit {
  private readonly store = inject(TeamStore);

  ngOnInit(): void {
    this.store.loadTeams();
    this.store.loadTrainers();
  }
}