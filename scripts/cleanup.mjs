// Run manually with server credentials, or on a trusted scheduled runner.
// Never delete storage.objects directly: use the Storage API.
import {sb,rest} from '../server/core.js';
const cutoff=Date.now()-3*86400000;
for(const prefix of ['staging','documents']){
 let offset=0;const paths=[];
 for(;;){
  const items=await(await sb('/storage/v1/object/list/admission-documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})})).json();
  for(const item of items){
   if(!item.id||Date.parse(item.created_at)>=cutoff)continue;
   const path=prefix+'/'+item.name;
   if(prefix==='documents'){
    const used=await rest('applications?document_path=eq.'+encodeURIComponent(path)+'&select=id&limit=1');if(used.length)continue;
   }
   paths.push(path);
  }
  if(items.length<100)break;offset+=100;
 }
 for(let i=0;i<paths.length;i+=100)await sb('/storage/v1/object/admission-documents',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths.slice(i,i+100)})});
 console.log(prefix+': removed '+paths.length+' expired, unreferenced files');
}
await rest('api_rate_limits?window_start=lt.'+new Date(Date.now()-86400000).toISOString(),{method:'DELETE'});
