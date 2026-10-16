// Deterministic browser capture; uses the real wallpaper and real mouse actions.
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const {spawnSync}=require('child_process');
let chromium;
try {({chromium}=require('playwright'));}
catch {({chromium}=require('../../../tools/ui-inspector/node_modules/playwright-core'));}
const root=path.resolve(__dirname,'..');
const frames=path.join(root,'checks/output/demo-frames');
fs.mkdirSync(frames,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:process.env.DEMO_BROWSER||'msedge',headless:true});
 const evidence=[];
 try {
  const page=await browser.newPage({viewport:{width:640,height:400},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))errors.push('Unexpected network request: '+r.url());});
  await page.addInitScript(()=>{
    let time=0,queue=[],seed=18;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    Object.defineProperty(performance,'now',{value:()=>time});
    window.requestAnimationFrame=callback=>{queue.push(callback);return queue.length;};
    window.demoStep=milliseconds=>{
      // Four 20ms simulation ticks per GIF frame, independent of screenshot speed.
      for(let left=milliseconds;left>0;left-=20){time+=Math.min(left,20);const callbacks=queue;queue=[];callbacks.forEach(fn=>fn(time));}
    };
  });
  await page.goto(pathToFileURL(path.join(root,'wallpaper/index.html')).href);
  await page.evaluate(()=>{
    wallpaperPropertyListener.applyGeneralProperties({fps:60});
    const caption=document.createElement('div');caption.id='demo-caption';
    caption.style.cssText='position:fixed;bottom:18px;left:0;right:0;text-align:center;font:14px "Segoe UI","Microsoft YaHei",sans-serif;color:#455039;letter-spacing:1px;pointer-events:none';
    document.body.appendChild(caption);
    const cursor=document.createElement('div');cursor.id='demo-cursor';
    cursor.style.cssText='position:fixed;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#45503999;box-sizing:border-box;transform:translate(-50%,-50%);pointer-events:none';
    document.body.appendChild(cursor);
  });
  async function move(x,y){
    await page.mouse.move(x,y);
    await page.evaluate(({x,y})=>{const c=document.querySelector('#demo-cursor');c.style.left=x+'px';c.style.top=y+'px';},{x,y});
  }
  for(let i=0;i<90;i++){
    let label='跟着你的目光';
    if(i<18){const a=i/17*Math.PI*2;await move(320+Math.sin(a)*190,220+Math.cos(a)*70);}
    if(i===18){await move(320,200);await page.mouse.down();}
    if(i===20)await page.mouse.up();
    if(i>=18&&i<27)label='点一下，轻轻回弹';
    if(i>=27&&i<=39){
      const positions=[270,292.5,315,337.5,360,337.5,315,292.5,270,292.5,315,337.5,360];
      await move(positions[i-27],130);
    }
    if(i>=27&&i<57)label='摸摸头，笑一个';
    if(i>=57&&i<67){await move(320,200);await page.mouse.click(320,200);}
    if(i>=57)label=i<67?'连点十下……':'好啦好啦，知道了  - -';
    await page.evaluate(({label,pressed})=>{
      document.querySelector('#demo-caption').textContent=label;
      document.querySelector('#demo-cursor').style.background=pressed?'#fff':'#45503999';
      window.demoStep(80);
    },{label,pressed:(i>=18&&i<20)||(i>=57&&i<67)});
    const state=await page.evaluate(()=>badgeDiagnostics());
    evidence.push({frame:i,...state});
    await page.screenshot({path:path.join(frames,`${String(i).padStart(3,'0')}.png`)});
  }
  if(errors.length)throw Error(errors.join('\n'));
  if(!evidence.slice(0,18).some(s=>Math.abs(s.rotation.y)>0.1))throw Error('Gaze did not move');
  if(!evidence.slice(18,25).some(s=>s.eyeOpen<0.5&&s.scaleY<0.99))throw Error('Blink/compression not captured');
  if(!evidence.slice(30,57).some(s=>s.happy&&s.blush>0.9))throw Error('Smile not captured');
  if(!evidence.slice(67).every(s=>s.deadpan))throw Error('Deadpan not captured');
  fs.writeFileSync(path.join(frames,'capture.json'),JSON.stringify({width:640,height:400,frameMs:80,count:90,evidence},null,2));
 } finally {await browser.close();}
 const encoded=spawnSync(process.env.PYTHON||'python',[path.join(__dirname,'encode-demo.py'),frames,path.join(root,'assets/little-knot-demo.gif')],{stdio:'inherit'});
 if(encoded.error)throw encoded.error;
 if(encoded.status!==0)throw Error('GIF encoding failed');
})().catch(e=>{console.error(e);process.exitCode=1;});
