# ✧ Crônicas do Éter — Sobreviventes

RPG de sobrevivência para navegador: hordas crescentes, combate automático, experiência, melhorias e vitória aos oito minutos. Classes disponíveis: Guerreiro, Arcanista e Andarilho.

## Renderização — somente Canvas 2D

O mundo, os personagens, os inimigos, projéteis, efeitos e partículas são desenhados em tempo real por JavaScript usando CanvasRenderingContext2D. A renderização do jogo usa uma única superfície Canvas; a interface e o minimapa usam HTML/CSS e Canvas 2D. Não existe dependência de Three.js, WebGL, modelos OBJ/GLB/FBX, spritesheets ou imagens externas.

O Guerreiro tem uma ilustração vetorial detalhada implementada em src/render/characters/Warrior.js; Arcanista e Andarilho e os inimigos são desenhados em src/render/Art.js. O jogo e o ateliê compartilham as mesmas funções de desenho.

## Executar

Requer Node.js 20+.

    npm install
    npm run dev

Abra http://localhost:3000. Para validar e gerar a publicação:

    npm test
    npm run build
    npm run preview

## Jogabilidade

- WASD ou setas: movimentar; ataques acontecem automaticamente.
- No celular, toque e arraste para usar o joystick virtual.
- Esc/P: pausar ou continuar.
- Colete cristais para ganhar XP e escolher melhorias.
- Sobreviva por oito minutos; há dois chefes.
- Os recordes ficam salvos no navegador via localStorage.
- O mapa procedural é determinístico e tem biomas diferentes.

## Ateliê de personagens 2D

Abra warrior-studio.html para visualizar as três classes com a mesma arte usada no jogo. Escolha frente/costas/lado, movimento, zoom e cenário; pause a animação ou exporte um PNG com transparência. O ateliê não precisa de modelos externos.

## Estrutura

- src/engine/Game.js — ciclo e regras de jogo.
- src/render/Renderer.js — composição das camadas em Canvas 2D.
- src/render/Art.js e src/render/characters/Warrior.js — arte procedural.
- src/world/World.js — cenários/biomas.
- src/systems/ — inimigos, combate e progressão.
- src/ui/ e src/hud.css — interface, minimapa e HUD.
- src/studio/WarriorStudio.js — ateliê Canvas 2D.
- tests/ — validações da simulação, HUD e motor gráfico.

O Vite produz um site estático. O workflow .github/workflows/pages.yml publica dist/ no GitHub Pages a partir da branch main.

Consulte docs/ARCHITECTURE.md para notas de desenvolvimento.
