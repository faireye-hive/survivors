# Arquitetura — Crônicas do Éter

## Tecnologias

- JavaScript ES Modules e Vite para desenvolvimento e publicação.
- Canvas 2D para o cenário, personagens, monstros, efeitos e minimapa.
- HTML/CSS para interface e Web Audio para sons sintetizados.
- Sem bibliotecas gráficas 3D, modelos externos ou spritesheets.

## Fluxo de jogo

`Game.step(dt)` calcula movimento, inimigos, combate, progressão e efeitos.
`Renderer.render(game)` desenha o mundo e os atores por profundidade Y usando
um único `CanvasRenderingContext2D`. O jogador fica no centro da câmera.
A interface e o minimapa são atualizados em módulos independentes.

## Rig procedural 2D compartilhado

`src/data/Rig2D.js` define `RIG_SCHEMA`, versão 1, templates de
`hero.guardian`, `hero.mage`, `hero.ranger`, `monster.slime`, `monster.bat`,
`monster.skeleton`, `monster.wraith` e `monster.colossus`.

Cada personagem possui `id`, `template`, `name`, `colors` e `clips`.
Cada animação contém `id`, `duration`, `loop` e
`frames: [{time,pose}]`; cada pose é um mapa de peças para
`{x,y,rotation,scale}`. As transformações são relativas ao pai, com pivôs
no tronco, cabeça, olhos, boca, braços, mãos, pernas, pés e arma.
Os keyframes são interpolados; a rotação usa o arco angular mais curto.

`src/render/characters/RigRenderer.js` desenha todos os personagens e
monstros usando esse mesmo sistema. `src/render/Art.js` delega
`drawPlayer` e `drawEnemy` ao renderizador compartilhado, preservando
as rotinas de itens, projéteis e efeitos especiais.

O Guerreiro foi redesenhado no mesmo estilo compacto ilustrado dos demais
heróis. O código detalhado antigo foi removido, evitando dois sistemas
separados de aparência e animação.

## Rig Studio 2D

`warrior-studio.html` e `src/studio/WarriorStudio.js` implementam um
editor de personagens Canvas 2D com preview em tempo real, seleção e
arraste das articulações, inspetor de propriedades, editor de cores,
keyframes, linha do tempo, reprodução, importação/exportação JSON e PNG.

A biblioteca de poses é gravada em `localStorage` usando
`cronicas.2d.rigs.v1` e carregada no início do jogo. O editor pode exportar
um personagem isolado ou o projeto completo, ambos no formato
`cronicas-do-eter/rig2d`, versão 1. Os arquivos importados são validados:
IDs, templates, cores, clipes, duração e números das transformações possuem
limites. Importar um personagem de ID existente substitui o registro
daquele ID no projeto local.

A integração de uma animação personalizada ao jogo ocorre automaticamente
na próxima recarga da página (mesma origem do navegador) quando o clipe
se chama `idle`, `walk`, `attack` ou `hit`. Clipes com outros nomes são
disponibilizados no editor e precisam de um gatilho de gameplay para ser
reproduzidos durante a partida.

## Desempenho

Canvas 2D, culling de atores fora da tela, nenhuma textura externa e
atualizações do jogo via `requestAnimationFrame`. Futuras melhorias:
cache de poses de multidões e spatial hash de colisões.

Execute `npm test` e `npm run build` antes da publicação no GitHub Pages.

## Anatomia e edição com restrições

`RIG_ANATOMY` seleciona as peças reais de cada espécie. `rigNodeDefinition`
fornece pivôs próprios (ex.: rosto dentro do slime, asas do morcego), e
`getRigHandles(pose,character)` devolve somente as juntas dessa anatomia.
Monstros não compartilham a estrutura humana por acidente.

O editor oferece dois gestos: girar no pivô (padrão, com alça circular)
e mover partes com mobilidade definida. `rigOffsetRange` e
`boundedRigValue` limitam deslocamentos na interface, no desenho
e na validação de JSON; articulações rígidas têm deslocamento zero
e permitem rotação. Os descendentes seguem a transformação do pai.

## Guia de caminhada de quatro direções

`src/data/WalkGuide.js` gera poses procedurais de contato/passagem
para frente, trás, esquerda e direita. `src/studio/WalkReference.js`
desenha o esqueleto diretamente no Canvas usando os mesmos pivôs
de `getRigHandles`. O painel contém 16 miniaturas sem imagens externas,
sobreposição opcional, opacidade e seleção do quadro.

`createDirectionalWalkClip` cria `walk.front`, `walk.back`, `walk.left`
ou `walk.right` com quatro poses e um quadro de fechamento no tempo
final. `resolveWalkAction` faz fallback para a animação antiga `walk`
quando um clipe direcional não existe. `actorWalkDirection` seleciona a
direção a partir da velocidade ou orientação anterior; ambos são
usados no renderizador do jogo. Criar um clipe no editor exige ação
explícita e confirmação antes de substituir outro do mesmo ID.
