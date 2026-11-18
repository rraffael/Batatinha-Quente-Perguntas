-- Quantas vezes cada resposta foi usada (define a raridade dinâmica).
CREATE TABLE IF NOT EXISTS uso_respostas (
  pergunta_id TEXT NOT NULL,
  resposta_id TEXT NOT NULL,
  usos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pergunta_id, resposta_id)
);

-- Tentativas recusadas (texto normalizado, sem identificar jogador) para descobrir variantes que faltam.
CREATE TABLE IF NOT EXISTS tentativas_recusadas (
  pergunta_id TEXT NOT NULL,
  texto TEXT NOT NULL,
  vezes INTEGER NOT NULL DEFAULT 0,
  ultima_em INTEGER NOT NULL,
  PRIMARY KEY (pergunta_id, texto)
);
