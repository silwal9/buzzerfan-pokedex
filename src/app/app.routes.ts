import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', redirectTo: '/pokedex', pathMatch: 'full'},
    // {
    //     path: 'pokedex',
    //     loadComponent: () =>
    //         import('./pokedex/pokedex.component').then((m) => m.PokedexComponent)
    // },
    // {
    //     path: 'teams',
    //     loadComponent: () =>
    //         import('./teams/teams.component').then((m) => m.TeamsComponent)
    // },
    {
        path: '**',
        redirectTo: '/pokedex',
    }
];
