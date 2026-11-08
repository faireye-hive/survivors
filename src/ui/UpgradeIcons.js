/**
 * Ten bespoke, semantic 24×24 vector icons for the level-up screen.
 * Static paths are inserted through createElementNS, never innerHTML.
 * One silhouette per upgrade: easy to tell apart at a glance.
 */
export const UPGRADE_ICON_PATHS=Object.freeze({
  'stat:might':Object.freeze([
    'M6 14V9.7a1.5 1.5 0 0 1 3 0v-.9a1.5 1.5 0 0 1 3 0v-.4a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v4.3c0 3.1-1.9 5.3-4.8 6.1l-3.1.2-3.1-2.7L5 14.6a1.5 1.5 0 0 1 2.4-1.7l2 2.2',
    'M9 9v2.1M12 9v2.3M15 9v2.3'
  ]),
  'stat:vitality':Object.freeze([
    'M12 21s-8.6-5.4-9-11.1C2.7 5.5 7.3 3 12 7c4.7-4 9.3-1.5 9 2.9C20.6 15.6 12 21 12 21Z',
    'M12 9v6M9 12h6'
  ]),
  'stat:haste':Object.freeze([
    'M10 4v6l2.8 2.6 4.8 1.2 2.4 3.4V20H6.2C4.3 20 3 19 3 17.3V14l3.5-1.5L7.5 8',
    'M3 6h4M2 10h4M11 7h2'
  ]),
  'stat:magnet':Object.freeze([
    'M5 3v10a7 7 0 0 0 14 0V3h-5v10a2 2 0 0 1-4 0V3H5Z',
    'M5 7h5M14 7h5'
  ]),
  'stat:armor':Object.freeze([
    'M12 2 20 5v6c0 5.4-3.3 8.8-8 11-4.7-2.2-8-5.6-8-11V5l8-3Z',
    'M12 6v12M8 12h8'
  ]),
  'stat:recovery':Object.freeze([
    'M9 3h6M10 3v4L5.4 15A4 4 0 0 0 9 21h6a4 4 0 0 0 3.6-6L14 7V3',
    'M12 12v6M9 15h6'
  ]),
  'weapon:blade':Object.freeze([
    'M5 3 14 12M3 5l2-2 3 3-2 2-3-3ZM14 12l6 6M17.5 16l-2 2M20 18l1 1-2 2-1-1',
    'M19 3 10 12M21 5l-2-2-3 3 2 2 3-3ZM10 12l-6 6M6.5 16l2 2M4 18l-1 1 2 2 1-1'
  ]),
  'weapon:bolt':Object.freeze([
    'M14 2 5 14h6l-1 8 9-13h-6l1-7Z',
    'M4 4v3M2.5 5.5h3M20 18v3M18.5 19.5h3'
  ]),
  'weapon:dagger':Object.freeze([
    'M7 3 12 8 9 11 4 6 7 3ZM10 10l10 10M16 17l3-3',
    'M17 3 12 8l3 3 5-5-3-3ZM14 10 4 20M8 17l-3-3'
  ]),
  'weapon:aura':Object.freeze([
    'M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z',
    'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z',
    'M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1'
  ])
});
const NS='http://www.w3.org/2000/svg';
export function createUpgradeIcon(id,doc=globalThis.document){
  const paths=UPGRADE_ICON_PATHS[id];
  if(!paths)throw Error('Ícone de melhoria desconhecido: '+id);
  if(!doc?.createElementNS)throw Error('Document SVG indisponível');
  const svg=doc.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('stroke','currentColor');
  svg.setAttribute('stroke-width','1.8');
  svg.setAttribute('stroke-linejoin','round');
  svg.setAttribute('stroke-linecap','round');
  svg.setAttribute('focusable','false');
  svg.setAttribute('aria-hidden','true');
  svg.classList.add('upgrade-artwork');
  for(const d of paths){
    const path=doc.createElementNS(NS,'path');
    path.setAttribute('d',d);
    svg.append(path);
  }
  return svg;
}
