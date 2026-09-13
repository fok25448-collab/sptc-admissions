import {endpoint,rest} from '../server/core.js';
export default endpoint('GET',async()=>{
 const courses=await rest('courses?published=eq.true&order=sort_order.asc,id.asc&select=id,name,level,system,category,description,quota,image,duration,tuition,jobs,positions,accepting_applications');
 return {courses};
});
