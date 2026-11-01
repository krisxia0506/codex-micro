import { mkdir, writeFile, rm, readdir } from 'node:fs/promises';
import { Mesh } from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { zipSync,strToU8 } from 'fflate';
import { createParts, printableGeometry, dimensions, socketFitCoupon } from '../../web/model.js';
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
 parts.push({id:'socket-fit-coupon',name:'五孔上板与下挂底座试配件',printable:true,geometry:socketFitCoupon()});
 const archive={};
 for(const part of parts){
  const geometry=printableGeometry(part),data=exporter.parse(new Mesh(geometry),{binary:true});
  const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  archive[`${part.id}.stl`]=bytes;await writeFile(new URL(`${part.id}.stl`,dir),bytes);geometry.dispose();
 }
 const manifest={version:1,modelVersion:'0.18',variant:'A',units:'mm',dimensions,status:'Unvalidated physical fit; A has no switch-housing latch',screws:'4 x M3 x 12',parts:parts.map(({geometry,...p})=>p)};
 archive['manifest.json']=strToU8(JSON.stringify(manifest,null,2));
 archive['README.txt']=strToU8(`Codex Micro v0.18 / A - five-hole carrier
Units: mm. Enclosure 110 x 120 mm. Replace bottom, wall and top together. XIAO centre (0,53,5), USB faces +Y.
Bottom floor 2 mm; rim, nut seats and cradle base locally 4 mm. Carrier 1.5 mm. Socket mounts underneath carrier. Holes: centre 4.4 mm, guides 2.1 mm, socket collars 3.2 mm. Hardware: four M3x12 screws and M3 hex nuts.
Print bottom flat face on bed; carrier and coupon exported face down with holders upward. PLA / 0.4 mm nozzle / 0.12 mm layers: print coupon first. No switch-housing latch in this design. Physical fit, retention and stiffness unverified.
XIAO/USB reference geometry is provisional; knob and joystick cap remain solid appearance pieces.
References: Cherry MX and Kailh PG151101S11 drawings; KiCad MX footprint; MakerWorld BigNum and 20/20 structure references. No third-party CAD redistributed.
`);
 const zip=zipSync(archive);
 await writeFile(new URL(`codex-micro-stl.zip`,publicDir),zip);
 await writeFile(new URL(`../../exports/codex-micro-v0.18-stl.zip`,import.meta.url),zip);
 await writeFile(new URL('manifest.json',dir),archive['manifest.json']);
 console.log(`A: exported ${parts.length} STL files`);
 for(const p of parts)p.geometry.dispose();
}
