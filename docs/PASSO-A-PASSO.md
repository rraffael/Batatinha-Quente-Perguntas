# Batatá Quentá — Passo a passo do Raffael

> **Próximo passo agora:** Fase 2, passo 2.1 — rodar `npm install` na pasta do projeto e me avisar.

| Fase | O quê | Status |
|---|---|---|
| 0 | Preparar a máquina | ✅ (Node 24.19.0) |
| 1 | Conta Cloudflare + Worker ligado ao GitHub | ✅ |
| 2 | Instalar e testar local | ⬜ **agora** |
| 3 | Enviar ao GitHub → deploy automático | ⬜ |
| 4 | Subdomínio `batata.tiffion.com` (AWS) | ⬜ depois da Fase 3 |
| 5 | Estatísticas de raridade (D1) | ⬜ opcional |
| 6 | Discord Activity | futuro |
| 7 | Anúncios | NÃO fazer agora |

Legenda: ✅ feito · ⬜ pendente.

---

## Fase 2 — Instalar e testar local (agora)

*No PowerShell, dentro da pasta do projeto.*

- [ ] **2.1 Instalar as dependências.**
  ```powershell
  cd "D:\Projeto Pessoal\Batatinha-Quente-Perguntas"
  npm install
  ```
  ✔ Termina sem `ERR!`. **Me avise** — eu rodo os testes, o typecheck e o build.
- [ ] **2.2 Subir o jogo local e testar** (depois que eu disser que passou nas validações).
  ```powershell
  npm run dev
  ```
  ✔ Abra a URL mostrada (ex.: `http://localhost:5173`) em **2 abas** (uma anônima), crie uma sala numa e entre pela outra.
- [ ] **2.3 Parar e conferir a porta livre.** `Ctrl+C` no terminal, depois:
  ```powershell
  Get-NetTCPConnection -LocalPort 5173 -State Listen
  ```
  ✔ Deu certo se der erro/nada. Se aparecer algo: `Stop-Process -Id <OwningProcess>`.

## Fase 3 — Enviar ao GitHub (deploy automático)

*O Worker `batatinha-quente-perguntas` no painel já está ligado ao repo: cada push publica sozinho.*

- [ ] **3.1 Ajustar o build no painel.** Onde: https://dash.cloudflare.com/ → **Workers & Pages** → `batatinha-quente-perguntas` → **Settings** → **Build** → **Build configuration**:
  - Build command: `npm run build`
  - Deploy command: `npx wrangler deploy`
  ✔ Salvo.
- [ ] **3.2 Conferir se o repo local aponta para o GitHub.**
  ```powershell
  git remote -v
  ```
  ✔ Mostra `origin https://github.com/...`. Se não mostrar nada: `git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git`
- [ ] **3.3 Primeiro commit e push.**
  ```powershell
  git add -A
  git commit -m "Primeira versão do Batatá Quentá"
  git branch -M main
  git push -u origin main
  ```
  ✔ No painel da Cloudflare aparece um build novo rodando e termina com **Success**.
  *Se aparecer de novo "Fetching repository failed": GitHub → Settings → Applications → Cloudflare Workers and Pages → Configure → dar acesso a esse repo.*
- [ ] **3.4 Testar pela URL pública.** O painel mostra `https://batatinha-quente-perguntas.<sua-conta>.workers.dev`. Teste com celular + PC.
  ✔ Cria sala e joga normalmente. Mande o link aos amigos 🎉
- Para salvar e publicar de novo depois: `git add -A; git commit -m "o que mudou"; git push`

## Fase 4 — Subdomínio `batata.tiffion.com` (depois da Fase 3 funcionando)

> ⚠️ **NÃO crie zona hospedada nova** no Route 53 (custa US$ 0,50/mês). Use a zona que já existe de `tiffion.com`.

- [ ] **4.1 Certificado (ACM) — região us-east-1.** Onde: https://us-east-1.console.aws.amazon.com/acm/home?region=us-east-1 → **Request** → *public certificate* → nome `batata.tiffion.com` → **DNS validation** → **Request** → abra o certificado → **Create records in Route 53** → **Create records**.
  ✔ Em alguns minutos o status fica **Issued**.
- [ ] **4.2 Distribuição CloudFront.** Onde: https://console.aws.amazon.com/cloudfront/v4/home → **Create distribution**:
  - Plano de preço: **Free (flat-rate)**
  - Origin domain: `batatinha-quente-perguntas.<sua-conta>.workers.dev` · Protocol: **HTTPS only**
  - Viewer protocol policy: **Redirect HTTP to HTTPS**
  - Allowed HTTP methods: **todos** (GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE)
  - Cache policy: **CachingDisabled**
  - Origin request policy: **AllViewerExceptHostHeader**
  - Alternate domain name: `batata.tiffion.com` · Certificado: o do passo 4.1
  ✔ Status **Enabled** e aparece um domínio `dxxxx.cloudfront.net`.
- [ ] **4.3 DNS no Route 53.** Onde: https://console.aws.amazon.com/route53/v2/hostedzones → zona `tiffion.com` → **Create record** → nome `batata` → tipo **A** → **Alias** → *CloudFront distribution* → a distribuição → **Create**. Repita com tipo **AAAA**.
  ✔ Os 2 registros aparecem na zona.
- [ ] **4.4 Testar** `https://batata.tiffion.com` com 2 abas.
  ✔ Funciona igual ao workers.dev. *Se a sala não conectar, me avise; plano B é usar o endereço workers.dev.*

## Fase 5 — Estatísticas de raridade (opcional)

*Sem isso o jogo funciona com as raridades do banco. Com isso, a raridade passa a seguir o que a turma realmente responde.*

- [ ] **5.1** `npx wrangler login` → **Allow** no navegador.
- [ ] **5.2** `npx wrangler d1 create batatinha-stats` → **me mande o `database_id`** (eu ativo no `wrangler.jsonc`).
- [ ] **5.3** Depois que eu ativar: `npx wrangler d1 migrations apply batatinha-stats --remote` e faça push.

## Fase 6 — Discord Activity (futuro)

- [ ] https://discord.com/developers/applications → **New Application** → **Activities** → URL Mapping `/` → `batatinha-quente-perguntas.<sua-conta>.workers.dev`. Eu preparo o código quando chegar a hora.

## Fase 7 — Anúncios (NÃO fazer agora)

*Só com público real. Antes disso é burocracia sem retorno.*

- [ ] (futuro) Abrir atividade nas Finanças (Categoria B; CAE sugerido **63120**) e registro no **VIES**.
- [ ] (futuro) Consultar um **contabilista certificado**.
- [ ] (futuro) AdSense com dados PT, **IBAN** português e **W-8BEN** com NIF.
- [ ] (futuro) Ligar a **mensagem de privacidade** do AdSense e usar **anúncios não personalizados**.

## Pendências paralelas

- [ ] Se ainda não fez a **Declaração de Saída Definitiva do País** (Receita Federal), regularizar com um contador brasileiro.

---

## Decisões já tomadas

- Nome: **Batatá Quentá** · Endereço: **batata.tiffion.com** · busca INPI/EUIPO sem conflito.
- 250 pontos = +1 vida (máx. 5), acumulando entre perguntas. Errar tira 1 s do pavio; pavio em zero = estouro = perde vida.
- Respostas esgotadas: pergunta troca e o pavio reinicia, sem perder vida.

## Decisões pendentes suas

1. **Protótipo visual** — `start design\prototipo.html` → "aprovado" ou lista de ajustes.
