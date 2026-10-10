import * as THREE from 'three';
/** Original workshop details inspired by the user's photos. */
export function createWorkshopDetails() {
 const group=new THREE.Group();
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d')!;ctx.fillStyle='#49473f';ctx.fillRect(0,0,1024,512);
 for(let row=0;row<16;row++)for(let col=-1;col<17;col++) {const x=col*64+(row%2)*32;ctx.fillStyle=['#705447','#665247','#81614e','#755e50'][(row*7+col+20)%4];ctx.fillRect(x+2,row*32+2,60,28);ctx.fillStyle='#ffffff08';ctx.fillRect(x+4,row*32+3,56,3);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,1);
 const brick=new THREE.MeshStandardMaterial({map:texture,roughness:.94});
 const steel=new THREE.MeshStandardMaterial({color:0x505b59,metalness:1,roughness:.55});
 const red=new THREE.MeshStandardMaterial({color:0x812c2b,roughness:.45});
 const boxGeometry=new THREE.BoxGeometry(1,1,1);const sets=new Map<THREE.Material,THREE.Matrix4[]>();const dummy=new THREE.Object3D();
 const box=(mat:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,0,0);dummy.updateMatrix();if(!sets.has(mat))sets.set(mat,[]);sets.get(mat)!.push(dummy.matrix.clone());};
 box(brick,-7.1,2.8,-7.84,7.5,5.6,.02);box(brick,7.1,2.8,-7.84,7.5,5.6,.02);box(brick,10.84,2.8,-2,.02,5.6,12);
 // Side mezzanine with a clear view of the car bay.
 box(steel,8.4,3.0,-3.9,4.6,.12,6);
 for(const x of [6.2,10.5])for(const z of [-6.6,-1.2])box(steel,x,1.5,z,.1,3,.1);
 for(let z=-6.7;z<=-1;z+=.4)box(steel,6.15,3.55,z,.045,1.1,.045);
 box(steel,6.15,4.1,-3.85,.08,.08,5.8);
 for(let x=6.1;x<=10.7;x+=.4)box(steel,x,3.55,-.95,.045,1.1,.045);
 box(steel,8.4,4.1,-.95,4.6,.08,.08);
 for(let i=0;i<10;i++)box(steel,8.9,i*.29+.14,.5+i*.24,2,.08,.3);
 box(red,7.8,.7,-6.5,2.8,1.4,.8);box(steel,7.8,1.44,-6.5,3,.08,.9);
 for(let i=0;i<5;i++)box(steel,7.8,.25+i*.24,-6.04,2.5,.025,.035);
 for(const x of [-9,9]) {box(steel,x,5.35,-1,.14,.14,12);box(steel,x,3.1,-7.6,.14,4.5,.14);}
 for(const [mat,matrices] of sets){const mesh=new THREE.InstancedMesh(boxGeometry,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 const cable=new THREE.MeshStandardMaterial({color:0x181e1e,roughness:.9});
 for(let i=0;i<5;i++){const x=-9+i*.55;const points=[new THREE.Vector3(x,2.8,-7.65),new THREE.Vector3(x+.22,1.5,-7.52),new THREE.Vector3(x+.4,2.8,-7.65)];const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.025,5,false),cable);group.add(tube);}
 return group;
}
