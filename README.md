# ✧ Crônicas do Éter — Sobreviventes

RPG de sobrevivência para navegador, **100% Canvas 2D**. Enfrente hordas crescentes, colete cristais de experiência, evolua habilidades automáticas e resista durante oito minutos. Não usa Three.js, imagens externas, modelos 3D ou assets de personagens importados.

## Jogar

- **Guerreiro** — espada e resistência.
- **Arcanista** — magia guiada.
- **Andarilho** — adagas rápidas.
- WASD ou setas para se mover; joystick no celular. Os ataques são **automáticos**.
- Colete XP e escolha melhorias ao subir de nível. `Esc` ou `P` pausa o jogo.
- A partida dura oito minutos; minibosses aparecem nos níveis 5, 15, 25… e chefes principais nos níveis 10, 20, 30…

## Conteúdo e encontros

- **Limo, Morcego, Esqueleto, Espectro e Guardião da Névoa** são inimigos existentes.
- **Esporão da Floresta** surge a partir de 1:00. Ele coloca círculos de esporos no chão: há um aviso visual antes de causarem dano, permitindo escapar.
- **Aranha da Ruína** surge depois de 1:50. Aproxima-se rapidamente em zigue-zague.
- **Florescimento Sombrio (1:15)**, **Teias das Ruínas (3:15)** e **Eclipse de Éter (5:20)** são três ondas especiais com avisos na tela.
- **Inimigos de elite** aparecem nessas ondas. Eles têm mais vida e garantem uma **Relíquia**, que restaura 15 PV e aumenta permanentemente o dano em 7% durante a partida. Os bônus acumulam.
- Os eventos de horda por tempo continuam; os chefes principais agora são acionados por **níveis**, não por minutos.
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

A cada derrota ou vitória, o jogador recebe **ouro virtual** calculado
principalmente pelo **nível alcançado**, além de inimigos derrotados e
tempo de sobrevivência. Toda partida rende algum ouro, até uma tentativa
curta. Sobreviver aos oito minutos acrescenta um bônus final. A estimativa
do ouro aparece no HUD; a quantia efetivamente recebida e o saldo
aparecem na tela de resultado.

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
