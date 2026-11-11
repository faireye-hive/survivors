# Arquitetura procedural para survival

## Unidade, orientação e envelope
- 1 unidade = 1 metro; Y cresce para cima; solo em Y=0; eixo Z positivo é frente da base, salvo convenção do projeto.
- Modelo inclui `group.userData`: `assetId`, `category`, `version`, `bounds`, `stage`, `collisionHint`.
- Portas com vão suficiente para o avatar usado no jogo, não proporções fixas arbitrárias. Verifique contra o raio/altura do agente.
- Telhados sempre têm beiral, inclinação, cumeeira, espessura e peças de apoio; não coloque planos finos sem lateral visível.

## Muro modular de pedra
- Estrutura: sapata mais larga que o muro, corpo espesso com topo, contrafortes nos módulos, ameias/merlões alternados e juntas de alvenaria.
- Para paredões extensos: compor módulos padronizados, reutilizar geometrias e instanciar os contrafortes. Não criar uma geometria por pedra distante sem necessidade.
- Entrada: corte real na linha do perímetro com passagem contínua. Não use muro intacto atrás do portão.
- Materiais: pedra rugosa cinza quente, rejunte escuro, desgaste das quinas. Variação discreta por módulo com seed, não ruído cromático aleatório exagerado.

## Casa/oficina
- Silhueta: largura, altura de parede, profundidade, inclinação do telhado e posição da porta devem se ler mesmo a 15–30 metros da câmera.
- Componentes: fundação, paredes com espessura, montantes/pilares, telhado duplo com beiral, cumeeira, portal, janelas, vigas e ferragens.
- Evite telhado plano que cubra a fachada, porta falsa desenhada com um retângulo sem profundidade, e elementos simétricos repetidos sem propósito.
- Evolução 0–1: 0–0.14 implantação e estacas; 0.14–0.30 alicerces; 0.30–0.52 postes e armação; 0.52–0.75 fechamento; 0.75–0.90 cobertura; 0.90–1 detalhes. Para progresso contínuo, é aceitável preencher fileiras/elementos por módulos discretos quando a progressão for consistente e legível.

## Torre e portão
- Torre: base estável, corpo elevado, plataforma/varanda, ameias e pequena entrada. Use cilindro segmentado ou malha poligonal com UVs para fuste, evitando torre-cubo genérica.
- Portão: vão adequado, verga/arco, soleira, ombreiras, dois painéis ou grade com espessura, dobradiças e reforços. Sem geometria sólida bloqueando a passagem quando está aberto.
- Garanta continuidade do perímetro, sem lacunas invisíveis entre módulos.

## Estágios de construção e automação da base
- Um `constructionSite` mantém `id`, `type`, `position`, `rotation`, `resourcesRequired`, `resourcesStored`, `progress`, `workers`, `meshRoot`.
- Jogador aproxima-se fisicamente da plataforma de depósito; a ação de depósito/transferência altera armazenamento. A colocação de materiais é visível (pilhas, carroças, andaimes) e a malha cresce conforme progressão.
- Contratados recebem tarefas e deslocam-se fisicamente até depósitos/construções. A velocidade aumenta, mas não transforma a base em painel abstrato.
- Mantenha colisor e navmesh passáveis no estágio inicial; atualize conforme paredes e portões aparecem.

## Controles de arte sugeridos
Parâmetros em um objeto serializável: `width`, `depth`, `wallHeight`, `wallThickness`, `roofPitch`, `stoneHue`, `timberHue`, `weathering`, `seed`, `quality`, `progress`. Mantenha a API determinística; mesmas opções devem gerar a mesma geometria.