import Module from 'manifold-3d';
import * as THREE from 'three';
import { xiaoPosition } from './harness.js';
import { usbSpec } from './usb.js';
import { mxSpec } from './mx.js';
const wasmURL=new URL('../node_modules/manifold-3d/manifold.wasm',import.meta.url);
const kernel=await Module({locateFile:()=>wasmURL.protocol==='file:'?decodeURIComponent(wasmURL.pathname):wasmURL.href});
kernel.setup();
export const assemblySpec={
 screwCenters:[[-46,-46],[46,-46],[-46,46],[46,46]],
 screwDiameter:3.4,nutAcrossFlats:5.8,nutDepth:2.6,
 lipOuter:103.4,lipInner:100.2,lipHeight:1.6,frameInner:104,
 socket:{model:'PG151101S11 / CPG151101S11',bodyWidth:11.3,baseWidth:10.9,bodyDepth:5.89,bodyHeight:1.85,
  overallWidth:14.5,collarHeight:1.2,pins:mxSpec.pins,clearance:.25,bottomZ:mxSpec.socketBottom},
};
// Every temporary WASM object is freed after converting the resulting solids.
export function buildAssembly(locations,variant='bare'){
 const owned=[];const keep=o=>(owned.push(o),o);
 const {Manifold:M,CrossSection:C}=kernel;
 const box=(w,d,h,x=0,y=0,z=0)=>keep(keep(M.cube([w,d,h])).translate([x-w/2,y-d/2,z]));
 const cylinder=(r,h,x=0,y=0,z=0,n=32)=>keep(keep(M.cylinder(h,r,r,n)).translate([x,y,z]));
 const union=arr=>keep(M.union(arr));
 const cut=(a,b)=>keep(a.subtract(b));
 const move=(a,x,y,z=0)=>keep(a.translate([x,y,z]));
 const section=(w,d,r)=>keep(keep(C.square([w-2*r,d-2*r],true)).offset(r,'Round',2,32));
 const extrude=(s,h,z=0)=>move(keep(s.extrude(h)),0,0,z);
 const slab=(w,d,r,h,z=0)=>extrude(section(w,d,r),h,z);
 const ring=(outer,inner,r,h,z)=>cut(slab(outer,outer,r,h,z),slab(inner,inner,r-(outer-inner)/2,h+.2,z-.1));
 const mesh=solid=>{
  if(solid.status()!=='NoError')throw new Error(`Assembly solid: ${solid.status()}`);
  const m=solid.getMesh();const g=new THREE.BufferGeometry();
  const positions=[];for(let i=0;i<m.vertProperties.length;i+=m.numProp)positions.push(...m.vertProperties.slice(i,i+3));
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(new THREE.BufferAttribute(m.triVerts,1));
  const result=g.toNonIndexed();g.dispose();result.computeVertexNormals();return result;
 };
 try{
  const {socket:s,screwCenters}=assemblySpec;
  const legacyPins=s.pins.map(([x,y])=>[x,y-7.62]);
  // PG151101S11 drawing envelope. Unspecified mould radii are visual approximations.
  // Keep the mounting envelope separate from the terminal cavities: the holder
  // must never grow fingers into the socket's electrical contact recesses.
  const outline=new THREE.Shape();
  outline.moveTo(-6.36,-1.16);
  outline.quadraticCurveTo(-6.36,-.86,-6.06,-.86);
  outline.lineTo(-2.2,-.86);
  outline.bezierCurveTo(-1.6,-.86,-1.4,-2.75,1.4,-2.75);
  outline.lineTo(4.64,-2.75);
  outline.quadraticCurveTo(4.94,-2.75,4.94,-3.05);
  outline.lineTo(4.94,-5.01);
  outline.quadraticCurveTo(4.94,-6.75,3.2,-6.75);
  outline.lineTo(-6.06,-6.75);
  outline.quadraticCurveTo(-6.36,-6.75,-6.36,-6.45);
  outline.closePath();
  // Reflect the old opposite-face outline about Y=-3.805: viewed from
  // the insertion side, the right terminal is higher than the left (IMG_6941).
  const profile=keep(new C([outline.getPoints(16).map(p=>[p.x,-7.61-p.y])]));
  const terminalRecesses=union([box(2.4,2.1,1.3,-5.56,-5.08,4.9),box(2.4,2.1,1.3,4.14,-2.54,4.9)]);
  const socketBody=cut(extrude(profile,s.bodyHeight,5),terminalRecesses);
  const pinSlots=union(legacyPins.map(([x,y])=>box(1.2,.6,3.5,x,y,4.9)));
  let socket=cut(union([socketBody,...legacyPins.map(([x,y])=>cylinder(1.45,1.2,x,y,6.85))]),pinSlots);
  const pocket=extrude(keep(profile.offset(s.clearance,'Round',2,32)),3.5,5);
  // Construct the holder in the legacy mould coordinates, then transform it
  // below the carrier. Its old floor is trimmed off after the transform.
  let pod=cut(box(15.8,10.5,4,-.635,-3.805,3),pocket);
  const contactReliefs=union(legacyPins.map(([x,y])=>box(2,1.4,2,x,y,3.8)));
  const solderBays=union([box(5,3.1,4,-7.15,-5.08,4.4),box(5,3.1,4,6,-2.54,4.4)]);
  pod=cut(pod,union([solderBays,contactReliefs]));
  // Relief slots isolate flexible tongues on the two long edges.
  const relief=[];
  for(const [cx,cy] of [[-3.8,-6.95],[1,-.66]]){
   for(const dx of [-1.65,1.65])relief.push(box(.65,3.1,4,cx+dx,cy,3.8));
  }
  pod=cut(pod,union(relief));
  // After inversion the flat shoulder supports the socket at Z=8.05,
  // with 0.1 mm seating slack and a 0.7 mm nose. Print-fit trial required.
  const hook=(cx,boundary,direction)=>{
   // Full-depth buttress: the outer back slopes from the head down to the pod rim.
   // Keep the two side relief slots open; a stiffer tongue requires physical insertion testing.
   const yz=[[-2,3.8],[0,3.8],[0,6.95],[.45,6.95],[.45,7.65],[.10,8.0],[-.65,8.0],[-2,7]]
    .map(([inset,z])=>[boundary+direction*inset,z]);
   if(direction<0)yz.reverse();
   return move(keep(keep(keep(new C([yz])).extrude(2.6)).rotate([90,0,90])),cx-1.3,0,0);
  };
  pod=cut(union([pod,hook(-3.8,-7,1),hook(1,-.61,-1)]),solderBays);
  // The old pod now hangs from the carrier, opening downward. Socket collars
  // remain upward: only the holder is inverted, never the electrical part.
  socket=move(socket,0,7.62,3.15);
  const fiveHoles=(z,h)=>union([cylinder(mxSpec.centerHole/2,h,0,0,z),
   ...mxSpec.guides.map(([x,y])=>cylinder(mxSpec.guideHole/2,h,x,y,z)),
   ...s.pins.map(([x,y])=>cylinder(mxSpec.contactHole/2,h,x,y,z))]);
  pod=keep(keep(pod.mirror([0,0,1])).translate([0,7.62,15]));
  pod=keep(pod.intersect(box(22,22,3.6,0,3.8,6.6)));
  pod=cut(pod,fiveHoles(6,7));
  const coupon=cut(union([box(22,22,1.5,0,2,10),pod]),fiveHoles(6,7));
  const screws=screwCenters.map(([x,y])=>cylinder(1.7,24,x,y,-2));
  const nuts=screwCenters.map(([x,y])=>cylinder(assemblySpec.nutAcrossFlats/Math.sqrt(3),2.7,x,y,-1.1,6));
  // 2 mm floor; retain the original mating height only at rim and fasteners.
  let bottom=union([slab(110,110,8,2,-1),ring(110,100.2,8,2.1,.9),
   ...screwCenters.map(([x,y])=>cylinder(5.6,2.1,x,y,.9)),ring(103.4,100.2,5.7,1.7,2.9)]);
  // Cradle with exterior stops supports the board edges and leaves an underside relief.
  const [bx,by,bz]=xiaoPosition;
  let cradle=cut(box(21,22,3.2,bx,by+.6,3),box(18.4,21.6,3,bx,by,5));
  cradle=cut(cradle,box(14,17,3,bx,by,3.8));
  // Side windows expose solder pads; low rails still locate the PCB edge.
  cradle=cut(cradle,union([-1,1].map(d=>box(3,19,2,bx+d*9.5,by,5.8))));
  // Only a Type-C-sized window penetrates the outside wall.
  const radius=usbSpec.panelHeight/2;
  const halfStraight=usbSpec.panelWidth/2-radius;
  const usbProfile=keep(C.union([keep(C.square([2*halfStraight,2*radius],true)),
   ...[-1,1].map(d=>keep(keep(C.circle(radius,64)).translate([d*halfStraight,0])))]));
  const usbOpening=move(keep(keep(usbProfile.extrude(10)).rotate([90,0,0])),bx,-49,usbSpec.centerZ);
  // Internal recess stops 1.2 mm short of the exterior, retaining the PCB shoulders.
  const boardRecess=box(21.6,3.8,5.8,bx,-51.9,3);
  bottom=cut(union([bottom,box(21,22,2.1,bx,by+.6,.9),cradle]),union([...screws,...nuts,usbOpening]));
  // The frame's solid pillars bridge the two plates; all four holes are coaxial.
  const pillars=screwCenters.map(([x,y])=>union([cylinder(4.5,7,x,y,3),box(10,6,7,Math.sign(x)*48,y,3)]));
  let wall=cut(union([ring(110,104,8,7,3),...pillars]),union([...screws,
   // Relief pockets in the pillars accept both continuous locating lips.
   ring(103.9,99.7,5.95,1.9,2.9),ring(103.9,99.7,5.95,1.9,8.2),...screwCenters.map(([x,y])=>cylinder(4.8,1.3,x,y,8.8))]));
  const switchCuts=locations.map(k=>move(fiveHoles(6,7),k.x,k.y));
  let top=union([...locations.map(k=>move(pod,k.x,k.y)),slab(110,110,8,1.5,10),ring(103.4,100.2,5.7,1.7,8.4),...screwCenters.map(([x,y])=>cylinder(4.5,2.5,x,y,9))]);
  top=cut(top,union([...screws,...switchCuts,cylinder(9.8,5,-30,30,8),cylinder(9,5,30,30,8)]));
  wall=cut(wall,union([usbOpening,boardRecess]));
  top=cut(top,union([usbOpening,boardRecess]));
  // Optional square-hole plate: 5 mm above the five-hole carrier surface.
  let frame=union([slab(110,110,8,1.5,15),...screwCenters.map(([x,y])=>cylinder(4.5,5,x,y,11.5))]);
  frame=cut(frame,union([...screws,...locations.map(k=>box(14.2,14.2,3,k.x,k.y,14.5)),
   cylinder(10,8,-30,30,11),cylinder(10,8,30,30,11)]));
  const washers=union(screwCenters.map(([x,y])=>cut(cylinder(3.5,1,x,y,16.5),cylinder(1.7,1.2,x,y,16.4))));
  const headZ=variant==='framed'?17.5:11.5,shaftLength=variant==='framed'?18:12;
  const bolts=union(screwCenters.map(([x,y])=>union([cylinder(1.5,shaftLength,x,y,-.5),cut(cylinder(2.75,3,x,y,headZ),cylinder(1.3,1.8,x,y,headZ+1.5,6))])));
  const metalNuts=union(screwCenters.map(([x,y])=>cut(cylinder(5.5/Math.sqrt(3),2.4,x,y,-.9,6),cylinder(1.5,3,x,y,-1.1))));
  const socketSolids=locations.map(k=>move(socket,k.x,k.y));
  const result={bottom:mesh(bottom),wall:mesh(move(wall,0,0,-3)),top:mesh(move(top,0,0,-10)),
   frame:mesh(move(frame,0,0,-15)),washers:mesh(move(washers,0,0,-16.5)),sockets:mesh(union(socketSolids)),bolts:mesh(bolts),nuts:mesh(metalNuts),
   coupon:mesh(coupon)};
  // Mechanical regression evidence is computed from solid intersections, not screenshots.
  const overlap=(a,b)=>{const i=keep(a.intersect(b));return i.volume();};
  const allShell=union([bottom,wall,top,...(variant==='framed'?[frame,washers]:[])]);
  const plasticPins=union([cylinder(mxSpec.postDiameter/2,3.3,0,0,8.2),...mxSpec.guides.map(([x,y])=>cylinder(.8,3.3,x,y,8.2))]);
  const contacts=union(s.pins.map(([x,y])=>box(1.1,.4,3.3,x,y,8.2)));
  const completePins=union([plasticPins,contacts]);
  const switchBody=box(14,14,7,0,0,11.5);
  const pinsInAssembly=union(locations.map(k=>move(completePins,k.x,k.y)));
  // Sweep the inserted pins upward through the final millimetre of approach.
  const insertionSweep=union(Array.from({length:6},(_,i)=>move(pinsInAssembly,0,0,i*.2)));
  result.validation={bottomComponents:bottom.decompose().map(keep).length,wallComponents:wall.decompose().map(keep).length,
   topComponents:top.decompose().map(keep).length,
   postSocketOverlap:overlap(socket,cylinder(1.95,3.3,0,0,8.2)),guideSocketOverlap:overlap(socket,union(mxSpec.guides.map(([x,y])=>cylinder(.8,3.3,x,y,8.2)))),plasticSocketOverlap:overlap(socket,plasticPins),contactSocketOverlap:overlap(socket,contacts),
   pinShellOverlap:overlap(allShell,pinsInAssembly),pinSocketOverlap:overlap(union(socketSolids),pinsInAssembly),
   insertionOverlap:overlap(allShell,insertionSweep),
   switchBodyOverlap:overlap(allShell,union(locations.map(k=>move(switchBody,k.x,k.y)))),
   usbPassageOverlap:overlap(union([bottom,wall,top]),usbOpening),
   boardOutwardStopOverlap:overlap(union([bottom,wall,top]),box(17.8,21,1,bx,by-.6,bz)),
   boardSeatedOverlap:overlap(union([bottom,wall,top]),box(17.8,21,1,bx,by,bz)),
   shellOverlap:overlap(bottom,wall)+overlap(bottom,top)+overlap(wall,top),
   socketHolderOverlap:overlap(top,union(socketSolids)),
   socketContactReliefOverlap:overlap(top,union(locations.map(k=>move(fiveHoles(6,7),k.x,k.y)))),
   socketSolderBayOverlap:overlap(top,union(locations.flatMap(k=>[box(1.6,1.68,.4,k.x-7.15,k.y+2.54,8.65),box(1.6,1.68,.4,k.x+6,k.y+5.08,8.65)]))),
   upwardRetentionVolume:overlap(top,move(union(socketSolids),0,0,.6)),
   downwardSupportVolume:overlap(top,move(union(socketSolids),0,0,-.3)),
   frameShellOverlap:overlap(frame,union([bottom,wall,top])),frameComponents:frame.decompose().map(keep).length,
   boltShellOverlap:overlap(union([bottom,wall,top,...(variant==='framed'?[frame,washers]:[])]),bolts),nutShellOverlap:overlap(bottom,metalNuts)};
  return result;
 }finally{for(const o of owned.reverse())o.delete();}
}

// Printable trial fit, deliberately separate from nominal switch dimensions.
export const keycapSpec={height:8.5,cavityDepth:4.7,wallInset:1.7,
 mountSpan:4.3,mountBar:1.3,mountDepth:4.2,hubRadius:2.9,leadInDepth:.35,
 assembledZ:20.8,stemTop:23.1,stemSpan:4.0,stemBar:1.2,travel:4};
export function hollowKeycap(exterior,width,depth,mountXs){
 const owned=[];const keep=o=>(owned.push(o),o);const {Manifold:M,CrossSection:C}=kernel;const s=keycapSpec;
 const move=(g,x,y,z)=>keep(g.translate([x,y,z]));
 const box=(w,d,h,x=0,y=0,z=0)=>move(keep(M.cube([w,d,h])),x-w/2,y-d/2,z);
 const union=a=>keep(M.union(a));const cut=(a,b)=>keep(a.subtract(b));
 try{
  const input=new kernel.Mesh({numProp:3,vertProperties:exterior.attributes.position.array,triVerts:new Uint32Array(exterior.index.array)});input.merge();
  const outside=keep(new M(input));
  const inner=keep(keep(C.square([width-2*s.wallInset-4,depth-2*s.wallInset-4],true)).offset(2,'Round',2,32));
  const cavity=move(keep(inner.extrude(s.cavityDepth+.1)),0,0,-.1);
  const hubs=mountXs.map(x=>move(keep(M.cylinder(s.cavityDepth+.2,s.hubRadius,s.hubRadius,48)),x,0,0));
  const holes=[];
  for(const x of mountXs){
   holes.push(box(s.mountSpan,s.mountBar,s.mountDepth+.1,x,0,-.1),box(s.mountBar,s.mountSpan,s.mountDepth+.1,x,0,-.1));
   for(const [w,d] of [[s.mountSpan,s.mountBar],[s.mountBar,s.mountSpan]]){
    const mouth=keep(C.square([w+.3,d+.3],true));
    holes.push(move(keep(mouth.extrude(s.leadInDepth+.05,0,0,[w/(w+.3),d/(d+.3)])),x,0,-.05));
   }
  }
  const solid=cut(union([cut(outside,cavity),...hubs]),union(holes));
  const m=solid.getMesh();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(m.vertProperties,3));g.setIndex(new THREE.BufferAttribute(m.triVerts,1));const geometry=g.toNonIndexed();g.dispose();geometry.computeVertexNormals();
  const stems=union(mountXs.flatMap(x=>[box(s.stemSpan,s.stemBar,3.7,x,0,-.5),box(s.stemBar,s.stemSpan,3.7,x,0,-.5)]));
  const overlap=keep(solid.intersect(stems));
  const components=solid.decompose().map(keep).length;
  return {geometry,validation:{components,stemOverlap:overlap.volume(),engagement:s.stemTop-s.assembledZ,
   roofThickness:s.height-2.1-s.cavityDepth,mounts:mountXs.length}};
 }finally{for(const o of owned.reverse())o.delete();}
}
