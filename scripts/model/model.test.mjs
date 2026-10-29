import test from 'node:test';
import assert from 'node:assert/strict';
import { createParts, printableGeometry } from '../../web/model.js';
import { Mesh, Vector3 } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const parts=createParts();
test('assembly IDs are unique',()=>assert.equal(new Set(parts.map(p=>p.id)).size,parts.length));
test('electronic placeholders cannot be exported',()=>{
 assert.equal(parts.filter(p=>p.printable).length,18);
 for(const p of parts.filter(p=>!p.printable)) assert.throws(()=>printableGeometry(p),/cannot be printed/);
});
for(const part of parts.filter(p=>p.printable)) test(`${part.id}: watertight, positive-volume STL at Z=0`,()=>{
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
  key.geometry.computeBoundingBox();assert.ok(key.position[2]+key.geometry.boundingBox.min.z-plateTop>=6);
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
