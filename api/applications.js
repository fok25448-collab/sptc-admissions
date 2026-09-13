import {endpoint,verify,hash,rate,rest,rpc,fail,uuid} from '../server/core.js';
import {normalize,finalizeFiles} from '../server/admissions.js';
export default endpoint('POST',async req=>{
 await rate(req,'submit',30);
 const proof=verify(req.body.token);
 if(proof.purpose!=='quota-v2'||!uuid(proof.requestId)||!Array.isArray(proof.files))fail(400,'ข้อมูลคำขอไม่ถูกต้อง');
 const data=normalize(req.body.data,proof.course);
 if(hash(JSON.stringify(data))!==proof.dataHash)fail(409,'ข้อมูลเปลี่ยนหลังเตรียมไฟล์ กรุณาส่งใหม่');
 const fingerprint=hash(JSON.stringify({data,files:proof.files,year:proof.year}));
 const query='applications?request_id=eq.'+proof.requestId+'&select=*';
 let previous=(await rest(query))[0];
 if(previous&&previous.payload_hash!==fingerprint)fail(409,'คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว');
 if(!previous){
  const files=await finalizeFiles(proof);
  try{await rpc('submit_quota_application',{p_request_id:proof.requestId,p_payload_hash:fingerprint,p_data:data,p_year:proof.year,p_files:files});}
  catch(e){if(e.code==='23505')fail(409,'มีใบสมัครในปีการศึกษานี้แล้ว กรุณาไปหน้าตรวจสอบใบสมัคร');if(e.code==='P0001')fail(409,'ไม่สามารถรับใบสมัครได้ หลักสูตรอาจเต็ม ปิดรับ หรือเงื่อนไขเปลี่ยน กรุณาติดต่อเจ้าหน้าที่');throw e;}
  previous=(await rest(query))[0];
 }
 const {application_number,payload,course_snapshot,admission_year,created_at,status,schedule_snapshot}=previous;
 return {status:'success',applicationNumber:application_number,application:{application_number,payload,course_snapshot,admission_year,created_at,status,schedule_snapshot}};
});
