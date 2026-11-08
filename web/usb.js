import * as THREE from 'three';
// GCT USB4105 drawing: mating aperture 8.34 x 2.56 mm.
// Outer shell wall and panel clearance below are design allowances, not XIAO CAD.
export const usbSpec={mouthWidth:8.34,mouthHeight:2.56,shellWall:.3,panelWidth:10,panelHeight:4,centerZ:7.25};
export function capsule(width,height,Path=THREE.Shape){
 const p=new Path(),r=height/2,c=width/2-r;
 p.moveTo(-c,-r);p.lineTo(c,-r);p.absarc(c,0,r,-Math.PI/2,Math.PI/2,false);
 p.lineTo(-c,r);p.absarc(-c,0,r,Math.PI/2,Math.PI*1.5,false);p.closePath();return p;
}
export function usbShellGeometry(){
 const s=usbSpec,shape=capsule(s.mouthWidth+2*s.shellWall,s.mouthHeight+2*s.shellWall);
 shape.holes.push(capsule(s.mouthWidth,s.mouthHeight,THREE.Path));
 const g=new THREE.ExtrudeGeometry(shape,{depth:6,bevelEnabled:false,curveSegments:32});
 g.rotateX(Math.PI/2);g.translate(0,11.7,2.25);return g;
}
