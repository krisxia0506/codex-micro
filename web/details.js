import * as THREE from 'three';

// Render-only details: markings and commercial component features are not STL parts.
export function decorate(mesh, part) {
  const add = (geometry, color, position, metalness = 0) => {
    const child = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color, roughness: .4, metalness}));
    child.position.set(...position);
    child.castShadow = true;
    mesh.add(child);
    return child;
  };
  const box = (w,d,h,color,x,y,z,metalness=0) => add(new THREE.BoxGeometry(w,d,h),color,[x,y,z],metalness);
  const cylinder = (r,h,color,x,y,z) => {
    const g = new THREE.CylinderGeometry(r,r,h,48);
    g.rotateX(Math.PI/2);
    return add(g,color,[x,y,z],.6);
  };
  const text = (label,w,d,x,y,z,color='#4a4553') => {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='500 52px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,64);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const child=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    child.position.set(x,y,z);mesh.add(child);
  };
  if(part.id.startsWith('key-')) {
    const i=Number(part.id.slice(4));
    text(i<=6?`0${i}`:['✓','×','↗','VOICE'][i-7],i===10?23:12,4,0,0,7.03);
    // Small light window on the face of each task key.
    if(i<=6)box(5,.5,.5,'#f6ffff',0,-8,4);
  }
  if(part.id==='knob') {
    for(let i=0;i<48;i++) {
      const angle=i*Math.PI/24;
      const ridge=box(.45,.7,9,'#555963',Math.cos(angle)*8.95,Math.sin(angle)*8.95,6,.7);
      ridge.rotation.z=angle;
    }
    cylinder(7.8,.3,'#858a94',0,0,12.1);
    box(.6,3,.15,'#eee9dc',0,5,12.3);
  }
  if(part.id==='joystick') {
    cylinder(6.8,.4,'#aaa1bd',0,0,9.15);
    for(const r of [3.8,5]) {
      const ring=new THREE.TorusGeometry(r,.14,6,48);
      add(ring,'#8d839e',[0,0,9.4]);
    }
  }
  if(part.id.startsWith('switch-')) {
    box(4,1.3,3,'#caa6db',0,0,8);
    box(1.3,4,3,'#caa6db',0,0,8);
    for(const x of [-5,5])box(.7,1,2,'#caa35f',x,0,-.5,.8);
  }
  if(part.id==='encoder') {
    cylinder(3,4,'#c7cbd0',0,0,9);
    for(const x of [-4,0,4])box(1,2,1,'#cda659',x,-7,1,.8);
  }
  if(part.id==='stick-module') {
    cylinder(6,2,'#aaaeb6',0,0,8);
    cylinder(2.5,4,'#bfc2c6',0,0,11);
  }
  if(part.id==='xiao') {
    // Features communicate the module's architecture, not exact component placement.
    box(8,7,2.5,'#aeb3bd',0,8,2.25,.8);
    box(6.6,.2,1.5,'#171d24',0,11.6,2.25);
    box(7,7,1.4,'#9ca4a9',0,-1,1.7,.8);
    text('nRF52',6,1.6,0,-1,2.43,'#263635');
    box(3,2.5,1,'#bda266',-4,-7,1.5,.5);
    text('MIC',3,1,-4,-7,2.04,'#352d23');
    box(2,3,1,'#252930',4,-7,1.5);
    for(const x of [-8.3,8.3])for(let i=0;i<7;i++)box(1.4,1.6,.1,'#d4ad65',x,-7.6+i*2.54,1.05,.8);
    text('XIAO',7,1.6,0,-9,1.1,'#e4e0cd');
  }
  if(part.id==='sockets') {
    for(const [x,y] of part.socketPositions){
      for(const dx of [-5,5]){
        cylinder(1.5,.2,'#c1a15c',x+dx,y,1.6);
        cylinder(.7,.22,'#15191c',x+dx,y,1.7);
        box(2.2,2,1,'#beaa7d',x+dx,y-3.5,0,.8);
      }
    }
  }
  if(part.id==='top') {
    text('CODEX / MICRO',29,2.6,0,48,3.04,'#817b86');
  }
}
