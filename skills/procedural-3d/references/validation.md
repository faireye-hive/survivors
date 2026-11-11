# Validação proporcional e entrega

Escolha verificações pelo modo de falha provável, pelo uso e pelo tamanho da mudança. Um gerador reutilizável pede mais cobertura que uma correção de cor. Não crie uma suíte que apenas confirme os nomes das funções ou replique sua implementação.

## Evidências distintas

| Evidência | O que comprova | O que não comprova |
| --- | --- | --- |
| Compilação/importação | Sintaxe e dependências nesse ambiente | Geometria correta, aparência ou FPS |
| Geração executada | Caminho de geração para os parâmetros testados | Todos os limites e seeds |
| Inspeção geométrica | Invariantes examinadas | Intenção artística |
| Imagem realmente inspecionada | Aparência naquela câmera e iluminação | Todas as vistas ou exportação |
| Arquivo reaberto no destino | Compatibilidade dos aspectos conferidos | Portabilidade para qualquer consumidor |
| Perfil de desempenho | Custo da carga e máquina medidas | Desempenho universal |

## Geometria e reprodução

Para malhas novas, escolha invariantes relevantes:

- Valores finitos, índices válidos e atributos com contagens compatíveis.
- Bounding box plausível e escala/origem corretas.
- Ausência de faces de área desprezível ou normais inválidas onde deveriam existir.
- Winding consistente, costuras esperadas e transições de LOD sem frestas.
- Componentes, aberturas e colisões coerentes com a intenção; exigir estanqueidade somente quando necessário.

Para geradores, execute o caso principal, alguns seeds distintos e extremos válidos que representem riscos reais. Confirme falha controlada para parâmetros inválidos e limites de recursos respeitados.

Compare a mesma configuração em duas execuções. Use um resumo canônico de geometria e parâmetros quando o formato contiver timestamps, IDs ou metadados variáveis; diferenças nos bytes do arquivo não implicam necessariamente diferenças no resultado.

Teste independência útil: mudar cor preserva geometria; aumentar resolução preserva a forma geral; gerar chunks em ordem diferente preserva conteúdo e bordas. Cobre essas propriedades somente quando fazem parte do contrato do gerador.

## Inspeção visual

Abra as imagens/renderizações. Para um asset, a câmera final e uma vista que revele suas áreas críticas costumam ser suficientes; adicione vistas conforme o risco de defeitos ocultos. Para populações, observe repetição, colisões e variação na escala final.

Se houver shaders, confira a iluminação final e uma iluminação de diagnóstico. Para animação ou movimento de câmera, inspecione a sequência: um frame estático não revela flicker, popping ou textura deslizando.

Registre problemas concretos e corrija os de maior impacto. Use estes critérios de aceitação, adaptando ao pedido:

- Identidade e silhueta reconhecíveis no tamanho de uso.
- Proporções, escala, apoios e junções coerentes.
- Materiais distintos e detalhes distribuídos com intenção.
- Ausência de artefatos visíveis de geometria, shading, transparência e LOD.
- Composição e iluminação sustentam a leitura desejada.
- Variações preservam a família visual sem cópias óbvias.

Sem ferramenta de renderização, use as verificações estruturais possíveis e identifique a lacuna visual. Não descreva um preview como aprovado só porque um arquivo foi gerado.

## Reabertura e empacotamento

Abra o arquivo exportado em um processo/cena limpo ou no consumidor solicitado, quando disponível. Confirme materiais/texturas, eixos, unidades, pivôs e animações aplicáveis. Use um validador oficial do formato se disponível e proporcional; ele complementa a inspeção no consumidor.

Entregue somente o necessário para uso e reprodução:

- Fonte editável ou patch integrado ao projeto.
- Resultado no formato pedido e dependências realmente necessárias.
- Seed e parâmetros relevantes, com uma forma curta de executar ou regenerar.
- Preview visual inspecionado quando possível.
- Resumo dos testes efetivamente executados e limitações concretas.

Para um lote ou pipeline reutilizável, um manifesto pequeno pode registrar versões, unidades, eixos, seed, parâmetros, arquivos e métricas medidas. Para uma peça simples, esses dados podem ficar no próprio gerador ou em uma instrução curta; não crie documentação duplicada.
