import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators,
} from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TitleCasePipe } from '@angular/common';
import { TeamStore } from '../../state/team.store';
import { PokemonApiService } from '../../../pokedex/services/pokemon-api.service';
import { Pokemon } from '../../../pokedex/models/pokemon.model';
import { Team, Trainer } from '../../models/team.model';
import { uniqueNameValidator } from '../../validators/unique-name.validators';

@Component({
  selector: 'app-team-form',
  imports: [
    ReactiveFormsModule, TitleCasePipe,
    MatAutocompleteModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule,
  ],
  templateUrl: './team-form.component.html',
  styleUrl: './team-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormComponent implements OnInit {
  private readonly store      = inject(TeamStore);
  private readonly pokemonApi = inject(PokemonApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly trainers            = toSignal(this.store.state.pipe(map((s) => s.trainers)), { initialValue: [] as Trainer[] });
  private readonly teams       = toSignal(this.store.state.pipe(map((s) => s.teams)),    { initialValue: [] as Team[] });
  readonly autocompleteResults = signal<Pokemon[]>([]);
  readonly autocompleteLoading = signal(false);
  readonly autocompleteError   = signal<string | null>(null);
  readonly selectedPokemon     = signal<Pokemon[]>([]);
  /** Flips to true once the user has typed ≥2 chars — gates the autocomplete empty state. */
  readonly hasSearched         = signal(false);

  private readonly autocompleteInput$ = new Subject<string>();

  // A getter (() => this.teams()) is passed instead of a snapshot so the validator
  // always reads the live team list — important because teams load asynchronously
  // and this.teams() is [] at FormGroup construction time.
  readonly form = new FormGroup({
    name:       new FormControl('', {
      validators: [
        Validators.required, 
        Validators.minLength(3), 
        Validators.maxLength(30)
      ],
      asyncValidators: [uniqueNameValidator(() => this.teams())],
      updateOn: 'change',
    }),
    trainer_id: new FormControl<number | null>(null, Validators.required),
  });

  get nameCtrl() { 
    return this.form.get('name')!; 
  }

  ngOnInit(): void {
    this.autocompleteInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => {
        if (term.length <= 1) {
          this.autocompleteResults.set([]);
          this.autocompleteError.set(null);
          this.hasSearched.set(false);
          return of([]);
        }
        this.hasSearched.set(true);
        this.autocompleteLoading.set(true);
        this.autocompleteError.set(null);
        return this.pokemonApi.searchPokemons$(term, 8).pipe(
          catchError((err: Error) => {
            this.autocompleteError.set(err.message || 'Search failed');
            return of([]);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((results) => {
      this.autocompleteResults.set(results);
      this.autocompleteLoading.set(false);
    });
  }

  onAutocompleteInput(value: string): void { 
    this.autocompleteInput$.next(value); 
  }

  addPokemon(pokemon: Pokemon): void {
    if (this.selectedPokemon().length >= 6) return;
    if (this.selectedPokemon().some((p) => p.id === pokemon.id)) return;
    this.selectedPokemon.update((list) => [...list, pokemon]);
  }

  removePokemon(id: number): void {
    this.selectedPokemon.update((list) => list.filter((p) => p.id !== id));
  }

  submit(formDirective?: FormGroupDirective): void {
    if (this.form.invalid) return;
    if (this.selectedPokemon().length < 1) return;

    const { name, trainer_id } = this.form.value;
    this.store.createTeam(name!, trainer_id!, this.selectedPokemon().map((p) => p.id));

    formDirective?.resetForm();
    this.form.reset();
    this.selectedPokemon.set([]);
    this.hasSearched.set(false);
  }
}