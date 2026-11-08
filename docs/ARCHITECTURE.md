# Arquitetura — Crônicas do Éter

## Fundamentos

Frontend Vite + ES Modules, simulação JS, única renderização Canvas 2D e interface HTML/CSS. Sem 3D, sprites externos ou dependências gráficas pesadas. A página `index.html` é o único ponto de entrada do site.

## Gameplay

`Game.step(dt)` atualiza movimento, inimigos, efeitos, combate e experiência. `Enemies.js` inclui perseguição, movimento de flanco para aranhas, temporizadores do Esporão, dano de áreas com sinalização prévia e três eventos únicos por partida. `encounters.js` guarda o calendário em segundos; uma `Set` evita repetir eventos. O número de inimigos fica limitado a 170; perigos no chão a 24.

`Combat.js` calcula ataques automáticos, projéteis e morte de inimigos. Inimigos de elite soltam relíquias garantidas; `Progression.js` aplica +7% de dano e +15 PV (limitados a HP máximo). A progressão de nível continua oferecendo armas e melhorias existentes.

`Renderer.js` desenha o mapa, as áreas perigosas no chão, os drops, personagens, projéteis e avisos passageiros. A ordem garante que ameaças no chão fiquem atrás dos inimigos e o aviso de onda apareça acima do jogo, sem bloquear os controles.

## Arte dos personagens

Guerreiro, Arcanista e Andarilho compartilham o mesmo estilo ilustrado Canvas 2D via `src/render/characters/RigRenderer.js`, sem um editor. O personagem é desenhado a partir dos atributos de aparência e poses do código. O renderizador evita adicionar braços ou pés humanoides em monstros que não os possuem.

`WildCreatures.js` implementa o Esporão e a Aranha com formas procedurais: chapéu/haste para fungos e oito patas para aranhas. `Art.js` seleciona entre os desenhos específicos e o renderizador compartilhado, sem fallback para o slime no caso desses dois monstros.

`Rig2D.js` conserva o formato `cronicas-do-eter/rig2d` versão 1 e os padrões do jogo. As 100 poses de caminhada aprovadas do arquivo do usuário são geradas por `WalkPoseData.js` para as quatro direções. `WalkGuide.js` resolve a direção pelo movimento e seleciona a animação apropriada.

Os dados previamente gravados em `cronicas.2d.rigs.v1` continuam legíveis para não perder alterações já feitas pelo usuário. O Rig Studio foi descontinuado e seus arquivos exclusivos retirados: desenvolvimento a partir de agora é focado no jogo.

## Mundo e apresentação

`World.js` constrói terrenos determinísticos com biomas e objetos desenhados em Canvas. `HudData.js` fornece ao HUD pontos reais de vida, arma, XP e posições do minimapa. Elites e relíquias têm identificação visual distinta. Efeitos e banners são temporários; não interrompem a partida.

## Validação

`npm test` executa verificações do gameplay, encontros, renderização 2D, upgrades, movimento, anatomia dos personagens e dados de caminhada. `npm run build` gera o site estático em `dist/`. O workflow do GitHub publica esse artefato no GitHub Pages.
