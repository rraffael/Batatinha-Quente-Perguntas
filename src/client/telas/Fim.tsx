import { Avatar, BotaoSair, EspacoAnuncio } from '../componentes';
import { Chat } from './Chat';
import type { PropsTela } from './Lobby';

export function Fim({ sala, eu, enviar, sair, chat }: PropsTela) {
  const ranking = sala.jogadores
    .filter((j) => !j.espectador)
    .sort((a, b) => {
      if (a.id === sala.vencedorId) return -1;
      if (b.id === sala.vencedorId) return 1;
      const ea = a.eliminadoNaRodada ?? Infinity;
      const eb = b.eliminadoNaRodada ?? Infinity;
      return eb - ea || b.pontos - a.pontos;
    });
  const vencedor = sala.vencedorId ? ranking[0] : undefined;
  const podio = [ranking[1], ranking[0], ranking[2]];

  return (
    <section class="card centro" aria-labelledby="h-fim">
      <h1 id="h-fim" class="titulo-fim">
        Fim de festa!
      </h1>
      <p class="muted">
        {vencedor ? `${vencedor.apelido} saiu da roda sem nenhuma queimadura.` : 'Ninguém sobrou na roda!'}
      </p>
      {vencedor && (
        <div class="destaque-vencedor" aria-label={`Números de ${vencedor.apelido}`}>
          <Avatar personagem={vencedor.personagem} tamanho="lg" />
          <div class="numeros">
            <div>
              <strong>{vencedor.pontos}</strong>
              <span>pontos</span>
            </div>
            <div>
              <strong>{vencedor.acertos}</strong>
              <span>{vencedor.acertos === 1 ? 'acerto' : 'acertos'}</span>
            </div>
            <div>
              <strong>{vencedor.vidas}</strong>
              <span>{vencedor.vidas === 1 ? 'vida sobrando' : 'vidas sobrando'}</span>
            </div>
            {vencedor.lendarias > 0 && (
              <div>
                <strong>{vencedor.lendarias}</strong>
                <span>{vencedor.lendarias === 1 ? 'lendária' : 'lendárias'}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div class="center-actions topo">
        <button class="btn btn-primary" onClick={() => enviar({ t: 'novaPartida' })}>
          Voltar para a sala
        </button>
      </div>
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
          <li key={j.id} class={j.id === vencedor?.id ? 'vencedor' : ''}>
            <span class="pos">{i + 1}</span>
            <Avatar personagem={j.personagem} tamanho="sm" />
            {j.apelido}
            {j.id === eu && <span class="muted"> (você)</span>}
            <span class="stat">
              {j.pontos} pts · {j.acertos} {j.acertos === 1 ? 'acerto' : 'acertos'}
              {j.lendarias > 0 && ` · ${j.lendarias} lendária${j.lendarias > 1 ? 's' : ''}`}
            </span>
          </li>
        ))}
      </ol>
      <div class="fim-chat">
        <Chat mensagens={chat} eu={eu} enviar={enviar} />
      </div>
      <div class="center-actions">
        <BotaoSair aoSair={sair} />
      </div>
      <EspacoAnuncio />
    </section>
  );
}
