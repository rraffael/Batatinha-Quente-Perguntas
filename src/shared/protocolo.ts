import type { Raridade, Ritmo } from './regras';

export type Fase = 'lobby' | 'contagem' | 'jogando' | 'intervalo' | 'fim';

export interface Config {
  /** Ids de temas; vazio = todos. */
  temas: string[];
  /** Inclui perguntas de dificuldade "dificil". */
  dificeis: boolean;
  vidas: number;
  ritmo: Ritmo;
  maxJogadores: number;
}

export interface JogadorPublico {
  id: string;
  apelido: string;
  personagem: string;
  vidas: number;
  pontos: number;
  /** Pontos acumulados rumo à próxima vida (0..499). */
  bonus: number;
  vivo: boolean;
  conectado: boolean;
  espectador: boolean;
  host: boolean;
  acertos: number;
  lendarias: number;
  /** Número da rodada em que foi eliminado (para o ranking). */
  eliminadoNaRodada: number | null;
}

export interface UsoPublico {
  canonica: string;
  raridade: Raridade;
  pontos: number;
  por: string;
}

export interface RodadaPublica {
  numero: number;
  perguntaId: string;
  texto: string;
  tema: string;
  temaNome: string;
  nota?: string;
  vezDe: string;
  usadas: UsoPublico[];
  total: number;
}

export interface NaoDita {
  canonica: string;
  raridade: Raridade;
}

export type Evento =
  | { seq: number; tipo: 'inicio' }
  | {
      seq: number;
      tipo: 'aceita';
      jogadorId: string;
      canonica: string;
      raridade: Raridade;
      pontos: number;
      ganhouVida: boolean;
      trocouPergunta: boolean;
    }
  | {
      seq: number;
      tipo: 'estouro';
      jogadorId: string;
      eliminado: boolean;
      fimDeJogo: boolean;
      naoDitas: NaoDita[];
    };

export interface SalaPublica {
  codigo: string;
  fase: Fase;
  config: Config;
  jogadores: JogadorPublico[];
  /** Ordem dos assentos na roda. */
  ordem: string[];
  rodada: RodadaPublica | null;
  evento: Evento | null;
  /** Milissegundos até a contagem/intervalo terminar (nunca o pavio, que é oculto). */
  proximaEmMs: number | null;
  vencedorId: string | null;
}

export interface TemaInfo {
  id: string;
  nome: string;
  qtd: number;
}

export type MotivoRecusa = 'usada' | 'ambigua' | 'desconhecida';

export type MsgCliente =
  | { t: 'entrar'; jogadorId: string; segredo: string; apelido: string; personagem: string }
  | { t: 'config'; config: Partial<Config> }
  | { t: 'iniciar' }
  | { t: 'responder'; texto: string }
  | { t: 'digitando'; texto: string }
  | { t: 'sair' }
  | { t: 'expulsar'; jogadorId: string }
  | { t: 'novaPartida' };

export type MsgServidor =
  | { t: 'sala'; sala: SalaPublica }
  | { t: 'recusada'; texto: string; motivo: MotivoRecusa; canonica?: string }
  | { t: 'digitando'; jogadorId: string; texto: string }
  | { t: 'erro'; codigo: string; mensagem: string };

/** Mensagem crua de keep-alive respondida pelo runtime sem acordar a sala. */
export const PING = 'ping';
export const PONG = 'pong';
