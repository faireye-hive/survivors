# Direção de arte e acabamento

## Transforme adjetivos em decisões

Converta “bonito”, “realista”, “estilizado” ou “premium” em critérios observáveis: linguagem de formas, proporções, paleta, resposta dos materiais, densidade de detalhes, escala das imperfeições e câmera de uso. Uma referência fornecida pelo usuário tem prioridade sobre um estilo presumido.

Quando houver referência visual, descreva o que será preservado e confira as imagens durante a iteração. Sem referência, escolha uma família visual coerente. Não invente que um asset corresponde a uma referência que não foi vista.

- Estilizado: exagero seletivo de proporções, grupos de valor claros, bordas e detalhes compatíveis com a resolução de exibição.
- Realista: escala plausível, espessuras, montagem, resposta de materiais e desgaste relacionado a processos físicos.
- Low-poly: planos e normais intencionais, silhueta expressiva, distribuição criteriosa dos poucos polígonos.
- Hero asset: detalhe concentrado nas regiões realmente vistas; verso simplificado somente se o uso permitir.

## Forma antes de superfície

Faça a forma funcionar em material neutro e, quando útil, como silhueta. Use massas primárias para identidade, secundárias para construção e terciárias para superfície. Evite frequências e amplitudes de detalhe iguais em toda a peça.

Agrupar primitivos pode ser um blockout útil. Para acabamento, trate interseções visíveis, transições, espessura, pés de apoio, bordas e junções. Não funda componentes que devem parecer montados separadamente.

Introduza assimetria com propósito: uma direção dominante de vento, uma face fraturada, um lado exposto à água. Ruído uniforme em cada eixo tende a destruir a intenção da forma. Preserve elementos funcionais como encaixes, faces de apoio e vias de circulação.

A câmera define o detalhe útil. Avalie o objeto no tamanho final em pixels, além do close-up. Elementos subpixel podem gerar cintilação em vez de riqueza visual.

## Materiais com causas

Defina primeiro quais partes são madeira, pedra, metal, tecido, tinta etc.; diferencie sua resposta à luz antes de adicionar sujeira.

- Trabalhe cor, rugosidade e relevo em escalas coerentes. Evite repetir exatamente o mesmo ruído em todos os canais.
- Relacione máscaras a causas: contato e cavidades para sujeira, exposição para desbotamento, fluxo para escorridos, direção de crescimento para fibras.
- Use coordenadas estáveis; verifique se alterar escala ou mover uma instância estica ou faz deslizar a textura.
- Considere bevel físico nas bordas cuja captura de luz é importante. Espessura e raio devem acompanhar a escala da peça.
- Preserve os valores apropriados ao modelo de material da engine; não use metalness ou emissão apenas para compensar luz inadequada.
- Em estilos pintados, mudanças deliberadas de cor e roughness podem ser mais valiosas que mapas grandes e ruído fino.

## Luz e composição

Escolha o papel da iluminação: revelar produto, sustentar atmosfera ou garantir leitura de gameplay. Estabeleça luz principal e apoio somente conforme necessário. Uma luz de recorte é útil se separar a silhueta; não é requisito.

Ajuste exposição e transformação de cor antes de refinar materiais. Compare materiais sob uma condição neutra consistente para não compensar um erro de pipeline com cores arbitrárias.

Verifique contato no chão, volume, áreas estouradas, sombras que apagam a forma e competição com o fundo. Bloom, névoa, AO e profundidade de campo devem apoiar a leitura. Não os use para esconder geometria incompleta.

## Revisão orientada ao maior defeito

Compare uma imagem com a anterior mantendo câmera e luz constantes quando estiver avaliando geometria ou material. Identifique um problema concreto e a correção esperada, por exemplo:

| Sintoma | Investigue primeiro |
| --- | --- |
| Rocha parece uma esfera amassada | Massas, planos de fratura, base e distribuição das convexidades |
| Vegetação parece um cone uniforme | Silhueta da copa, hierarquia dos galhos, vazios e agrupamentos |
| Construção parece feita de caixas soltas | Espessura, encontros, modulação e detalhes construtivos |
| Superfície parece plástico | Escala do relevo, roughness, resposta à luz e separação de materiais |
| Cena parece um catálogo de objetos | Relações de escala, composição, densidade e repetição visível |
| Mais detalhe piorou o resultado | Ruído de alta frequência, falta de áreas calmas e custo em pixels |

Esses diagnósticos são hipóteses: confirme na imagem e na geometria antes de aplicar a correção.
