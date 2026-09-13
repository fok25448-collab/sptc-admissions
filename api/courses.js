import {endpoint,rest} from '../server/core.js';
export default endpoint('GET',async()=>{
 const courses=await rest('courses?published=eq.true&order=sort_order.asc,id.asc&select=id,name,level,system,category,description,quota,image,duration,tuition,jobs,positions,accepting_applications,min_gpa');
 const settings=(await rest('site_settings?id=eq.1&select=admission_year,admissions_open,quota_schedule'))[0];
 return {courses,admissionYear:settings.admission_year,admissionsOpen:settings.admissions_open,schedule:settings.quota_schedule};
});
