import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { PONTOS_MULTI, PONTOS_POR_VIDA, RARIDADES, VIDAS_MAX } from '../../shared/regras';
import { Avatar, Selo } from '../componentes';
import { EMAIL_CONTATO, NOME_JOGO } from '../config';
import { apagarDados } from '../identidade';
import { PERSONAGENS_INFO } from '../personagens';

const ATUALIZADO_EM = '18/11/2026';

function Pagina({ titulo, children }: { titulo: string; children: ComponentChildren }) {
  return (
    <article class="card pagina-texto">
      <p>
        <a href="#/">← Voltar</a>
      </p>
      <h1>{titulo}</h1>
      {children}
    </article>
  );
}

function Contato() {
  return EMAIL_CONTATO ? <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a> : <em>(e-mail de contato a definir)</em>;
}

export function PaginaSobre() {
  return (
    <Pagina titulo="Como jogar">
      <ol>
        <li>Crie uma sala e mande o código (ou o link) para a turma. Precisa de pelo menos 2 pessoas.</li>
        <li>Cada rodada tem uma pergunta, como "Cite um país da Europa". Na sua vez, digite uma resposta e aperte Enter.</li>
        <li>Resposta certa e que ninguém disse ainda: a batata passa para o próximo da roda.</li>
        <li>
          O pavio é secreto e dura entre 10 e 30 segundos. Ele não reinicia a cada passe: se a batata chegar a você
          com o pavio quase no fim, ele volta para 8 segundos.
        </li>
        <li>Errou ou repetiu? Perde 1 segundo do pavio. Se o tempo zerar, a batata estoura.</li>
        <li>Estourou na sua mão: você perde uma vida, e a próxima rodada começa com você. Quem ficar por último vence.</li>
        <li>Se todas as respostas de uma pergunta forem ditas, a pergunta troca, o pavio reinicia e ninguém perde vida.</li>
        <li>Não precisa escrever tudo certinho: acento não importa, e digitar uns 80% da palavra já completa sozinho.</li>
      </ol>
      <h2>Raridade e vidas extras</h2>
      <p>
        Respostas mais difíceis de lembrar valem mais. A cada {PONTOS_POR_VIDA} pontos você ganha uma vida (máximo de{' '}
        {VIDAS_MAX}).
      </p>
      <ul class="lista-raridades">
        {RARIDADES.map((r) => (
          <li key={r}>
            <Selo raridade={r} /> +{PONTOS_MULTI[r]} pontos
          </li>
        ))}
      </ul>
      <h2>A turma da roda</h2>
      <p>Os personagens vêm do folclore brasileiro. A arte é original deste jogo.</p>
      <ul class="lista-personagens">
        {PERSONAGENS_INFO.map((p) => (
          <li key={p.id}>
            <Avatar personagem={p.id} tamanho="sm" />
            <div>
              <strong>{p.nome}</strong>
              <p class="muted">{p.origem}</p>
            </div>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}

export function PaginaPrivacidade() {
  const [apagado, setApagado] = useState(false);
  return (
    <Pagina titulo="Privacidade">
      <p class="muted">Versão de {ATUALIZADO_EM}. Vale para o RGPD/GDPR (União Europeia) e a LGPD (Brasil).</p>
      <h2>Resumo</h2>
      <p>
        Você joga sem conta, sem e-mail e sem nome verdadeiro. O jogo não usa cookies próprios, não tem analytics e,
        hoje, não exibe anúncios.
      </p>
      <h2>Quem é o responsável</h2>
      <p>
        O {NOME_JOGO} é um projeto pessoal mantido por uma pessoa singular residente em Portugal, que é a responsável
        pelo tratamento dos dados. Contato: <Contato />.
      </p>
      <h2>O que é tratado e por quê</h2>
      <ul>
        <li>
          <strong>Identificador aleatório e preferências</strong> (apelido, personagem, tema), guardados no armazenamento
          local do seu navegador. Servem para você voltar à sala se a conexão cair. São estritamente necessários ao
          jogo, por isso não pedem consentimento (Lei 41/2004 e Diretiva ePrivacy). Base legal: execução do serviço
          (RGPD art. 6.º, n.º 1, b; LGPD art. 7.º, V).
        </li>
        <li>
          <strong>Apelido e respostas digitadas</strong> durante a partida, mostrados aos outros jogadores da sala. Os
          dados da sala são apagados cerca de uma hora depois que todos saem.
        </li>
        <li>
          <strong>Estatísticas anônimas</strong>: contamos quantas vezes cada resposta foi usada (para calcular a
          raridade) e guardamos tentativas não reconhecidas apenas como texto, sem ligação a nenhum jogador, para
          melhorar o banco de perguntas.
        </li>
        <li>
          <strong>Endereço IP e dados técnicos</strong>, processados pelo provedor de hospedagem para entregar o site e
          protegê-lo contra abusos, com registros de curta duração. Base legal: interesse legítimo em segurança (RGPD
          art. 6.º, n.º 1, f; LGPD art. 7.º, IX).
        </li>
      </ul>
      <h2>Quem processa os dados</h2>
      <p>
        Cloudflare (hospedagem e salas) e Amazon Web Services (domínio). Podem tratar dados fora do Espaço Económico
        Europeu e do Brasil, com as garantias contratuais desses provedores (cláusulas contratuais-tipo e EU-US Data
        Privacy Framework). Não vendemos nem compartilhamos dados para publicidade.
      </p>
      <h2>Crianças e adolescentes</h2>
      <p>
        O jogo não tem chat livre, perfis públicos nem compras. É recomendado a partir de 13 anos; abaixo disso, jogue
        com o conhecimento de um responsável. Se acreditar que uma criança nos forneceu dados pessoais, fale conosco
        para apagarmos.
      </p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção, apagamento e portabilidade, ou se opor a um tratamento, pelo contato acima.
        Também pode reclamar à CNPD (Portugal, cnpd.pt) ou à ANPD (Brasil, gov.br/anpd).
      </p>
      <p>
        <button
          class="btn btn-ghost"
          onClick={() => {
            apagarDados();
            setApagado(true);
          }}
        >
          Apagar meus dados deste navegador
        </button>
        {apagado && <span class="muted"> Pronto, apagado.</span>}
      </p>
      <h2>Mudanças</h2>
      <p>
        Se esta política mudar (por exemplo, se um dia houver anúncios), a nova versão aparece aqui com nova data e, se
        necessário, pediremos seu consentimento antes.
      </p>
    </Pagina>
  );
}

export function PaginaTermos() {
  return (
    <Pagina titulo="Termos de uso">
      <p class="muted">Versão de {ATUALIZADO_EM}.</p>
      <ol>
        <li>O {NOME_JOGO} é gratuito, para diversão, e é oferecido "como está", sem garantia de disponibilidade.</li>
        <li>Recomendado a partir de 13 anos. Menores devem usar com o conhecimento dos responsáveis.</li>
        <li>
          Seja gente boa: nada de apelidos ofensivos, discriminatórios ou com dados pessoais, nem uso de robôs ou
          trapaças. O anfitrião pode remover jogadores da sala, e apelidos impróprios são trocados automaticamente.
        </li>
        <li>
          As respostas do jogo são de caráter recreativo e podem ter erros ou omissões. Achou uma resposta que faltou ou
          que não deveria valer? Avise pelo contato: <Contato />.
        </li>
        <li>
          Nome, código, arte e banco de perguntas pertencem ao autor do jogo. Marcas, personagens e nomes de pessoas
          citados como respostas pertencem aos seus titulares e aparecem só como informação, sem afiliação.
        </li>
        <li>
          Respostas que você digita podem ser contadas de forma agregada e anônima para calcular a raridade e melhorar o
          banco de perguntas.
        </li>
        <li>Estes termos podem mudar; a versão em vigor fica sempre nesta página.</li>
      </ol>
    </Pagina>
  );
}

export function PaginaCreditos() {
  return (
    <Pagina titulo="Créditos">
      <ul>
        <li>
          <strong>Ideia e jogo:</strong> inspirado na brincadeira de roda "batata quente" e em jogos de palavras
          online. Regras, textos, código e arte próprios.
        </li>
        <li>
          <strong>Banco de perguntas:</strong> listas montadas pelo projeto a partir de fatos de conhecimento público,
          conferidos em fontes como a Wikipédia e listas oficiais. Os textos das perguntas são próprios; a fonte de
          cada pergunta fica registrada no repositório do projeto.
        </li>
        <li>
          <strong>Personagens:</strong> arte original inspirada no folclore brasileiro, sem relação com adaptações de
          TV, quadrinhos ou séries. Referência de pesquisa: Luís da Câmara Cascudo, <em>Dicionário do Folclore
          Brasileiro</em>.
        </li>
        <li>
          <strong>Fontes:</strong> Baloo 2 (Ek Type) e Nunito (Vernon Adams), sob a SIL Open Font License 1.1.
        </li>
        <li>
          <strong>Tecnologia:</strong> Preact, Vite e Cloudflare Workers.
        </li>
      </ul>
    </Pagina>
  );
}
