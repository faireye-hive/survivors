import test from 'node:test';
import assert from 'node:assert/strict';
import {insideFortress,crossesFortress,excludeEnemyFromFortresses,FORTRESS_BOUNDS,fortressClearance} from '../src/world/FortressBounds.js';
import {spawnEnemy,updateEnemies,updateEnemyShots,updateHazards} from '../src/systems/Enemies.js';

function game(){return {
 width:1200,height:800,elapsed:0,state:'playing',spawnTimer:999,
 campaign:{fortresses:[{buildings:{tower:1,wall:0},integrity:100}]},
 player:{x:0,y:0,hp:140,radius:16,armor:0,inv:0,level:1},
 enemies:[],hazards:[],enemyShots:[],encountersSeen:new Set(),
 audio:{play(){}},addText(){},burst(){},finish(){this.state='lost';}
};}
function outsideBody(e,index=0){
 const x=Math.abs(e.x-index*FORTRESS_BOUNDS.spacing),y=Math.abs(e.y);
 assert.ok(x>=FORTRESS_BOUNDS.halfWidth+fortressClearance(e)||y>=FORTRESS_BOUNDS.halfDepth+fortressClearance(e),`body inside: ${e.x},${e.y}, r=${e.radius}`);
}
test('every species spawns outside even the starting base without upgraded walls',()=>{
 const g=game();
 for(const type of ['slime','bat','spore','spider','wraith','skeleton','colossus'])
   for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5])outsideBody(spawnEnemy(g,type,{angle,radius:20}));
});
test('creatures approaching all sides cannot enter or hurt a hero inside',()=>{
 const g=game();
 for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
   const e=spawnEnemy(g,'spore',{angle,radius:450});e.sporeTimer=0;
 }
 for(let i=0;i<600;i++)updateEnemies(g,1/60);
 for(const e of g.enemies)outsideBody(e);
 assert.equal(g.player.hp,140);assert.equal(g.hazards.length,0);
});
test('swept collision stops boss charges crossing the entire fortress in one step',()=>{
 const g=game(),enemy={x:600,y:0,radius:65,vx:10000,vy:0};
 assert.equal(excludeEnemyFromFortresses(g,enemy,{x:-600,y:0}),true);
 assert.ok(enemy.x<0);outsideBody(enemy);
 assert.ok(crossesFortress(g,{x:-600,y:0},{x:600,y:0}));
});
test('stale positions are expelled and all conquered forts share the protection',()=>{
 const g=game();g.campaign.fortresses.push({buildings:{},integrity:0});
 for(const x of [0,1800]){const e={x,y:0,radius:20};excludeEnemyFromFortresses(g,e);outsideBody(e,x/1800);}
 assert.ok(insideFortress(g,{x:1800,y:100}));
 assert.equal(insideFortress(g,{x:450,y:0}),false);
});
test('hostile shots cannot cross walls or the entrance, even with a fast update',()=>{
 const g=game();
 g.enemyShots=[{x:600,y:0,vx:-2000,vy:0,life:3,radius:7,damage:20}];
 updateEnemyShots(g,.6);assert.equal(g.enemyShots.length,0);assert.equal(g.player.hp,140);
 g.player.x=450;g.enemyShots=[{x:490,y:0,vx:-100,vy:0,life:3,radius:7,damage:20}];
 updateEnemyShots(g,.3);assert.equal(g.player.hp,120);
});
test('spore pools outside cannot damage the interior and old pools inside disappear',()=>{
 const g=game();g.player.y=160;
 g.hazards=[{x:0,y:180,radius:80,damage:20,life:3,warmup:0},{x:0,y:0,radius:80,damage:20,life:3,warmup:0}];
 updateHazards(g,.1);assert.equal(g.player.hp,140);assert.equal(g.hazards.length,1);
 g.player.y=190;updateHazards(g,.1);assert.equal(g.player.hp,120);
});
test('perimeter collision leaves the hero-facing opening safe and permits movement outside',()=>{
 const g=game(),enemy={x:335,y:0,radius:16,vx:-100,vy:100};
 excludeEnemyFromFortresses(g,enemy,{x:360,y:-30});outsideBody(enemy);
 const free={x:450,y:100,radius:16,vx:0,vy:100};
 assert.equal(excludeEnemyFromFortresses(g,free,{x:450,y:0}),false);
 assert.equal(free.y,100);
});
