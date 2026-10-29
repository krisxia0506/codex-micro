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
  if(part.id==='usb') {
    box(7,.15,1.8,'#171d24',0,3.55,1.5);
    box(5,.2,.35,'#ba9857',0,3.68,1.5,.8);
  }
  if(['mcu','power'].includes(part.id)) {
    const size=part.id==='mcu'?9:5;
    for(let i=-3;i<=3;i++)for(const sign of [-1,1]){
      box(.5,1.5,.3,'#c4c5bd',i*size/9,sign*(size/2+.4),.5,.8);
      box(1.5,.5,.3,'#c4c5bd',sign*(size/2+.4),i*size/9,.5,.8);
    }
    text(part.id==='mcu'?'MCU':'PWR',size-1,1.5,0,0,part.id==='mcu'?1.53:1.23,'#c6c8c5');
  }
  if(part.id==='pcb') {
    text('CODEX MICRO / REV A · CONCEPT',60,3,0,34,1.63,'#e8e6ce');
    text('LAYOUT ONLY — NOT ROUTED',53,2.8,0,-44,1.63,'#e8e6ce');
    for(const x of [-44,44])for(const y of [-55,55]){
      const ring=new THREE.RingGeometry(1.7,3,32);
      add(ring,'#c7a659',[x,y,1.64],.8);
    }
    for(let row=0;row<3;row++)for(let col=0;col<3;col++){
      const x=(col-1)*28,y=20-row*26;
      text(`SW${row*3+col+1}`,10,2,x,y+10,1.64,'#d8e5d4');
      for(const offset of [-5,5])cylinder(1.3,.1,'#cfb776',x+offset,y,1.65);
      box(3,1.5,.8,'#e8e3ca',x,y-10,2);
      box(2,1,.7,'#292b31',x+8,y-10,2);
    }
    // Sparse decorative copper traces are illustrative, not a circuit design.
    for(const x of [-39,39]){
      box(.25,90,.03,'#417665',x,-2,1.63);
      for(const y of [-32,-6,20])box(8,.25,.03,'#417665',x+(x<0?4:-4),y,1.63);
    }
  }
  if(part.id==='top') {
    text('CODEX / MICRO',29,2.6,0,48,3.04,'#817b86');
  }
}
