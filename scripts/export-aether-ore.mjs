import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Box3,Vector3,REVISION} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createAetherOre,disposeAetherOre} from '../src/render/three/assets/AetherOre.js';

// GLTFExporter uses the browser FileReader even for texture-free binary exports.
// Only the Blob -> ArrayBuffer path is needed for this self-contained model.
export async function exportOre(options={}) {
  const previous=globalThis.FileReader;
  if(!previous)globalThis.FileReader=class {
    readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}
  };
  const root=createAetherOre(options);
  try{
    const buffer=await new GLTFExporter().parseAsync(root,{binary:true});
    const size=new Box3().setFromObject(root).getSize(new Vector3());
    const manifest={asset:'aether-ore-v1',generatorVersion:1,threeRevision:REVISION,units:'meters',upAxis:'Y',origin:'ground center',parameters:root.userData.parameters,size:size.toArray(),triangles:root.children.reduce((sum,m)=>sum+m.geometry.attributes.position.count/3,0),materials:root.children.length,bytes:buffer.byteLength};
    return {buffer,manifest};
  }finally{
    disposeAetherOre(root);
    if(!previous)delete globalThis.FileReader;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=resolve(process.argv[2]||'public/models/aether-ore.glb');
  const {buffer,manifest}=await exportOre();
  await mkdir(dirname(output),{recursive:true});await writeFile(output,Buffer.from(buffer));
  await writeFile(output.replace(/\.glb$/i,'')+'.json',JSON.stringify(manifest,null,2)+'\n');
  console.log(`Exportado: ${output} (${manifest.triangles} triângulos, ${manifest.bytes} bytes)`);
}
