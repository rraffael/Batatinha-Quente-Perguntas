import { useEffect, useRef, useState } from 'preact/hooks';
import type { JogadorPublico } from '../../shared/protocolo';
import { PONTOS_POR_VIDA, ROTULO_RARIDADE, type Raridade } from '../../shared/regras';
import { Avatar, Coracoes, Selo } from '../componentes';
import type { PropsTela } from './Lobby';
import type { Digitando, Recusa } from './Sala';

interface Aviso {
  id: number;
  tipo: 'ok' | 'used' | 'unknown' | 'boom';
  texto: string;
  raridade?: Raridade;
  pontos?: number;
}

/** Contagem regressiva local a partir dos ms informados pelo servidor. */
function useSegundosRestantes(ms: number | null, chave: unknown): number | null {
  const [fim, setFim] = useState<number | null>(null);
  const [, setTique] = useState(0);
  useEffect(() => setFim(ms === null ? null : Date.now() + ms), [ms, chave]);
  useEffect(() => {
    if (fim === null) return;
    const t = setInterval(() => setTique((x) => x + 1), 200);
    return () => clearInterval(t);
  }, [fim]);
  return fim === null ? null : Math.max(0, Math.ceil((fim - Date.now()) / 1000));
}

/** A batata "esquenta" em momentos aleatórios: nunca revela o tempo real do pavio. */
function useBatataAleatoria(ativa: boolean): boolean {
  const [quente, setQuente] = useState(false);
  useEffect(() => {
    if (!ativa) return setQuente(false);
    let t: ReturnType<typeof setTimeout>;
    const trocar = () => {
      setQuente((q) => !q);
      t = setTimeout(trocar, 900 + Math.random() * 3200);
    };
    t = setTimeout(trocar, 900 + Math.random() * 3200);
    return () => clearTimeout(t);
  }, [ativa]);
  return quente;
}

export function Partida({
  sala,
  eu,
  enviar,
  sair,
  recusa,
  digitando,
}: PropsTela & { recusa: Recusa | null; digitando: Digitando | null }) {
  const rodada = sala.rodada;
  const porId = new Map(sala.jogadores.map((j) => [j.id, j]));
  const me = porId.get(eu);
  const minhaVez = sala.fase === 'jogando' && rodada?.vezDe === eu;
  const evento = sala.evento;
  const estouro = sala.fase === 'intervalo' && evento?.tipo === 'estouro' ? evento : null;

  const [texto, setTexto] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const ultimoDigitando = useRef(0);
  const segundos = useSegundosRestantes(sala.proximaEmMs, evento?.seq ?? sala.fase);
  const batataQuente = useBatataAleatoria(sala.fase === 'jogando');

  // Eventos do servidor viram avisos curtos.
  useEffect(() => {
    if (!evento) return;
    const nome = ('jogadorId' in evento ? porId.get(evento.jogadorId)?.apelido : undefined) ?? 'Alguém';
    if (evento.tipo === 'aceita') {
      if (evento.jogadorId === eu) setTexto('');
      const extra = evento.ganhouVida ? ' · +1 vida!' : evento.trocouPergunta ? ' · acabaram as respostas, pergunta nova!' : '';
      setAviso({
        id: evento.seq,
        tipo: 'ok',
        texto: `${nome}: ${evento.canonica}${extra}`,
        raridade: evento.raridade,
        pontos: evento.pontos,
      });
    } else if (evento.tipo === 'estouro') {
      setTexto('');
      setAviso({
        id: evento.seq,
        tipo: 'boom',
        texto: evento.eliminado ? `POF! ${nome} saiu da roda` : `POF! ${nome} perdeu uma vida`,
      });
    }
  }, [evento?.seq]);

  // Recusas são privadas: só quem digitou vê o motivo.
  useEffect(() => {
    if (!recusa) return;
    const texto =
      recusa.motivo === 'usada'
        ? `"${recusa.canonica ?? recusa.texto}" já foi dita!`
        : recusa.motivo === 'ambigua'
          ? `"${recusa.texto}" pode ser mais de uma coisa. Seja mais específico!`
          : `Hmm, "${recusa.texto}" não vale (−1s)`;
    setAviso({ id: -recusa.id, tipo: recusa.motivo === 'usada' ? 'used' : 'unknown', texto });
    entrada.current?.select();
  }, [recusa?.id]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso((a) => (a?.id === aviso.id ? null : a)), 2800);
    return () => clearTimeout(t);
  }, [aviso?.id]);

  // Na sua vez, o foco vai direto para o campo (e o teclado do celular continua aberto).
  useEffect(() => {
    if (minhaVez) entrada.current?.focus();
  }, [minhaVez, rodada?.perguntaId]);

  function aoDigitar(valor: string) {
    setTexto(valor);
    const agora = Date.now();
    if (minhaVez && agora - ultimoDigitando.current > 150) {
      ultimoDigitando.current = agora;
      enviar({ t: 'digitando', texto: valor });
    }
  }

  function aoEnviar(e: Event) {
    e.preventDefault();
    if (!minhaVez || !texto.trim()) return;
    enviar({ t: 'responder', texto });
    entrada.current?.focus();
  }

  // Assentos em roda, na ordem do jogo.
  const assentos = sala.ordem.map((id) => porId.get(id)).filter((j): j is JogadorPublico => !!j);
  const posicao = (i: number) => {
    const a = (i / Math.max(assentos.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * 42, y: 50 + Math.sin(a) * 42 };
  };
  const portador = estouro?.jogadorId ?? (sala.fase === 'jogando' ? rodada?.vezDe : undefined);
  const iPortador = assentos.findIndex((j) => j.id === portador);
  const pBatata =
    iPortador >= 0
      ? (() => {
          const p = posicao(iPortador);
          return { x: p.x + (50 - p.x) * 0.32, y: p.y + (50 - p.y) * 0.32 };
        })()
      : { x: 50, y: 50 };
  const imagemBatata = estouro ? 'batata-estourando' : batataQuente ? 'batata-esquentando' : 'batata';
  const daVez = rodada ? porId.get(rodada.vezDe) : undefined;
  const previa = digitando && digitando.jogadorId === rodada?.vezDe && digitando.jogadorId !== eu ? digitando.texto : '';

  return (
    <section class="match" aria-label="Partida">
      <div>
        <div class="hud">
          <span class="badge r-comum grande">Rodada {rodada?.numero ?? 1}</span>
          {me && !me.espectador ? (
            <>
              <div class="points">
                <div
                  class="bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={PONTOS_POR_VIDA}
                  aria-valuenow={me.bonus}
                  aria-label="Pontos para ganhar vida"
                >
                  <div class="fill" style={{ width: `${(me.bonus / PONTOS_POR_VIDA) * 100}%` }} />
                </div>
                <small>
                  {me.bonus} / {PONTOS_POR_VIDA} para ganhar ♥ · {me.pontos} pts
                </small>
              </div>
              <Coracoes vidas={me.vidas} />
            </>
          ) : (
            <span class="muted">Você está assistindo. Entra na próxima partida!</span>
          )}
        </div>

        <div class="roda">
          <div class="clareira">
            {sala.fase === 'contagem' && (
              <div class="pergunta">
                <small>Prepare-se!</small>
                <span class="contador">{segundos ?? 3}</span>
              </div>
            )}
            {sala.fase === 'jogando' && rodada && (
              <div class="pergunta">
                <small>{rodada.temaNome}</small>
                {rodada.texto}
                {rodada.nota && <span class="nota">{rodada.nota}</span>}
              </div>
            )}
            {estouro && (
              <div class="pergunta pequena">
                <small>Ninguém disse…</small>
                <div class="nao-ditas">
                  {estouro.naoDitas.map((n) => (
                    <span key={n.canonica} class={`badge r-${n.raridade}`} title={ROTULO_RARIDADE[n.raridade]}>
                      {n.canonica}
                    </span>
                  ))}
                </div>
                {!estouro.fimDeJogo && segundos !== null && <small>Próxima pergunta em {segundos}…</small>}
              </div>
            )}
          </div>
          {assentos.map((j, i) => {
            const p = posicao(i);
            const classes = [
              'seat',
              j.id === eu ? 'is-me' : '',
              j.id === portador ? 'is-holder' : '',
              j.vivo ? '' : 'is-out',
              estouro?.jogadorId === j.id ? 'shake' : '',
              j.conectado ? '' : 'offline',
            ].join(' ');
            return (
              <div key={j.id} class={classes} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <Avatar personagem={j.personagem} />
                <span class="name">{j.apelido}</span>
                <Coracoes vidas={j.vidas} />
              </div>
            );
          })}
          {sala.fase !== 'contagem' && (
            <div class={`potato ${estouro ? 'boom' : ''}`} style={{ left: `${pBatata.x}%`, top: `${pBatata.y}%` }}>
              <img src={`/personagens/${imagemBatata}.svg`} alt="Batata quente" width={52} height={52} />
            </div>
          )}
        </div>

        <div class="feedback" aria-live="polite">
          {aviso && (
            <span key={aviso.id} class={`toast ${aviso.tipo}`}>
              {aviso.texto}
              {aviso.raridade && (
                <>
                  {' '}
                  <Selo raridade={aviso.raridade} />
                  {aviso.pontos ? <strong> +{aviso.pontos}</strong> : null}
                </>
              )}
            </span>
          )}
        </div>

        <div class="answer-bar">
          {sala.fase === 'jogando' && !minhaVez && daVez && (
            <p class="digitando">
              <strong>{daVez.apelido}</strong> está com a batata{previa ? <>: “{previa}”</> : '…'}
            </p>
          )}
          <form onSubmit={aoEnviar} autoComplete="off">
            <label class="sr" for="resposta">
              Sua resposta
            </label>
            <input
              ref={entrada}
              class="input answer-input"
              id="resposta"
              value={texto}
              onInput={(e) => aoDigitar(e.currentTarget.value)}
              disabled={!minhaVez}
              placeholder={minhaVez ? 'Sua vez! Digite e aperte Enter' : 'Espere a batata chegar…'}
              enterKeyHint="send"
              autoCapitalize="off"
              autoCorrect="off"
              spellcheck={false}
              maxLength={60}
            />
            <button class="btn btn-primary" disabled={!minhaVez}>
              Passar!
            </button>
          </form>
        </div>
      </div>

      <aside class="card history" aria-labelledby="h-hist">
        <h2 id="h-hist">Nesta pergunta</h2>
        {rodada && rodada.usadas.length > 0 ? (
          <ol>
            {[...rodada.usadas].reverse().map((u) => (
              <li key={u.canonica}>
                <Avatar personagem={porId.get(u.por)?.personagem ?? 'saci'} tamanho="sm" />
                <span>{u.canonica}</span>
                <Selo raridade={u.raridade} />
              </li>
            ))}
          </ol>
        ) : (
          <p class="muted">Nenhuma resposta ainda.</p>
        )}
        {rodada && (
          <p class="muted pequeno">
            {rodada.usadas.length} de {rodada.total} respostas ditas
          </p>
        )}
        <button class="btn btn-ghost pequeno" onClick={sair}>
          Sair da partida
        </button>
      </aside>
    </section>
  );
}
