import test from 'node:test';
import assert from 'node:assert/strict';
import { createParts, printableGeometry } from '../../web/model.js';
import { Mesh, Vector3 } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
const parts=createParts();
test('assembly IDs are unique',()=>assert.equal(new Set(parts.map(p=>p.id)).size,parts.length));
test('electronic placeholders cannot be exported',()=>{
 assert.equal(parts.filter(p=>p.printable).length,15);
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
