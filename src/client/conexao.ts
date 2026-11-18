import { PING, PONG, type MsgCliente, type MsgServidor } from '../shared/protocolo';

export type StatusConexao = 'conectando' | 'conectado' | 'reconectando' | 'encerrado';

interface Opcoes {
  codigo: string;
  aoAbrir: () => MsgCliente;
  aoMensagem: (msg: MsgServidor) => void;
  aoStatus: (status: StatusConexao, detalhe?: string) => void;
}

/** WebSocket com reconexão automática (celular em segundo plano, rede instável). */
export class Conexao {
  private ws: WebSocket | null = null;
  private tentativas = 0;
  private encerrada = false;
  private timerPing: ReturnType<typeof setInterval> | undefined;
  private timerReconexao: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly opcoes: Opcoes) {
    this.conectar();
    document.addEventListener('visibilitychange', this.aoVisibilidade);
  }

  enviar(msg: MsgCliente): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  encerrar(): void {
    this.encerrada = true;
    clearInterval(this.timerPing);
    clearTimeout(this.timerReconexao);
    document.removeEventListener('visibilitychange', this.aoVisibilidade);
    this.ws?.close(1000, 'saiu');
    this.opcoes.aoStatus('encerrado');
  }

  private conectar(): void {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocolo}://${location.host}/ws/${this.opcoes.codigo}`);
    this.ws = ws;
    this.opcoes.aoStatus(this.tentativas === 0 ? 'conectando' : 'reconectando');

    ws.onopen = () => {
      this.tentativas = 0;
      this.opcoes.aoStatus('conectado');
      ws.send(JSON.stringify(this.opcoes.aoAbrir()));
      clearInterval(this.timerPing);
      this.timerPing = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(PING), 25_000);
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string' || e.data === PONG) return;
      try {
        this.opcoes.aoMensagem(JSON.parse(e.data) as MsgServidor);
      } catch {}
    };
    ws.onclose = (e) => {
      clearInterval(this.timerPing);
      if (this.ws !== ws) return;
      // 4000+ = o servidor recusou (sala cheia, removido, substituído por outra aba): não insiste.
      if (this.encerrada || e.code >= 4000) {
        this.encerrada = true;
        this.opcoes.aoStatus('encerrado', e.reason);
        return;
      }
      this.agendarReconexao();
    };
  }

  private agendarReconexao(): void {
    clearTimeout(this.timerReconexao);
    const espera = Math.min(8_000, 400 * 2 ** this.tentativas);
    this.tentativas += 1;
    this.opcoes.aoStatus('reconectando');
    this.timerReconexao = setTimeout(() => this.conectar(), espera);
  }

  private aoVisibilidade = (): void => {
    // Ao voltar para a aba (celular), reconecta na hora se a conexão caiu.
    if (document.visibilityState === 'visible' && !this.encerrada && this.ws?.readyState !== WebSocket.OPEN) {
      this.tentativas = 0;
      clearTimeout(this.timerReconexao);
      this.conectar();
    }
  };
}
