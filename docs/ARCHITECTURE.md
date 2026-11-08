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

## Fases de dificuldade e comunicação visual

`src/data/difficulty.js` centraliza `threatAt(seconds)`: número de
monstros por grupo, intervalo de surgimento, escala de vida, escala de
velocidade e bônus de dano. O valor máximo do relógio é 480 segundos,
prevenindo extrapolação após a vitória. As fases começam em 0, 75,
210 e 360 segundos. `Enemies.js` usa a mesma curva tanto para
`spawnEnemy` quanto para `updateEnemies`, evitando divergência de
dificuldade e limites de população. O cap existente continua 170.

O Guardião da Névoa conta com investidas: antes de acelerar, ele fica
parado durante 0,7 segundo enquanto `Art.js` desenha um círculo
telegráfico dourado; a investida dura 0,72 segundo. Esse comportamento
é exclusivo dos chefes, sem modificar colisões de ataque básicas.

`src/ui/UpgradeIcons.js` guarda dez formas vetoriais distintas,
identificadas pelos IDs das armas e atributos. `createUpgradeIcon`
usa exclusivamente `createElementNS` com caminhos estáticos (sem
`innerHTML`). `Progression.createChoices` oferece rótulo de efeito
curto, cor e grupo; `Interface.showLevel` combina ícone, efeito em
destaque e descrição secundária sem alterar `applyChoice`.
No HUD desktop, o indicador AMEAÇA mostra o nível atual da curva.

## Progressão entre tentativas

`src/storage/Profile.js` estende o mesmo `cronicas_eter_profile_v1`
com `gold`, `lifetimeGold`, `lastGold`, `bestLevel` e um objeto
`upgrades`; perfis antigos continuam válidos. `calculateRunGold` é
uma função pura limitada a valores finitos; a recompensa cresce de
acordo com nível, kills, tempo e bônus por vitória. `recordRun` mantém
os recordes e concede o ouro uma única vez por término de partida
(`Game.finish` já impede chamadas duplicadas).

`src/data/metaUpgrades.js` declara as seis melhorias disponíveis,
efeitos, limites e preços crescentes. `buyPermanentUpgrade` valida
ID, saldo, limite e sucesso da gravação antes de confirmar a compra.
`Game.reset` carrega o perfil, calcula `permanentBonuses` e aplica
os atributos às três classes. O bônus de experiência afeta os cristais
de XP recolhidos em `Progression.js`. As melhorias compradas não
alteram a partida em andamento.

`src/ui/MetaShop.js` constrói as seis opções do menu com DOM seguro,
níveis, preços e ícones SVG. `Interface.js` permite abrir a loja
no menu ou na tela de derrota/vitória e voltar ao estado anterior,
exibindo ouro conquistado e ouro guardado. Não existe moeda externa
ou servidor remoto; o progresso é local ao navegador.

O equilíbrio de hordas usa 2, 3, 4 e 5 inimigos por grupo nas
fases temporais de `difficulty.js`; vida e velocidade crescem mais
rapidamente, mantendo o limite de atores renderizados.

## Marcos de nível, minibosses, chefes e recompensas

`src/data/levelMilestones.js` é a fonte única dos marcos de nível.
`milestoneForLevel(n)` devolve miniboss para múltiplos de cinco que
não sejam múltiplos de dez, e chefe principal para múltiplos de dez.
`enemyLevelScaling` eleva a vida, velocidade e dano dos inimigos
conforme o nível, adicionalmente ao fator temporal de `threatAt`.

`Progression.updateProgression` chama `spawnLevelMilestone` logo ao
aumentar o nível, antes de pausar para a escolha de melhoria. O
miniboss/chefe já estará esperando quando a partida for retomada.
`levelMilestones` é um `Set` por partida: não há spawn duplicado.
`Enemies.js` reserva lugar na população para um chefe se necessário,
sem ultrapassar o limite de 170 inimigos. Os antigos spawns de
chefe por tempo foram desativados, mantendo os três eventos de hordas.

Minibosses são versões ampliadas de espécies comuns com grande aumento
de PV/XP, corrida telegráfica e bônus de ouro. O Soberano do Eclipse
usa o Colosso procedural com visual ampliado, investida e rajada
radial: pausa para avisar antes de disparar 10 projéteis em todas as
direções (16 abaixo de 50% de PV). `enemyShots` é uma lista separada
dos projéteis de herói. Seu comprimento é limitado; as colisões
respeitam armadura, invulnerabilidade e estado terminal da partida.

`Combat.hurt` concede um bônus em `g.bonusGold` quando o chefe
morre (além de XP e relíquia). Esse bônus não é salvo imediatamente:
`Game.finish` inclui-o no `recordRun` existente, evitando créditos
duplicados. `Profile.calculateRunGold` recebe `bonusGold` opcional.
`Interface.update` reflete o bônus no ouro estimado do HUD e mostra
a barra superior de PV do chefe principal enquanto ele estiver vivo.

## Paletas temáticas para habilidades

Os dados de `upgrades.js` e `weapons.js` possuem `theme` separado
do antigo `family`. Ataque usa vermelho/laranja, defesa usa azul,
utilidade/suporte verde-turquesa. `Progression.createChoices` expõe
esse tema; a `Interface` aplica `data-theme` com uma categoria textual
e os estilos CSS diferenciam borda, fundo e destaque (não só cor).
`MetaShop` segue o mesmo padrão, preservando ícones SVG únicos e
descrições acessíveis.

## Curva exponencial de HP comum e densidade crescente

`enemyLevelScaling(level).health = 1.05 ** (level - 1)`, com nível
sanitizado e limitado para segurança numérica. A fórmula vale para
todas as espécies comuns, e também para a base dos elites.
`Enemies.spawnEnemy` mantém HP fracionário para aplicar exatamente os
5% sem distorção por arredondamento; `rescaleCommonEnemies` atualiza
monstros vivos quando o herói sobe de nível, preservando a fração de
HP restante para não restaurar a vida deles. Minibosses e chefes
mantêm multiplicadores separados, inclusive o fator temporal.

`levelHordePressure(level,packBase,intervalBase)` adiciona **um monstro
por nível ganho** ao tamanho do grupo definido por `threatAt` (2–5)
até o máximo de 24. Também reduz gradualmente o intervalo entre grupos
até o piso de 0,34s e aproxima um pouco o círculo de surgimento.
`Enemies.updateEnemies` distribui os ângulos dos novos monstros ao
redor do jogador para evitar que o grupo inteiro apareça apenas de um
lado. `MAX_ENEMIES=170` continua prevenindo excesso de atores.
Os encontros e marcos de miniboss/chefe por nível continuam funcionando.
