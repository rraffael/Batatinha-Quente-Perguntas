import { useEffect, useState } from 'preact/hooks';
import { EspacoAnuncio } from './componentes';
import { aplicarTema, temaAtual, type Tema } from './identidade';
import { Inicio } from './telas/Inicio';
import { PaginaCreditos, PaginaPrivacidade, PaginaSobre, PaginaTermos } from './telas/Paginas';
import { TelaSala } from './telas/Sala';

const rotaAtual = () => location.hash.replace(/^#\/?/, '');

export function App() {
  const [rota, setRota] = useState(rotaAtual());

  useEffect(() => {
    const aoMudar = () => {
      setRota(rotaAtual());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  const sala = rota.match(/^sala\/([A-Za-z]{4})$/);
  if (sala) {
    const codigo = sala[1].toUpperCase();
    return <TelaSala key={codigo} codigo={codigo} />;
  }

  let conteudo;
  switch (rota) {
    case 'sobre':
      conteudo = <PaginaSobre />;
      break;
    case 'privacidade':
      conteudo = <PaginaPrivacidade />;
      break;
    case 'termos':
      conteudo = <PaginaTermos />;
      break;
    case 'creditos':
      conteudo = <PaginaCreditos />;
      break;
    default:
      conteudo = <Inicio />;
  }

  return (
    <div class="shell">
      <main>{conteudo}</main>
      <EspacoAnuncio />
      <Rodape />
    </div>
  );
}

function Rodape() {
  const [tema, setTema] = useState<Tema>(temaAtual());
  const proximo: Record<Tema, Tema> = { sistema: 'escuro', escuro: 'claro', claro: 'sistema' };
  const rotulo: Record<Tema, string> = { sistema: 'Tema: automático', escuro: 'Tema: noite', claro: 'Tema: dia' };
  return (
    <footer class="rodape">
      <nav>
        <a href="#/sobre">Como jogar</a>
        <a href="#/privacidade">Privacidade</a>
        <a href="#/termos">Termos</a>
        <a href="#/creditos">Créditos</a>
        <button
          type="button"
          class="link"
          onClick={() => {
            const t = proximo[tema];
            aplicarTema(t);
            setTema(t);
          }}
        >
          {rotulo[tema]}
        </button>
      </nav>
      <p class="muted">Marcas e nomes citados nas respostas pertencem aos seus titulares; uso apenas informativo, sem afiliação.</p>
    </footer>
  );
}
