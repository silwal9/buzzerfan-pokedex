import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TeamStore } from './state/team.store';
import { TeamListComponent } from './components/team-list/team-list.component';
import { TeamFormComponent } from './components/team-form/team-form.component';

@Component({
  selector: 'app-teams',
  imports: [
    TeamListComponent,
    TeamFormComponent,
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