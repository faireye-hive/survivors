---
name: procedural-3d
description: Crie, refine e depure modelos, materiais e cenários 3D procedurais por código ou grafos de nós, com direção de arte, geração reproduzível e validação visual. Use para assets paramétricos, terrenos, vegetação, arquitetura modular, Geometry Nodes e geometria gerada em motores 3D. Não use para imagens 2D que apenas imitam 3D ou para tarefas sem geração procedural.
---

# 3D Procedural

Entregue geometria e um gerador editável que produzam a aparência desejada no destino real. Qualidade significa forma intencional, materiais legíveis, estabilidade dos parâmetros e custo adequado à câmera e à plataforma; quantidade de polígonos ou de ruído não é uma medida de qualidade.

## Defina o resultado antes da técnica

Inspecione o projeto, os assets e a ferramenta disponíveis. Preserve a engine, a linguagem, a estética e o formato pedidos. Em um projeto existente, reutilize sua organização, materiais e convenções antes de criar uma pipeline paralela.

Extraia do pedido e do projeto: objeto/cenário, estilo, escala, câmera de uso, plataforma, formato de entrega e restrições relevantes. Pergunte somente pelo que mudaria substancialmente o resultado e não puder ser inferido. Para um pedido aberto, escolha e declare uma direção visual concreta e comece por uma amostra representativa.

- Asset offline ou render: Blender é uma opção quando disponível e apropriado; confirme que o executável realmente funciona.
- Cena interativa existente: trabalhe na engine instalada. Three.js não é requisito universal.
- Geometry Nodes: prefira quando o usuário precisa de controles visuais e edição não destrutiva.
- Houdini, Godot, Unity ou Unreal: mantenha a ferramenta escolhida; consulte a API oficial da versão instalada para suas particularidades.
- Se a ferramenta necessária estiver ausente, produza as partes executáveis no ambiente e explicite a limitação; não troque silenciosamente um modelo 3D por uma imagem.

Escolha um formato de entrega compatível com o consumidor. Use GLB quando conveniente, não por obrigação. Código procedural, grafos de materiais e dados específicos de uma engine podem exigir baking ou adaptação antes da exportação.

## Consulte somente a referência necessária

- [Direção de arte](references/art-direction.md): para decisões de forma, materiais, composição e revisão visual.
- [Geometria e geração](references/geometry.md): para malhas, terrenos, distribuição, curvas, determinismo e parâmetros.
- [Blender](references/blender.md): ao usar Python, Geometry Nodes, render ou exportação no Blender.
- [Tempo real](references/realtime.md): ao gerar assets/cenas para jogos e aplicações interativas, incluindo Three.js.
- [Validação e entrega](references/validation.md): ao testar o gerador e entregar o asset final.

Use documentação oficial correspondente à versão instalada quando um detalhe de API afetar a implementação. Não atualize dependências apenas para adaptar o projeto a um exemplo.

## Trabalhe por evidências visuais

1. **Forma e escala.** Construa a silhueta, as proporções, o contato com o solo e a câmera. Inspecione um preview simples antes de adicionar detalhes caros.
2. **Estrutura.** Acrescente formas secundárias com uma lógica reconhecível: montagem, crescimento, fratura, erosão ou uso. Defina regiões de detalhe e regiões de descanso.
3. **Superfície.** Separe materiais, rugosidade e variação de cor. Reserve geometria para alterações perceptíveis na silhueta, profundidade ou sombra; use shading para microdetalhes quando adequado.
4. **Apresentação.** Ajuste luz, exposição, enquadramento e contraste na câmera final. Verifique também sob luz neutra para detectar defeitos escondidos pelo look.
5. **Verificação.** Execute o gerador, teste parâmetros representativos, inspecione imagens e valide a versão exportada no destino quando disponível.

Em cada passagem, corrija primeiro o defeito que mais prejudica o resultado. Evite expandir o sistema antes de uma amostra demonstrar a qualidade desejada. Itere até atender aos critérios do pedido ou identificar um bloqueio concreto; informe o que ficou sem verificação.

## Contrato do gerador

Separe parâmetros, geração geométrica, materiais, composição e exportação o suficiente para permitir alterações independentes. Exponha controles artísticos significativos, com unidades, intervalos válidos e comportamento nos limites; não exponha todo coeficiente interno.

Para famílias de assets, mantenha seed explícita e IDs estáveis. Independência entre variação de forma, distribuição e material evita que mudar uma cor reorganize a cena. Registre seed, parâmetros e versões necessárias à reprodução. Não prometa determinismo entre versões, GPUs ou algoritmos diferentes sem teste.

Preserve o trabalho do usuário: regenere apenas os objetos/coleções pertencentes ao gerador. Reexecução não deve duplicar objetos, acumular recursos ou apagar a cena inteira. Em um arquivo novo e isolado, limpar a cena inicial pode ser apropriado.

Dimensione os controles de qualidade ao uso: preview, final, LOD ou densidade somente quando úteis. Estabeleça limites para subdivisão, contagens e tentativas de distribuição antes que parâmetros extremos esgotem memória ou travem a aplicação.

## Critério de conclusão

A entrega deve permitir usar e reproduzir o resultado: gerador ou grafo editável, asset no formato solicitado e instrução curta de execução com os parâmetros principais. Inclua preview inspecionado quando houver ferramenta de renderização. Para uma alteração pequena, entregue o patch e evidência proporcional, sem exigir um pacote novo.

Diferencie o que executou, o que verificou visualmente e o que foi apenas preparado. Build bem-sucedido não comprova qualidade visual; render bonito não comprova exportação, desempenho ou validade da malha. Nunca afirme testes que não executou.