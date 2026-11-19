import type { Saguao } from './saguao';
import type { Sala } from './sala';

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
  /** Lista de salas públicas (uma instância só). */
  SAGUAO: DurableObjectNamespace<Saguao>;
  /** Opcional: estatísticas de uso (raridade dinâmica). */
  DB?: D1Database;
}
