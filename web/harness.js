import { socketTerminals } from './mx.js';
import { CurvePath, LineCurve3, QuadraticBezierCurve3, TubeGeometry, Vector3 } from 'three';

export const xiaoPosition=[0,53,5];
export const xiaoRotation=0; // USB-C local +Y faces the top (+Y) edge.
export function xiaoWorldPoint(x,y,z){
 const c=Math.cos(xiaoRotation),s=Math.sin(xiaoRotation);
 return [xiaoPosition[0]+x*c-y*s,xiaoPosition[1]+x*s+y*c,xiaoPosition[2]+z];
}

export function wireGeometry(x,y,index,side){
 const direction=side===0?-1:1;
 const endpoint=xiaoWorldPoint(direction*8.3,-7.6+(index%7)*2.54,1.05);
 const endY=endpoint[1];
 const [terminalX,terminalY]=socketTerminals[side];
 const routeY=Math.max(y-10,-40.2); // Leave clearance around the lower M3 pillars.
 const points=[[x+terminalX,y+terminalY,8.9],[x+direction*9.1,y+terminalY,8.9],
  [x+direction*9.1,routeY,7.5],[direction*(39+index*.7),routeY,7.5],
  [direction*(39+index*.7),41,5.75],[endpoint[0],41,7.5],[endpoint[0],endY,7.5],endpoint].map(p=>new Vector3(...p));
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
