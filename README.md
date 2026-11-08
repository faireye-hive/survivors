# ✧ Crônicas do Éter — Sobreviventes

RPG de sobrevivência para navegador, **100% Canvas 2D**. Enfrente hordas crescentes, colete cristais de experiência, evolua habilidades automáticas e resista durante oito minutos. Não usa Three.js, imagens externas, modelos 3D ou assets de personagens importados.

## Jogar

- **Guerreiro** — espada e resistência.
- **Arcanista** — magia guiada.
- **Andarilho** — adagas rápidas.
- WASD ou setas para se mover; joystick no celular. Os ataques são **automáticos**.
- Colete XP e escolha melhorias ao subir de nível. `Esc` ou `P` pausa o jogo.
- A partida dura oito minutos, com chefes aos 2:45 e 6:05.

## Conteúdo e encontros

- **Limo, Morcego, Esqueleto, Espectro e Guardião da Névoa** são inimigos existentes.
- **Esporão da Floresta** surge a partir de 1:00. Ele coloca círculos de esporos no chão: há um aviso visual antes de causarem dano, permitindo escapar.
- **Aranha da Ruína** surge depois de 1:50. Aproxima-se rapidamente em zigue-zague.
- **Florescimento Sombrio (1:15)**, **Teias das Ruínas (3:15)** e **Eclipse de Éter (5:20)** são três ondas especiais com avisos na tela.
- **Inimigos de elite** aparecem nessas ondas. Eles têm mais vida e garantem uma **Relíquia**, que restaura 15 PV e aumenta permanentemente o dano em 7% durante a partida. Os bônus acumulam.
- Os chefes originais e as demais ondas de inimigos continuam funcionando.
- O mapa infinito inclui santuário, prados, bosque, ruínas e regiões corrompidas.

## Arte e animações

Os três heróis utilizam ilustrações procedurais simples em um mesmo estilo Canvas 2D. Os monstros têm suas próprias silhuetas, sem membros humanos desnecessários. Esporão e Aranha são desenhados diretamente em `src/render/characters/WildCreatures.js`.

O jogo mantém as animações de caminhada aprovadas para quatro direções, além de idle, attack e hit. O antigo Rig Studio foi retirado para priorizar **conteúdo jogável**. O armazenamento local das poses não é apagado pela atualização; a representação das animações aprovadas permanece no código.

## Executar e validar

Requer Node.js 20+:

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Abra `http://localhost:3000`. O workflow do GitHub Pages publica a partir da branch `main`.

## Organização

- `src/engine/Game.js`: estado, controles e ciclo da partida.
- `src/systems/Enemies.js`: spawns, padrões de movimentação, esporos e ondas.
- `src/data/encounters.js`: calendário das ondas especiais.
- `src/systems/Combat.js`: armas automáticas, combate e drop de relíquias.
- `src/systems/Progression.js`: XP, coleta, cura e melhorias.
- `src/render/Renderer.js`: cenário, efeitos, personagens e avisos de onda.
- `src/render/Art.js` e `src/render/characters/`: arte procedural Canvas.
- `src/world/World.js`: terreno e biomas determinísticos.
- `src/ui/` e `src/hud.css`: HUD e minimapa.
- `src/data/Rig2D.js` e `src/data/WalkPoseData.js`: animações dos personagens.
- `tests/`: testes de jogabilidade, desenho e dados de animação.

Consulte `docs/ARCHITECTURE.md` para detalhes técnicos.

## Equilíbrio mais desafiador

A dificuldade avança em **quatro fases** ao longo dos oito minutos:
- **0:00 — Calmaria:** grupos de um inimigo, com criaturas mais rápidas que na versão anterior.
- **1:15 — Invasão:** grupos de dois inimigos, além dos encontros especiais já previstos.
- **3:30 — Cerco:** grupos de três, monstros mais resistentes e mais próximos do jogador.
- **6:00 — Caos:** grupos de quatro, surgimentos mais frequentes e pressão contínua.

A vida, velocidade e dano dos inimigos crescem gradualmente com o relógio.
Os chefes podem realizar uma **investida**, precedida por um círculo dourado
de aviso por 0,7 segundo: afaste-se da trajetória para desviar.

## Escolha visual de melhorias

As seis melhorias de atributo e as quatro armas agora têm **10 ícones SVG
exclusivos**, desenhados no código, sem dependência de bibliotecas de ícones.
A tela de evolução destaca o efeito com uma etiqueta curta e cor própria:
`+15% DANO`, `+25 VIDA MÁX.`, `+9% VELOCIDADE`, `+34 ALCANCE XP`,
`+2 ARMADURA`, `+40 PV AGORA` e ataques identificados pela silhueta.
No celular, a descrição longa fica oculta visualmente, mas permanece
acessível por leitor de tela.

Os valores das melhorias e das armas continuam os mesmos; a dificuldade
aumentou principalmente pela pressão crescente das hordas.
