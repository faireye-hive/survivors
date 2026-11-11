# Árvore procedural — bosque de Crônicas do Éter

O modelo usa as recomendações da skill [procedural-3d](../.agents/skills/procedural-3d/SKILL.md): silhueta primeiro, crescimento hierárquico, sementes independentes, materiais PBR, baixo overdraw e geometria validada.

## Aparência

Árvore de folha larga de fantasia, com tronco irregular de seção variável, quatro raízes de sustentação, 6–8 galhos inclinados, folhagem facetada assimétrica e variação sutil de cor. Não usa texturas ou arquivos 3D externos. Y é vertical, origem no solo e unidades em metros. O asset é renderizado por dois materiais no máximo, casca e folhagem (um para árvores sem folhas).

## Integração

`src/render/three/assets/ProceduralTree.js` exporta `createProceduralTree`, `regenerateProceduralTree` e `disposeProceduralTree`. Os nós de coleta de madeira usam modelos próprios com IDs e seeds estáveis. As árvores do terreno usam **quatro protótipos reutilizados via InstancedMesh** para manter previsível o custo de desenho. A sombra é mantida; as folhagens usam faces opacas para evitar overdraw de transparência.

O modelo usa `quality: 'game'` por padrão, com copa de detalhe baixo, e `quality: 'hero'` para inspeção mais próxima. A seed determina a forma; alterar apenas a cor não altera vértices. O valor de `height` representa altura aproximada, incluindo copa.

## Visualizar

Execute `npm run dev` e abra `/tests/fixtures/procedural-tree.html`. Use o mouse para orbitar e os controles para modificar altura, idade, densidade, copa, curvatura, cor e seed. O botão **Exportar GLB** salva a árvore visível no navegador. Para verificar o contexto real do jogo, abra a cena 3D normal e visite o bioma de bosque.

## Testes

Execute `npm test` e `npm run build`. Os testes de árvore verificam atributos da malha, limites de tamanho, ausência de triângulos degenerados, repetibilidade da seed, alteração de cor sem mudança de forma, descarte de recursos e regeneração sem destruir outros objetos.

As árvores de cenário são cenográficas; os nós de madeira continuam seguindo as regras de interação já existentes. Ainda é necessário validar a leitura da copa, sombras e desempenho na câmera de gameplay em navegador e dispositivo-alvo.