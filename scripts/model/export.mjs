import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { zipSync,strToU8 } from 'fflate';
import { createParts, printableGeometry, dimensions, socketFitCoupon, assemblySpec } from '../../web/model.js';
const exporter=new STLExporter();
const publicDir=new URL('../../public/',import.meta.url);await mkdir(publicDir,{recursive:true});
// Remove generated variant exports so obsolete B files are not served or packaged.
for(const name of ['bare','framed'])await rm(new URL(`../../exports/${name}/`,import.meta.url),{recursive:true,force:true});
for(const name of await readdir(publicDir))if(/^codex-micro-(bare|framed)-stl\.zip$/.test(name))await rm(new URL(name,publicDir));
const exportRoot=new URL('../../exports/',import.meta.url);await mkdir(exportRoot,{recursive:true});
for(const name of await readdir(exportRoot))if(/^codex-micro-v[0-9.]+-(bare|framed)-stl\.zip$/.test(name))await rm(new URL(name,exportRoot));
{
 const dir=new URL(`../../exports/stl/`,import.meta.url);await mkdir(dir,{recursive:true});
 const parts=createParts().filter(p=>p.printable);
 parts.push({id:'socket-fit-coupon',name:'1350 下挂底座试配件',printable:true,geometry:socketFitCoupon()});
 const archive={};
 for(const part of parts){
  const geometry=printableGeometry(part),data=exporter.parse(new Mesh(geometry),{binary:true});
  const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  archive[`${part.id}.stl`]=bytes;await writeFile(new URL(`${part.id}.stl`,dir),bytes);geometry.dispose();
 }
 const manifest={version:1,modelVersion:'0.21',variant:'A',switchFamily:'Deep Sea MINI / Choc V2 reference',socketModel:'CPG135001S30',socketDimensions:assemblySpec.socket,socketSupport:assemblySpec.socketSupport,mechanicalStatus:'Reference trial: exact MINI mould drawing unavailable',units:'mm',dimensions,status:'Unvalidated physical fit; A has no switch-housing latch',screws:'4 x M3 x 12',parts:parts.map(({geometry,...p})=>p)};
 archive['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
 archive['README.txt']=strToU8(`Codex Micro v0.21 / A - MINI low-profile reference-fit prototype
Units: mm. Enclosure 110 x 120 mm. XIAO centre (0,53,5), USB faces +Y. Bottom floor 2 mm, local mounts 4 mm. Four M3x12 screws and M3 nuts.
Requires Kailh CPG135001S30 Choc sockets. OLD CPG151101S11 MX SOCKETS DO NOT FIT. Replace the top carrier, sockets and all keycaps; v0.21 bottom adds 13 socket support pedestals; midframe unchanged.
The exact Deep Sea MINI mould drawing has NOT been obtained. Mechanical interface is based on Kailh CPG135301D01 Choc V2 drawing, with MINI 2.8 +/-0.25 mm travel from its official product page. The silent -21 PDF is a DIFFERENT travel variant and was NOT used as the MINI specification. Unspecified mould curves are approximations; no third-party CAD redistributed.
1350 socket drawing KHA-PG1350-005EN: upper width 9.95 +/-0.15, lower width 9.55 +/-0.05, depth 6.85 +/-0.05, body height 1.85 +/-0.1, overall terminal span 13.15 +/-0.15, collar diameter 2.90 +/-0.05, total height 3.05 +/-0.05. Rim thickness 0.25 is an UNDIMENSIONED modelling assumption. Pocket uses maximum upper profile plus 0.25 mm per side through the insertion path (overall pocket envelope 10.45 x 7.35); do not constrict entry to lower width. Collar relief 3.3 mm is a PRINT allowance, not the drawing PCB hole 3.0 mm.
Bottom supports: one per switch, offset (-2.5,-4.9) mm from switch centre. Interior floor Z=1, support top Z=8, socket underside Z=8.15: height above floor 7 mm, nominal gap 0.15 mm. Top diameter 2.8 mm, tapered foot diameter 5 mm. The top touches insulating central bridge, not contacts. Gap is a design allowance, NOT verified print tolerance. Check seating with enclosure screws lightly tightened; never force a warped plate closed.
Carrier holes: centre 5.2 mm, socket collars 3.3 mm, auxiliary relief 1.8 mm. Contacts (-5,-3.8) and (0,-5.9); socket collars (-5,-3.8) and (0,-6). The 0.1 mm difference is accommodated inside the socket slots, not silently changed to match.
Keycap: height 7.5, cavity 3.8, mounting boss diameter 5.2, cross 4.15 x 1.45, blind depth 2.8, engagement 2.5 mm. Guard inner/outer 5.5/6.5 mm are CHOC V2 REFERENCE dimensions, not confirmed MINI measurements. All print allowances are design assumptions.
PRINT THE TWO-PIECE FIT KIT FIRST: socket-fit-coupon.stl plus key-1.stl. PLA / 0.4 mm nozzle / 0.12 mm layers. Carrier/coupon exported broad face down and holders up. Keycap is hollow: inspect slicer bridges/support and do not fill the blind mounting hole with support. Seat the Choc socket, insert the switch, then fit the cap. Check retaining shoulders, three pin clearances, light seating force, full return and bottom-out clearance before printing the whole set. Do not force a tight cap; printed fit and strength remain unverified.
A does not latch the switch housing. XIAO/USB geometry is provisional; knob and joystick cap are solid appearance pieces.
Sources:
https://www.kailhswitch.com/Content/upload/pdf/202115927/CPG135001S30-data-sheet.pdf
https://kailhswitch.net/products/kailh-deep-sea-silent-min-low-profile-keyboard-switch
https://www.kailh.net/pages/product-datasheet
https://raw.githubusercontent.com/keyboardio/keyswitch_documentation/master/datasheets/Kailh/CPG135001S30-Choc-Socket.pdf
`);
 const fit=zipSync({'socket-fit-coupon.stl':archive['socket-fit-coupon.stl'],'key-1.stl':archive['key-1.stl'],'README.txt':archive['README.txt']});
 await writeFile(new URL('codex-micro-mini-fit.zip',publicDir),fit);
 await writeFile(new URL('../../exports/codex-micro-v0.21-mini-fit.zip',import.meta.url),fit);
 const zip=zipSync(archive);
 await writeFile(new URL(`codex-micro-stl.zip`,publicDir),zip);
 await writeFile(new URL(`../../exports/codex-micro-v0.21-stl.zip`,import.meta.url),zip);
 await writeFile(new URL('manifest.json',dir),archive['manifest.json']);
 console.log(`A: exported ${parts.length} STL files`);
 for(const p of parts)p.geometry.dispose();
}
