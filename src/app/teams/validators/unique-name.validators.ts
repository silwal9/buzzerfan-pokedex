import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

/**
 * Async validator factory — exported so unit tests can import it directly.
 * Accepts a getter function that returns the current team list; debounces via `timer(300)`.
 * Using a getter (not a snapshot) ensures the validator always reads the live list,
 * even if teams loaded after the FormGroup was created.
 * Returns `{ nameTaken: true }` if the name already exists (case-insensitive).
 */
export function uniqueNameValidator(getTeams: () => { name: string }[]): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> =>
    timer(300).pipe(
      switchMap(() => {
        const value = (control.value as string)?.trim().toLowerCase();
        if (!value) return of(null);
        const taken = getTeams().some((t) => t.name.trim().toLowerCase() === value);
        return of(taken ? { nameTaken: true as const } : null);
      }),
    );
}
