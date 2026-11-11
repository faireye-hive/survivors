# 3D Procedural Artist

Skill de modelagem 3D procedural voltada a jogos de sobrevivência com Three.js/WebGL. Não exige Blender, Unity nem modelador 3D externo.

## Uso com agentes

Leia [SKILL.md](SKILL.md) e as referências em [references/](references/) antes de criar estruturas 3D. A instalação no repositório não significa instalação automática como plugin na conta do ChatGPT.

## Exemplo isolado

- [examples/demo.html](examples/demo.html): demonstração 3D com muros, torres, portão e construção progressiva.
- [examples/fortress-generator.js](examples/fortress-generator.js): gerador paramétrico, sem modelos 3D importados.
- [examples/smoke-test.mjs](examples/smoke-test.mjs): teste estrutural com mocks, sem renderização.

Para ver a demonstração, sirva a pasta por HTTP (ex.: Vite/Live Server) e abra `demo.html`. O HTML usa um CDN para Three.js. Os exemplos não foram conectados ao jogo automaticamente.

Teste de estrutura: execute `node .agents/skills/3d-procedural-artist/examples/smoke-test.mjs` na raiz do repositório.
