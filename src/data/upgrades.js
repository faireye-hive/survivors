export const STAT_UPGRADES = Object.freeze({
  might: { name: 'Força interior', glyph: '✊', effect: '+15% DANO', accent: '#f1a58d',
    description: 'Aumenta o dano de todas as armas em 15%.', maxLevel: 5 },
  vitality: { name: 'Sangue ancestral', glyph: '♥', effect: '+25 VIDA MÁX.', accent: '#f0a7b6',
    description: 'Aumenta a vida máxima em 25 e recupera 25 PV.', maxLevel: 5 },
  haste: { name: 'Passos leves', glyph: '➤', effect: '+9% VELOCIDADE', accent: '#94e8cf',
    description: 'Aumenta a velocidade de movimento em 9%.', maxLevel: 5 },
  magnet: { name: 'Ímã de Éter', glyph: '∩', effect: '+34 ALCANCE XP', accent: '#cbb5ff',
    description: 'Amplia o alcance de coleta de experiência.', maxLevel: 5 },
  armor: { name: 'Pele de pedra', glyph: '⬡', effect: '+2 ARMADURA', accent: '#a9cafd',
    description: 'Reduz em 2 o dano recebido de cada golpe.', maxLevel: 5 },
  recovery: { name: 'Renovação', glyph: '✚', effect: '+40 PV AGORA', accent: '#aee8ab',
    description: 'Recupera 40 PV instantaneamente.', maxLevel: 99 },
});
