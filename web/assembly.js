import Module from 'manifold-3d';
import * as THREE from 'three';
import { xiaoPosition } from './harness.js';
import { usbSpec } from './usb.js';
import { switchSpec, socketTerminals } from './switch-spec.js';
const wasmURL=new URL('../node_modules/manifold-3d/manifold.wasm',import.meta.url);
const kernel=await Module({locateFile:()=>wasmURL.protocol==='file:'?decodeURIComponent(wasmURL.pathname):wasmURL.href});
kernel.setup();
export const assemblySpec={
 screwCenters:[[-46,-46],[46,-46],[-46,46],[46,46]],
 socketSupport:{offset:[-2.5,-4.9],floorZ:1,topZ:switchSpec.socketBottom-.15,gap:.15,topDiameter:2.8,footDiameter:5},
 screwDiameter:3.4,nutAcrossFlats:5.8,nutDepth:2.6,
 lipOuter:103.4,lipInner:100.2,lipHeight:1.6,frameInner:104,
 socket:{model:'CPG135001S30',bodyWidth:9.95,baseWidth:9.55,bodyDepth:6.85,bodyHeight:1.85,
  overallWidth:13.15,collarHeight:1.2,collarDiameter:2.9,flangeHeight:.25,pins:switchSpec.socketPins,clearance:.5,bottomZ:switchSpec.socketBottom},
};
// Every temporary WASM object is freed after converting the resulting solids.
export function buildAssembly(locations){
 const owned=[];const keep=o=>(owned.push(o),o);
 const {Manifold:M,CrossSection:C}=kernel;
 const box=(w,d,h,x=0,y=0,z=0)=>keep(keep(M.cube([w,d,h])).translate([x-w/2,y-d/2,z]));
 const cylinder=(r,h,x=0,y=0,z=0,n=32)=>keep(keep(M.cylinder(h,r,r,n)).translate([x,y,z]));
 const union=arr=>keep(M.union(arr));
 const cut=(a,b)=>keep(a.subtract(b));
 const move=(a,x,y,z=0)=>keep(a.translate([x,y,z]));
 const section=(w,d,r)=>keep(keep(C.square([w-2*r,d-2*r],true)).offset(r,'Round',2,32));
 const extrude=(s,h,z=0)=>move(keep(s.extrude(h)),0,0,z);
 // Extend enclosure profiles 10 mm at +Y for the top-centred controller bay.
 const slab=(w,d,r,h,z=0)=>move(extrude(section(w,d+10,r),h,z),0,5);
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
  const recess=switchSpec.recessDepth,nominalSocketBottom=s.bottomZ+recess;
  // CPG135001S30 insertion-side profile: 9.95 x 6.85 mm; rounded waist
  // and contact cavity shape are approximate where the drawing is unlabelled.
  const outline=new THREE.Shape();
  outline.moveTo(-7.575,-1.475);outline.lineTo(-3.4,-1.475);
  outline.bezierCurveTo(-2.1,-1.475,-2.7,-3.675,-.5,-3.675);
  outline.lineTo(1.575,-3.675);outline.lineTo(2.375,-4.475);
  outline.lineTo(2.375,-8.325);outline.lineTo(-1.7,-8.325);
  outline.bezierCurveTo(-3,-8.325,-2.4,-6.125,-4.5,-6.125);
  outline.lineTo(-6.775,-6.125);outline.lineTo(-7.575,-5.325);outline.closePath();
  const profile=keep(new C([outline.getPoints(16).map(p=>[p.x,p.y]).reverse()]));
  const pinSlots=union(s.pins.map(([x,y])=>box(1.2,.8,3.5,x,y,8.05)));
  const contactRecesses=union([box(2.3,2.1,1.2,-6.6,-3.8,8.05),box(2.3,2.1,1.2,1.4,-6,8.05)]);
  // Drawing: bottom width 9.55, upper rim 9.95. Rim thickness is unlabelled;
  // 0.25 mm is a modelling assumption, NOT a manufacturer dimension.
  const baseProfile=keep(profile.intersect(keep(keep(C.square([s.baseWidth,20],true)).translate([-2.6,-4.9]))));
  const shoulderZ=nominalSocketBottom+s.bodyHeight-s.flangeHeight;
  const socketBody=union([extrude(baseProfile,s.bodyHeight,nominalSocketBottom),extrude(profile,s.flangeHeight,shoulderZ)]);
  let socket=cut(union([cut(socketBody,contactRecesses),
   ...s.pins.map(([x,y])=>cylinder(s.collarDiameter/2,s.collarHeight,x,y,nominalSocketBottom+s.bodyHeight))]),pinSlots);
  // Keep the pocket at the maximum rim envelope through the full insertion path.
  // Shrinking its entry to the base width would prevent the wider rim from entering.
  const pocket=extrude(keep(profile.offset(s.clearance,'Round',2,32)),4,6.8);
  let pod=cut(extrude(keep(profile.offset(1.5,'Round',2,32)),3.1,7.1),pocket);
  const solderBays=union(socketTerminals.map(([x,y])=>box(4,3.1,4,x,y,6.8)));
  const relief=[];
  for(const [cx,cy] of [[-5,-.975],[0,-8.825]])for(const dx of [-1.65,1.65])relief.push(box(.65,3.1,3.1,cx+dx,cy,7.1));
  pod=cut(pod,union([...relief,solderBays]));
  const hook=(cx,boundary,direction)=>{
   const yz=[[-1.5,10.1],[0,10.1],[0,8.05],[.65,8.05],[.65,7.35],[0,7.0],[-1.5,8.2]]
    .map(([d,z])=>[boundary+direction*d,z]);
   if(yz.reduce((sum,p,i)=>{const q=yz[(i+1)%yz.length];return sum+p[0]*q[1]-q[0]*p[1];},0)<0)yz.reverse();
   return move(keep(keep(keep(new C([yz])).extrude(2.6)).rotate([90,0,90])),cx-1.3,0,0);
  };
  pod=cut(union([pod,hook(-5,-.95,-1),hook(0,-8.85,1)]),solderBays);
  const mountingHoles=(z,h)=>union([cylinder(switchSpec.centerHole/2,h,0,0,z),
   ...switchSpec.auxiliaryHoles.map(([x,y])=>cylinder(switchSpec.guideHole/2,h,x,y,z)),
   ...s.pins.map(([x,y])=>cylinder(switchSpec.contactHole/2,h,x,y,z))]);
  pod=cut(pod,mountingHoles(6,7));
  pod=move(pod,0,0,-recess);socket=move(socket,0,0,-recess);
  // 15 mm opening clears the 13.95 mm housing; 1.5 mm thick recessed floor.
  // An 18 mm outer cup ties that floor back into the surrounding upper plate.
  const cup=cut(box(18,18,1.5+recess,0,0,10-recess),box(15,15,recess+.2,0,0,11.5-recess));
  const coupon=cut(union([cut(box(22,24,1.5,0,-2,10),box(15,15,4,0,0,9)),cup,pod]),mountingHoles(6-recess,7+recess));
  const screws=screwCenters.map(([x,y])=>cylinder(1.7,24,x,y,-2));
  const nuts=screwCenters.map(([x,y])=>cylinder(assemblySpec.nutAcrossFlats/Math.sqrt(3),2.7,x,y,-1.1,6));
  // 2 mm floor; retain the original mating height only at rim and fasteners.
  let bottom=union([slab(110,110,8,2,-1),ring(110,100.2,8,2.1,.9),
   ...screwCenters.map(([x,y])=>cylinder(5.6,2.1,x,y,.9)),ring(103.4,100.2,5.7,1.7,2.9)]);
  // Central insulating bridge between the two contacts. Avoid both insertion
  // slots, underside contact recesses, solder bays and the retaining tongues.
  const support=assemblySpec.socketSupport;
  const supportLocal=union([
   move(keep(M.cylinder(2.1,support.footDiameter/2,support.topDiameter/2,48)),...support.offset,.9),
   cylinder(support.topDiameter/2,support.topZ-2.9,...support.offset,2.9)]);
  const supports=union(locations.map(k=>move(supportLocal,k.x,k.y)));
  bottom=union([bottom,supports]);
  // Cradle with exterior stops supports the board edges and leaves an underside relief.
  const [bx,by,bz]=xiaoPosition;
  let cradle=cut(box(21,22,3.2,bx,by-.6,3),box(18.4,21.6,3,bx,by,5));
  cradle=cut(cradle,box(14,17,3,bx,by,3.8));
  // Side windows expose solder pads; low rails still locate the PCB edge.
  cradle=cut(cradle,union([-1,1].map(d=>box(3,19,2,bx+d*9.5,by,5.8))));
  // Only a Type-C-sized window penetrates the outside wall.
  const radius=usbSpec.panelHeight/2;
  const halfStraight=usbSpec.panelWidth/2-radius;
  const usbProfile=keep(C.union([keep(C.square([2*halfStraight,2*radius],true)),
   ...[-1,1].map(d=>keep(keep(C.circle(radius,64)).translate([d*halfStraight,0])))]));
  const usbOpening=move(keep(keep(usbProfile.extrude(10)).rotate([90,0,0])),bx,69,usbSpec.centerZ);
  // Internal recess stops 1.2 mm short of the exterior, retaining the PCB shoulders.
  const boardRecess=box(21.6,3.8,5.8,bx,61.9,3);
  bottom=cut(union([bottom,box(21,22,2.1,bx,by-.6,.9),cradle]),union([...screws,...nuts,usbOpening]));
  // The frame's solid pillars bridge the two plates; all four holes are coaxial.
  const pillars=screwCenters.map(([x,y])=>union([cylinder(4.5,7,x,y,3),box(10,6,7,Math.sign(x)*48,y,3)]));
  let wall=cut(union([ring(110,104,8,7,3),...pillars]),union([...screws,
   // Relief pockets in the pillars accept both continuous locating lips.
   ring(103.9,99.7,5.95,1.9,2.9),ring(103.9,99.7,5.95,1.9,8.2),...screwCenters.map(([x,y])=>cylinder(4.8,1.3,x,y,8.8))]));
  const switchCuts=locations.map(k=>move(mountingHoles(6-recess,7+recess),k.x,k.y));
  let top=union([...locations.map(k=>move(pod,k.x,k.y)),cut(slab(110,110,8,1.5,10),union(locations.map(k=>box(15,15,4,k.x,k.y,9)))),...locations.map(k=>move(cup,k.x,k.y)),ring(103.4,100.2,5.7,1.7,8.4),...screwCenters.map(([x,y])=>cylinder(4.5,2.5,x,y,9))]);
  top=cut(top,union([...screws,...switchCuts,cylinder(9.8,5,-30,30,8),cylinder(9,5,30,30,8)]));
  wall=cut(wall,union([usbOpening,boardRecess]));
  top=cut(top,union([usbOpening,boardRecess]));
  const headZ=11.5,shaftLength=12;
  const bolts=union(screwCenters.map(([x,y])=>union([cylinder(1.5,shaftLength,x,y,-.5),cut(cylinder(2.75,3,x,y,headZ),cylinder(1.3,1.8,x,y,headZ+1.5,6))])));
  const metalNuts=union(screwCenters.map(([x,y])=>cut(cylinder(5.5/Math.sqrt(3),2.4,x,y,-.9,6),cylinder(1.5,3,x,y,-1.1))));
  const socketSolids=locations.map(k=>move(socket,k.x,k.y));
  const result={bottom:mesh(bottom),wall:mesh(move(wall,0,0,-3)),top:mesh(move(top,0,0,-10)),
   sockets:mesh(union(socketSolids)),bolts:mesh(bolts),nuts:mesh(metalNuts),
   coupon:mesh(coupon)};
  // Mechanical regression evidence is computed from solid intersections, not screenshots.
  const overlap=(a,b)=>{const i=keep(a.intersect(b));return i.volume();};
  const allShell=union([bottom,wall,top]);
  const plasticPins=cylinder(switchSpec.postDiameter/2,3.3,0,0,8.2-recess);
  const contacts=union(switchSpec.pins.map(([x,y])=>box(.8,.25,3,x,y,8.5-recess)));
  const completePins=union([plasticPins,contacts]);
  const switchBody=box(13.95,13.95,5.3,0,0,switchSpec.carrierTop);
  const pinsInAssembly=union(locations.map(k=>move(completePins,k.x,k.y)));
  // Sweep the inserted pins upward through the final millimetre of approach.
  const insertionSweep=union(Array.from({length:6},(_,i)=>move(pinsInAssembly,0,0,i*.2)));
  result.validation={bottomComponents:bottom.decompose().map(keep).length,wallComponents:wall.decompose().map(keep).length,
   topComponents:top.decompose().map(keep).length,
   supportCount:locations.length,
   supportSocketOverlap:overlap(supports,union(socketSolids)),
   supportContactOverlap:overlap(supportLocal,move(union([pinSlots,contactRecesses,solderBays]),0,0,-recess)),
   supportCatchVolumes:locations.map((k,i)=>overlap(supports,move(socketSolids[i],0,0,-.2))),
   postSocketOverlap:overlap(socket,plasticPins),plasticSocketOverlap:overlap(socket,plasticPins),contactSocketOverlap:overlap(socket,contacts),
   pinShellOverlap:overlap(allShell,pinsInAssembly),pinSocketOverlap:overlap(union(socketSolids),pinsInAssembly),
   insertionOverlap:overlap(allShell,insertionSweep),
   switchBodyOverlap:overlap(allShell,union(locations.map(k=>move(switchBody,k.x,k.y)))),
   usbPassageOverlap:overlap(union([bottom,wall,top]),usbOpening),
   boardOutwardStopOverlap:overlap(union([bottom,wall,top]),box(17.8,21,1,bx,by+.6,bz)),
   boardSeatedOverlap:overlap(union([bottom,wall,top]),box(17.8,21,1,bx,by,bz)),
   shellOverlap:overlap(bottom,wall)+overlap(bottom,top)+overlap(wall,top),
   socketHolderOverlap:overlap(top,union(socketSolids)),
   socketContactReliefOverlap:overlap(top,union(locations.map(k=>move(mountingHoles(6-recess,7+recess),k.x,k.y)))),
   socketSolderBayOverlap:overlap(top,union(locations.flatMap(k=>socketTerminals.map(([x,y])=>box(1.6,1.68,.4,k.x+x,k.y+y,8.65-recess))))),
   upwardRetentionVolume:overlap(top,move(union(socketSolids),0,0,.6)),
   downwardSupportVolume:overlap(top,move(union(socketSolids),0,0,-.3)),
   boltShellOverlap:overlap(union([bottom,wall,top]),bolts),nutShellOverlap:overlap(bottom,metalNuts)};
  return result;
 }finally{for(const o of owned.reverse())o.delete();}
}

// Printable trial fit, deliberately separate from nominal switch dimensions.
export const keycapSpec={height:7.5,cavityDepth:3.8,wallInset:1.35,
 mountSpan:4.15,mountBar:1.45,mountDepth:2.8,hubRadius:2.6,leadInDepth:.35,
 assembledZ:18-switchSpec.recessDepth,stemTop:20.5-switchSpec.recessDepth,stemSpan:4.0,stemBar:1.3,travel:2.8};
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
  const stems=union(mountXs.flatMap(x=>[box(s.stemSpan,s.stemBar,3,x,0,-.5),box(s.stemBar,s.stemSpan,3,x,0,-.5)]));
  const overlap=keep(solid.intersect(stems));
  const guards=union(mountXs.map(x=>move(cut(keep(M.cylinder(3.1,3.25,3.25,64)),keep(M.cylinder(3.3,2.75,2.75,64))),x,0,-.6)));
  const guardOverlap=keep(solid.intersect(guards)).volume();
  // Lower cap to maximum specified travel; fixed housing envelope is PCB-referenced.
  const bodies=union(mountXs.map(x=>move(cut(box(13.95,13.95,5.3),keep(M.cylinder(5.4,3.3,3.3,64))),x,0,switchSpec.carrierTop-s.assembledZ+switchSpec.maxTravel)));
  const bottomOutOverlap=keep(solid.intersect(bodies)).volume();
  const components=solid.decompose().map(keep).length;
  return {geometry,validation:{components,guardOverlap,bottomOutOverlap,stemOverlap:overlap.volume(),engagement:s.stemTop-s.assembledZ,
   roofThickness:s.height-2.1-s.cavityDepth,mounts:mountXs.length}};
 }finally{for(const o of owned.reverse())o.delete();}
}
