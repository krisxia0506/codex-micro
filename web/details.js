import * as THREE from 'three';
import { keycapSpec } from './assembly.js';
import { capsule, usbSpec, usbShellGeometry } from './usb.js';

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
    if(i<=6){
      cylinder(3.3,.15,'#87919d',0,0,7.55);
    } else {
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const c=canvas.getContext('2d');c.strokeStyle='#15191b';c.lineWidth=10;c.lineCap='round';c.lineJoin='round';
      const path=points=>{c.beginPath();points.forEach(([x,y],j)=>j?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
      const circle=(x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();};
      if(i===7)path([[141,43],[65,143],[120,143],[111,207],[191,104],[137,104],[141,43]]);
      if(i===8){circle(128,128,75);path([[94,129],[119,153],[165,98]]);}
      if(i===9){circle(128,128,75);path([[103,103],[153,153]]);path([[153,103],[103,153]]);}
      if(i===10){path([[52,128],[111,128],[190,56]]);path([[143,56],[190,56],[190,103]]);path([[130,149],[190,203],[190,155]]);path([[146,203],[190,203]]);}
      if(i===11){c.beginPath();c.roundRect(102,43,52,108,26);c.stroke();c.beginPath();c.arc(128,125,51,0,Math.PI);c.stroke();path([[128,178],[128,210]]);path([[102,210],[154,210]]);}
      if(i===12){c.beginPath();c.moveTo(72,192);c.bezierCurveTo(20,163,44,121,61,110);c.bezierCurveTo(45,63,105,33,136,63);c.bezierCurveTo(190,40,218,93,196,122);c.bezierCurveTo(234,168,184,211,149,192);c.closePath();c.stroke();path([[92,108],[112,128],[92,148]]);path([[139,150],[164,150]]);}
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const icon=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));icon.position.z=6.9;mesh.add(icon);
    }
  }
  if(part.id==='knob') {
    cylinder(8.6,.4,'#c8d0d4',0,0,12.1);
    const groove=box(18,1.7,.2,'#67747d',0,0,12.35);groove.rotation.z=Math.PI/4;
  }
  if(part.id==='joystick') {
    box(18.5,18.5,1,'#a2aaad',0,0,0,.7);
    cylinder(7.4,.4,'#26292b',0,0,9.15);
    for(let i=0;i<4;i++){const angle=Math.PI/4+i*Math.PI/2;const mark=box(3,.6,.15,'#101314',Math.cos(angle)*4.7,Math.sin(angle)*4.7,9.4);mark.rotation.z=angle;}
  }
  if(part.id.startsWith('switch-')) {
    box(keycapSpec.stemSpan,keycapSpec.stemBar,3.7,'#caa6db',0,0,8.85);
    box(keycapSpec.stemBar,keycapSpec.stemSpan,3.7,'#caa6db',0,0,8.85);
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
    add(usbShellGeometry(),'#aeb3bd',[0,0,0],.8);
    const cavity=new THREE.ShapeGeometry(capsule(usbSpec.mouthWidth,usbSpec.mouthHeight),32);
    cavity.rotateX(-Math.PI/2);add(cavity,'#171d24',[0,10.7,2.25]);
    box(6,.6,.65,'#303039',0,11,2.25);
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
      for(const [dx,dy] of [[-3.81,-2.54],[2.54,-5.08]]){
        cylinder(.95,.18,'#c1a15c',x+dx,y+dy,8.12);
        cylinder(.55,.2,'#15191c',x+dx,y+dy,8.14);
      }
      box(1.6,1.68,.4,'#beaa7d',x-7.16,y-2.54,5.7,.8);
      box(1.6,1.68,.4,'#beaa7d',x+5.74,y-5.08,5.7,.8);
    }
  }
  if(part.id==='top') {
    // Decorative marks sit on the low plate, not a raised cover.
    const before=new Set(mesh.children);
    text('CODEX / MICRO',29,2.6,0,-44,3.04,'#697176');
    cylinder(7,.2,'#9ca5a9',-30,-30,3.15);cylinder(4.8,.25,'#14191d',-30,-30,3.35);
    for(const child of mesh.children)if(!before.has(child))child.position.z-=1.5;
  }
}
