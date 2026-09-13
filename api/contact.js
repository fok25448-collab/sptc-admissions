import {endpoint,rate,text,uuid,fail,hash,rpc} from '../server/core.js';
export default endpoint('POST',async req=>{
 await rate(req,'contact',10);
 const d=req.body;if(!uuid(d.requestId))fail(400,'รหัสคำขอไม่ถูกต้อง');
 const data={name:text(d.name,'ชื่อ',200),email:text(d.email,'อีเมล',254),subject:text(d.subject,'เรื่อง',40),message:text(d.message,'ข้อความ',5000),phone:typeof d.phone==='string'?d.phone.trim().slice(0,30):''};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)||!['admission','course','documents','other'].includes(data.subject))fail(400,'กรุณาตรวจสอบอีเมลและเรื่องที่ติดต่อ');
 try{await rpc('submit_contact',{p_request_id:d.requestId,p_hash:hash(JSON.stringify(data)),p_data:data});}catch(e){if(e.code==='P0001')fail(409,'รหัสคำขอซ้ำกับข้อความอื่น กรุณาโหลดหน้าใหม่');throw e;}
 return {status:'success'};
});
