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

## Rig Studio 2D · personagens e animações

O ateliê `warrior-studio.html` agora é um editor de animação para as três classes e os cinco monstros. Todos usam o mesmo renderizador `src/render/characters/RigRenderer.js`, inclusive o Guerreiro: não há mais um estilo vetorial diferente só para ele.

Cada personagem possui um ID estável: `hero.guardian`, `hero.mage`, `hero.ranger`, `monster.slime`, `monster.bat`, `monster.skeleton`, `monster.wraith`, `monster.colossus`. Também é possível criar um ID próprio no editor clonando um personagem existente.

Clique numa articulação ou selecione uma peça para ajustar posição X/Y, rotação e escala; os olhos e a boca acompanham a cabeça, as mãos acompanham os braços e a arma acompanha a mão direita. Crie keyframes, defina duração e loop, reproduza a animação e exporte **JSON do personagem** ou **projeto completo**. Há importação com validação de esquema e salvamento automático em localStorage.

O formato de projeto é `{ "schema": "cronicas-do-eter/rig2d", "version": 1, "characters": [...] }`. Cada personagem tem `id`, `template`, `name`, `colors` e `clips`; cada clipe contém `id`, `duration`, `loop`, e `frames: [{ time, pose }] `. A pose mapeia IDs de peças (`head`, `eyeL`, `mouth`, `handR`, `footL`, `weapon`, etc.) para deslocamentos, ângulos e escala. Os dados importados são validados e os mesmos clipes são usados pelo jogo após recarregar a página no mesmo navegador e origem.

**Importante:** a aparência de um personagem novo usa um dos modelos visuais existentes. Para criar uma nova espécie com anatomia própria, será necessário acrescentar novas formas ao renderizador além dos keyframes.

### Rig Studio: anatomia por espécie e articulações conectadas

Os monstros não usam o esqueleto humano por padrão: o limo é uma única massa com rosto;
o morcego usa asas sem pernas; o espectro usa um manto flutuante sem pés; o esqueleto
usa ossos (sem sapatos); e o colosso possui membros rochosos, sem mãos ou pés humanos.
O editor só mostra os controles das peças existentes para cada espécie.

**Girar articulação** é a ferramenta padrão: selecione um pivô e arraste para girar,
ou use a alça amarela e o slider de rotação no inspetor. O pivô permanece preso,
seus filhos acompanham o giro e a malha não se desmonta. **Mover posição** permite
deslocar o tronco, a cabeça em poucos pixels e olhos/boca dentro do rosto;
as juntas de braços, mãos, pernas, pés e armas permanecem encaixadas.
Se um JSON antigo possuir deslocamentos exagerados em juntas conectadas,
esses valores são normalizados durante a importação/validação para evitar separações.
O formato `rig2d` continua na versão 1 e mantém os mesmos IDs de peças.
