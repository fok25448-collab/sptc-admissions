import {endpoint,rate,rest,fail,validId} from '../server/core.js';
import {STATUSES,nextStepFor} from '../server/admissions.js';
export default endpoint('POST',async req=>{
 await rate(req,'status',8);
 const id=String(req.body.idCard||'').trim(),phone=String(req.body.phone||'').trim();
 if(!validId(id)||!/^0[689]\d{8}$/.test(phone))fail(400,'กรุณาตรวจสอบเลขบัตรประชาชน 13 หลักและเบอร์โทรศัพท์ 10 หลัก');
 const rows=await rest('applications?id_card=eq.'+id+'&payload->>phone=eq.'+phone+'&order=created_at.desc&limit=5&select=id,application_number,admission_year,course_snapshot,status,public_note,next_step,created_at,updated_at,schedule_snapshot,submission_channel,payload');
 const applications=await Promise.all(rows.map(async a=>({
  number:a.application_number,year:a.admission_year,name:(a.payload.firstNameThai||'').slice(0,2)+'***',course:a.course_snapshot?.name,level:a.course_snapshot?.level,system:a.course_snapshot?.system,
  status:a.status,statusLabel:STATUSES[a.status]||a.status,note:a.public_note,nextStep:a.next_step||nextStepFor(a.status,a.schedule_snapshot),createdAt:a.created_at,updatedAt:a.updated_at,channel:a.submission_channel,
  history:await rest('application_reviews?application_id=eq.'+a.id+'&order=created_at.asc&select=to_status,public_note,next_step,created_at')
 })));
 return {applications};
});
