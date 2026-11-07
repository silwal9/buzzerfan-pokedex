export interface Trainer {
  id: number;
  name: string;
  region: string;
  avatar_url: string;
}

export interface Team {
  id: number;
  name: string;
  trainer_id: number;
  pokemon_ids: number[];
  created_at: string;
  /** True while the mutation is in-flight (optimistic entry) */
  optimistic?: boolean;
}