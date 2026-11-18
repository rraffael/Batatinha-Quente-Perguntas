import type { Sala } from './sala';

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
  /** Opcional: estatísticas de uso (raridade dinâmica). */
  DB?: D1Database;
}
