export const WEAPONS = Object.freeze({
  blade: { name: 'Lâmina solar', glyph: '⚔', effect: 'CORTE EM ARCO', accent: '#f1d69d',
    description: 'Arco de espada que atinge inimigos próximos.', cooldown: 0.78, damage: 28, maxLevel: 5 },
  bolt: { name: 'Fagulha arcana', glyph: '✦', effect: 'MAGIA GUIADA', accent: '#a3d5ff',
    description: 'Projétil mágico guiado pelo inimigo mais próximo.', cooldown: 0.95, damage: 26, maxLevel: 5 },
  dagger: { name: 'Adagas do vento', glyph: '➶', effect: 'ADAGAS PERFURANTES', accent: '#b7e8ad',
    description: 'Adagas velozes que atravessam os inimigos.', cooldown: 1.05, damage: 19, maxLevel: 5 },
  aura: { name: 'Aura rúnica', glyph: '✺', effect: 'ATAQUE EM ÁREA', accent: '#dfbaff',
    description: 'Pulsos mágicos que atingem inimigos ao redor.', cooldown: 1.65, damage: 16, maxLevel: 5 },
});
