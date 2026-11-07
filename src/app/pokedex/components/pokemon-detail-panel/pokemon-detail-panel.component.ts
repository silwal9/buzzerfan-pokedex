import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject,
  input, output, signal, computed,
} from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { TitleCasePipe } from '@angular/common';
import { PokemonApiService } from '../../services/pokemon-api.service';
import { Pokemon, PokemonDetail } from '../../models/pokemon.model';
import { SkeletonComponent } from '../../../common/components/skeleton/skeleton.component';
import { TypeBadgeComponent } from '../../../common/components/type-badge/type-badge.component';
import { getFriendlyErrorMessage } from '../../../common/utils/error.utils';

@Component({
  selector: 'app-pokemon-detail-panel',
  imports: [NgxEchartsDirective, SkeletonComponent, TypeBadgeComponent, TitleCasePipe],
  templateUrl: './pokemon-detail-panel.component.html',
  styleUrl: './pokemon-detail-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('250ms ease-out', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
  ],
})
export class PokemonDetailPanelComponent implements OnInit {
  private readonly api        = inject(PokemonApiService);
  private readonly destroyRef = inject(DestroyRef);

  pokemon = input.required<Pokemon>();
  closed  = output<void>();

  readonly abilities        = signal<PokemonDetail['abilities']>([]);
  readonly abilitiesLoading = signal(false);
  readonly abilitiesError   = signal<string | null>(null);

  /** Observable stream of pokemon input initialized in injection context */
  private readonly pokemon$ = toObservable(this.pokemon);

  readonly radarOption = computed<EChartsOption>(() => {
    const p = this.pokemon();
    return {
      radar: {
        indicator: [
          { name: 'HP',      max: 255 },
          { name: 'Attack',  max: 255 },
          { name: 'Defense', max: 255 },
          { name: 'Sp.Atk', max: 255 },
          { name: 'Sp.Def', max: 255 },
          { name: 'Speed',  max: 255 },
        ],
      },
      series: [{
        type: 'radar',
        data: [{
          value: [
            p.stats.hp, 
            p.stats.attack, 
            p.stats.defense, 
            p.stats.spAtk, 
            p.stats.spDef, 
            p.stats.speed
          ],
          name: p.name,
        }],
      }],
    };
  });

  ngOnInit(): void {
    this.setupAbilitiesStream();
  }

  retryAbilities(): void {
    const p = this.pokemon();
    this.abilitiesLoading.set(true);
    this.abilitiesError.set(null);
    this.api.getAbilities$(p.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (abs) => { this.abilities.set(abs); this.abilitiesLoading.set(false); },
      error: (err: unknown) => { this.abilitiesError.set(getFriendlyErrorMessage(err, 'Failed to load abilities. Please try again.')); this.abilitiesLoading.set(false); },
    });
  }

  close(): void { this.closed.emit(); }

  private setupAbilitiesStream(): void {
    this.pokemon$.pipe(
      switchMap((p) => {
        this.abilitiesLoading.set(true);
        this.abilitiesError.set(null);
        return this.api.getAbilities$(p.id).pipe(
          catchError((err: unknown) => {
            this.abilitiesError.set(getFriendlyErrorMessage(err, 'Failed to load abilities. Please try again.'));
            return of(null);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((abs) => {
      if (abs !== null) this.abilities.set(abs);
      this.abilitiesLoading.set(false);
    });
  }
}