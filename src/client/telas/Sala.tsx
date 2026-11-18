import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MotivoRecusa, MsgCliente, SalaPublica } from '../../shared/protocolo';
import { Conexao, type StatusConexao } from '../conexao';
import { identidade, preferencias } from '../identidade';
import { FormularioPerfil } from './Inicio';
import { Fim } from './Fim';
import { Lobby } from './Lobby';
import { Partida } from './Partida';

export interface Recusa {
  id: number;
  texto: string;
  motivo: MotivoRecusa;
  canonica?: string;
}

export interface Digitando {
  jogadorId: string;
  texto: string;
}

export interface Tentativa {
  id: number;
  jogadorId: string;
  texto: string;
  aceita: boolean;
}

export function TelaSala({ codigo }: { codigo: string }) {
  const [pronto, setPronto] = useState(!!preferencias.apelido());
  if (!pronto) return <PerfilAntesDeEntrar codigo={codigo} aoConcluir={() => setPronto(true)} />;
  return <SalaConectada codigo={codigo} />;
}

function PerfilAntesDeEntrar({ codigo, aoConcluir }: { codigo: string; aoConcluir: () => void }) {
  const [apelido, setApelido] = useState('');
  const [personagem, setPersonagem] = useState(preferencias.personagem());
  return (
    <div class="shell">
      <main class="home-grid">
        <div class="hero">
          <img src="/personagens/batata.svg" alt="" width={96} height={96} />
          <h1>Entrar na roda {codigo}</h1>
        </div>
        <form
          class="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!apelido.trim()) return;
            preferencias.salvar(apelido.trim(), personagem);
            aoConcluir();
          }}
        >
          <FormularioPerfil
            apelido={apelido}
            personagem={personagem}
            aoMudar={(a, p) => {
              setApelido(a);
              setPersonagem(p);
            }}
          />
          <button class="btn btn-primary largo" disabled={!apelido.trim()}>
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}

function SalaConectada({ codigo }: { codigo: string }) {
  const eu = useMemo(() => identidade(), []);
  const [sala, setSala] = useState<SalaPublica | null>(null);
  const [status, setStatus] = useState<StatusConexao>('conectando');
  const [erro, setErro] = useState('');
  const [recusa, setRecusa] = useState<Recusa | null>(null);
  const [digitando, setDigitando] = useState<Digitando | null>(null);
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const conexao = useRef<Conexao | null>(null);

  useEffect(() => {
    let contador = 0;
    const c = new Conexao({
      codigo,
      aoAbrir: () => ({
        t: 'entrar',
        jogadorId: eu.jogadorId,
        segredo: eu.segredo,
        apelido: preferencias.apelido(),
        personagem: preferencias.personagem(),
      }),
      aoMensagem: (msg) => {
        switch (msg.t) {
          case 'sala':
            setSala(msg.sala);
            if (msg.sala.fase !== 'jogando') setDigitando(null);
            break;
          case 'recusada':
            setRecusa({ id: ++contador, texto: msg.texto, motivo: msg.motivo, canonica: msg.canonica });
            break;
          case 'digitando':
            setDigitando({ jogadorId: msg.jogadorId, texto: msg.texto });
            break;
          case 'tentativa':
            setTentativa({ id: ++contador, jogadorId: msg.jogadorId, texto: msg.texto, aceita: msg.aceita });
            setDigitando(null);
            break;
          case 'erro':
            setErro(msg.mensagem);
            break;
        }
      },
      aoStatus: (s) => setStatus(s),
    });
    conexao.current = c;
    return () => c.encerrar();
  }, [codigo, eu]);

  const enviar = (msg: MsgCliente) => conexao.current?.enviar(msg);
  const sairDaSala = () => {
    enviar({ t: 'sair' });
    conexao.current?.encerrar();
    location.hash = '#/';
  };

  // Erros "de ação" (ex.: só o host pode começar) somem sozinhos.
  useEffect(() => {
    if (!erro || status === 'encerrado') return;
    const t = setTimeout(() => setErro(''), 3500);
    return () => clearTimeout(t);
  }, [erro, status]);

  if (status === 'encerrado' && !sala?.jogadores.some((j) => j.id === eu.jogadorId && j.conectado)) {
    return (
      <div class="shell">
        <main class="card centro">
          <h1>Saiu da roda</h1>
          <p class="muted">{erro || 'A conexão com a sala foi encerrada.'}</p>
          <a class="btn btn-primary" href="#/">
            Voltar ao início
          </a>
        </main>
      </div>
    );
  }

  if (!sala) {
    return (
      <div class="shell">
        <main class="card centro">
          <img class="girando" src="/personagens/batata.svg" alt="" width={72} height={72} />
          <p>{erro || 'Chegando na roda…'}</p>
          {erro && (
            <a class="btn btn-ghost" href="#/">
              Voltar
            </a>
          )}
        </main>
      </div>
    );
  }

  const props = { sala, eu: eu.jogadorId, enviar, sair: sairDaSala };
  return (
    <div class={`shell fase-${sala.fase}`}>
      {status === 'reconectando' && (
        <div class="aviso-conexao" role="status">
          Reconectando…
        </div>
      )}
      {erro && (
        <div class="aviso-conexao erro" role="alert">
          {erro}
        </div>
      )}
      <main>
        {sala.fase === 'lobby' && <Lobby {...props} />}
        {(sala.fase === 'contagem' || sala.fase === 'jogando' || sala.fase === 'intervalo') && (
          <Partida {...props} recusa={recusa} digitando={digitando} tentativa={tentativa} />
        )}
        {sala.fase === 'fim' && <Fim {...props} />}
      </main>
    </div>
  );
}
