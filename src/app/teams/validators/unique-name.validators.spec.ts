import { describe, it, expect, vi, afterEach } from 'vitest';
import { Observable, firstValueFrom } from 'rxjs';
import { AbstractControl, ValidationErrors } from '@angular/forms';

// Import the ACTUAL exported function from the real application file.
import { uniqueNameValidator } from './unique-name.validators';

function fakeControl(value: string): AbstractControl {
  return { value } as AbstractControl;
}

describe('uniqueNameValidator (imported from unique-name.validators.ts)', () => {
  afterEach(() => { vi.useRealTimers(); });

  const existingTeams = [{ name: 'Kanto Starters' }, { name: 'Johto Squad' }];
  // Pass a getter — matches the production usage in TeamFormComponent
  const validator = uniqueNameValidator(() => existingTeams);

  it('returns { nameTaken: true } for a name already in the list (case-insensitive)', async () => {
    vi.useFakeTimers();
    const obs$ = validator(fakeControl('kanto starters')) as Observable<ValidationErrors | null>;
    const promise = firstValueFrom(obs$);
    vi.advanceTimersByTime(300);
    const result = await promise;
    expect(result).toEqual({ nameTaken: true });
  });

  it('returns null for a unique name', async () => {
    vi.useFakeTimers();
    const obs$ = validator(fakeControl('New Squad')) as Observable<ValidationErrors | null>;
    const promise = firstValueFrom(obs$);
    vi.advanceTimersByTime(300);
    const result = await promise;
    expect(result).toBeNull();
  });

  it('returns null for empty / whitespace input', async () => {
    vi.useFakeTimers();
    const obs$ = validator(fakeControl('   ')) as Observable<ValidationErrors | null>;
    const promise = firstValueFrom(obs$);
    vi.advanceTimersByTime(300);
    const result = await promise;
    expect(result).toBeNull();
  });
});