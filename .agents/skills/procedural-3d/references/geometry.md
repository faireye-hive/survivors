# Geometria, parâmetros e distribuição

## Escolha a representação pelo resultado

| Problema | Ponto de partida | Limitação importante |
| --- | --- | --- |
| Peça torneada | Perfil + revolução | Tratar eixo, polos, tampas e costura |
| Tubo, raiz, cabo | Curva + seção | Controlar torção, raio e curvas fechadas |
| Construção modular | Gramática de módulos com encaixes | Reservar portas, circulação e dimensões funcionais |
| Terreno aberto | Heightfield em chunks | Não representa cavernas ou saliências verticais sobrepostas |
| Formas orgânicas fundidas | Campo implícito/SDF + extração | Resolução, memória, espessura mínima e malha resultante |
| Rocha facetada | Massas deformadas ou planos de corte | Evitar ruído uniforme e triângulos degenerados |
| Vegetação | Esqueleto hierárquico + instâncias | Junções, vazios da copa, overdraw e LOD |
| População de objetos | Amostragem com restrições + instâncias | Densidade, colisões, estabilidade e tentativas limitadas |

Use outra representação se o objeto exigir. Não transforme esta tabela numa obrigação de implementar vários sistemas.

## Malhas confiáveis

Documente unidade, eixos, handedness, origem e convenção de winding. Verifique orientação após espelhamentos e escalas negativas. Normais usam a transformação apropriada, não simplesmente a matriz de posições quando há escala não uniforme.

Ao construir buffers:

- Confirme índices inteiros dentro dos limites, posições finitas e consistência de contagens dos atributos.
- Trate fechamento, tampas e vértices duplicados nas costuras conscientemente.
- UV seams e arestas duras podem exigir vértices distintos na representação de render, mesmo quando ocupam a mesma posição.
- Triangule polígonos côncavos com um método válido; um leque arbitrário pode sair do polígono.
- Escolha tolerâncias relativas à escala. Uma constante absoluta pode apagar detalhes pequenos ou deixar degenerações grandes passarem.
- Recalcule normais após deformação e preserve descontinuidades intencionais. Normais suaves não corrigem topologia ruim.
- Use tangentes compatíveis com o consumidor quando houver normal maps.

Malha manifold e estanque é requisito para certos sólidos, booleans ou fabricação; folhas, superfícies abertas e cards podem ser intencionalmente não estanques. Não “corrija” essas aberturas sem considerar o uso.

## Curvas e superfícies

Amostre curvas por comprimento ou curvatura quando espaçamento uniforme no parâmetro produzir segmentos desiguais. Limite curvatura e raio para evitar auto-interseções na varredura de seções.

Para orientação ao longo de curvas, um referencial de transporte paralelo pode evitar flips de Frenet em trechos quase retos. Curvas fechadas também precisam resolver a torção residual na costura. Defina a política de junção entre ramos; sobreposição pode servir à distância, mas pede tratamento em close-up.

Em superfícies periódicas, compartilhe posição e orientação nas bordas, respeitando a duplicação necessária para UVs. Em polos, evite uma fileira inteira de vértices coincidentes gerando faces sem área.

## Aleatoriedade que não desmonta o asset

Use uma seed raiz com streams ou hashes estáveis por subsistema e por identidade semântica. Exemplo conceitual:

```text
shape_seed = stable_hash(root_seed, "shape", asset_id)
color_seed = stable_hash(root_seed, "color", asset_id)
spawn_seed = stable_hash(root_seed, "scatter", chunk_x, chunk_z, candidate_id)
```

Defina o algoritmo e a codificação dos dados. O hash nativo de uma linguagem pode variar entre processos; consumo sequencial de um RNG global torna o resultado dependente da ordem de execução. Identidades baseadas apenas em índice deixam de ser estáveis quando elementos anteriores são inseridos ou removidos.

Para ruído, controle comprimento de onda e amplitude separadamente. Limite frequências à resolução geométrica e de tela. Domain warping excessivo pode quebrar máscaras e produzir auto-interseções; mantenha áreas funcionais protegidas.

Não faça de cada amostra aleatória uma decisão artística independente. Escolha primeiro uma família e correlacione características: tronco espesso sustenta galhos coerentes; rochas do mesmo afloramento compartilham orientação e material.

## Distribuição com intenção

Defina máscaras antes de distribuir: inclinação, altitude, distância de caminhos, disponibilidade de suporte, área navegável e exclusões. Teste apoio com a superfície real; alinhar tudo à normal pode deixar árvores ou construções inclinadas de maneira inadequada.

Use espaçamento mínimo/Poisson quando colisões e distância importarem, clusters quando a formação for agrupada e jitter quando existir uma estrutura regular subjacente. Para objetos com tamanhos diferentes, a distância de exclusão deve considerar seus volumes ou raios, não só os centros.

Limite tentativas de rejeição. Se a densidade pedida for inviável, retorne a quantidade obtida e a causa; não entre em loop ilimitado nem aceite sobreposições silenciosamente. Para grandes populações, utilize grade espacial, árvore ou outra estrutura adequada para consultas locais.

## Terrenos e mundos em chunks

Amostre altura e máscaras em coordenadas globais para manter continuidade. Normais das bordas precisam de amostras vizinhas ou derivadas coerentes; igualar só a posição deixa costuras de iluminação.

Defina posse dos objetos nas bordas e use uma vizinhança suficiente para avaliar exclusões; isso evita duplicação e colisões entre chunks. IDs espaciais devem suportar coordenadas negativas e não depender da ordem de carregamento.

Antes de ruído fino, estabeleça relevo de grande escala, rotas e áreas de interesse. Caso use erosão, diferencie simulação efetiva de uma aproximação visual; avalie o custo e preserve a seed. LODs adjacentes precisam de transição de borda, stitching, skirts ou estratégia equivalente apropriada ao caso.

## Controles úteis

Prefira controles como altura, espessura, curvatura, idade, densidade, fragmentação e intensidade de desgaste. Separe seed, estilo e resolução: aumentar resolução não deve reinventar a identidade do asset.

Valide números finitos, intervalos e combinações inviáveis antes de alocar buffers. Defina limite de crescimento e memória para subdivisão, recursão e campos volumétricos. Teste limites válidos, zero quando permitido e entradas inválidas que devem falhar de modo compreensível.