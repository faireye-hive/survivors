import {META_IDS,META_UPGRADES,metaPrice} from '../data/metaUpgrades.js';
import {createUpgradeIcon} from './UpgradeIcons.js';

const NS='http://www.w3.org/2000/svg';
function iconFor(def,doc){
  if(def.icon!=='meta:wisdom')return createUpgradeIcon(def.icon,doc);
  // The book silhouette is unique to the persistent XP bonus.
  const svg=doc.createElementNS(NS,'svg');
  for(const [key,value] of Object.entries({
    viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',
    'stroke-width':'1.8','stroke-linejoin':'round','stroke-linecap':'round',
    focusable:'false','aria-hidden':'true'
  }))svg.setAttribute(key,value);
  svg.classList.add('upgrade-artwork');
  for(const d of [
    'M12 6c-2.3-1.6-5.5-2-9-1.1v13.7c3.5-.8 6.6-.5 9 1.2 2.4-1.7 5.5-2 9-1.2V4.9c-3.5-.9-6.7-.5-9 1.1Z',
    'M12 6v13.8M6 9l3 .2M15 9.2l3-.3M6 13l3 .3M15 13.3l3-.3'
  ]){
    const path=doc.createElementNS(NS,'path');
    path.setAttribute('d',d);svg.append(path);
  }
  return svg;
}
function span(doc,cls,text){
  const el=doc.createElement('span');
  el.className=cls;el.textContent=text;return el;
}
/** Rebuilds the six cards after every purchase, with no unsafe HTML. */
export function renderShopGrid(container,profile,doc=globalThis.document){
  container.replaceChildren();
  for(const id of META_IDS){
    const def=META_UPGRADES[id],level=profile.upgrades?.[id]||0;
    const cost=metaPrice(id,level),maxed=cost===null;
    const affordable=maxed||profile.gold>=cost;
    const card=doc.createElement('button');
    card.type='button';card.className='meta-upgrade-card';
    card.dataset.metaUpgrade=id;card.dataset.maxed=String(maxed);
    card.dataset.affordable=String(affordable);
    card.style.setProperty('--meta-accent',def.color);
    card.disabled=maxed;
    const art=doc.createElement('span');art.className='meta-upgrade-icon';
    art.append(iconFor(def,doc));
    const body=doc.createElement('span');body.className='meta-upgrade-body';
    body.append(
      span(doc,'meta-upgrade-name',def.name),
      span(doc,'meta-upgrade-effect',def.effect),
      span(doc,'meta-upgrade-desc',def.description)
    );
    const progress=doc.createElement('span');
    progress.className='meta-upgrade-progress';
    progress.setAttribute('aria-hidden','true');
    for(let i=0;i<def.maxLevel;i++){
      const pip=span(doc,'meta-upgrade-pip','');
      if(i<level)pip.classList.add('filled');
      progress.append(pip);
    }
    body.append(progress);
    const aside=doc.createElement('span');aside.className='meta-upgrade-right';
    aside.append(
      span(doc,'meta-upgrade-level','Nv. '+level+'/'+def.maxLevel),
      span(doc,'meta-upgrade-cost',maxed?'MÁXIMO':'🪙 '+cost)
    );
    card.append(art,body,aside);
    card.setAttribute('aria-label',def.name+', nível '+level+' de '+def.maxLevel+
      '. '+def.effect+'. '+(maxed?'Máximo atingido':
        (affordable?'Comprar por ':'Faltam ')+(affordable?cost:cost-profile.gold)+' moedas.'));
    container.append(card);
  }
}
