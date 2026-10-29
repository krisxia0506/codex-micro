import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createParts, printableGeometry, socketFitCoupon } from './model.js';
import './style.css';
import { decorate } from './details.js';
import { wireGeometry } from './harness.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
const $=s=>document.querySelector(s), host=$('#viewport');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#edece8');
const camera=new THREE.PerspectiveCamera(36,1,0.1,2000); camera.up.set(0,0,1);
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true}); } catch { host.textContent='无法启动 WebGL，请启用浏览器硬件加速后刷新。'; throw new Error('WebGL unavailable'); }
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1; renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
const labels=new CSS2DRenderer(); labels.domElement.className='model-labels'; host.appendChild(labels.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=100; controls.maxDistance=700;
function reset(){camera.position.set(120,-160,180); controls.target.set(0,0,30); controls.update();} reset();
scene.add(new THREE.HemisphereLight(0xffffff,0x777482,2));
const light=new THREE.DirectionalLight(0xffffff,2); light.position.set(-100,-80,300); light.castShadow=true; light.shadow.mapSize.set(2048,2048); Object.assign(light.shadow.camera,{left:-220,right:220,top:220,bottom:-220}); light.shadow.bias=-0.001; scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#edece8',roughness:1})); floor.position.z=-1.1; floor.receiveShadow=true; scene.add(floor);
const parts=createParts(); const meshes=[]; let selected=parts[0]; let electronicsOnly=false; const annotations=[];
const taskKeys=parts.filter(part=>/^key-[1-6]$/.test(part.id));
const taskGroup=document.createElement('div'); taskGroup.className='task-group';
taskGroup.innerHTML='<div class="part-row task-group-header"><input type="checkbox" checked aria-label="显示任务键组"><button aria-expanded="false" aria-controls="task-key-children"><span class="group-arrow">▸</span>任务键组<small>6 个</small></button></div><div id="task-key-children" class="task-group-children" hidden></div>';
const groupToggle=taskGroup.querySelector('button'), groupCheck=taskGroup.querySelector('input');
const groupChildren=taskGroup.querySelector('.task-group-children');
function expandTaskGroup(open){groupChildren.hidden=!open;groupToggle.setAttribute('aria-expanded',String(open));taskGroup.querySelector('.group-arrow').textContent=open?'▾':'▸';}
groupToggle.onclick=()=>expandTaskGroup(groupChildren.hidden);
function syncTaskGroup(){
 const count=meshes.filter(m=>taskKeys.includes(m.userData.part)&&m.visible).length;
 groupCheck.checked=count===taskKeys.length;groupCheck.indeterminate=count>0&&count<taskKeys.length;
 taskGroup.classList.toggle('contains-selection',taskKeys.includes(selected));
}
groupCheck.onchange=()=>{for(const m of meshes.filter(m=>taskKeys.includes(m.userData.part))){m.visible=groupCheck.checked;m.userData.part.row.querySelector('input').checked=m.visible;}syncTaskGroup();};
$('#count').textContent=`${parts.length-taskKeys.length+1} 项`;
$('#count').title=`共 ${parts.length} 个零件，任务键合并为一个分组`;
for(const part of parts){
 const mesh=new THREE.Mesh(part.geometry,new THREE.MeshStandardMaterial({color:part.color,roughness:.48,metalness:.08})); mesh.position.fromArray(part.position); decorate(mesh,part);
 if(/^key-[1-6]$/.test(part.id)){mesh.material.transparent=true;mesh.material.opacity=.88;mesh.material.roughness=.22;mesh.material.emissive.set(part.color);mesh.material.emissiveIntensity=.18;}

 if(!part.printable && !part.id.startsWith('switch-') && !part.id.startsWith('case-')) {
  const button=document.createElement('button'); button.className='component-label'; button.textContent=part.name; button.onclick=()=>select(part);
  const label=new CSS2DObject(button); label.position.set(0,0,8); mesh.add(label); annotations.push(label);
 }
 mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.part=part; scene.add(mesh); meshes.push(mesh);
 const row=document.createElement('div'); row.className='part-row'; row.innerHTML=`<input type="checkbox" checked aria-label="显示${part.name}"><button><i style="background:${part.color}"></i>${part.name}<small>${part.id}</small></button>`;
 row.querySelector('input').onchange=e=>{mesh.visible=e.target.checked;syncTaskGroup();};
 row.querySelector('button').onclick=()=>select(part); part.row=row;
 if(taskKeys.includes(part)){if(!taskGroup.isConnected)$('#parts').appendChild(taskGroup);groupChildren.appendChild(row);}else $('#parts').appendChild(row);
}
function select(part){ selected=part; if(taskKeys.includes(part))expandTaskGroup(true);syncTaskGroup(); $('#part-name').textContent=part.name; $('#description').textContent=part.description; $('#download').disabled=!part.printable; $('#download').textContent=part.printable?'↓ 下载该零件 STL':(part.id.startsWith('case-')?'标准紧固件 · 不提供打印文件':'电子元件占位 · 不提供打印文件'); for(const m of meshes){const active=m.userData.part===part; m.material.emissive.set(active?'#665574':(/^key-[1-6]$/.test(m.userData.part.id)?m.userData.part.color:'#000000')); m.userData.part.row.classList.toggle('selected',active);} } select(selected);
$('#explode').oninput=e=>{const t=Number(e.target.value)/100; $('#amount').textContent=`${e.target.value}%`; for(const m of meshes)m.position.z=m.userData.part.position[2]+m.userData.part.level*25*t; controls.target.z=30+45*t;};
$('#assembly').onclick=()=>{
 electronicsOnly=false;$('#electronics').checked=false;$('#wires').checked=false;
 const ids=['bottom','wall','top','sockets','case-screws','case-nuts'];
 for(const mesh of meshes){mesh.visible=ids.includes(mesh.userData.part.id);mesh.userData.part.row.querySelector('input').checked=mesh.visible;}
 $('#explode').value='80';$('#explode').dispatchEvent(new Event('input'));camera.position.set(155,-210,150);controls.target.set(0,0,45);controls.update();select(parts.find(p=>p.id==='bottom'));
};
$('#mounts').onclick=()=>{
 electronicsOnly=false;$('#electronics').checked=false;$('#wires').checked=false;
 for(const mesh of meshes){mesh.visible=['bottom','sockets'].includes(mesh.userData.part.id);mesh.userData.part.row.querySelector('input').checked=mesh.visible;}
 $('#explode').value='20';$('#explode').dispatchEvent(new Event('input'));camera.position.set(100,-150,180);controls.target.set(0,0,15);controls.update();select(parts.find(p=>p.id==='bottom'));
};
$('#reset').onclick=reset; $('#top').onclick=()=>{camera.position.set(0,-.01,250); controls.target.set(0,0,0); controls.update();};
$('#wire').onchange=e=>meshes.forEach(m=>m.traverse(child=>{if(child.isMesh)child.material.wireframe=e.target.checked;}));
$('#show-all').onclick=()=>{electronicsOnly=false; $('#electronics').checked=false; meshes.forEach(m=>{m.visible=true;m.userData.part.row.querySelector('input').checked=true;});syncTaskGroup();};
$('#electronics').onchange=e=>{electronicsOnly=e.target.checked; meshes.forEach(m=>{m.visible=!electronicsOnly||(!m.userData.part.printable||m.userData.part.electronicLayer===true);m.userData.part.row.querySelector('input').checked=m.visible;}); if(electronicsOnly)select(parts.find(p=>p.id==='xiao'));syncTaskGroup();};
$('#labels').onchange=()=>{};

const harness=new THREE.Group();scene.add(harness);
const socketPart=parts.find(p=>p.id==='sockets');
const xiaoPart=parts.find(p=>p.id==='xiao');
for(const [i,[x,y]] of socketPart.socketPositions.entries()){
 for(let side=0;side<2;side++){
  const wire=new THREE.Mesh(wireGeometry(x,y,i,side),new THREE.MeshStandardMaterial({color:side===0?'#c99565':'#6a9da5',roughness:.7}));
  harness.add(wire);
 }
}
$('#wires').onchange=()=>{};
const ray=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down;
host.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]); host.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return; const r=host.getBoundingClientRect(); pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(pointer,camera); const hit=ray.intersectObjects(meshes.filter(m=>m.visible))[0]; if(hit){let object=hit.object;while(!object.userData.part&&object.parent)object=object.parent;select(object.userData.part);}});
function save(data,name){const url=URL.createObjectURL(new Blob([data]));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#download').onclick=()=>{if(!selected.printable)return;const mesh=new THREE.Mesh(printableGeometry(selected));const data=new STLExporter().parse(mesh,{binary:true});save(data,`codex-micro-${selected.id}-mm.stl`);mesh.geometry.dispose();};
$('#download-coupon').onclick=()=>{const g=socketFitCoupon();const data=new STLExporter().parse(new THREE.Mesh(g),{binary:true});save(data,'codex-micro-socket-fit-coupon-mm.stl');g.dispose();};
$('#download-all').onclick=()=>{const a=document.createElement('a');a.href=`${import.meta.env.BASE_URL}codex-micro-stl.zip`;a.download='codex-micro-stl.zip';a.click();};
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height); labels.setSize(width,height); camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');
leaders.classList.add('label-leaders');host.appendChild(leaders);
const leaderLines=annotations.map(()=>{const line=document.createElementNS(leaders.namespaceURI,'line');leaders.appendChild(line);return line;});
renderer.setAnimationLoop(()=>{
 controls.update();
 harness.visible=$('#wires').checked&&meshes.find(m=>m.userData.part===socketPart).visible&&meshes.find(m=>m.userData.part===xiaoPart).visible;
 harness.position.z=Number($('#explode').value)/100*50;
 const topVisible=meshes.find(m=>m.userData.part.id==='top').visible;
 const showLabels=$('#labels').checked && (electronicsOnly || Number($('#explode').value)>20 || !topVisible);
 annotations.forEach(label=>label.visible=showLabels);
 renderer.render(scene,camera);labels.render(scene,camera);
 const w=host.clientWidth,h=host.clientHeight;
 annotations.forEach((label,i)=>{
  const visible=showLabels&&label.parent.visible;
  const line=leaderLines[i];line.style.display=visible?'':'none';
  if(!visible)return;
  const right=i%2===1,slot=Math.floor(i/2);
  const x=right?w-8:8,y=35+slot*58;
  label.element.style.transform=`translate(${right?'-100%':'0'},-50%) translate(${x}px,${y}px)`;
  const anchor=label.getWorldPosition(new THREE.Vector3()).project(camera);
  line.setAttribute('x1',String(x+(right?-60:60)));line.setAttribute('y1',String(y+12));
  line.setAttribute('x2',String((anchor.x+1)*w/2));line.setAttribute('y2',String((1-anchor.y)*h/2));
 });
});
