# Blender: execução, nós e exportação

## Ambiente e autoria

Confira a versão real do Blender, o acesso ao executável e o renderizador disponível antes de escrever chamadas dependentes de versão. Um comando presente no PATH não garante execução. Inspecione o arquivo existente antes de alterar coleções, materiais, câmera ou configurações globais.

Prefira a API de dados para criar e conectar objetos, malhas, materiais e nós de forma explícita. Operadores dependem de contexto; quando forem necessários, prepare seleção, objeto ativo e modo, e confirme seu resultado. Evite operações que dependem de uma área de UI ao executar em background. Veja [Using Operators](https://docs.blender.org/api/main/info_gotchas_operators.html), escolhendo a documentação da versão instalada.

Organize elementos gerados em uma coleção identificável. Mantenha referências aos datablocks criados e remova apenas recursos de propriedade do gerador. Não use limpeza global de órfãos como atalho para regenerar parte de um arquivo do usuário.

Um script reutilizável deve receber caminhos de entrada/saída e parâmetros sem presumir o diretório atual. Para execução em background, a forma geral é:

```text
blender --background --python-exit-code 1 --python /caminho/gerar.py -- --output /caminho/saida --seed 42
```

O trecho após `--` pertence ao script e só funciona se ele implementar esses argumentos. `--python-exit-code` permite detectar exceções Python; confirme o código de saída e os arquivos produzidos. Não use `--factory-startup` ao editar um arquivo existente.

## Geometry Nodes

Projete o grupo como um gerador editável: nomes e unidades nos controles, limites razoáveis e separação entre forma, distribuição e acabamento. Confirme a API da interface de node groups e os sockets disponíveis na versão instalada em vez de assumir índices de sockets de exemplos antigos.

Campos são avaliados num domínio e contexto. Ao transferir dados entre pontos, faces, curvas e instâncias, confira se a interpolação e o domínio representam a intenção. Capture ou armazene atributos antes de operações que descartem a identidade necessária para etapas posteriores.

Use IDs estáveis onde a variação precisa persistir após mudanças topológicas. Verifique a origem dos IDs usados pelo nó de randomização; não assuma que o índice sempre representa o mesmo elemento.

Mantenha instâncias enquanto beneficiam edição e memória. Realize apenas quando uma operação ou o consumidor exigir geometria real, e avalie o aumento de memória. A realização também muda a forma como atributos passam à geometria; confira materiais e variação após a conversão. Consulte [Instances](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/instances.html).

## Modificadores e shading

A ordem dos modificadores é parte do design. Compare deformação, bevel, subdivision e tratamento de normais na geometria avaliada, especialmente sob escala não uniforme. Não aplique toda a pilha indiscriminadamente; preserve uma fonte editável e, se necessário, gere uma cópia para exportação.

Arestas duras, shading plano e smooth shading têm usos distintos. Escolha pelo acabamento e pela topologia. Verifique a API de smoothing da versão utilizada antes de reproduzir propriedades de versões anteriores.

Estabeleça unidades e escala antes de configurar bevels, displacement, luzes e câmeras. No shader, use canais de dados sem transformações de cor indevidas e faça o mapeamento manter a escala física ou estilística escolhida.

## Render e inspeção

Faça primeiro um render pequeno que mostre silhueta, contato e materiais. Inspecione a imagem com uma ferramenta de visualização disponível. Depois aumente resolução e amostragem conforme a entrega; escolher Cycles ou Eevee depende da aparência, plataforma e recursos disponíveis.

Registre câmera, resolução, transformação de visualização e seed quando necessários à comparação. Verifique ruído, denoising que apaga detalhes, fireflies, transparência e recortes. Não substitua essa inspeção pela existência de um arquivo PNG.

Se GPU falhar, considere CPU quando o custo for razoável e a ferramenta suportar. Se o Blender não executar, não afirme que o `.blend`, render ou exportação foram validados; entregue o trabalho possível com a limitação explícita.

## Exportação é uma etapa de produção

Confirme suporte do exportador e do consumidor a materiais, instâncias, animação e extensões. Um grafo procedural arbitrário não deve ser presumido portátil. Quando necessário, prepare UVs e bake dos canais suportados; reconstrua no destino somente se isso fizer parte da entrega.

No baking, preserve densidade de texel adequada, margens entre ilhas e correspondência da base tangente dos normal maps. Verifique os canais compactados e suas convenções no formato escolhido. Guarde a fonte procedural antes de converter ou aplicar modificadores.

Reimporte o resultado em uma cena vazia ou abra no consumidor real. Confira unidades, eixo, pivô, materiais, transparência, texturas e animações relevantes. Renderizar o arquivo fonte não valida o arquivo exportado.

Consulte o [manual de glTF do Blender](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) quando esse for o formato escolhido; confirme capacidades pela versão local do exportador e pelo carregador de destino.
