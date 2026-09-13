import {randomUUID} from 'node:crypto';
import {DOCUMENTS,validateApplicant,STATUSES,nextStepFor} from '../shared/application-model.js';
import {rest,sb,config,hash,fileMeta,validMagic,fail,signed,verify} from './core.js';
export {DOCUMENTS,STATUSES,nextStepFor};
export function normalize(input,course){const {data,errors}=validateApplicant(input,course);if(Object.keys(errors).length)fail(400,Object.values(errors)[0]);return data;}
export async function prepareFiles(requestId,metadata,channel){
 if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))fail(400,'กรุณาแนบรูปถ่าย');
 const files=[];
 for(const [kind,definition]of Object.entries(DOCUMENTS)){
  if(!metadata[kind]){if(kind==='portrait'||channel==='online')fail(400,'กรุณาแนบ'+definition.label);continue;}
  const meta=fileMeta(metadata[kind]);
  if(meta.size>definition.max||!definition.accept.split(',').includes(meta.type))fail(400,'รูปแบบหรือขนาดไฟล์ไม่ถูกต้อง: '+definition.label);
  const path=`staging/${requestId}/${kind}.${meta.ext}`;
  const result=await(await sb('/storage/v1/object/upload/sign/admission-documents/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  if(!result.url)fail(502,'ไม่สามารถเตรียมอัปโหลดได้');
  const url=config().url;
  const uploadUrl=new URL(result.url.startsWith('/storage/v1/')?result.url:'/storage/v1'+result.url,url).href;
  if(!uploadUrl.startsWith(url+'/storage/v1/'))fail(502,'ปลายทางอัปโหลดไม่ถูกต้อง');
  files.push({kind,...meta,path,uploadUrl});
 }
 return files;
}
export async function finalizeFiles(proof){
 return Promise.all(proof.files.map(async file=>{
  const response=await sb('/storage/v1/object/authenticated/admission-documents/'+file.path);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==file.size||hash(bytes)!==file.sha256||!validMagic(bytes,file.type))fail(400,'กรุณาตรวจสอบเนื้อหาไฟล์: '+DOCUMENTS[file.kind].label);
  const path=`documents/${proof.requestId}/${file.kind}.${file.ext}`;
  try{await sb('/storage/v1/object/admission-documents/'+path,{method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:bytes});}
  catch(e){
   if(![400,409].includes(e.upstream))throw e;
   const prior=Buffer.from(await(await sb('/storage/v1/object/authenticated/admission-documents/'+path)).arrayBuffer());
   if(hash(prior)!==file.sha256)fail(409,'คำขอเดิมมีเอกสารไม่ตรงกัน กรุณาเริ่มส่งใหม่');
  }
  return {kind:file.kind,path,name:file.name,type:file.type,size:file.size,sha256:file.sha256};
 }));
}
export async function signedRead(path){
 const result=await(await sb('/storage/v1/object/sign/admission-documents/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:60})})).json();
 const value=result.signedURL||result.signedUrl;
 if(!value)fail(502,'ไม่สามารถเปิดเอกสารได้');
 const base=config().url;const url=new URL(value.startsWith('/storage/v1/')?value:'/storage/v1'+value,base).href;
 if(!url.startsWith(base+'/storage/v1/'))fail(502,'ปลายทางเอกสารไม่ถูกต้อง');return url;
}
export async function requireAdmin(req){
 const cookies=String(req.headers.cookie||'').split(';').map(x=>x.trim());
 const token=cookies.find(x=>x.startsWith('sptc_admin='))?.slice('sptc_admin='.length);
 if(!token)fail(401,'กรุณาเข้าสู่ระบบเจ้าหน้าที่');
 const c=config();
 const response=await fetch(c.url+'/auth/v1/user',{headers:{apikey:c.key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(!response.ok)fail(401,'การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
 const user=await response.json();if(!user.id)fail(401,'ไม่สามารถยืนยันผู้ใช้ได้');
 const admins=await rest('admin_users?user_id=eq.'+encodeURIComponent(user.id)+'&active=eq.true&select=user_id,display_name');
 if(!admins[0])fail(403,'บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่');
 return {...admins[0],email:user.email};
}
export function sessionCookie(token,maxAge){return `sptc_admin=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${maxAge}${config().origin.startsWith('https://')?'; Secure':''}`;}
