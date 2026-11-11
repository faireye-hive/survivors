# Checklist de qualidade 3D

## Inspeção estática
- [ ] O objeto é reconhecível em perspectiva e em vista isométrica distante?
- [ ] Há paredes, aberturas, telhado e profundidade reais, em vez de marcadores abstratos?
- [ ] Não existem faces invertidas, vazamentos, telhados flutuantes, interseções gritantes?
- [ ] As dimensões e pivôs respeitam a convenção da cena (Y-up, solo em Y=0)?
- [ ] O contorno de portas e janelas tem espessura suficiente?
- [ ] As cores e rugosidades distinguem pedra, madeira e metal sem depender só de iluminação?
- [ ] Há UVs/normais corretas quando necessárias?

## Inspeção dinâmica
- [ ] Testar início, 25%, 50%, 75% e 100% da construção.
- [ ] O espaço para o personagem andar/entregar recursos funciona em todos os estágios?
- [ ] Nenhum telhado ou torre aparece completo antes da fundação correspondente?
- [ ] `setProgress` chamada duas vezes com o mesmo valor não duplica geometrias.
- [ ] A câmera consegue mostrar a base inteira e fazer zoom sem clipping relevante?
- [ ] Testar luz diurna e noturna se o jogo as tiver.

## Performance
- [ ] Repetições instanciadas e geometrias compartilhadas quando cabível.
- [ ] Geometrias e materiais compartilhados têm ciclo de vida documentado.
- [ ] Triângulos, draw calls e memória comparados antes/depois quando houver ferramentas.
- [ ] LOD não descaracteriza silhueta nem esconde portão/muros a distância.

## Exportação e relatório
- [ ] GLB/GLTF reimportado e checado (orientação, tamanhos, materiais, normais).
- [ ] Diferenciar `gerado`, `verificado com testes automatizados` e `inspecionado visualmente no navegador`.
- [ ] Informar parâmetros disponíveis, limitações, etapas pendentes e caminho do artefato.