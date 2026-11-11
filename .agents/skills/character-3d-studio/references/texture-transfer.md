# Pintura projetada e transferência

## Registrar as projeções

Renderize a geometria com câmera ortográfica e fundo uniforme. Guarde transformação da câmera, escala ortográfica, enquadramento e resolução. Ao gerar pintura, peça preservação da silhueta, pose, proporções e coordenadas; forneça a referência de estilo separadamente. Frente e verso exigem alvos próprios.

Compare a pintura com o render antes de projetar: geração por IA pode deslocar cabeça, pés ou altura mesmo com instruções explícitas. Ajuste o registro ou regenere quando necessário. Use projeção correspondente à câmera real; não associe a imagem inteira ao UV original.

Limite pintura por orientação e visibilidade com ray casting. Transições suaves evitam faixas laterais. Superfícies oclusas e rasantes precisam de fonte alternativa ou pintura própria. Máscara de silhueta/alpha ajuda a não pintar o fundo nas bordas; uma máscara por saturação só serve quando o fundo e a paleta permitem, pois pode rejeitar metal neutro.

## Cascas, UVs e redução

Se surgirem manchas sem correspondência na pintura, inspecione UVs sobrepostos, superfícies internas e normais invertidas. Em samples com cascas muito próximas, pintar apenas a casca externa pode deixar a interna sobrescrever o mesmo texel durante o bake. Corrija a geometria ou trate essas superfícies explicitamente. Não use valor absoluto de normal indiscriminadamente em qualquer modelo.

Vértices coincidentes exportados por glTF podem ser costuras UV. Una por posição com tolerância proporcional à escala antes de decimar, preservando UVs por canto; não una camadas distintas ou dedos próximos. Redução independente dos dois lados da costura pode abrir frestas.

Se a redução invalidar o atlas, gere UVs próprios na malha reduzida e transfira cor e dados do high para o low. Use cage e distância de raios ajustadas às espessuras locais. Confira o normal map tangente em mais de uma iluminação. Desconecte a textura de destino do shader lido durante o bake para evitar dependência circular.

## Materiais e arquivos

Separe metal, couro, pele e tecido usando roughness/metalness, mesmo com um material e atlas único. Sombras artísticas pintadas fazem parte de um estilo, mas não são albedo físico puro; evite duplicar sombra direcional intensa no motor.

No glTF, roughness ocupa G e metallic B; occlusion usa R quando conectado. Verifique o conteúdo exportado, não apenas o nome ORM. Ao reduzir imagens empacotadas no Blender, salve e reabra o arquivo reduzido ou confirme que o exportador não reutilizou bytes originais. Leia dimensões das imagens dentro do GLB final.

Em scripts Blender, calcule normais primeiro e escreva atributos em lote. Alternar alteração de atributos com leitura de normais por vértice pode provocar recomputação repetida e tornar o processo impraticável.
