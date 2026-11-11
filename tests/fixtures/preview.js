
// Exercise the real game in an isolated, in-memory save. Never writes player progress.
const html=await (await fetch('/index.html')).text();
const bootstrap=`<script type="module">
const values=new Map();
Object.defineProperty(window,'localStorage',{value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}});
const runtimeErrors=[];window.addEventListener('error',e=>runtimeErrors.push(e.message));window.addEventListener('unhandledrejection',e=>runtimeErrors.push(String(e.reason)));
await import('/src/main.js');
const params=new URLSearchParams(location.search);
const frameTimes=[];let lastFrame=performance.now();function measure(now){frameTimes.push(now-lastFrame);if(frameTimes.length>60)frameTimes.shift();lastFrame=now;requestAnimationFrame(measure);}requestAnimationFrame(measure);
const report=document.createElement('output');report.id='renderer-status';report.hidden=true;document.body.append(report);
setInterval(()=>{const {game}=window.__ETER_DEV__,gpu=game.renderer.gpu;report.textContent=JSON.stringify({errors:runtimeErrors,hp:game.player.hp,insideEnemies:game.enemies.filter(e=>game.campaign.fortresses.some((_,i)=>Math.abs(e.x-i*1800)<300+e.radius&&Math.abs(e.y)<165+e.radius)).length,fps:Math.round(1000/(frameTimes.reduce((a,b)=>a+b,0)/Math.max(1,frameTimes.length))),calls:gpu.info.render.calls,triangles:gpu.info.render.triangles,geometries:gpu.info.memory.geometries,textures:gpu.info.memory.textures,resources:game.resourceNodes.length,resourceAssets:[...(game.renderer.collections.get('resources')?.values()||[])].map(root=>root.userData.assetId||'wood'),elapsed:game.elapsed,kills:game.kills,enemies:game.enemies.length,paused:game.paused,player:{x:game.player.x,y:game.player.y},form:game.player.classId});},500);

if(params.has('protection')){
 const {game,ui}=window.__ETER_DEV__;const {spawnEnemy}=await import('/src/systems/Enemies.js');
 game.start('guardian');cancelAnimationFrame(game.raf);game.spawnTimer=999;game.enemies=[];
 const types=['slime','bat','skeleton','spore','spider','wraith','colossus'];
 for(let i=0;i<28;i++)spawnEnemy(game,types[i%types.length],{angle:i*Math.PI/14,radius:650});
 for(let i=0;i<1200;i++)game.step(1/60);
 game.paused=true;ui.update(game,true);game.render();
}
if(params.has('showcase')||params.has('stress')){
 const {game}=window.__ETER_DEV__;
 game.start(params.get('form')||'guardian');game.paused=true;
 const {spawnEnemy}=await import('/src/systems/Enemies.js');
 game.enemies=[];
 const types=['slime','bat','skeleton','spore','spider','wraith','colossus'];
 const spots=[[-100,170],[120,150],[-250,240],[260,160],[-280,350],[-70,320],[340,320]];
 const count=params.has('stress')?170:types.length;
 for(let i=0;i<count;i++){spawnEnemy(game,types[i%types.length]);const e=game.enemies.at(-1),spot=spots[i%spots.length],angle=i*2.399,radius=180+(i%9)*65;e.x=game.player.x+(params.has('stress')?Math.cos(angle)*radius:spot[0]);e.y=game.player.y+(params.has('stress')?Math.sin(angle)*radius:spot[1]);e.vx=0;e.vy=-10;e.hp=e.maxHp*.65;}
 if(params.has('built')){const f=game.campaign.fortresses[0];f.buildings={house:1,tower:2,lumber:1,quarry:1,wall:2};f.workers=[{role:'guard'},{role:'lumberjack'},{role:'miner'}];f.project={type:'wall',progress:5,required:12};}
 game.drops=['xp','heal','wood','stone','relic'].map((kind,i)=>({kind,x:game.player.x+180,y:game.player.y-160+i*55,life:90,value:1}));
 game.resourceNodes=[{id:1,kind:'wood',x:game.player.x-350,y:game.player.y+210},{id:2,kind:'stone',x:game.player.x+350,y:game.player.y+210}];
 game.hazards=[{x:game.player.x+300,y:game.player.y+60,radius:60,life:9,warmup:2}];
 window.__ETER_DEV__.ui.update(game,true);game.render();
}
if(params.has('construction')){
 const {game,ui}=window.__ETER_DEV__;game.start(params.get('form')||'guardian');cancelAnimationFrame(game.raf);game.paused=true;
 const rawProgress=Number(params.get('progress')),progress=Math.max(0,Math.min(1,Number.isFinite(rawProgress)?rawProgress/100:.5)),fort=game.campaign.fortresses[0];
 const type=params.get('type')||'wall',woodRequired=type==='house'?22:30,stoneRequired=type==='house'?10:20;
 fort.buildings={house:type==='house'?0:1,tower:0,lumber:0,quarry:0,wall:0};
 fort.project={type,progress:12*progress,required:12,woodRequired,stoneRequired,woodDelivered:woodRequired*progress,stoneDelivered:stoneRequired*progress};
 ui.update(game,true);game.render();
}
if(params.has('ore')){
 const {game}=window.__ETER_DEV__;game.start('guardian');cancelAnimationFrame(game.raf);game.paused=true;game.enemies=[];
 game.resourceNodes=[{id:'ore-preview',kind:'stone',x:game.player.x-40,y:game.player.y+300}];
 game.render();
}
if(params.has('metrics')){report.hidden=false;report.style.cssText='position:fixed;right:12px;bottom:12px;z-index:9999;max-width:420px;padding:8px 10px;border-radius:7px;background:#10252be8;color:#f5ead0;font:11px ui-monospace,monospace;pointer-events:none';}
</script>`;
const safeHtml=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
document.open();document.write(safeHtml.replace('<head>','<head><base href="/">').replace('</body>',bootstrap+'</body>'));document.close();
