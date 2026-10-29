import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// All geometry uses millimetres. Z is the assembly's vertical axis.
export const dimensions = { width: 110, depth: 110, wall: 3, height: 11.5 };
function rectangle(w, d, x = 0, y = 0) {
  const p = new THREE.Path();
  p.moveTo(x-w/2,y-d/2); p.lineTo(x+w/2,y-d/2);
  p.lineTo(x+w/2,y+d/2); p.lineTo(x-w/2,y+d/2); p.closePath();
  return p;
}
function rounded(w,d,r=8) {
  const p=new THREE.Shape(), x=-w/2,y=-d/2;
  p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);
  p.lineTo(x+w,y+d-r);p.quadraticCurveTo(x+w,y+d,x+w-r,y+d);
  p.lineTo(x+r,y+d);p.quadraticCurveTo(x,y+d,x,y+d-r);
  p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;
}
function cap(w,d,h) {
 return new THREE.ExtrudeGeometry(rounded(w-1.2,d-1.2,2.5),{depth:h-1.2,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.6,bevelThickness:.6,curveSegments:8}).translate(0,0,.6);
}
function plate(w, d, h, holes = []) {
  const s = rounded(w,d,Math.min(w,d)>=90?8:2);
  s.holes = holes;
  return conformEdges(new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, steps:1, curveSegments:8}));
}

function keycap(w,d,h) {
  const segments=64,vertices=[],indices=[];
  const rings=[[.94,0],[1,.8],[1,h-1],[.94,h],[.8,h-.15],[.58,h-1.25],[.3,h-1.9]];
  for(const [scale,z] of rings)for(let i=0;i<segments;i++){
    const t=i/segments*Math.PI*2,c=Math.cos(t),s=Math.sin(t);
    vertices.push(Math.sign(c)*Math.pow(Math.abs(c),.45)*w/2*scale,Math.sign(s)*Math.pow(Math.abs(s),.45)*d/2*scale,z);
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){
    const a=r*segments+i,b=r*segments+(i+1)%segments,c=b+segments,d=a+segments;indices.push(a,b,d,b,c,d);
  }
  const bottom=vertices.length/3;vertices.push(0,0,0);const center=vertices.length/3;vertices.push(0,0,h-2.1);
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments;indices.push(bottom,j,i);
    const base=(rings.length-1)*segments;indices.push(center,base+i,base+j);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

function circle(r,x,y) { const p = new THREE.Path(); p.absarc(x,y,r,0,Math.PI*2,false); return p; }
export function createParts() {
  const parts=[];
  function add(id,name,geometry,position,color,level,description) {
    parts.push({id,name,geometry,position,color,level,description,printable:true});
  }
  add('bottom','底板',plate(110,110,3),[0,0,0],'#c8cbd0',0,'110 × 110 × 3 mm；独立平板试样。');
  add('wall','外壳围框',plate(110,110,7,[new THREE.Path(rounded(104,104,6).getPoints())]),[0,0,3],'#e0e2e4',1,'3 mm 壁厚，7 mm 高；接口与固定结构待硬件选型。');
  const keys=[];
  const taskLocations=[[-10,30],[10,30],[-30,10],[-10,10],[10,10],[30,10]];
  taskLocations.forEach(([x,y],i)=>keys.push({x,y,w:18.5,d:18.5,name:`任务键 ${i+1}`,color:['#a4f1cf','#ffe0a0','#a8bfff','#e5eced','#b8c6ff','#f4adc9'][i]}));
  [-30,-10,10,30].forEach((x,i)=>keys.push({x,y:-10,w:18.5,d:18.5,name:['快速模式','批准','拒绝','分支对话'][i],color:'#e9edef'}));
  keys.push({x:0,y:-30,w:38.5,d:18.5,name:'语音键',color:'#e9edef'});
  keys.push({x:30,y:-30,w:18.5,d:18.5,name:'发送',color:'#e9edef'});
  const switchLocations=keys.flatMap(k=>k.name==='语音键'?[{x:-10,y:k.y},{x:10,y:k.y}]:[k]);
  const holes=switchLocations.map(k=>rectangle(14.2,14.2,k.x,k.y));
  holes.push(circle(9.8,-30,30),circle(9,30,30));
  add('top','低位轴体定位板',plate(110,110,1.5,holes),[0,0,10],'#c5cdd0',2.5,'位于键帽和轴体肩部下方，不包围键帽。14.2 mm 方孔与 1.5 mm 板厚为设计假设，卡扣配合待实物验证。');
  keys.forEach((k,i)=>add(`key-${i+1}`,k.name,keycap(k.w,k.d,7),[k.x,k.y,18],k.color,4,'实心外观占位件，无轴体十字柱，不能作为功能键帽。'));
  const knob=new THREE.CylinderGeometry(9,9,12,48); knob.rotateX(Math.PI/2); knob.translate(0,0,6);
  add('knob','旋钮',knob,[-30,30,18],'#bac3c7',4,'直径 18 mm；实心占位件，未设计编码器轴孔。');
  const stick=new THREE.CylinderGeometry(8,6,9,40); stick.rotateX(Math.PI/2); stick.translate(0,0,4.5);
  add('joystick','摇杆帽',stick,[30,30,18],'#25282a',4,'实心外观占位件，未适配实际摇杆。');
  const electronic=(id,name,geometry,position,color,description)=>{
    add(id,name,geometry,position,color,2,description+' 展示示意，不导出 STL。');
    parts.at(-1).printable=false;
  };
  electronic('xiao','XIAO Sense Plus',plate(17.8,21,1),[0,40,5],'#183c3b','XIAO nRF52840 Sense Plus，官方板外形 21 × 17.8 mm；元件高度、安装间隙为示意。USB-C、麦克风及电源电路在开发板上。');
  switchLocations.forEach((k,i)=>electronic(`switch-${i+1}`,`SW${i+1} · 机械轴体`,cap(14,14,7),[k.x,k.y,8],'#464b52','14 × 14 mm 轴体外观包络；具体型号与行程待定。'));
  electronic('encoder','ENC1 · 旋转编码器',cap(12,12,8),[-30,30,7],'#b5b7bb','位于旋钮下方，包含外壳与转轴示意。');
  electronic('stick-module','JOY1 · 摇杆模块',cap(18,18,8),[30,30,7],'#373c43','位于右上摇杆帽下方。');
  const sockets=mergeGeometries(switchLocations.map(k=>{
    const g=new THREE.BoxGeometry(14,6,3).toNonIndexed();g.translate(k.x,k.y-2,0);return g;
  }));
  electronic('sockets','Kailh MX 底座组',sockets,[0,0,6.5],'#30343a','13 个底座位于轴体引脚下方，由打印支架承托；已确定使用凯华 Kailh MX；具体料号、外形与锁止尺寸待图纸或实物核对。可改为直接焊线。');
  parts.at(-1).socketPositions=switchLocations.map(k=>[k.x,k.y-2]);
  // Repeated, connected-per-socket carrier samples. Their retention fit is not validated.
  const carriers=mergeGeometries(switchLocations.map(k=>{
    const g=plate(19,12,3,[rectangle(14.6,6.6)]);g.translate(k.x,k.y-2,0);return g;
  }));
  add('socket-carriers','底座承托框组 · 试样',carriers,[0,0,5],'#d2c8b6',2,'13 个打印承托框位置试样；内孔 14.6 × 6.6 mm 仅为占位假设，无锁止卡扣，不能直接固定实际底座。待实物尺寸确认后设计。');
  parts.at(-1).electronicLayer=true;
  return parts;
}
export function printableGeometry(part) {
  if(part.printable===false) throw new Error(`Electronic placeholder cannot be printed: ${part.id}`);
  const geometry=part.geometry.clone(); geometry.computeBoundingBox();
  geometry.translate(0,0,-geometry.boundingBox.min.z); return geometry;
}

// Earcut can leave T junctions between aligned rectangular holes. Split any
// triangle edge at existing vertices so exported surfaces share complete edges.
function conformEdges(geometry) {
  const a=geometry.getAttribute('position'); const vertices=new Map();
  for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i);vertices.set(v.toArray().join(','),v);}
  const points=[...vertices.values()], output=[];
  function emit(a,b,c){
    const tri=[a,b,c];
    for(let i=0;i<3;i++){
      const u=tri[i],v=tri[(i+1)%3],w=tri[(i+2)%3];
      const edge=v.clone().sub(u),length=edge.lengthSq();
      for(const p of points){const t=p.clone().sub(u).dot(edge)/length;
        if(t>1e-6&&t<1-1e-6&&u.clone().addScaledVector(edge,t).distanceToSquared(p)<1e-10){emit(u,p,w);emit(p,v,w);return;}
      }
    }
    for(const v of tri)output.push(...v.toArray());
  }
  for(let i=0;i<a.count;i+=3)emit(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(a,i+j)));
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(output,3));result.computeVertexNormals();geometry.dispose();return result;
}
