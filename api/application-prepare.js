import {endpoint,application,fileMeta,uuid,fail,hash,signed,rate,sb,courseForApplication} from '../server/core.js';
export default endpoint('POST',async req=>{
 await rate(req,'prepare',15);
 const {requestId}=req.body;if(!uuid(requestId))fail(400,'รหัสคำขอไม่ถูกต้อง');
 const data=application(req.body.data),file=fileMeta(req.body.file);
 const {settings}=await courseForApplication(data.courseId);
 const path=`staging/${requestId}.${file.ext}`;
 const result=await(await sb('/storage/v1/object/upload/sign/admission-documents/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
 if(!result.url)fail(502,'ไม่สามารถเตรียมการอัปโหลดได้');
 const payload={requestId,dataHash:hash(JSON.stringify(data)),file,path,year:settings.admission_year,exp:Date.now()+24*60*60*1000};
 // Supabase returns a path relative to /storage/v1.
 const {url}=await import('../server/core.js').then(m=>m.config());
 const uploadUrl=new URL(result.url.startsWith('/storage/v1/')?result.url:'/storage/v1'+result.url,url).href;
 if(!uploadUrl.startsWith(url+'/storage/v1/'))fail(502,'ปลายทางอัปโหลดไม่ถูกต้อง');
 return {uploadUrl,token:signed(payload)};
});
