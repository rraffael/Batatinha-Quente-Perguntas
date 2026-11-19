import { useEffect, useState } from 'preact/hooks';
import type { Fase, SalaListada } from '../../shared/protocolo';
import { MAX_APELIDO } from '../../shared/regras';
import { NOME_JOGO } from '../config';
import { preferencias } from '../identidade';
import { imagemPersonagem, PERSONAGENS_INFO } from '../personagens';

export function FormularioPerfil({
  apelido,
  personagem,
  aoMudar,
}: {
  apelido: string;
  personagem: string;
  aoMudar: (apelido: string, personagem: string) => void;
}) {
  return (
    <>
      <div class="field">
        <label for="apelido">Seu apelido</label>
        <input
          class="input"
          id="apelido"
          maxLength={MAX_APELIDO}
          placeholder="Ex.: Raffa"
          autoComplete="nickname"
          value={apelido}
          onInput={(e) => aoMudar(e.currentTarget.value, personagem)}
        />
      </div>
      <fieldset class="escolha-personagem">
        <legend>Escolha seu personagem</legend>
        <div class="chars">
          {PERSONAGENS_INFO.map((p) => (
            <label class="char" key={p.id} title={p.origem}>
              <input
                type="radio"
                name="personagem"
                value={p.id}
                checked={personagem === p.id}
                onChange={() => aoMudar(apelido, p.id)}
              />
              <img src={imagemPersonagem(p.id)} alt="" width={64} height={64} />
              <span>{p.nome}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function Inicio() {
  const [apelido, setApelido] = useState(preferencias.apelido());
  const [personagem, setPersonagem] = useState(preferencias.personagem());
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const mudarPerfil = (a: string, p: string) => {
    setApelido(a);
    setPersonagem(p);
  };

  function validarPerfil(): boolean {
    if (!apelido.trim()) {
      setErro('Escolha um apelido primeiro.');
      document.getElementById('apelido')?.focus();
      return false;
    }
    preferencias.salvar(apelido.trim(), personagem);
    return true;
  }

  async function criar(publica: boolean) {
    if (!validarPerfil()) return;
    setOcupado(true);
    setErro('');
    try {
      const r = await fetch(`/api/salas?publica=${publica ? 1 : 0}`, { method: 'POST' });
      const dados = (await r.json()) as { codigo?: string; erro?: string };
      if (!r.ok || !dados.codigo) throw new Error(dados.erro);
      location.hash = `#/sala/${dados.codigo}`;
    } catch {
      setErro('Não deu para criar a sala agora. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function entrarComCodigo(e: Event) {
    e.preventDefault();
    if (!validarPerfil()) return;
    const c = codigo.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(c)) {
      setErro('O código tem 4 letras.');
      return;
    }
    setOcupado(true);
    setErro('');
    try {
      const r = await fetch(`/api/salas/${c}`);
      const dados = (await r.json()) as { existe: boolean };
      if (!dados.existe) setErro('Sala não encontrada. Confira o código.');
      else location.hash = `#/sala/${c}`;
    } catch {
      setErro('Sem conexão com o servidor.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section aria-labelledby="h-inicio">
      <div class="hero">
        <img src="/personagens/batata.svg" alt="" width={96} height={96} />
        <h1 id="h-inicio">{NOME_JOGO}</h1>
        <p class="muted">Responda rápido e passe a batata antes que ela estoure!</p>
      </div>
      <div class="home-grid">
        <div class="card">
          <FormularioPerfil apelido={apelido} personagem={personagem} aoMudar={mudarPerfil} />
        </div>
        <div class="card">
          <div class="criar-sala">
            <button class="btn btn-primary" onClick={() => criar(false)} disabled={ocupado}>
              Criar sala privada
            </button>
            <button class="btn btn-secondary" onClick={() => criar(true)} disabled={ocupado}>
              Criar sala pública
            </button>
          </div>
          <div class="or">ou entre com o código</div>
          <form class="join" onSubmit={entrarComCodigo}>
            <label class="sr" for="codigo">
              Código da sala
            </label>
            <input
              class="input code-input"
              id="codigo"
              maxLength={4}
              placeholder="ABCD"
              autoComplete="off"
              autoCapitalize="characters"
              spellcheck={false}
              value={codigo}
              onInput={(e) => setCodigo(e.currentTarget.value.toUpperCase())}
            />
            <button class="btn btn-secondary" disabled={ocupado}>
              Entrar
            </button>
          </form>
          {erro && (
            <p class="toast unknown" role="alert">
              {erro}
            </p>
          )}
        </div>
        <SalasPublicas aoEntrar={(c) => validarPerfil() && (location.hash = `#/sala/${c}`)} />
        <p class="muted centro">
          <a href="#/sobre">Como jogar?</a>
        </p>
      </div>
    </section>
  );
}

const ROTULO_FASE: Record<Fase, string> = {
  lobby: 'Esperando',
  contagem: 'Começando',
  jogando: 'Em jogo',
  intervalo: 'Em jogo',
  fim: 'Acabando',
};

function SalasPublicas({ aoEntrar }: { aoEntrar: (codigo: string) => void }) {
  const [salas, setSalas] = useState<SalaListada[] | null>(null);

  useEffect(() => {
    let ativo = true;
    const buscar = () =>
      fetch('/api/salas')
        .then((r) => r.json() as Promise<SalaListada[]>)
        .then((lista) => ativo && setSalas(lista))
        .catch(() => {});
    buscar();
    const t = setInterval(buscar, 10_000);
    return () => {
      ativo = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div class="card salas-publicas" aria-labelledby="h-publicas">
      <h2 id="h-publicas">Salas públicas</h2>
      {salas === null ? (
        <p class="muted">Procurando rodas abertas…</p>
      ) : salas.length === 0 ? (
        <p class="muted">Nenhuma sala pública agora. Crie uma e chame a galera!</p>
      ) : (
        <ul>
          {salas.map((s) => (
            <li key={s.codigo}>
              <span class="code">{s.codigo}</span>
              <span class="nome">Roda de {s.anfitriao || '…'}</span>
              <span class="muted">
                {s.jogadores}/{s.maxJogadores} · {ROTULO_FASE[s.fase]}
              </span>
              <button class="btn btn-secondary pequeno" onClick={() => aoEntrar(s.codigo)}>
                {s.fase === 'lobby' ? 'Entrar' : 'Assistir'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
