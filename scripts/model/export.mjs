import { mkdir, writeFile, rm } from 'node:fs/promises';
import { Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createParts, printableGeometry, dimensions, socketFitCoupon } from '../../web/model.js';
const dir=new URL('../../exports/stl/',import.meta.url); await mkdir(dir,{recursive:true});
const parts=createParts().filter(p=>p.printable);parts.push({id:'socket-fit-coupon',name:'单底座试配件',printable:true,geometry:socketFitCoupon()}); const exporter=new STLExporter();
for(const part of parts) {
  const data=exporter.parse(new Mesh(printableGeometry(part)),{binary:true});
  await writeFile(new URL(`${part.id}.stl`,dir),Buffer.from(data.buffer,data.byteOffset,data.byteLength));
}
await writeFile(new URL('../manifest.json',dir),JSON.stringify({version:1,modelVersion:'0.12',units:'mm',dimensions,status:'Concept samples; not hardware-fit validated',parts:parts.map(({geometry,...p})=>p)},null,2)+'\n');
console.log(`Exported ${parts.length} separate STL parts in millimetres to exports/stl/`);
const {zipSync,strToU8}=await import('fflate');
const {readFile}=await import('node:fs/promises');
const archive={};
for(const part of parts) archive[`${part.id}.stl`]=new Uint8Array(await readFile(new URL(`${part.id}.stl`,dir)));
archive['README.txt']=strToU8('Codex Micro handwired concept samples v0.12\nv0.12: Midframe exterior restored around a 10 x 3.5 mm Type-C window. Internal board recess retains 1.2 mm exterior wall to block PCB shoulders. Bottom separate stops replaced by continuous midframe wall. USB face recessed 0.4 mm. Upward clamping remains unimplemented. XIAO edge-support cradle, underside relief, side solder windows and exterior USB opening. Replace bottom, wall and top together. Cradle locates the board but does not clamp it vertically. Actual PCB underside and USB cable fit must be checked. Units: millimetres (mm). Each STL rests on Z=0.\nXIAO Sense Plus and handwired architecture. Integral socket pockets and retaining shoulders follow PG151101S11 dimensions. v0.9 adds solid triangular rear buttresses from hook heads to pod rims on all 13 bottom socket mounts. Side slots stay open. Hooks retain 45-degree undersides and 0.70 mm noses. Buttresses stiffen the tongues: insertion force and retention need physical testing. Target trial: PLA, 0.4 mm nozzle, 0.12 mm layers. Bottom: flat face on bed, pockets upwards; hooks intended for support-free trial, not yet physically validated. Shell has locating lips and four M3x12 screws with M3 nuts (hardware not printed). No switch/fastener fit validation. Keycaps have hollow undersides and MX cross sockets (4.30 mm span, 1.30 mm arm, 4.20 mm depth); print one standard key first to check fit. Voice key uses two sockets 20 mm apart, not standard stabilizer spacing. Knob and joystick remain solid placeholders.\nTop plate is already exported face-down with the lip upwards. Fit bottom nuts, seat both locating lips in the frame, then tighten four screws from above. Use your slicer to check supports and tolerances. Not a working keyboard kit.\n');
archive['manifest.json']=new Uint8Array(await readFile(new URL('../manifest.json',dir)));
await rm(new URL('socket-carriers.stl',dir),{force:true}); // Superseded generated sample.
const publicDir=new URL('../../public/',import.meta.url);await mkdir(publicDir,{recursive:true});
await writeFile(new URL('codex-micro-stl.zip',publicDir),zipSync(archive));
