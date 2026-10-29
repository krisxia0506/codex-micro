import { CurvePath, LineCurve3, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';

export function wireGeometry(x,y,index,side){
 const direction=side===0?-1:1;
 const endY=34+(index%7)*2.1;
 const terminalX=side===0?-7.15:6,terminalY=side===0?-2.54:-5.08;
 const routeY=Math.max(y-12,-40.2); // Leave clearance around the lower M3 pillars.
 const points=[[x+terminalX,y+terminalY,5.75],[x+direction*9.1,y+terminalY,5.75],
  [x+direction*9.1,routeY,5.75],[direction*(39+index*.7),routeY,5.75],
  [direction*(39+index*.7),35,5.75],[direction*13,endY,5.75],
  [direction*8.3,endY,6.05]].map(p=>new Vector3(...p));
 // Rounded polyline stays within the routing points' convex hull. An interpolating
 // spline can overshoot the side corridor and pierce the enclosure wall.
 const curve=new CurvePath();let previous=points[0];
 for(let i=1;i<points.length-1;i++){
  const entry=points[i].clone().lerp(points[i-1],.2);
  const exit=points[i].clone().lerp(points[i+1],.2);
  curve.add(new LineCurve3(previous,entry));
  curve.add(new QuadraticBezierCurve3(entry,points[i],exit));previous=exit;
 }
 curve.add(new LineCurve3(previous,points.at(-1)));
 return new TubeGeometry(curve,100,.35,6,false);
}
