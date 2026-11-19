// Sons sintetizados na hora com a Web Audio API: sem arquivos, sem licença, sem peso.

let contexto: AudioContext | null = null;
let mudo = lerMudo();

function lerMudo(): boolean {
  try {
    return localStorage.getItem('bq.mudo') === '1';
  } catch {
    return false;
  }
}

export function estaMudo(): boolean {
  return mudo;
}

export function alternarMudo(): boolean {
  mudo = !mudo;
  try {
    localStorage.setItem('bq.mudo', mudo ? '1' : '0');
  } catch {}
  return mudo;
}

function audio(): AudioContext | null {
  if (mudo) return null;
  if (!contexto) {
    try {
      contexto = new AudioContext();
    } catch {
      return null;
    }
  }
  if (contexto.state === 'suspended') contexto.resume().catch(() => {});
  return contexto;
}

// Navegadores só liberam áudio depois de um clique/tecla do usuário.
if (typeof window !== 'undefined') {
  const destravar = () => audio();
  window.addEventListener('pointerdown', destravar, { once: true });
  window.addEventListener('keydown', destravar, { once: true });
}

interface OpcoesTom {
  tipo?: OscillatorType;
  volume?: number;
  ate?: number;
}

function tom(freq: number, inicio: number, duracao: number, { tipo = 'sine', volume = 0.12, ate }: OpcoesTom = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + inicio;
  const osc = a.createOscillator();
  const ganho = a.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (ate) osc.frequency.exponentialRampToValueAtTime(ate, t0 + duracao);
  ganho.gain.setValueAtTime(0.0001, t0);
  ganho.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
  osc.connect(ganho).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duracao + 0.05);
}

interface OpcoesRuido {
  volume: number;
  filtro: BiquadFilterType;
  de: number;
  ate: number;
}

function ruido(inicio: number, duracao: number, { volume, filtro, de, ate }: OpcoesRuido) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + inicio;
  const buffer = a.createBuffer(1, Math.ceil(a.sampleRate * duracao), a.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = a.createBufferSource();
  fonte.buffer = buffer;
  const f = a.createBiquadFilter();
  f.type = filtro;
  f.frequency.setValueAtTime(de, t0);
  f.frequency.exponentialRampToValueAtTime(ate, t0 + duracao);
  const ganho = a.createGain();
  ganho.gain.setValueAtTime(volume, t0);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);
  fonte.connect(f).connect(ganho).connect(a.destination);
  fonte.start(t0);
}

export const sons = {
  /** Resposta aceita. */
  acerto() {
    tom(660, 0, 0.12, { tipo: 'triangle', volume: 0.14 });
    tom(990, 0.08, 0.2, { tipo: 'triangle', volume: 0.14 });
  },
  /** Resposta recusada (errada, repetida ou ambígua). */
  erro() {
    tom(220, 0, 0.22, { tipo: 'square', volume: 0.06, ate: 130 });
  },
  /** Pergunta nova na roda. */
  novaPergunta() {
    [523, 659, 784].forEach((f, i) => tom(f, i * 0.08, 0.22, { volume: 0.1 }));
  },
  /** Batata passando de mão em mão. */
  passe() {
    ruido(0, 0.16, { volume: 0.1, filtro: 'bandpass', de: 700, ate: 2600 });
  },
  /** A batata chegou em você. */
  suaVez() {
    tom(880, 0, 0.1, { volume: 0.12 });
    tom(1175, 0.1, 0.16, { volume: 0.12 });
  },
  /** Tique-taque do pavio acabando (forte = em brasa). */
  tique(forte: boolean) {
    tom(forte ? 1500 : 1050, 0, 0.05, { tipo: 'square', volume: forte ? 0.06 : 0.035 });
    if (forte) ruido(0, 0.12, { volume: 0.04, filtro: 'highpass', de: 5000, ate: 7000 });
  },
  /** POF! */
  estouro() {
    ruido(0, 0.7, { volume: 0.55, filtro: 'lowpass', de: 3200, ate: 90 });
    tom(140, 0, 0.45, { volume: 0.4, ate: 40 });
  },
  inicio() {
    [392, 523, 659, 784].forEach((f, i) => tom(f, i * 0.12, 0.26, { tipo: 'triangle', volume: 0.12 }));
  },
  fim() {
    [784, 659, 784, 1047].forEach((f, i) => tom(f, i * 0.16, i === 3 ? 0.6 : 0.3, { tipo: 'triangle', volume: 0.13 }));
  },
  entrou() {
    tom(523, 0, 0.1, { volume: 0.1 });
    tom(784, 0.08, 0.16, { volume: 0.1 });
  },
  saiu() {
    tom(659, 0, 0.1, { volume: 0.1 });
    tom(440, 0.08, 0.18, { volume: 0.1 });
  },
};
