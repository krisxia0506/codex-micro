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
  // PLA / 0.4 mm nozzle trial: grow the hook inward on a 45-degree underside.
  // Start above the socket roof (6.85), leaving the nominal seated pocket clear.
  // A 0.70 mm nose replaces the old 0.50 mm wedge with its near-zero thin edge.
  const hook=(cx,boundary,direction)=>{
   const yz=[[-.65,6.7],[0,6.9],[.45,7.35],[.45,8.05],[.10,8.4],[-.65,8.4]]
    .map(([inset,z])=>[boundary+direction*inset,z]);
   if(direction<0)yz.reverse();
   return move(keep(keep(keep(new C([yz])).extrude(2.6)).rotate([90,0,90])),cx-1.3,0,0);
  };
  pod=union([pod,hook(-3.8,-.61,-1),hook(1,-7,1)]);
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

// Printable trial fit, deliberately separate from nominal switch dimensions.
export const keycapSpec={height:8.5,cavityDepth:4.7,wallInset:1.7,
 mountSpan:4.3,mountBar:1.3,mountDepth:4.2,hubRadius:2.9,leadInDepth:.35,
 assembledZ:16,stemTop:19.2,stemSpan:4.0,stemBar:1.2,travel:4};
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
