# ✧ Crônicas do Éter — Fronteiras

RPG de sobrevivência e exploração para navegador, **3D em WebGL com Three.js**. Explore biomas, enfrente criaturas, reúna madeira e pedra, construa fortalezas automatizadas e expanda a fronteira. A ameaça aumenta com o tempo e o nível, mas a expedição não termina por um cronômetro fixo. O mundo, os personagens e os edifícios usam modelos 3D procedurais, iluminação e sombras reais. Requer navegador com WebGL2 e aceleração gráfica.

## Jogar

- **Guerreiro** — espada e resistência.
- **Arcanista** — magia guiada.
- **Andarilho** — adagas rápidas.
- WASD ou setas para se mover; joystick no celular. Os ataques são **automáticos**.
- Colete XP e escolha melhorias ao subir de nível. `Esc` ou `P` pausa o jogo.
- As expedições não têm duração fixa; minibosses aparecem nos níveis 5, 15, 25… e chefes principais nos níveis 10, 20, 30…
- Colete recursos em exploração, construa e melhore edifícios e contrate trabalhadores para automatizar produção e defesa.
- Prepare um canteiro com `E`, fique na área para entregar madeira e pedra e veja fundação, paredes e cobertura aparecerem em etapas; trabalhadores contratados também carregam o estoque até obras ativas.
- Lenhadores e mineradores continuam produzindo por até 24 horas offline. Construções e incursões só avançam enquanto o jogo está aberto.
- A área interna de cada base bloqueia monstros, investidas, projéteis inimigos e esporos. A entrada continua livre para o herói.
- Torres e sentinelas enfrentam incursões; muralhas reduzem danos. Repare uma fortaleza violada no núcleo da base.

## Conteúdo e encontros

- **Limo, Morcego, Esqueleto, Espectro e Guardião da Névoa** são inimigos existentes.
- **Esporão da Floresta** surge a partir de 1:00. Ele coloca círculos de esporos no chão: há um aviso visual antes de causarem dano, permitindo escapar.
- **Aranha da Ruína** surge depois de 1:50. Aproxima-se rapidamente em zigue-zague.
- **Florescimento Sombrio (1:15)**, **Teias das Ruínas (3:15)** e **Eclipse de Éter (5:20)** são três ondas especiais com avisos na tela.
- **Inimigos de elite** aparecem nessas ondas. Eles têm mais vida e garantem uma **Relíquia**, que restaura 15 PV e aumenta permanentemente o dano em 7% durante a partida. Os bônus acumulam.
- Os eventos de horda por tempo continuam; os chefes principais agora são acionados por **níveis**, não por minutos.
- O mapa infinito inclui santuário, prados, bosque, ruínas e regiões corrompidas.

## Arte e animações

Um único personagem humanoide articulado assume três formas: Guerreiro, Arcanista e Andarilho. Corpo, pivôs e animações são compartilhados; equipamento, traje e habilidades definem a forma escolhida. O menu exibe uma prévia 3D animada e o retrato da HUD usa a mesma aparência.

Cada espécie de monstro tem modelo próprio. Árvores, pedras, cristais, fortalezas, canteiros, trabalhadores, portais, drops, projéteis e perigos são renderizados no mesmo espaço 3D. As bases combinam muralhas modulares com ameias, portão em arco aberto, torres octogonais, abrigo, depósito e oficina com telhados modelados por geometria procedural. A câmera em perspectiva acompanha o herói; a roda do mouse ajusta a distância. Superfícies rígidas são agrupadas por articulação e o terreno usa instâncias para reduzir o custo das hordas.

Os dados antigos de poses 2D permanecem preservados como referência; a partida usa as animações do modelo 3D. Ouro, campanha e melhorias continuam nos mesmos saves locais.

## Executar e validar

Requer Node.js 20+:

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Abra `http://localhost:3000`. Para validar sem alterar o progresso salvo, use `http://localhost:3000/tests/fixtures/3d-preview.html` durante o desenvolvimento. O workflow do GitHub Pages publica a partir da branch `main`.

## Organização

- `src/engine/Game.js`: estado, controles e ciclo da partida.
- `src/systems/Enemies.js`: spawns, padrões de movimentação, esporos e ondas.
- `src/data/encounters.js`: calendário das ondas especiais.
- `src/systems/Combat.js`: armas automáticas, combate e drop de relíquias.
- `src/systems/Progression.js`: XP, coleta, cura e melhorias.
- `src/render/three/Renderer3D.js`: câmera, luzes, sombras, sincronização do mundo e efeitos.
- `src/render/three/Models.js`: personagem base, equipamentos, monstros e animações.
- `src/render/three/Environment.js`: terreno instanciado, fortalezas, recursos e portais.
- `src/render/three/HeroPreview.js`: prévia do personagem e retrato da HUD.
- `src/world/World.js`: terreno e biomas determinísticos.
- `src/ui/` e `src/hud.css`: HUD e minimapa.
- `src/data/Rig2D.js` e `src/data/WalkPoseData.js`: referências antigas de animação preservadas.
- `tests/`: testes de jogabilidade, desenho e dados de animação.

Consulte `docs/ARCHITECTURE.md` para detalhes técnicos.

## Equilíbrio mais desafiador

A ameaça da exploração avança em **quatro fases** conforme o tempo da expedição:
- **0:00 — Calmaria:** grupos de um inimigo, com criaturas mais rápidas que na versão anterior.
- **1:15 — Invasão:** grupos de dois inimigos, além dos encontros especiais já previstos.
- **3:30 — Cerco:** grupos de três, monstros mais resistentes e mais próximos do jogador.
- **6:00 — Caos:** grupos de quatro, surgimentos mais frequentes e pressão contínua.

A velocidade e o dano dos inimigos crescem gradualmente com o relógio. A **vida dos monstros comuns** depende apenas do nível do herói, com ganho acumulativo de 5% por nível.
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

## Ouro e progresso entre partidas (roguelite)

A cada expedição encerrada, o jogador recebe **ouro virtual** calculado
principalmente pelo **nível alcançado**, além de inimigos derrotados e
tempo explorado. Toda expedição rende algum ouro. A estimativa aparece no
HUD; a quantia recebida e o saldo aparecem na tela de resultado.

Abra **Melhorias permanentes · Loja** no menu ou **Gastar ouro · Ficar
mais forte** após uma partida. Existem seis trilhas permanentes, com
preços progressivos e níveis máximos:

| Melhoria | Bônus por nível | Limite |
|---|---|---|
| Vigor eterno | +15 PV máximos iniciais | 8 |
| Poder ancestral | +6% dano inicial | 8 |
| Armadura rúnica | +1 armadura inicial | 5 |
| Botas do vento | +4% velocidade inicial | 8 |
| Atração de Éter | +20 alcance de coleta | 6 |
| Sabedoria acumulada | +9% XP recebido | 8 |

Os atributos comprados só se aplicam **ao começar a próxima partida**.
As melhorias temporárias por XP continuam independentes e podem
ser escolhidas normalmente durante o jogo.

O ouro, níveis comprados, recordes e melhor nível são armazenados no
`localStorage` do navegador usando o perfil `cronicas_eter_profile_v1`.
Dados de recordes antigos são preservados. Isso é ouro **somente do jogo**:
não existe compra com dinheiro real, conta de servidor nem sincronização
entre dispositivos. Limpar os dados do site também apaga o progresso.

### Pressão de hordas maior

As quatro fases por tempo lançam **2, 3, 4 e 5** inimigos por
grupo como quantidade **inicial**, respectivamente (0:00, 1:15, 3:30, 6:00).
**Cada nível do herói acrescenta mais um monstro a cada grupo**:
no primeiro estágio, são 2 no nível 1, 6 no nível 5, 11 no nível 10 e
21 no nível 20. O grupo chega até **24 monstros**; o limite de 170
inimigos simultâneos continua protegendo o desempenho no mobile.
O intervalo entre grupos também diminui progressivamente, e monstros
são distribuídos em círculo ao redor do jogador.

## Combates de chefe por nível

O relógio ainda controla as ondas normais, mas a dificuldade dos monstros
também cresce conforme o **nível do herói**, além do tempo sobrevivido.

- **Níveis 5, 15, 25, 35…:** um miniboss gigante de uma espécie comum,
  com mais vida e XP, investida rápida avisada e **ouro extra** pela derrota.
- **Níveis 10, 20, 30, 40…:** o **Soberano do Eclipse**, chefe com mais
  vida, investida e **círculos de projéteis mágicos**. Ele avisa antes da
  salva; abaixo de 50% de vida lança mais projéteis por vez.
- O chefe principal exibe **barra de vida com nome, nível e PV no topo**
  da tela. Minibosses têm barra de PV sobre o monstro mesmo sem dano.
- Não há duplicação de miniboss no nível 10: todo múltiplo de dez
  dispara somente o chefe principal.
- A recompensa de ouro dos chefes derrotados é incluída no ouro da
  tentativa e **creditada uma vez ao final da partida**; cristais de XP e
  relíquias também são derrubados ao morrer.

As habilidades de **ataque e armas** usam tons quentes (vermelho e
laranja). Melhorias de **defesa** usam tons de azul e melhorias de
**utilidade e suporte**, tons de verde/turquesa. Essa classificação
aparece no cabeçalho, borda, fundo e ícone das cartas, inclusive no
celular, e também é aplicada à loja permanente. Os ícones continuam
únicos e os textos de efeito permanecem acessíveis.

### Vida dos monstros comuns: +5% por nível

A cada nível do jogador, a vida máxima de **todos os monstros comuns**
aumenta **5% sobre o valor do nível anterior**, multiplicativamente:
`HP(nível) = HP_base × 1,05^(nível − 1)`.

| Nível do jogador | Multiplicador de HP comum |
|---|---|
| 1 | 1,00× |
| 5 | 1,22× |
| 10 | 1,55× |
| 20 | 2,53× |
| 30 | 4,12× |

O aumento também afeta monstros já presentes, mantendo a proporção da
vida que lhes restava. O relógio **não multiplica HP de monstros comuns**:
somente os chefes/minibosses mantêm multiplicadores especiais de vida.
Por isso a pressão dos monstros comuns depende do nível e da quantidade,
mesmo sem enfrentar um chefe.

Os limites de aparição (24 por grupo, 170 simultâneos) são limites
técnicos, não níveis máximos do personagem. A curva pretende tornar as
melhorias temporárias e permanentes cada vez mais importantes; o
equilíbrio exato deve ser avaliado jogando com diferentes classes.

## Skill de 3D procedural

A skill [`procedural-3d`](skills/procedural-3d/SKILL.md) reúne direção de arte, geometria, Blender, tempo real e validação. Para usá-la no Codex, copie `skills/procedural-3d` para `~/.codex/skills/` e invoque `$procedural-3d`. A geração preserva seeds, identidade dos assets e recursos do projeto.
