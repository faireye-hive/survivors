# Arquitetura — Crônicas do Éter

## Tecnologias

- JavaScript ES Modules e Vite para desenvolvimento e publicação.
- Canvas 2D para o mundo, personagens, efeitos e minimapa.
- HTML e CSS para a interface; Web Audio para sons sintetizados.
- Sem recursos externos de personagens ou bibliotecas de renderização 3D.

## Fluxo de um frame

Game.step(dt) atualiza movimento, combate, inimigos, progressão, efeitos e interface. Renderer.render(game) desenha um quadro com o contexto game.ctx (CanvasRenderingContext2D). A câmera acompanha o jogador. World.draw desenha o terreno; Renderer ordena inimigos e jogador por Y para uma sobreposição coerente; Art.js desenha projéteis, efeitos, partículas e textos de dano.

O ciclo usa requestAnimationFrame e limita delta time para evitar saltos longos ao retornar à aba. A resolução física respeita devicePixelRatio até 2.

## Personagens

- Art.drawPlayer é o ponto de entrada para todas as classes.
- Guerreiro: src/render/characters/Warrior.js, usando formas vetoriais, curvas, gradientes e poses frontais ou traseiras.
- Arcanista e Andarilho: src/render/Art.js, sem imagens nem texturas.
- A escala de exibição mantém os personagens compatíveis com os inimigos e com as colisões.
- O ateliê em warrior-studio.html reaproveita Art.drawPlayer, não duplica os desenhos e exporta em PNG transparente.

Para incluir novas classes, adicione suas informações em src/data/classes.js e implemente o desenho associado em src/render/characters/ ou Art.js. As funções devem sempre usar save/restore para não afetar o contexto do próximo ator.

## Limites e desempenho

Use culling por viewport (já aplicado aos inimigos e itens), mantenha o mesmo canvas de jogo, evite criação de caches gigantes por frame e adicione testes com node:test ao modificar sistemas. O ateliê possui canvas próprio apenas por ser uma página independente.

## Desenvolvimento

Execute npm test e npm run build antes de publicar. O workflow de CI roda em pull requests; o workflow Pages faz o deploy da main.
