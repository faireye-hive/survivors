export const STAT_UPGRADES = Object.freeze({
  might: { theme: 'attack', name: 'Força interior', glyph: '✊', effect: '+15% DANO', accent: '#ff8667',
    description: 'Aumenta o dano de todas as armas em 15%.', maxLevel: 5 },
  vitality: { theme: 'defense', name: 'Sangue ancestral', glyph: '♥', effect: '+25 VIDA MÁX.', accent: '#80baf7',
    description: 'Aumenta a vida máxima em 25 e recupera 25 PV.', maxLevel: 5 },
  haste: { theme: 'utility', name: 'Passos leves', glyph: '➤', effect: '+9% VELOCIDADE', accent: '#5dd6b1',
    description: 'Aumenta a velocidade de movimento em 9%.', maxLevel: 5 },
  magnet: { theme: 'utility', name: 'Ímã de Éter', glyph: '∩', effect: '+34 ALCANCE XP', accent: '#71cfe5',
    description: 'Amplia o alcance de coleta de experiência.', maxLevel: 5 },
  armor: { theme: 'defense', name: 'Pele de pedra', glyph: '⬡', effect: '+2 ARMADURA', accent: '#83aaff',
    description: 'Reduz em 2 o dano recebido de cada golpe.', maxLevel: 5 },
  recovery: { theme: 'utility', name: 'Renovação', glyph: '✚', effect: '+40 PV AGORA', accent: '#80ddac',
    description: 'Recupera 40 PV instantaneamente.', maxLevel: 99 },
});
