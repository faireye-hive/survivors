# Guia de geometria procedural sem software externo

## Qual técnica escolher
| Componente | Técnica primária | Por quê |
|---|---|---|
| Arcos, portas e janelas recortadas | `THREE.Shape` + `Path`/`holes` + `ExtrudeGeometry` | Vãos reais, espessura e bevel |
| Telhado de duas águas | `BufferGeometry` indexada ou `ExtrudeGeometry` com perfil de empena | A forma depende de inclinação e beiral |
| Vigas, galhos, cabos | `TubeGeometry` com `CatmullRomCurve3` ou sweep em malha customizada | Caminhos orgânicos e repetíveis |
| Torres octogonais, colunas | `CylinderGeometry`/`LatheGeometry` ou loft de perfis | Silhueta e seções controláveis |
| Esculturas/rostos/elementos orgânicos | Loft de seções, superfície paramétrica e subdivisão | Curvatura e densidade local |
| Pedras desgastadas | Malha low-poly deformada com seed + normais recalculadas | Variedade sem assets importados |
| Muitos objetos iguais | `InstancedMesh` | Reduz draw calls |

## BufferGeometry confiável
- Declare `position` e, quando texturizado, `uv` para **cada vértice**; use índices coerentes ou triangule o polígono.
- Em sólidos, cada face externa deve apontar para fora; verifique com `computeVertexNormals()` e `DoubleSide` apenas durante diagnóstico, nunca como conserto permanente para faces invertidas.
- Ao fechar volumes, não deixe buracos, autointerseções ou faces de área zero; `ExtrudeGeometry` não funciona bem com contornos autointersectantes.
- Defina `geometry.computeBoundingBox()` e `geometry.computeBoundingSphere()` após deformações e `computeVertexNormals()` após mudar posições.
- Para hard-surface, separe vértices nas quinas que devem ter normais independentes. Evite normals suavizadas em arestas que deveriam ser cortantes.
- Não aplique escala negativa sem examinar orientação de winding/tangentes; use transformações positivas quando possível.

## Curvas, detalhes e performance
- `steps`, `curveSegments` e `bevelSegments` sobem a contagem de triângulos muito rápido. Ajuste à proximidade da câmera e faça perfis de qualidade configuráveis.
- Evite criar e destruir 1000 meshes por quadro. Crie uma vez, atualize transforms ou visibility nas transições e faça `dispose()` quando removidos definitivamente.
- Geometrias e texturas compartilhadas **não** devem ser descartadas por um único mesh sem gestão de referências.
- `MeshStandardMaterial` suporta `roughness` e `metalness`, mas rugosidade não resolve geometria plana: primeiro melhore a silhueta.
- Evite um draw call por tijolo distante. Para close-up use instancing, atlas/material compartilhado e LOD; em distância use o corpo do muro e linhas de juntas sutis.
- CSG e subdivision são opções, não obrigações. Evite dependências externas quando Shape + Extrude atendem ao caso.

## Interfaces sugeridas
```js
createAsset(THREE, { type, size, seed, quality, style }) // retorna THREE.Group
setConstructionProgress(group, progress)              // mantém geometria/estado visual consistentes
getCollisionShapes(group)                              // colisores simplificados para gameplay
exportAssetGLB(group)                                  // com GLTFExporter da versão usada no projeto
```

`GLTFExporter` pode ser importado de `three/addons/exporters/GLTFExporter.js` quando o projeto usar módulos Three.js. `OBJExporter` existe para OBJ, mas o formato não carrega os mesmos materiais de glTF. Nunca afirme que um arquivo foi exportado se somente o código de exportação foi criado.