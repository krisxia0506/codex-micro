import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createParts, printableGeometry } from './model.js';
import './style.css';
const $=s=>document.querySelector(s), host=$('#viewport');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#edece8');
const camera=new THREE.PerspectiveCamera(36,1,0.1,2000); camera.up.set(0,0,1);
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true}); } catch { host.textContent='无法启动 WebGL，请启用浏览器硬件加速后刷新。'; throw new Error('WebGL unavailable'); }
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1; renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=100; controls.maxDistance=700;
function reset(){camera.position.set(210,-260,260); controls.target.set(0,0,30); controls.update();} reset();
scene.add(new THREE.HemisphereLight(0xffffff,0x777482,2));
const light=new THREE.DirectionalLight(0xffffff,2); light.position.set(-100,-80,300); light.castShadow=true; light.shadow.mapSize.set(2048,2048); Object.assign(light.shadow.camera,{left:-220,right:220,top:220,bottom:-220}); light.shadow.bias=-0.001; scene.add(light);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#edece8',roughness:1})); floor.position.z=-1; floor.receiveShadow=true; scene.add(floor);
const parts=createParts(); const meshes=[]; let selected=parts[0];
$('#count').textContent=String(parts.length).padStart(2,'0');
for(const part of parts){
 const mesh=new THREE.Mesh(part.geometry,new THREE.MeshStandardMaterial({color:part.color,roughness:.48,metalness:.08})); mesh.position.fromArray(part.position); mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.part=part; scene.add(mesh); meshes.push(mesh);
 const row=document.createElement('div'); row.className='part-row'; row.innerHTML=`<input type="checkbox" checked aria-label="显示${part.name}"><button><i style="background:${part.color}"></i>${part.name}<small>${part.id}</small></button>`;
 row.querySelector('input').onchange=e=>mesh.visible=e.target.checked;
 row.querySelector('button').onclick=()=>select(part); part.row=row; $('#parts').appendChild(row);
}
function select(part){ selected=part; $('#part-name').textContent=part.name; $('#description').textContent=part.description; for(const m of meshes){const active=m.userData.part===part; m.material.emissive.set(active?'#30233c':'#000000'); m.userData.part.row.classList.toggle('selected',active);} } select(selected);
$('#explode').oninput=e=>{const t=Number(e.target.value)/100; $('#amount').textContent=`${e.target.value}%`; for(const m of meshes)m.position.z=m.userData.part.position[2]+m.userData.part.level*22*t; controls.target.z=30+35*t;};
$('#reset').onclick=reset; $('#top').onclick=()=>{camera.position.set(0,-.01,400); controls.target.set(0,0,0); controls.update();};
$('#wire').onchange=e=>meshes.forEach(m=>m.material.wireframe=e.target.checked);
$('#show-all').onclick=()=>meshes.forEach(m=>{m.visible=true;m.userData.part.row.querySelector('input').checked=true;});
const ray=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down;
host.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]); host.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return; const r=host.getBoundingClientRect(); pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1); ray.setFromCamera(pointer,camera); const hit=ray.intersectObjects(meshes.filter(m=>m.visible))[0]; if(hit)select(hit.object.userData.part);});
function save(data,name){const url=URL.createObjectURL(new Blob([data]));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#download').onclick=()=>{const mesh=new THREE.Mesh(printableGeometry(selected));const data=new STLExporter().parse(mesh,{binary:true});save(data,`codex-micro-${selected.id}-mm.stl`);mesh.geometry.dispose();};
$('#download-all').onclick=()=>{const a=document.createElement('a');a.href=`${import.meta.env.BASE_URL}codex-micro-stl.zip`;a.download='codex-micro-stl.zip';a.click();};
new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height); camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(host);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
