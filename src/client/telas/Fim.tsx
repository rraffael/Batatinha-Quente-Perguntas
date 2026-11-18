import { Avatar, EspacoAnuncio } from '../componentes';
import type { PropsTela } from './Lobby';

export function Fim({ sala, eu, enviar, sair }: PropsTela) {
  const souHost = sala.jogadores.some((j) => j.id === eu && j.host);
  const ranking = sala.jogadores
    .filter((j) => !j.espectador)
    .sort((a, b) => {
      if (a.id === sala.vencedorId) return -1;
      if (b.id === sala.vencedorId) return 1;
      const ea = a.eliminadoNaRodada ?? Infinity;
      const eb = b.eliminadoNaRodada ?? Infinity;
      return eb - ea || b.pontos - a.pontos;
    });
  const vencedor = ranking[0];
  const podio = [ranking[1], ranking[0], ranking[2]];

  return (
    <section class="card centro" aria-labelledby="h-fim">
      <h1 id="h-fim" class="titulo-fim">
        Fim de festa!
      </h1>
      <p class="muted">
        {vencedor ? `${vencedor.apelido} saiu da roda sem nenhuma queimadura.` : 'Ninguém sobrou na roda!'}
      </p>
      <div class="podium">
        {podio.map((j, i) =>
          j ? (
            <div key={j.id} class={`p${[2, 1, 3][i]}`}>
              <Avatar personagem={j.personagem} tamanho="lg" />
              <strong>{j.apelido}</strong>
              <div class="step">{[2, 1, 3][i]}</div>
            </div>
          ) : (
            <div key={i} />
          ),
        )}
      </div>
      <ol class="ranking">
        {ranking.map((j, i) => (
          <li key={j.id}>
            <span class="pos">{i + 1}</span>
            <Avatar personagem={j.personagem} tamanho="sm" />
            {j.apelido}
            {j.id === eu && <span class="muted"> (você)</span>}
            <span class="stat">
              {j.pontos} pts · {j.acertos} acertos
              {j.lendarias > 0 && ` · ${j.lendarias} lendária${j.lendarias > 1 ? 's' : ''}`}
            </span>
          </li>
        ))}
      </ol>
      <div class="center-actions">
        {souHost ? (
          <button class="btn btn-primary" onClick={() => enviar({ t: 'novaPartida' })}>
            Jogar de novo
          </button>
        ) : (
          <p class="muted">Esperando o anfitrião reabrir a roda…</p>
        )}
        <button class="btn btn-ghost" onClick={sair}>
          Sair da roda
        </button>
      </div>
      <EspacoAnuncio />
    </section>
  );
}
