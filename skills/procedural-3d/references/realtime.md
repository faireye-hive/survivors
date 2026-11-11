# Geração procedural em tempo real

## Orçamento guiado pelo destino

Inspecione engine, versão, loop de renderização, gerenciamento de assets e câmera existentes. Escolha métricas relevantes: tempo de geração, frame time, picos, draw calls, triângulos visíveis, memória de geometria/texturas e custo de transparência. Não imponha um limite universal de polígonos nem prometa FPS sem medir.

Se o dispositivo alvo estiver indefinido, registre a máquina/browser usados na medição e mantenha qualidade configurável quando isso trouxer benefício. Distingua teste no hardware real de simulação ou throttling.

Gere geometria estática fora do loop por frame. Para trabalho pesado, avalie workers, jobs ou processamento em etapas com cancelamento e descarte de resultados antigos. Enquanto sliders mudam, debounce ou preview de menor custo pode evitar congelamento.

## Organização e memória

Compartilhe geometria e materiais entre cópias compatíveis; use instancing quando houver repetição suficiente. Instâncias ainda consomem vértices e pixels: não resolvem overdraw, sombras caras ou uma malha base excessiva.

Agrupe por material e por região espacial conforme o equilíbrio entre draw calls e culling. Um único lote para o mundo inteiro pode continuar sendo desenhado quando somente uma parte está visível. Preserve um mapeamento entre instâncias e identidades lógicas se houver interação.

Após deformar malhas ou mudar transformações, atualize os bounds usados por culling e picking. Para animação no shader, os bounds precisam cobrir o deslocamento máximo previsto.

Evite alocações frequentes no loop. Defina propriedade de recursos compartilhados e descarte somente quando não houver consumidores. Verifique que regenerar ou alternar presets repetidamente não aumenta memória sem limite.

## LOD e leitura

Faça LOD por importância visual e tamanho em tela quando viável; use histerese para evitar troca contínua perto do limiar. Reduza detalhes que desaparecem antes de comprometer a silhueta. Normais, materiais e pivôs devem manter aparência compatível entre níveis.

Vegetação exige atenção ao overdraw, sombras, alpha e transições para impostors/cards. Terrenos exigem costuras de posição e de iluminação. A distância de colisão e a de render não precisam usar a mesma representação.

Mantenha colisão simples e coerente com a navegação ou interação. Não derive um collider complexo de toda a malha detalhada sem necessidade demonstrada.

## Three.js: pontos que exigem atenção

Leia a versão instalada no projeto e use as APIs dela. Preserve a escolha WebGL/WebGPU e o sistema de materiais atual; shaders, extensões e pós-processamento podem ter compatibilidade diferente.

Para `BufferGeometry`, confira índices, atributos, normais, UVs e bounds após geração. Ao atualizar um atributo existente, sinalize a atualização conforme a API; alterações na quantidade de vértices podem exigir buffers novos.

Para `InstancedMesh`, atualize `instanceMatrix.needsUpdate` após alterações via `setMatrixAt`, e o atributo de cor quando modificado. Recalcule os bounds afetados para evitar culling ou picking incorreto. As matrizes são locais ao mesh; não duplique a transformação do pai. Veja [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html).

Diferencie texturas de cor de mapas de dados. Base color e emissive normalmente usam sRGB; normal, roughness e metalness permanecem como dados. Confira conversões de entrada e saída, tone mapping e pós-processamento para não aplicar conversões duas vezes. Veja [Color Management](https://threejs.org/manual/pages/color-management.html).

Remover um objeto da cena não libera automaticamente todos os recursos GPU. Descarte geometrias, materiais, texturas, render targets e recursos específicos conforme sua propriedade e a API da versão usada. Cancele listeners e animações associados ao componente. Veja [How to dispose of Objects](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).

## Verificação no consumidor

Compile e execute no destino disponível. Inspecione a câmera de gameplay, tamanhos de viewport relevantes, mudanças de parâmetros, regeneração e descarte. Observe erros de console e materiais/shaders faltantes.

Meça um cenário representativo com população e resolução finais; diferencie primeira compilação de shader de desempenho estabilizado. Relate mediana e picos quando forem relevantes. Use os contadores/profilers da engine para localizar o gargalo antes de reduzir qualidade às cegas.

Se o browser/renderizador não estiver disponível, ainda é possível validar a geração e a estrutura das malhas. Registre que aparência e desempenho em GPU continuam sem comprovação.
