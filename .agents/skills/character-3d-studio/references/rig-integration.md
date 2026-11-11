# Rig e integração em tempo real

Escolha a hierarquia a partir das articulações do modelo e do movimento esperado. Use loops de deformação quando a qualidade exigir; decimação preserva aparência estática, não garante dobramento adequado. Cabelo, fivelas e placas rígidas precisam de pesos que preservem sua forma.

Proximidade aos ossos pode iniciar pesos, mas precisa de máscaras anatômicas: a bolsa ao lado do braço não deve seguir o antebraço, nem a outra perna receber influência por mera proximidade. Normalize pesos, limite influências ao suporte do destino e teste poses extremas. Não dê como pronto um rig apenas porque exportou sem erro.

Crie clipes coerentes com as ações do jogo. Caminhada precisa de alternância de apoio, flexão de joelho e compensação dos braços; o ataque precisa corresponder ao evento de combate. Escolha explicitamente movimento na raiz ou caminhada no lugar. Evite aplicar deslocamento vertical simultaneamente no clipe e no código.

## Carregamento e ciclo de vida

- Cacheie o asset base; clone hierarquia e ossos por instância com ferramenta apropriada do motor. Em Three.js, SkeletonUtils.clone evita compartilhar ossos entre menu e jogo.
- Mantenha mixer e estado de animação por ator. Geometrias e texturas podem ser compartilhadas, desde que seu descarte tenha dono definido.
- Valide clipes necessários antes de remover o modelo anterior. Uma falha de rede deve manter um fallback utilizável e permitir nova tentativa apropriada.
- Se um ator for descartado enquanto carrega, não o reinsira após a Promise resolver. Na liberação, pare ações, remova caches do mixer e libere esqueletos da instância. Não descarte texturas compartilhadas enquanto outro ator as utiliza.
- Use delta de tempo limitado, transições curtas e ataque que possa reiniciar para um novo evento. Verifique pause/resume e trocas rápidas de classe.

## Verificação no destino

Abra o jogo real e o seletor de personagem. Confirme que ambos usam o asset correto, movimentos e orientação seguem o controle, e mudar uma instância não anima outra. Teste o carregamento tardio e falha com testes focados quando houver integração assíncrona.

Inspecione console, métricas de GPU e desempenho com a cena relevante. Use save isolado quando disponível. Um preview estático não comprova integração no combate. Documente o hardware/contexto quando reportar FPS; não generalize uma captura de desenvolvimento como garantia de desempenho.
