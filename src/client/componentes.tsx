import type { ComponentChildren } from 'preact';
import { ROTULO_RARIDADE, type Raridade } from '../shared/regras';
import { ANUNCIOS_LIGADOS } from './config';
import { imagemPersonagem, nomePersonagem } from './personagens';

export function Avatar({ personagem, tamanho = 'md', classe = '' }: { personagem: string; tamanho?: 'sm' | 'md' | 'lg'; classe?: string }) {
  return (
    <img
      class={`avatar avatar-${tamanho} ${classe}`}
      src={imagemPersonagem(personagem)}
      alt={nomePersonagem(personagem)}
      width={64}
      height={64}
    />
  );
}

export function Coracoes({ vidas }: { vidas: number }) {
  return (
    <span class="hearts" aria-label={`${vidas} ${vidas === 1 ? 'vida' : 'vidas'}`}>
      {vidas > 0 ? Array.from({ length: vidas }, (_, i) => <span key={i} class="on">♥</span>) : <span class="off">♥</span>}
    </span>
  );
}

export function Selo({ raridade }: { raridade: Raridade }) {
  return <span class={`badge r-${raridade}`}>{ROTULO_RARIDADE[raridade]}</span>;
}

export function Cartao({ children, classe = '' }: { children: ComponentChildren; classe?: string }) {
  return <div class={`card ${classe}`}>{children}</div>;
}

/** Espaço de anúncio: só existe fora da partida e quando os anúncios estiverem ligados. */
export function EspacoAnuncio() {
  if (!ANUNCIOS_LIGADOS) return null;
  return (
    <aside class="ad-slot" aria-label="Publicidade">
      <small>Publicidade</small>
    </aside>
  );
}
