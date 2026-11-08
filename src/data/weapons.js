export const WEAPONS = Object.freeze({
  blade: { theme: 'attack', name: 'Lâmina solar', glyph: '⚔', effect: 'CORTE EM ARCO', accent: '#f8a263',
    description: 'Arco de espada que atinge inimigos próximos.', cooldown: 0.78, damage: 28, maxLevel: 5 },
  bolt: { theme: 'attack', name: 'Fagulha arcana', glyph: '✦', effect: 'MAGIA GUIADA', accent: '#f4bc73',
    description: 'Projétil mágico guiado pelo inimigo mais próximo.', cooldown: 0.95, damage: 26, maxLevel: 5 },
  dagger: { theme: 'attack', name: 'Adagas do vento', glyph: '➶', effect: 'ADAGAS PERFURANTES', accent: '#f07e68',
    description: 'Adagas velozes que atravessam os inimigos.', cooldown: 1.05, damage: 19, maxLevel: 5 },
  aura: { theme: 'attack', name: 'Aura rúnica', glyph: '✺', effect: 'ATAQUE EM ÁREA', accent: '#eb7973',
    description: 'Pulsos mágicos que atingem inimigos ao redor.', cooldown: 1.65, damage: 16, maxLevel: 5 },
});
