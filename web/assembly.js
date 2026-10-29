import Module from 'manifold-3d';
import * as THREE from 'three';
const wasmURL=new URL('../node_modules/manifold-3d/manifold.wasm',import.meta.url);
const kernel=await Module({locateFile:()=>wasmURL.protocol==='file:'?decodeURIComponent(wasmURL.pathname):wasmURL.href});
kernel.setup();
export const assemblySpec={
 screwCenters:[[-46,-46],[46,-46],[-46,46],[46,46]],
 screwDiameter:3.4,nutAcrossFlats:5.8,nutDepth:2.6,
 lipOuter:103.4,lipInner:100.2,lipHeight:1.6,frameInner:104,
 socket:{model:'PG151101S11 / CPG151101S11',bodyWidth:11.3,baseWidth:10.9,bodyDepth:5.89,bodyHeight:1.85,
  overallWidth:14.5,collarHeight:1.2,pins:[[-3.81,-2.54],[2.54,-5.08]],clearance:.25,bottomZ:5},
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
  // Stepped outline reconstructed from the dimensioned manufacturer drawing.
  // Small mould fillets are simplified; fit clearance is a design parameter.
  const profile=keep(new C([[[-6.36,-6.75],[3.2,-6.75],[4.94,-5.5],[4.94,-2.75],[1.4,-2.75],
   [.4,-2.45],[-.5,-1.9],[-1.1,-.86],[-6.36,-.86]]]));
  const socketBody=extrude(profile,s.bodyHeight,s.bottomZ);
  const socket=union([socketBody,...s.pins.map(([x,y])=>cylinder(1.45,1.2,x,y,6.85))]);
  const pocket=extrude(keep(profile.offset(s.clearance,'Round',2,24)),3.5,5);
  // A load-bearing floor and side stops are integral to the bottom shell.
  let pod=cut(box(15.8,10.5,4,-.635,-3.805,3),pocket);
  // Two open solder bays keep the metal tabs and flying wires accessible.
  pod=cut(pod,union([box(5,3.1,4,-7.15,-2.54,4.65),box(5,3.1,4,6,-5.08,4.65)]));
  // Relief slots isolate flexible tongues on the two long edges.
  const relief=[];
  for(const [cx,cy] of [[-3.8,-.66],[1,-6.95]]){
   for(const dx of [-1.65,1.65])relief.push(box(.65,3.1,4,cx+dx,cy,3.8));
  }
  pod=cut(pod,union(relief));
  // Hooks overlap only the body shoulder, leaving both pin-entry collars clear.
  const hooks=[box(2.6,.7,.5,-3.8,-.72,6.95),box(2.6,.7,.5,1,-6.91,6.95)];
  pod=union([pod,...hooks]);
  // Chamfer the insertion side of each hook, retaining a flat lower shoulder.
  // The sloped wedges leave 0.25 mm of positive retention at the body edge.
  const wedge=keep(keep(new C([[[-.45,0],[.45,0],[.45,.45]]])).extrude(2.6));
  const chamfers=[move(keep(wedge.rotate([90,0,90])),-5.1,-.46,7.05),move(keep(wedge.rotate([90,0,-90])),2.3,-7.15,7.05)];
  pod=cut(pod,union(chamfers));
  const screws=screwCenters.map(([x,y])=>cylinder(1.7,16,x,y,-2));
  const nuts=screwCenters.map(([x,y])=>cylinder(assemblySpec.nutAcrossFlats/Math.sqrt(3),2.7,x,y,-1.1,6));
  let bottom=union([slab(110,110,8,4,-1),ring(103.4,100.2,5.7,1.7,2.9),...locations.map(k=>move(pod,k.x,k.y))]);
  bottom=cut(bottom,union([...screws,...nuts]));
  // The frame's solid pillars bridge the two plates; all four holes are coaxial.
  const pillars=screwCenters.map(([x,y])=>union([cylinder(4.5,7,x,y,3),box(10,6,7,Math.sign(x)*48,y,3)]));
  const wall=cut(union([ring(110,104,8,7,3),...pillars]),union([...screws,
   // Relief pockets in the pillars accept both continuous locating lips.
   ring(103.9,99.7,5.95,1.9,2.9),ring(103.9,99.7,5.95,1.9,8.2),...screwCenters.map(([x,y])=>cylinder(4.8,1.3,x,y,8.8))]));
  const switchCuts=locations.map(k=>box(14.2,14.2,5,k.x,k.y,8));
  let top=union([slab(110,110,8,1.5,10),ring(103.4,100.2,5.7,1.7,8.4),...screwCenters.map(([x,y])=>cylinder(4.5,2.5,x,y,9))]);
  top=cut(top,union([...screws,...switchCuts,cylinder(9.8,5,-30,30,8),cylinder(9,5,30,30,8)]));
  // Hardware is shown but never exported as printable plastic.
  const bolts=union(screwCenters.map(([x,y])=>union([cylinder(1.5,12,x,y,-.5),cut(cylinder(2.75,3,x,y,11.5),cylinder(1.3,1.8,x,y,13,6))])));
  const metalNuts=union(screwCenters.map(([x,y])=>cut(cylinder(5.5/Math.sqrt(3),2.4,x,y,-.9,6),cylinder(1.5,3,x,y,-1.1))));
  const socketSolids=locations.map(k=>move(socket,k.x,k.y));
  const result={bottom:mesh(bottom),wall:mesh(move(wall,0,0,-3)),top:mesh(move(top,0,0,-10)),
   sockets:mesh(union(socketSolids)),bolts:mesh(bolts),nuts:mesh(metalNuts),
   coupon:mesh(union([box(22,16,3,-.635,-3.805),pod]))};
  // Mechanical regression evidence is computed from solid intersections, not screenshots.
  const overlap=(a,b)=>{const i=keep(a.intersect(b));return i.volume();};
  result.validation={bottomComponents:bottom.decompose().map(keep).length,wallComponents:wall.decompose().map(keep).length,
   topComponents:top.decompose().map(keep).length,
   shellOverlap:overlap(bottom,wall)+overlap(bottom,top)+overlap(wall,top),
   socketHolderOverlap:overlap(bottom,union(socketSolids)),
   upwardRetentionVolume:overlap(bottom,move(union(socketSolids),0,0,.6)),
   downwardSupportVolume:overlap(bottom,move(union(socketSolids),0,0,-.3)),
   boltShellOverlap:overlap(union([bottom,wall,top]),bolts),nutShellOverlap:overlap(bottom,metalNuts)};
  return result;
 }finally{for(const o of owned.reverse())o.delete();}
}
