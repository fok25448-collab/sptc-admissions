// Trusted runner only. Recurses both legacy flat paths and the quota v2 folders.
// Storage deletion always uses its API, never direct storage.objects SQL.
import {sb,rest} from '../server/core.js';
const cutoff=Date.now()-3*86400000;
async function collect(prefix,root){
 let offset=0;const paths=[];
 for(;;){
  const items=await(await sb('/storage/v1/object/list/admission-documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})})).json();
  for(const item of items){
   const path=prefix+'/'+item.name;
   if(!item.id){paths.push(...await collect(path,root));continue;}
   const created=Date.parse(item.created_at);if(!Number.isFinite(created)||created>=cutoff)continue;
   if(root==='documents'){
    const [legacy,current]=await Promise.all([rest('applications?document_path=eq.'+encodeURIComponent(path)+'&select=id&limit=1'),rest('application_documents?path=eq.'+encodeURIComponent(path)+'&select=application_id&limit=1')]);
    if(legacy.length||current.length)continue;
   }
   paths.push(path);
  }
  if(items.length<100)break;offset+=100;
 }
 return paths;
}
for(const root of ['staging','documents']){
 const paths=await collect(root,root);
 for(let i=0;i<paths.length;i+=100)await sb('/storage/v1/object/admission-documents',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths.slice(i,i+100)})});
 console.log(root+': removed '+paths.length+' expired, unreferenced files');
}
await rest('api_rate_limits?window_start=lt.'+new Date(Date.now()-86400000).toISOString(),{method:'DELETE'});
