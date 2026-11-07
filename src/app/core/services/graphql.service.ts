import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

interface GraphQLResponse<T> {
  data: T;
  errors?: { message: string }[];
}

@Injectable({
  providedIn: 'root',
})
export class GraphqlService {
  private readonly http = inject(HttpClient);

  query<T>(url: string, query: string, variables: Record<string, unknown> = {}): Observable<T> {
    return this.http.post<GraphQLResponse<T>>(url, { query, variables })
    .pipe(
      map((res)=> {
        if (res.errors?.length) {
          throw new Error(res.errors.map((e) => e.message).join('; '));
        }
        return res.data;
      })
    );
  }
}
