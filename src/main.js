import { Game } from './engine/Game.js';
import { Interface } from './ui/Interface.js';

const canvas=document.getElementById('game');
let ui;
try{
  ui=new Interface();
  const game=new Game(canvas,ui);
  ui.connect(game);
  if(import.meta.env?.DEV)window.__ETER_DEV__={game,ui};
}catch(error){
  ui?.heroPreview?.destroy();
  console.error(error);
  const screen=document.createElement('section');screen.className='screen overlay-screen';
  screen.setAttribute('role','alert');
  const card=document.createElement('div');card.className='overlay-card panel';
  const title=document.createElement('h2');title.textContent='Não foi possível iniciar o 3D';
  const description=document.createElement('p');description.textContent='Ative a aceleração de hardware e abra o jogo em um navegador com suporte a WebGL2.';
  card.append(title,description);screen.append(card);document.getElementById('app').replaceChildren(screen);
}
