# Fantasy Warrior

Personagem refinado a partir do GLB fornecido pelo usuário e da referência
`Full-Body Fantasy Warrior Sprite.png`. A geometria original foi preservada como
escultura completa; a versão reduzida usa a mesma pintura e um normal map transferido
da escultura. A altura é 1,85 m, eixo vertical Y, frente +Z e origem no chão.

## Abrir e usar

```bash
npm run dev
```

Abra `/character.html` na porta indicada pelo Vite. O estúdio permite girar,
aproximar o rosto, inspecionar costas, alternar iluminação, malha e escultura neutra,
comparar as duas densidades, reproduzir repouso/caminhada/ataque na versão de jogo e baixar o GLB selecionado. A página também entra no build.

- `public/models/warrior/fantasy-warrior-game.glb`: versão integrada ao Guardião, 19 ossos, clipes Idle/Walk/Attack, cor 2K e mapas de dados 1K.
- `assets/warrior/fantasy-warrior-rig.blend`: fonte editável do esqueleto e animações.
- `public/models/warrior/fantasy-warrior.glb`: versão reduzida, texturas incorporadas.
- `public/models/warrior/fantasy-warrior-high.glb`: escultura completa, pintura incorporada.
- `public/models/warrior/base-color.png`: atlas UV de cor, 4096 × 4096, sRGB.
- `public/models/warrior/normal.png`: normal tangente +Y, 2048 × 2048, dados lineares.
- `public/models/warrior/orm.png`: R=1, G=roughness, B=metallic, 2048 × 2048.
- `public/models/warrior/manifest.json`: medidas e contagens reais da exportação.
- `assets/warrior/fantasy-warrior.blend`: cena editável, fontes, projeções e mapas empacotados.

## Reprodução

Requer Blender 5.3 (versão executada nesta entrega). O sample original é somente lido.
O script cria uma cena nova e grava apenas os próprios resultados.

```bash
blender --background --python-exit-code 1 --python scripts/build-warrior.py -- \
  --sample /caminho/sample_2026-11-05T020431.286.glb --render
```

Controles: `--ratio 0.24` define a fração de triângulos (0,08–1);
`--resolution 4096` aceita 1024, 2048 ou 4096; `--nose-depth 0.018` controla
a projeção adicional do nariz em metros (0–0,035). O nariz é uma deformação
integrada ao rosto, com ponte, ponta e asas, orientada pela folha de turnaround fornecida.
O atlas original é preservado na escultura completa. A versão reduzida recebe
um novo atlas com transferência da cor, roughness, metalness e normais.
As imagens de projeção ficam em `assets/warrior/front-paint.png` e `back-paint.png`.
A reprodução usa essas pinturas salvas; uma nova geração por IA pode produzir outra aparência.
O registro das projeções é específico deste sample, não um texturizador universal.

Após gerar a versão estática, execute `blender --background --python-exit-code 1 --python scripts/rig-warrior.py` para reconstruir a versão de jogo.

## Pintura e materiais

Ferramenta utilizada: `image_gen` integrada, com renders ortográficos do GLB como alvos
e o sprite fornecido como referência visual. Instruções de geração registradas em
`assets/warrior/paint-prompts.md`. A pintura é transferida ao atlas por UVs projetados,
normais e máscara de visibilidade por ray casting. O verso recebe
uma projeção própria. Superfícies ocultas e ângulos rasantes conservam a textura original
com ajuste de saturação, evitando projetar o fundo ou partes da frente nas costas.
As camadas internas próximas à superfície recebem a mesma pintura: o sample contém
cascas internas com UVs sobrepostos. Os vértices coincidentes são unidos antes da
redução, mantendo UVs por canto, para evitar frestas nas costuras.

O mapa de metalness da origem identifica ferragens; remapeamento de roughness melhora
a separação de superfícies. O normal map preserva o relevo da malha completa na reduzida.
Materiais seguem os canais do [glTF no Blender](https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html)
e o [bake em espaço tangente](https://docs.blender.org/api/current/bpy.ops.object.html#bpy.ops.object.bake).

## Escopo

O Guardião usa o novo modelo tanto no menu quanto na partida. O carregamento é assíncrono, com o modelo procedural como fallback; cada instância tem esqueleto e mixer próprios. Os clipes iniciais são procedurais, com ataque desarmado. A redução preserva a topologia triangulada do sample; não é retopologia manual para deformação. Ainda há irregularidades herdadas nas mechas e limitações nas articulações; não há rig facial ou dedos individuais.
Há sombreamento artístico na pintura. Ela não representa um albedo físico puro.

Validação automática: `npm test`. Os testes do asset conferem geometria finita,
índices, escala, UVs, texturas incorporadas, redução de triângulos, pesos normalizados e clipes. Os testes de integração verificam isolamento de esqueletos e descarte durante carregamento. `npm run build` inclui jogo e estúdio.

A skill reutilizável está em `.agents/skills/character-3d-studio/SKILL.md`, com referências sobre transferência de pintura e integração de rig. A receita específica deste personagem permanece nos scripts, sem transformar suas coordenadas em regra universal.
