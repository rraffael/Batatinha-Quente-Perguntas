import { useEffect, useRef, useState } from 'preact/hooks';
import type { MensagemChat, MsgCliente } from '../../shared/protocolo';
import { MAX_CHAT } from '../../shared/regras';
import { Avatar } from '../componentes';

/** Chat da sala: o mesmo no lobby, na partida e no fim. */
export function Chat({
  mensagens,
  eu,
  enviar,
}: {
  mensagens: MensagemChat[];
  eu: string;
  enviar: (msg: MsgCliente) => void;
}) {
  const [texto, setTexto] = useState('');
  const lista = useRef<HTMLOListElement>(null);

  // Rola para a mensagem mais nova.
  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens.length]);

  function aoEnviar(e: Event) {
    e.preventDefault();
    if (!texto.trim()) return;
    enviar({ t: 'chat', texto });
    setTexto('');
  }

  return (
    <div class="chat" aria-labelledby="h-chat">
      <h2 id="h-chat">Conversa</h2>
      <ol ref={lista} aria-live="polite">
        {mensagens.length === 0 && <li class="muted vazio">Ninguém falou nada ainda.</li>}
        {mensagens.map((m) => (
          <li key={m.id} class={m.jogadorId === eu ? 'minha' : ''}>
            <Avatar personagem={m.personagem} tamanho="sm" />
            <span>
              <strong>{m.apelido}:</strong> {m.texto}
            </span>
          </li>
        ))}
      </ol>
      <form onSubmit={aoEnviar} autoComplete="off">
        <label class="sr" for="chat-texto">
          Mensagem
        </label>
        <input
          id="chat-texto"
          class="input"
          value={texto}
          maxLength={MAX_CHAT}
          placeholder="Mandar mensagem…"
          enterKeyHint="send"
          onInput={(e) => setTexto(e.currentTarget.value)}
        />
        <button class="btn btn-secondary pequeno" disabled={!texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
