import {endpoint,uuid,fail,hash,signed,rate,courseForApplication} from '../server/core.js';
import {normalize,prepareFiles} from '../server/admissions.js';
export default endpoint('POST',async req=>{
 await rate(req,'prepare',15);
 const {requestId,data:input,files:metadata}=req.body;if(!uuid(requestId))fail(400,'รหัสคำขอไม่ถูกต้อง');
 const {course,settings}=await courseForApplication(String(input?.courseId||''));
 const data=normalize(input,course),files=await prepareFiles(requestId,metadata,data.submissionChannel);
 return {files:files.map(({kind,uploadUrl})=>({kind,uploadUrl})),token:signed({purpose:'quota-v2',requestId,dataHash:hash(JSON.stringify(data)),files:files.map(({uploadUrl,...file})=>file),course:{id:course.id,level:course.level,min_gpa:course.min_gpa},year:settings.admission_year,exp:Date.now()+86400000})};
});
