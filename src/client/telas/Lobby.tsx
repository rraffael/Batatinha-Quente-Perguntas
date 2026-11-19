import { useEffect, useState } from 'preact/hooks';
import type { Config, MsgCliente, SalaPublica, TemaInfo } from '../../shared/protocolo';
import { MIN_JOGADORES, PONTOS_POR_VIDA, RITMOS, VIDAS_MAX, type Ritmo } from '../../shared/regras';
import { Avatar, BotaoSair, EspacoAnuncio } from '../componentes';

export interface PropsTela {
  sala: SalaPublica;
  eu: string;
  enviar: (msg: MsgCliente) => void;
  sair: () => void;
}

let temasCache: TemaInfo[] | null = null;

function useTemas(): TemaInfo[] {
  const [temas, setTemas] = useState<TemaInfo[]>(temasCache ?? []);
  useEffect(() => {
    if (temasCache) return;
    fetch('/api/temas')
      .then((r) => r.json() as Promise<TemaInfo[]>)
      .then((t) => {
        temasCache = t;
        setTemas(t);
      })
      .catch(() => {});
  }, []);
  return temas;
}

export function Lobby({ sala, eu, enviar, sair }: PropsTela) {
  const temas = useTemas();
  const [copiado, setCopiado] = useState(false);
  const souHost = sala.jogadores.some((j) => j.id === eu && j.host);
  const naRoda = sala.jogadores.filter((j) => !j.espectador);
  const conectados = naRoda.filter((j) => j.conectado).length;
  const link = `${location.origin}/#/sala/${sala.codigo}`;
  const cfg = sala.config;
  const mudar = (config: Partial<Config>) => enviar({ t: 'config', config });

  async function copiar() {
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Batatá Quentá', text: `Entra na roda! Código ${sala.codigo}`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {}
  }

  // Seleção vazia = padrão: todos os temas menos os opcionais (nichos estrangeiros).
  const padrao = temas.filter((t) => !t.opcional).map((t) => t.id);
  const ehPadrao = (lista: string[]) =>
    lista.length === padrao.length && padrao.every((id) => lista.includes(id));

  function alternarTema(id: string) {
    const atual = cfg.temas.length === 0 ? padrao : cfg.temas;
    const novo = atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id];
    if (novo.length === 0) return; // pelo menos um tema
    mudar({ temas: ehPadrao(novo) ? [] : novo });
  }

  const temaLigado = (id: string) => (cfg.temas.length === 0 ? padrao.includes(id) : cfg.temas.includes(id));

  return (
    <div class="lobby-pagina">
      <div class="lobby">
        <div class="card">
          <div class="room-code">
            <h2 id="h-lobby">Sala</h2>
            <span class="code" aria-label={`Código da sala: ${sala.codigo.split('').join(' ')}`}>
              {sala.codigo}
            </span>
            <button class="btn btn-ghost pequeno" onClick={copiar}>
              {copiado ? 'Link copiado!' : 'Convidar'}
            </button>
          </div>
          <p class="muted">
            Chame a turma pra roda! ({naRoda.length} de {cfg.maxJogadores})
          </p>
          <ul class="players">
            {naRoda.map((j) => (
              <li key={j.id} class={j.conectado ? '' : 'offline'}>
                <Avatar personagem={j.personagem} tamanho="sm" />
                <span class="nome">
                  {j.apelido}
                  {j.id === eu && <span class="muted"> (você)</span>}
                  {!j.conectado && <span class="muted"> · caiu</span>}
                </span>
                {j.host && <span class="host">ANFITRIÃO</span>}
                {souHost && j.id !== eu && (
                  <button
                    class="btn-x"
                    title={`Remover ${j.apelido}`}
                    aria-label={`Remover ${j.apelido}`}
                    onClick={() => enviar({ t: 'expulsar', jogadorId: j.id })}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
            {naRoda.length < cfg.maxJogadores && <li class="empty">Lugar vago na roda…</li>}
          </ul>
        </div>

        <div class="card settings">
          <h2>Configurações</h2>
          <fieldset class="field" disabled={!souHost}>
            <legend>Vidas iniciais</legend>
            <div class="seg">
              {Array.from({ length: VIDAS_MAX }, (_, i) => i + 1).map((n) => (
                <label key={n}>
                  <input type="radio" name="vidas" checked={cfg.vidas === n} onChange={() => mudar({ vidas: n })} />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset class="field" disabled={!souHost}>
            <legend>Pavio</legend>
            <div class="seg">
              {(Object.keys(RITMOS) as Ritmo[]).map((r) => (
                <label key={r}>
                  <input type="radio" name="ritmo" checked={cfg.ritmo === r} onChange={() => mudar({ ritmo: r })} />
                  {RITMOS[r].rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset class="field" disabled={!souHost}>
            <legend>Temas {cfg.temas.length === 0 && <span class="muted">(padrão)</span>}</legend>
            <div class="chips">
              {temas
                .filter((t) => !t.opcional)
                .map((t) => (
                  <label key={t.id} class={`chip ${temaLigado(t.id) ? 'ligado' : ''}`}>
                    <input type="checkbox" checked={temaLigado(t.id)} onChange={() => alternarTema(t.id)} />
                    {t.nome}
                  </label>
                ))}
            </div>
            {temas.some((t) => t.opcional) && (
              <>
                <p class="muted pequeno">Extras (desligados por padrão):</p>
                <div class="chips">
                  {temas
                    .filter((t) => t.opcional)
                    .map((t) => (
                      <label key={t.id} class={`chip extra ${temaLigado(t.id) ? 'ligado' : ''}`}>
                        <input type="checkbox" checked={temaLigado(t.id)} onChange={() => alternarTema(t.id)} />
                        {t.nome}
                      </label>
                    ))}
                </div>
              </>
            )}
            <label class="toggle">
              <input type="checkbox" checked={cfg.dificeis} onChange={(e) => mudar({ dificeis: e.currentTarget.checked })} />
              Incluir perguntas difíceis
            </label>
          </fieldset>
          {souHost ? (
            <button
              class="btn btn-primary"
              disabled={conectados < MIN_JOGADORES}
              onClick={() => enviar({ t: 'iniciar' })}
            >
              {conectados < MIN_JOGADORES ? `Esperando mais ${MIN_JOGADORES - conectados}…` : 'Acender o pavio!'}
            </button>
          ) : (
            <p class="muted">Esperando o anfitrião acender o pavio…</p>
          )}
          <BotaoSair aoSair={sair} />
        </div>
      </div>
      <div class="card como-jogar">
        <h2>Como jogar</h2>
        <ol>
          <li>Na sua vez, digite uma resposta para a pergunta e aperte Enter. Acertou, a batata passa.</li>
          <li>O pavio é secreto: ninguém sabe quando a batata vai estourar. Errar custa 1 segundo.</li>
          <li>Estourou na sua mão? Perde uma vida. Quem ficar por último vence.</li>
          <li>Respostas raras dão pontos. A cada {PONTOS_POR_VIDA} pontos você ganha uma vida extra.</li>
        </ol>
      </div>
      <EspacoAnuncio />
    </div>
  );
}
