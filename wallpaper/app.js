(() => {
  'use strict';
  const settings = window.badgeSettings;
  const studioMode = new URLSearchParams(location.search).has('studio');
  const studio = document.querySelector('#studio');
  studio.hidden = !studioMode;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'}); }
  catch (error) { document.querySelector('#error').hidden=false; console.error(error); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.querySelector('#world').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6,6,3.6,-3.6,0.1,40);
  camera.position.set(0,0,12);
  scene.add(new THREE.HemisphereLight(0xffffff,0x7a806c,0.95));
  const light = new THREE.DirectionalLight(0xfff7e7,0.85);
  light.position.set(-3,6,8); scene.add(light);
  const rim = new THREE.DirectionalLight(0xffffff,0.25);
  rim.position.set(5,1,-2); scene.add(rim);
  const badge = new THREE.Group(); scene.add(badge);
  const hitMeshes=[];
  let happy=false, happyUntil=0, deadpan=false, deadpanUntil=0, pressStart=-10;
  let tapTimes=[];
  let petCooldownUntil=0;
  const faceMaterial = new THREE.MeshLambertMaterial({color:0xfaf9f2,flatShading:true});
  const sideMaterial = new THREE.MeshLambertMaterial({color:settings.ink,flatShading:true});
  const inkMaterial = new THREE.MeshLambertMaterial({color:settings.ink,flatShading:true});

  // SVG supplies the exact six-lobed silhouette; all visible layers are extruded meshes.
  const data = new THREE.SVGLoader().parse(window.BADGE_SVG);
  // This even-odd icon stores seven cutouts first and the exterior last.
  // Explicit assignment avoids the old SVGLoader misclassifying touching bounds.
  const contours = data.paths[0].subPaths;
  const exterior = contours[contours.length-1];
  const shapes = [{getPoints: n => exterior.getPoints(n), holes:contours.slice(0,-1)}];
  function mappedPath(path, isShape) {
    const points = path.getPoints(3).map(p => new THREE.Vector2((p.x-12)*0.145,(12-p.y)*0.145));
    return isShape ? new THREE.Shape(points) : new THREE.Path(points);
  }
  shapes.forEach(source => {
    const silhouette = mappedPath(source,true);
    const base = new THREE.ExtrudeGeometry(silhouette,{depth:0.48,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:0.045,bevelThickness:0.035,curveSegments:1});
    base.translate(0,0,-0.34);
    const body=new THREE.Mesh(base,[faceMaterial,sideMaterial]);
    badge.add(body); hitMeshes.push(body);
    const motif = mappedPath(source,true);
    const raised = new THREE.ExtrudeGeometry(motif,{depth:0.035,bevelEnabled:false,steps:1,curveSegments:1});
    raised.translate(0,0,0.178);
    badge.add(new THREE.Mesh(raised,inkMaterial));
    // Separate white inlays keep the narrow interwoven regions robust under triangulation.
    const inlays = new THREE.ExtrudeGeometry(source.holes.map(hole => mappedPath(hole,true)),{depth:0.004,bevelEnabled:false,steps:1,curveSegments:1});
    inlays.translate(0,0,0.214);
    badge.add(new THREE.Mesh(inlays,faceMaterial));
  });

  const eyes = [];
  // Outline, dark oval and highlight are painted into ONE flat texture.
  // They cannot slide independently or acquire separate depth while turning.
  const eyeCanvas = document.createElement('canvas');
  eyeCanvas.width=320; eyeCanvas.height=560;
  const eyeContext=eyeCanvas.getContext('2d');
  const eyeTexture=new THREE.CanvasTexture(eyeCanvas);
  eyeTexture.encoding=THREE.sRGBEncoding;
  const eyeMaterial=new THREE.MeshBasicMaterial({map:eyeTexture,transparent:true,depthWrite:false});
  function paintEye() {
    const color=inkMaterial.color.clone().multiplyScalar(0.16).convertLinearToSRGB();
    eyeContext.clearRect(0,0,320,560);
    eyeContext.save();eyeContext.translate(32,24);
    function oval(x,y,rx,ry,fill) {
      eyeContext.fillStyle=fill; eyeContext.beginPath();
      eyeContext.ellipse(x,y,rx,ry,0,0,Math.PI*2); eyeContext.fill();
    }
    if(deadpan) {
      // Flat-ended horizontal eyes with the same white outline as other expressions.
      eyeContext.fillStyle='#fffdf5';eyeContext.fillRect(-15,188.5,286,135);
      eyeContext.fillStyle='#'+color.getHexString();eyeContext.fillRect(4.5,208,247,96);
    } else if(happy) {
      // A closed smiling arch, outlined in the same single flat layer.
      eyeContext.lineCap='butt';
      for(const [width,stroke] of [[124,'#fffdf5'],[85,'#'+color.getHexString()]]) {
        eyeContext.beginPath();
        if(stroke==='#fffdf5'){eyeContext.moveTo(55,319.5);eyeContext.lineTo(55,300);}
        else eyeContext.moveTo(55,300);
        eyeContext.bezierCurveTo(55,155,201,155,201,300);
        if(stroke==='#fffdf5')eyeContext.lineTo(201,319.5);
        eyeContext.lineWidth=width;eyeContext.strokeStyle=stroke;eyeContext.stroke();
      }
    } else {
      oval(128,256,133.66,261,'#fffdf5');
      oval(128,256,114.67,240,'#'+color.getHexString());
      oval(114.67,237.74,22.93,161.74,'#fffdf5');
    }
    eyeContext.restore();
    eyeTexture.needsUpdate=true;
  }
  const eyeGeometry=new THREE.PlaneGeometry(0.6,1.073333);
  for (const x of [-0.58,0.58]) {
    const eye=new THREE.Mesh(eyeGeometry,eyeMaterial);
    eye.position.set(x,0.13,0.225); eye.userData.restX=x;
    badge.add(eye); eyes.push(eye);
  }
  // Solid-color elliptical meshes: anti-aliased edges, no soft gradient.
  const blushMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color('#eebece').convertSRGBToLinear(),transparent:true,depthWrite:false,opacity:0});
  for(const x of [-1.04,1.04]) {
    const cheek=new THREE.Mesh(new THREE.CircleGeometry(1,48),blushMaterial);
    cheek.scale.set(0.275,0.13,1);
    cheek.position.set(x,-0.29,0.23);badge.add(cheek);
  }

  const shadowMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color('#9fae85').convertSRGBToLinear(),depthWrite:false});
  const shadowGeometry=new THREE.CircleGeometry(1,64);
  shadowGeometry.scale(1.5,0.29,1);
  const shadow = new THREE.Mesh(shadowGeometry,shadowMaterial);
  shadow.position.set(0,-2.02,-0.6); scene.add(shadow);

  const pointer = {x:0,y:0,last:-100000};
  const raycaster=new THREE.Raycaster();
  let pet=null;
  let mouseMoves=0,modelPasses=0;
  const overControls=event=>event.target instanceof Element && !!event.target.closest('#studio');
  function hitCharacter(event) {
    if(settings.paused) return null;
    badge.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2),camera);
    const hit=raycaster.intersectObjects(hitMeshes)[0];
    return hit ? badge.worldToLocal(hit.point.clone()) : null;
  }
  const surface=renderer.domElement;
  surface.style.touchAction='none';
  addEventListener('mousedown',event=>{
    if(event.button!==0 || settings.paused || overControls(event)) return;
    cancelPet();
    const hit=hitCharacter(event);if(!hit)return;
    blinkStart=elapsed;pressStart=elapsed;
    const tapNow=performance.now();
    tapTimes=tapTimes.filter(time=>tapNow-time<=5000);
    tapTimes.push(tapNow);
    if(tapTimes.length>=10){
      if(happy)petCooldownUntil=elapsed+5;
      deadpan=true;deadpanUntil=elapsed+4;happy=false;blushMaterial.opacity=0;
      tapTimes=[];paintEye();
    }

  });
  function cancelPet(){pet=null;}
  addEventListener('mouseup',cancelPet);
  surface.addEventListener('pointercancel',cancelPet);
  document.addEventListener('mouseleave',cancelPet);
  document.addEventListener('visibilitychange',cancelPet);
  addEventListener('blur',cancelPet);
  addEventListener('mousemove',event=>{
    mouseMoves++;
    if(overControls(event)){cancelPet();return;}
    if(event.buttons || settings.paused || happy || elapsed<petCooldownUntil){cancelPet();return;}
    if(!pet){
      pet={anchor:event.clientX,direction:0,count:0,x:event.clientX,y:event.clientY,times:[]};
      return;
    }
    const now=performance.now();
    pet.times=pet.times.filter(time=>now-time<=2000);pet.count=pet.times.length;
    // Sample the travelled segment so a fast pass across the model also counts.
    const previous={x:pet.x,y:pet.y};pet.x=event.clientX;pet.y=event.clientY;
    const distance=Math.hypot(pet.x-previous.x,pet.y-previous.y);
    const stepPixels=Math.max(6,innerHeight/(camera.top-camera.bottom)*settings.size*0.15);
    const steps=Math.max(1,Math.ceil(distance/stepPixels));
    let crossed=false;
    for(let i=0;i<=steps;i++) {
      const hit=hitCharacter({clientX:previous.x+(pet.x-previous.x)*i/steps,clientY:previous.y+(pet.y-previous.y)*i/steps});
      if(hit && hit.y>0.9 && Math.abs(hit.x)<1.05) {crossed=true;break;}
    }
    const dx=event.clientX-pet.anchor;
    if(pet.direction && Math.sign(dx)===pet.direction){pet.anchor=event.clientX;return;}
    // Any horizontal movement counts, including tiny strokes; stationary events do not.
    if(dx===0 || !crossed)return;
    modelPasses++;
    pet.direction=Math.sign(dx);pet.anchor=event.clientX;pet.times.push(now);pet.count=pet.times.length;
    if(pet.count>=3){deadpan=false;tapTimes=[];happy=true;happyUntil=elapsed+3;paintEye();pet.count=0;pet.times=[];}
  });
  addEventListener('mousemove',e => {
    pointer.x = THREE.MathUtils.clamp(e.clientX/innerWidth*2-1,-1,1);
    pointer.y = THREE.MathUtils.clamp(1-e.clientY/innerHeight*2,-1,1);
    pointer.last=performance.now();
  });
  document.addEventListener('mouseleave',() => {pointer.last=-100000;});
  addEventListener('blur',() => {pointer.last=-100000;});
  function resize() {
    const aspect=innerWidth/innerHeight;
    const halfHeight=Math.max(3.65,2.8/aspect);
    camera.left=-halfHeight*aspect; camera.right=halfHeight*aspect;
    camera.top=halfHeight; camera.bottom=-halfHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  }
  addEventListener('resize',resize); resize();
  function applySettings() {
    scene.background=new THREE.Color(settings.background);
    shadowMaterial.color.set(settings.background).convertSRGBToLinear().multiplyScalar(0.72);
    document.body.style.background=settings.background;
    inkMaterial.color.set(settings.ink).convertSRGBToLinear(); sideMaterial.color.copy(inkMaterial.color);
    // Eyes remain darker than the chosen motif, even with a near-black motif.
    paintEye();
    badge.scale.setScalar(settings.size);
    shadow.position.y=-2.02*settings.size;
    for(const key of ['background','ink','size','tracking','float']) {
      const input=document.getElementById(key);
      if(key==='float') input.checked=settings[key]; else input.value=settings[key];
    }
  }
  addEventListener('badge-settings',applySettings); applySettings();
  for (const key of ['background','ink','size','tracking','float']) {
    document.getElementById(key).addEventListener('input',e => {
      settings[key]=key==='float'?e.target.checked:['size','tracking'].includes(key)?Number(e.target.value):e.target.value;
      applySettings();
    });
  }
  document.getElementById('reset').onclick=() => {Object.assign(settings,{background:'#b5c997',ink:'#353530',size:1,tracking:1,float:true});applySettings();};
  document.getElementById('hide').onclick=() => {studio.hidden=true;};
  addEventListener('keydown',e => {if(studioMode && e.key.toLowerCase()==='h') studio.hidden=!studio.hidden;});
  let lastFrame=0, elapsed=0, nextBlink=2.6, blinkStart=-10;
  let gazeX=0,gazeY=0,renderedFrames=0;
  function frame(now) {
    requestAnimationFrame(frame);
    if(settings.paused || document.hidden) {lastFrame=now;return;}
    const interval=1000/settings.fps;
    if(now-lastFrame<interval-0.5) return;
    const dt=Math.min((now-lastFrame)/1000,0.1); lastFrame=now; elapsed+=dt;
    const active=now-pointer.last<5500;
    const tx=active?pointer.x*settings.tracking:0;
    const ty=active?pointer.y*settings.tracking:0;
    const ease=1-Math.exp(-dt*5), eyeEase=1-Math.exp(-dt*12);
    badge.rotation.y += (tx*0.34-badge.rotation.y)*ease;
    badge.rotation.x += (-ty*0.23-badge.rotation.x)*ease;
    badge.rotation.z += (-tx*0.045-badge.rotation.z)*ease;
    const pressAge=elapsed-pressStart;
    const press=pressAge<0.48 ? Math.sin(Math.PI*pressAge/0.48) : 0;
    badge.position.y=(settings.float?Math.sin(elapsed*1.35)*0.055:0)-press*0.15*settings.size;
    badge.scale.set(settings.size*(1+press*0.035),settings.size*(1-press*0.075),settings.size);
    if(deadpan && elapsed>=deadpanUntil){deadpan=false;paintEye();}
    if(happy && elapsed>=happyUntil){happy=false;petCooldownUntil=elapsed+5;cancelPet();paintEye();}
    blushMaterial.opacity+=((happy?1:0)-blushMaterial.opacity)*(1-Math.exp(-dt*9));
    gazeX+=(tx*0.065-gazeX)*eyeEase; gazeY+=(ty*0.045-gazeY)*eyeEase;
    if(elapsed>nextBlink){blinkStart=elapsed;nextBlink=elapsed+2.8+Math.random()*3.8;}
    const blinkAge=elapsed-blinkStart;
    const openness=!happy && !deadpan && blinkAge<0.2?1-0.94*Math.sin(blinkAge/0.2*Math.PI):1;
    eyes.forEach(eye=>{
      // Give the smiling arches the larger footprint of the user's comparison sketch.
      eye.scale.set(happy?1.4:deadpan?1.25:1,happy?1.55:openness,1);
      eye.position.x=eye.userData.restX*(deadpan?1.32:happy?1.1:1)+gazeX;
      eye.position.y=0.13+gazeY-(happy?0.045:0);
    });
    shadow.scale.set(settings.size*(1-badge.position.y*0.5),settings.size,1);
    renderer.render(scene,camera); renderedFrames++;
  }
  requestAnimationFrame(frame);
  // Read-only diagnostics for the preview's automated checks.
  window.badgeDiagnostics = () => ({ready:true,version:18,smileRemaining:Math.max(0,happyUntil-elapsed),petCooldown:Math.max(0,petCooldownUntil-elapsed),mouseMoves,modelPasses,frames:renderedFrames,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls,rotation:{x:badge.rotation.x,y:badge.rotation.y},gaze:{x:gazeX,y:gazeY},eyeOpen:eyes[0].scale.y,happy,deadpan,taps:tapTimes.filter(time=>performance.now()-time<=5000).length,blush:blushMaterial.opacity,pressAge:elapsed-pressStart,scaleY:badge.scale.y,petStrokes:pet?.count??0,background:scene.background.getHexString(),size:badge.scale.x,settings:{...settings}});
})();
