import { normalizar } from './normalizar';

// Filtro simples de palavrões/ofensas (PT-BR e PT-PT) para apelidos e prévia de digitação.
// Palavras curtas só batem como palavra inteira; radicais longos batem em qualquer posição.
const PALAVRAS_INTEIRAS = new Set([
  'cu', 'cus', 'pau', 'rola', 'pinto', 'xota', 'cona', 'puta', 'puto', 'putas', 'putos',
  'fdp', 'vsf', 'tnc', 'pqp', 'krl', 'crl', 'porra', 'merda', 'bosta', 'corno', 'cornos',
  'viado', 'veado', 'bicha', 'otario', 'otaria', 'babaca', 'piranha', 'vadia', 'vagabunda',
  'macaco', 'macaca', 'crioulo', 'crioula', 'nazi', 'nazista', 'hitler', 'retardado', 'retardada',
  'mongol', 'foda', 'fode', 'foder', 'fodase', 'pica', 'grelo', 'broxa', 'punheta', 'siririca',
]);

const RADICAIS = [
  'caralh', 'buceta', 'boceta', 'xoxota', 'arromb', 'cacete', 'estupr', 'pedofil', 'putaria',
  'filhodaputa', 'filhadaputa', 'vaitomar', 'tomarnocu', 'punhet', 'fudid', 'fodid',
  'escrot', 'boquete', 'vagabund', 'piroca',
];

export function temPalavrao(texto: string): boolean {
  const n = normalizar(texto);
  if (!n) return false;
  const palavras = n.split(' ');
  if (palavras.some((p) => PALAVRAS_INTEIRAS.has(p))) return true;
  const colado = palavras.join('');
  return RADICAIS.some((r) => colado.includes(r));
}
