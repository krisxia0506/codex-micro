import * as THREE from 'three';

// All geometry uses millimetres. Z is the assembly's vertical axis.
export const dimensions = { width: 110, depth: 132, wall: 3, height: 20 };
function rectangle(w, d, x = 0, y = 0) {
  const p = new THREE.Path();
  p.moveTo(x-w/2,y-d/2); p.lineTo(x+w/2,y-d/2);
  p.lineTo(x+w/2,y+d/2); p.lineTo(x-w/2,y+d/2); p.closePath();
  return p;
}
function plate(w, d, h, holes = []) {
  const s = new THREE.Shape(rectangle(w,d).getPoints());
  s.holes = holes;
  return conformEdges(new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, steps:1, curveSegments:32}));
}
function circle(r,x,y) { const p = new THREE.Path(); p.absarc(x,y,r,0,Math.PI*2,false); return p; }
export function createParts() {
  const parts=[];
  function add(id,name,geometry,position,color,level,description) {
    parts.push({id,name,geometry,position,color,level,description});
  }
  add('bottom','底板',plate(110,132,3),[0,0,0],'#c8cbd0',0,'110 × 132 × 3 mm；独立平板试样。');
  add('wall','外壳围框',plate(110,132,14,[rectangle(104,126)]),[0,0,3],'#e0e2e4',1,'3 mm 壁厚，14 mm 高；接口与固定结构待硬件选型。');
  const keys=[];
  for (let row=0;row<2;row++) for(let col=0;col<3;col++) keys.push({x:(col-1)*28,y:20-row*26,w:22,d:20,name:`任务键 ${row*3+col+1}`,color:['#aac8ff','#bee8cb','#f1d695'][col]});
  for (let col=0;col<3;col++) keys.push({x:(col-1)*28,y:-32,w:22,d:18,name:['确认','取消','发送'][col],color:'#c4c6cb'});
  keys.push({x:0,y:-55,w:50,d:16,name:'语音键',color:'#cab8ef'});
  const holes=keys.map(k=>rectangle(k.w+1,k.d+1,k.x,k.y));
  holes.push(circle(10,-32,48),circle(9,32,48));
  add('top','上盖面板',plate(110,132,3,holes),[0,0,17],'#f4f1eb',2,'键帽轮廓开孔，非轴体安装板；0.5 mm 单边间隙为设计假设。');
  keys.forEach((k,i)=>add(`key-${i+1}`,k.name,plate(k.w,k.d,7),[k.x,k.y,18],k.color,3,'实心外观占位件，无轴体十字柱，不能作为功能键帽。'));
  const knob=new THREE.CylinderGeometry(9,9,12,48); knob.rotateX(Math.PI/2); knob.translate(0,0,6);
  add('knob','旋钮',knob,[-32,48,18],'#777a85',4,'直径 18 mm；实心占位件，未设计编码器轴孔。');
  const stick=new THREE.CylinderGeometry(8,6,9,40); stick.rotateX(Math.PI/2); stick.translate(0,0,4.5);
  add('joystick','摇杆帽',stick,[32,48,18],'#d0c3ed',4,'实心外观占位件，未适配实际摇杆。');
  return parts;
}
export function printableGeometry(part) {
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
