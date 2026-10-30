import test from 'node:test';
import assert from 'node:assert/strict';
import { createParts, printableGeometry, assemblyValidation, assemblySpec, socketFitCoupon } from '../../web/model.js';
import { Mesh, Vector3, Raycaster, MeshBasicMaterial, DoubleSide } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const parts=createParts();
test('assembly IDs are unique',()=>assert.equal(new Set(parts.map(p=>p.id)).size,parts.length));
test('electronic placeholders cannot be exported',()=>{
 assert.equal(parts.filter(p=>p.printable).length,17);
 for(const p of parts.filter(p=>!p.printable)) assert.throws(()=>printableGeometry(p),/cannot be printed/);
});
for(const part of [...parts.filter(p=>p.printable),{id:"socket-fit-coupon",geometry:socketFitCoupon()}]) test(`${part.id}: watertight, positive-volume STL at Z=0`,()=>{
 const geometry=printableGeometry(part);
 const data=new STLExporter().parse(new Mesh(geometry),{binary:true});
 const parsed=new STLLoader().parse(data.buffer); const a=parsed.getAttribute('position');
 const edges=new Map(); let volume=0;
 const key=v=>v.map(n=>Math.round(n*1e4)).join(',');
 for(let i=0;i<a.count;i+=3){
  const vs=[0,1,2].map(j=>[a.getX(i+j),a.getY(i+j),a.getZ(i+j)]);
  assert.ok(vs.flat().every(Number.isFinite));
  volume+=new Vector3(...vs[0]).dot(new Vector3(...vs[1]).cross(new Vector3(...vs[2])))/6;
  for(let j=0;j<3;j++){ const u=key(vs[j]),v=key(vs[(j+1)%3]);assert.notEqual(u,v);const k=[u,v].sort().join('|');const e=edges.get(k)||[0,0];e[0]++;e[1]+=u<v?1:-1;edges.set(k,e); }
 }
 for(const [edge,[count,orientation]] of edges){assert.equal(count,2,edge);assert.equal(orientation,0,edge);}
 assert.ok(volume>0);parsed.computeBoundingBox();assert.ok(Math.abs(parsed.boundingBox.min.z)<1e-5);
});

test('handwired architecture uses a module instead of a full PCB',()=>{
 assert.ok(parts.some(p=>p.id==='xiao'));
 assert.ok(!parts.some(p=>['pcb','mcu','power','usb'].includes(p.id)));
 assert.equal(parts.find(p=>p.id==='sockets').socketPositions.length,13);
});
test('reference layout has 2+4 task keys and a two-switch voice key',()=>{
 const tasks=parts.filter(p=>/^key-[1-6]$/.test(p.id));
 const rows=new Map();for(const p of tasks)rows.set(p.position[1],(rows.get(p.position[1])||0)+1);
 assert.deepEqual([...rows.values()],[2,4]);
 assert.equal(parts.filter(p=>p.id.startsWith('key-')).length,12);
 const voice=parts.find(p=>p.name==='语音键');voice.geometry.computeBoundingBox();
 const underVoice=parts.filter(p=>p.id.startsWith('switch-')&&p.position[1]===voice.position[1]&&Math.abs(p.position[0]-voice.position[0])<voice.geometry.boundingBox.max.x);
 assert.equal(underVoice.length,2);
});
test('floating keys remain above the low switch plate and enclosure rim',()=>{
 const plate=parts.find(p=>p.id==='top'),wall=parts.find(p=>p.id==='wall');
 plate.geometry.computeBoundingBox();wall.geometry.computeBoundingBox();
 const plateTop=plate.position[2]+plate.geometry.boundingBox.max.z;
 assert.ok(wall.position[2]+wall.geometry.boundingBox.max.z<=plateTop);
 for(const key of parts.filter(p=>p.id.startsWith('key-'))){
  key.geometry.computeBoundingBox();assert.ok(key.position[2]+key.geometry.boundingBox.min.z-plateTop>=4.5);
 }
});

// Check the actual tube surface, including its radius, against the usable cavity.
test('all handwires stay inside the enclosure cavity',async()=>{
 const { wireGeometry }=await import('../../web/harness.js');
 const sockets=parts.find(p=>p.id==='sockets').socketPositions;
 for(const [index,[x,y]] of sockets.entries())for(let side=0;side<2;side++){
  const geometry=wireGeometry(x,y,index,side);const vertices=geometry.getAttribute('position');
  for(let i=0;i<vertices.count;i++){
   assert.ok(Math.abs(vertices.getX(i))<49,'wire crosses the side corridor');
   assert.ok(Math.abs(vertices.getY(i))<49,'wire crosses the end corridor');
   assert.ok(vertices.getZ(i)>3&&vertices.getZ(i)<10,'wire crosses floor or plate');
  }
  geometry.dispose();
 }
});

test('shell plates, locating lips and socket mounts are connected solids',()=>{
 assert.equal(assemblyValidation.bottomComponents,1);
 assert.equal(assemblyValidation.wallComponents,1);
 assert.equal(assemblyValidation.topComponents,1);
 assert.ok(Math.abs(assemblyValidation.shellOverlap)<1e-6);
 assert.ok(Math.abs(assemblyValidation.socketHolderOverlap)<1e-6);
 assert.ok(assemblyValidation.upwardRetentionVolume>1,'socket must meet retaining shoulders on removal');
 assert.ok(assemblyValidation.downwardSupportVolume>1,'socket must meet floor under insertion load');
});
test('four coaxial M3 fasteners and nuts clear printed material',()=>{
 assert.equal(assemblySpec.screwCenters.length,4);
 assert.ok(Math.abs(assemblyValidation.boltShellOverlap)<1e-6);
 assert.ok(Math.abs(assemblyValidation.nutShellOverlap)<1e-6);
 assert.ok(Math.abs((assemblySpec.frameInner-assemblySpec.lipOuter)/2-.3)<1e-6);
 assert.equal(assemblySpec.socket.pins[1][0]-assemblySpec.socket.pins[0][0],6.35);
 assert.equal(assemblySpec.socket.pins[0][1]-assemblySpec.socket.pins[1][1],2.54);
});

test('switch plate exports face-down with broad bed contact',()=>{
 const g=printableGeometry(parts.find(p=>p.id==='top'));const a=g.getAttribute('position');let area=0;
 for(let i=0;i<a.count;i+=3){const v=[0,1,2].map(j=>new Vector3().fromBufferAttribute(a,i+j));
  if(v.every(p=>Math.abs(p.z)<1e-5))area+=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length()/2;
 }
 assert.ok(area>7000);g.dispose();
});

test('updated flying wires clear the integral socket mounts and enclosure',async()=>{
 const {default:Module}=await import('manifold-3d');const k=await Module();k.setup();
 const {wireGeometry}=await import('../../web/harness.js');
 const owned=[];const keep=o=>(owned.push(o),o);
 const solid=(positions,indices)=>{const m=new k.Mesh({numProp:3,vertProperties:positions,triVerts:new Uint32Array(indices)});m.merge();return keep(new k.Manifold(m));};
 try{
  const shells=parts.filter(p=>['bottom','wall','top'].includes(p.id)).map(p=>{
   const g=p.geometry.clone().translate(...p.position),a=g.getAttribute('position').array;
   const s=solid(a,Array.from({length:a.length/3},(_,i)=>i));g.dispose();return s;
  });
  const shell=keep(k.Manifold.union(shells));
  // Conservative envelope includes PCB and all displayed chips / USB connector.
  const board=parts.find(p=>p.id==='xiao'),[bx,by,bz]=board.position;
  const localEnvelope=keep(keep(k.Manifold.cube([17.8,22.2,3.5])).translate([-8.9,-10.5,0]));
  const envelope=keep(keep(localEnvelope.rotate([0,0,(board.rotationZ??0)*180/Math.PI])).translate([bx,by,bz]));
  assert.ok(Math.abs(keep(envelope.intersect(shell)).volume())<1e-6,'XIAO envelope must clear shell and socket holders');
  for(const part of parts.filter(p=>p.id.startsWith('switch-')||['sockets','encoder','stick-module','case-screws','case-nuts'].includes(p.id))){
   const source=part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone();
   source.translate(...part.position);const a=source.attributes.position.array;
   const other=solid(a,Array.from({length:a.length/3},(_,i)=>i));source.dispose();
   assert.ok(Math.abs(keep(envelope.intersect(other)).volume())<1e-6,`XIAO must clear ${part.id}`);
  }
  for(const [index,[x,y]] of parts.find(p=>p.id==='sockets').socketPositions.entries())for(let side=0;side<2;side++){
   const g=wireGeometry(x,y,index,side),indices=[...g.index.array];
   const {radialSegments:r,tubularSegments:t}=g.parameters,last=t*(r+1);
   // Close the visual tube's ends solely for solid-intersection measurement.
   for(let i=1;i<r-1;i++)indices.push(0,i,i+1,last,last+i+1,last+i);
   const wire=solid(g.attributes.position.array,indices);
   const overlap=keep(wire.intersect(shell));assert.ok(Math.abs(overlap.volume())<1e-6,`socket ${index+1}, side ${side}`);g.dispose();
  }
 }finally{for(const o of owned.reverse())o.delete();}
});

test('all keycaps have connected hollow shells and aligned MX mounts',()=>{
 for(const p of parts.filter(p=>p.id.startsWith('key-'))){
  const v=p.keycapValidation;assert.equal(v.components,1);assert.ok(Math.abs(v.stemOverlap)<1e-6);
  assert.ok(v.engagement>=3);assert.ok(v.roofThickness>=1.5);
  assert.equal(v.mounts,p.id==='key-11'?2:1);
 }
 assert.deepEqual(parts.find(p=>p.id==='key-11').mountXs,[-10,10]);
});

test('MX holes open from underneath and stop below the keycap roof',()=>{
 const material=new MeshBasicMaterial({side:DoubleSide});
 for(const p of parts.filter(p=>p.id.startsWith('key-'))){
  const mesh=new Mesh(p.geometry,material);
  const underside=(x,y)=>new Raycaster(new Vector3(x,y,-1),new Vector3(0,0,1)).intersectObject(mesh)[0]?.point.z;
  for(const x of p.mountXs){
   for(const [dx,dy] of [[0,0],[1.8,0],[0,1.8]])assert.ok(Math.abs(underside(x+dx,dy)-4.2)<1e-4,`${p.id} blind cross hole`);
   assert.ok(Math.abs(underside(x+1.3,1.3))<1e-4,`${p.id} material between cross arms`);
   assert.ok(Math.abs(underside(x+5,0)-4.7)<1e-4,`${p.id} underside cavity`);
  }
 }
 material.dispose();
});


test('socket hook undersides rise at 45 degrees with a substantial nose',()=>{
 const geometry=socketFitCoupon(),material=new MeshBasicMaterial({side:DoubleSide});
 const mesh=new Mesh(geometry,material);
 for(const [x,boundary,direction] of [[-3.8,-.61,-1],[1,-7,1]]){
  for(const inset of [.1,.3,.44]){
   const hits=new Raycaster(new Vector3(x,boundary+direction*inset,6.86),new Vector3(0,0,1)).intersectObject(mesh);
   assert.ok(Math.abs(hits[0]?.point.z-(6.9+inset))<1e-4,'underside must ramp upward without a horizontal overhang');
   const top=new Raycaster(new Vector3(x,boundary+direction*inset,10),new Vector3(0,0,-1)).intersectObject(mesh)[0]?.point.z;
   assert.ok(top-hits[0].point.z>=.7,'hook nose must retain at least 0.7 mm thickness');
  }
 }
 geometry.dispose();material.dispose();
});


test('socket hooks have solid sloping rear buttresses and open side relief slots',()=>{
 const geometry=socketFitCoupon(),material=new MeshBasicMaterial({side:DoubleSide});
 const mesh=new Mesh(geometry,material);
 const top=(x,y)=>new Raycaster(new Vector3(x,y,10),new Vector3(0,0,-1)).intersectObject(mesh)[0]?.point.z;
 for(const [x,boundary,direction] of [[-3.8,-.61,-1],[1,-7,1]]){
  for(const rear of [.8,1.1,1.5]){
   const expected=8.4-(rear-.65)*1.4/1.35;
   assert.ok(Math.abs(top(x,boundary-direction*rear)-expected)<1e-4,'rear must form a continuous slope down to rim');
  }
  for(const dx of [-1.65,1.65])assert.ok(top(x+dx,boundary-direction*.7)<=3.8001,'buttress must not fill side relief slots');
 }
 geometry.dispose();material.dispose();
});


test('XIAO USB faces outward and wire endpoints follow rotated pads',async()=>{
 const {xiaoPosition,xiaoRotation,xiaoWorldPoint,wireGeometry}=await import('../../web/harness.js');
 const board=parts.find(p=>p.id==='xiao');
 assert.equal(board.rotationZ,xiaoRotation);
 const port=xiaoWorldPoint(0,11.6,2.25);
 assert.ok(port[1]<xiaoPosition[1]);assert.ok(Math.abs(port[0]-xiaoPosition[0])<1e-6);
 for(let i=0;i<13;i++)for(let side=0;side<2;side++){
  const geometry=wireGeometry(0,0,i,side),end=geometry.parameters.path.getPoint(1);
  const expected=new Vector3(...xiaoWorldPoint(side===0?-8.3:8.3,-7.6+(i%7)*2.54,1.05));
  assert.ok(end.distanceTo(expected)<1e-6);geometry.dispose();
 }
});
