import { mkdir, writeFile } from 'node:fs/promises';
import { Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createParts, printableGeometry, dimensions } from '../../web/model.js';
const dir=new URL('../../exports/stl/',import.meta.url); await mkdir(dir,{recursive:true});
const parts=createParts(); const exporter=new STLExporter();
for(const part of parts) {
  const data=exporter.parse(new Mesh(printableGeometry(part)),{binary:true});
  await writeFile(new URL(`${part.id}.stl`,dir),Buffer.from(data.buffer,data.byteOffset,data.byteLength));
}
await writeFile(new URL('../manifest.json',dir),JSON.stringify({version:1,units:'mm',dimensions,status:'Concept samples; not hardware-fit validated',parts:parts.map(({geometry,...p})=>p)},null,2)+'\n');
console.log(`Exported ${parts.length} separate STL parts in millimetres to exports/stl/`);
const {zipSync,strToU8}=await import('fflate');
const {readFile}=await import('node:fs/promises');
const archive={};
for(const part of parts) archive[`${part.id}.stl`]=new Uint8Array(await readFile(new URL(`${part.id}.stl`,dir)));
archive['README.txt']=strToU8('Codex Micro concept samples v0.1\nUnits: millimetres (mm). Each STL rests on Z=0.\nNo PCB/switch/fastener fit validation. Solid controls are appearance placeholders.\nUse your slicer to check orientation, supports and tolerances. Not a working keyboard kit.\n');
archive['manifest.json']=new Uint8Array(await readFile(new URL('../manifest.json',dir)));
const publicDir=new URL('../../public/',import.meta.url);await mkdir(publicDir,{recursive:true});
await writeFile(new URL('codex-micro-stl.zip',publicDir),zipSync(archive));
