import { mkdir, writeFile } from 'node:fs/promises';
import { Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { zipSync,strToU8 } from 'fflate';
import { createParts, printableGeometry, dimensions, socketFitCoupon } from '../../web/model.js';
const exporter=new STLExporter();
const publicDir=new URL('../../public/',import.meta.url);await mkdir(publicDir,{recursive:true});
for(const variant of ['bare','framed']){
 const dir=new URL(`../../exports/${variant}/`,import.meta.url);await mkdir(dir,{recursive:true});
 const parts=createParts(variant).filter(p=>p.printable);
 parts.push({id:'socket-fit-coupon',name:'五孔上板与下挂底座试配件',printable:true,geometry:socketFitCoupon()});
 const archive={};
 for(const part of parts){
  const geometry=printableGeometry(part),data=exporter.parse(new Mesh(geometry),{binary:true});
  const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  archive[`${part.id}.stl`]=bytes;await writeFile(new URL(`${part.id}.stl`,dir),bytes);geometry.dispose();
 }
 const manifest={version:1,modelVersion:'0.17',variant,units:'mm',dimensions,status:'Unvalidated physical fit; A has no switch-housing latch',screws:variant==='framed'?'4 x M3 x 18':'4 x M3 x 12',parts:parts.map(({geometry,...p})=>p)};
 archive['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
 archive['README.txt']=strToU8(`Codex Micro v0.17 / ${variant==='bare'?'A - five-hole carrier only':'B - five-hole carrier plus square-hole switch plate'}\nUnits: mm. Replace both old bottom and top. Socket mounts are now underneath the top carrier.\nFive holes per switch: centre 4.4 mm; two locating pegs 2.1 mm at +/-5.08; two socket-collar holes 3.2 mm at (-3.81,2.54) and (2.54,5.08), Cartesian top view. These include print allowances, not manufacturer tolerances. Carrier thickness 1.5 mm. B square-hole plate top is 5 mm above the carrier top, with integral corner spacers and 14.2 mm openings.\nHardware: ${manifest.screws}, four M3 hex nuts. B includes four 1 mm printed washers above the square-hole plate to use standard M3x18 lengths. Do not use A screws for B.\nPrint carrier and coupon with broad top face on bed (already oriented), socket mounts upward. B frame is exported broad face on bed, feet upward; washers print flat. Bottom flat face on bed. Bottom floor is 2 mm; rim, nut seats and cradle foundation remain locally 4 mm.\nTrial target: PLA / 0.4 mm nozzle / 0.12 mm layers. Print coupon first: seat socket from underneath carrier, then insert switch from the five-hole side. Centre and locating pegs must pass freely. A does not latch the switch housing; B uses the separate square-hole plate. Check socket retention before pressing hard. Geometry checks do not establish physical fit or load capacity.\nXIAO cradle / USB geometry remains provisional; knob and joystick cap remain solid appearance pieces. No working electronics kit or assembly certification.\nReferences: MakerWorld BigNum 610097 and 20/20 2563301 (structure only); KiCad SW_Cherry_MX_1.00u_PCB footprint; Cherry MX series and Kailh PG151101S11 drawings. Independently constructed geometry, no third-party CAD redistributed.\n`);
 const zip=zipSync(archive);
 await writeFile(new URL(`codex-micro-${variant}-stl.zip`,publicDir),zip);
 await writeFile(new URL(`../../exports/codex-micro-v0.17-${variant}-stl.zip`,import.meta.url),zip);
 if(variant==='bare')await writeFile(new URL('codex-micro-stl.zip',publicDir),zip);
 await writeFile(new URL('manifest.json',dir),archive['manifest.json']);
 console.log(`${variant}: exported ${parts.length} STL files`);
 for(const p of parts)p.geometry.dispose();
}
