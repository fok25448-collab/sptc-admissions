import {endpoint,rest,rpc,uuid,fail,hash,rate} from '../server/core.js';
import {requireAdmin,signedRead,STATUSES,DOCUMENTS,nextStepFor} from '../server/admissions.js';
export default endpoint('POST',async req=>{
 const admin=await requireAdmin(req);await rate(req,'admin',120);
 const b=req.body;
 if(b.action==='list'){
  const page=Number(b.page||0);if(!Number.isInteger(page)||page<0||page>100000)fail(400,'หน้าไม่ถูกต้อง');
  let query='applications?order=created_at.desc&limit=31&offset='+page*30+'&select=id,application_number,admission_year,payload,course_snapshot,status,submission_channel,created_at';
  if(b.status){if(!STATUSES[b.status])fail(400,'สถานะไม่ถูกต้อง');query+='&status=eq.'+b.status;}
  const search=String(b.search||'').trim();
  if(search){if(/^\d{13}$/.test(search))query+='&id_card=eq.'+search;else if(/^SPTC-\d{4}-\d{8}$/.test(search))query+='&application_number=eq.'+search;else fail(400,'ค้นด้วยเลขใบสมัครเต็มหรือเลขบัตรประชาชน 13 หลัก');}
  const rows=await rest(query);
  return {hasMore:rows.length>30,applications:rows.slice(0,30).map(({payload,...a})=>({...a,name:(payload.prefix||'')+payload.firstNameThai+' '+payload.lastNameThai,phone:payload.phone}))};
 }
 if(!uuid(b.id))fail(400,'รหัสใบสมัครไม่ถูกต้อง');
 const a=(await rest('applications?id=eq.'+b.id+'&select=*'))[0];if(!a)fail(404,'ไม่พบใบสมัคร');
 if(b.action==='detail'){
  const [documents,history]=await Promise.all([rest('application_documents?application_id=eq.'+a.id+'&select=kind,name,mime_type,size_bytes'),rest('application_reviews?application_id=eq.'+a.id+'&order=created_at.desc&select=to_status,public_note,next_step,created_at')]);
  if(a.document_path&&!documents.some(d=>d.kind==='transcript'))documents.push({kind:'transcript',name:a.document_name});
  const {payload_hash,request_id,document_sha256,document_path,...application}=a;
  return {application,documents,history};
 }
 if(b.action==='document'){
  if(!DOCUMENTS[b.kind])fail(400,'ชนิดเอกสารไม่ถูกต้อง');
  const d=(await rest('application_documents?application_id=eq.'+a.id+'&kind=eq.'+b.kind+'&select=path'))[0];
  const path=d?.path||(b.kind==='transcript'?a.document_path:null);if(!path)fail(404,'ยังไม่มีไฟล์นี้ในระบบ');
  return {url:await signedRead(path)};
 }
 if(b.action==='review'){
  if(!uuid(b.requestId)||!Number.isInteger(b.version)||!STATUSES[b.status])fail(400,'ข้อมูลการตรวจสอบไม่ถูกต้อง');
  const note=String(b.note||'').trim(),nextStep=String(b.nextStep||'').trim()||nextStepFor(b.status,a.schedule_snapshot);
  if(note.length>3000||nextStep.length>3000)fail(400,'ข้อความยาวเกินไป');
  const checks=Object.fromEntries(Object.keys(DOCUMENTS).map(k=>[k,b.checks?.[k]===true]));
  if(['accepted','reported'].includes(b.status)&&Object.values(checks).some(v=>!v))fail(400,'กรุณาตรวจเอกสารให้ครบทั้ง 4 รายการก่อนอนุมัติ');
  if(['needs_documents','rejected','cancelled'].includes(b.status)&&!note)fail(400,'กรุณาระบุเหตุผลหรือรายการเอกสารที่ต้องนำส่ง');
  const values={p_request_id:b.requestId,p_actor:admin.user_id,p_application:a.id,p_expected_version:b.version,p_status:b.status,p_note:note,p_next_step:nextStep,p_checks:checks};
  try{return await rpc('review_quota_application',{...values,p_hash:hash(JSON.stringify(values))});}
  catch(e){if(e.code==='P0001')fail(409,e.detail?.includes('STALE_VERSION')?'ใบสมัครถูกแก้ไขแล้ว กรุณาโหลดข้อมูลใหม่ก่อนบันทึก':'บันทึกไม่ได้ กรุณาตรวจสถานะ เอกสาร และจำนวนที่รับ (ต้องอนุมัติก่อนบันทึกรายงานตัว)');throw e;}
 }
 fail(400,'คำขอไม่ถูกต้อง');
});
