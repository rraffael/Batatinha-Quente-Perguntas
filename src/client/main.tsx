import { render } from 'preact';
import '../../design/tokens.css';
import './estilo.css';
import { App } from './App';
import { aplicarTema } from './identidade';

aplicarTema();
render(<App />, document.getElementById('app')!);
