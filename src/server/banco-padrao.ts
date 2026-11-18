import dados from './generated/banco.json';
import { criarBanco, type DadosBanco, type FonteBanco } from './banco';

export const BANCO: FonteBanco = criarBanco(dados as unknown as DadosBanco);
