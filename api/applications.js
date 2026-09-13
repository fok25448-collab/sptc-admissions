import {endpoint,application,verify,hash,rate,rest,sb,rpc,fail,validMagic} from '../server/core.js';
export default endpoint('POST',async req=>{
 await rate(req,'submit',30);
 const proof=verify(req.body.token),data=application(req.body.data);
 if(hash(JSON.stringify(data))!==proof.dataHash)fail(409,'ข้อมูลเปลี่ยนหลังเตรียมไฟล์ กรุณาส่งใหม่');
 const fingerprint=hash(JSON.stringify({data,file:proof.file,year:proof.year}));
 const previous=await rest('applications?request_id=eq.'+proof.requestId+'&select=application_number,payload_hash');
 if(previous[0]){
  if(previous[0].payload_hash!==fingerprint)fail(409,'รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว');
  return {status:'success',applicationNumber:previous[0].application_number};
 }
 const fileResponse=await sb('/storage/v1/object/authenticated/admission-documents/'+proof.path);
 const bytes=Buffer.from(await fileResponse.arrayBuffer());
 if(bytes.length!==proof.file.size||hash(bytes)!==proof.file.sha256||!validMagic(bytes,proof.file.type))fail(400,'เนื้อหาไฟล์ไม่ตรงกับเอกสารที่เลือก กรุณาเลือกไฟล์ใหม่');
 // The committed copy has no signed upload URL and cannot be modified by applicants.
 const finalPath=`documents/${proof.requestId}.${proof.file.ext}`;
 try{
  await sb('/storage/v1/object/admission-documents/'+finalPath,{method:'POST',headers:{'Content-Type':proof.file.type,'x-upsert':'false'},body:bytes});
 }catch(e){
  if(![400,409].includes(e.upstream))throw e;
  const existing=Buffer.from(await(await sb('/storage/v1/object/authenticated/admission-documents/'+finalPath)).arrayBuffer());
  if(hash(existing)!==proof.file.sha256)fail(409,'เอกสารของคำขอนี้ไม่ตรงกัน กรุณาติดต่อเจ้าหน้าที่');
 }
 try{
  const result=await rpc('submit_application',{p_request_id:proof.requestId,p_payload_hash:fingerprint,p_data:data,p_year:proof.year,p_document_path:finalPath,p_document_name:proof.file.name,p_document_sha256:proof.file.sha256});
  return {status:'success',applicationNumber:result.application_number};
 }catch(e){
  if(e.code==='23505')fail(409,'มีใบสมัครสำหรับปีการศึกษานี้แล้ว กรุณาติดต่อเจ้าหน้าที่');
  if(e.code==='P0001')fail(409,'ไม่สามารถรับใบสมัครได้ หลักสูตรอาจปิดรับหรือข้อมูลคำขอไม่ตรงกัน กรุณาติดต่อเจ้าหน้าที่');
  // Keep files for safe retries if the DB commit outcome is unknown. Cleanup handles old orphans.
  throw e;
 }
});
