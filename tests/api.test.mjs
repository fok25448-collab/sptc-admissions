import test from 'node:test';import assert from 'node:assert/strict';
import {hash,signed} from '../server/core.js';import handler from '../api/applications.js';import status from '../api/application-status.js';import admin from '../api/admin.js';import session from '../api/admin-session.js';import {data as input} from './fixtures.mjs';import {validateApplicant} from '../shared/application-model.js';
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.APP_SECRET='test-secret'.repeat(4);process.env.APP_ORIGIN='https://admission.example';
const course={id:'P001',name:'ช่างยนต์',level:'ปวช.',min_gpa:2};const data=validateApplicant(input,course).data;
async function invoke(fn,body,headers={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.json=JSON.parse(v);}};await fn({method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json',...headers},body},res);return res;}
test('four files validated and made immutable; lost response retry returns same receipt',async()=>{
 const bytes=Buffer.from([255,216,255,1,2,3]);const id='11111111-1111-4111-8111-111111111111';
 const files=['portrait','transcript','house_registration','id_card'].map(kind=>({kind,name:kind+'.jpg',type:'image/jpeg',size:bytes.length,sha256:hash(bytes),ext:'jpg',path:'staging/'+id+'/'+kind+'.jpg'}));
 const token=signed({purpose:'quota-v2',requestId:id,dataHash:hash(JSON.stringify(data)),files,course,year:2570,exp:Date.now()+60000});
 let committed=null;const calls=[];const original=global.fetch;
 global.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;calls.push(path);
  if(path.endsWith('/consume_rate_limit'))return Response.json(true);
  if(path.endsWith('/applications'))return Response.json(committed?[committed]:[]);
  if(path.includes('/object/authenticated/'))return new Response(bytes);
  if(path.includes('/object/admission-documents/')){assert.equal(options.headers['x-upsert'],'false');assert.deepEqual(options.body,bytes);return Response.json({Key:'saved'});}
  if(path.endsWith('/submit_quota_application')){const b=JSON.parse(options.body);assert.equal(b.p_files.length,4);assert.ok(b.p_files.every(f=>f.path.startsWith('documents/')));committed={application_number:'SPTC-2570-00000001',payload_hash:b.p_payload_hash,payload:data,course_snapshot:course,admission_year:2570,created_at:'2026-09-13T12:00:00Z',status:'pending'};return Response.json(committed);}
  throw Error('Unexpected path '+path);
 };
 try{const first=await invoke(handler,{data,token});assert.equal(first.statusCode,200);assert.equal(first.json.applicationNumber,'SPTC-2570-00000001');calls.length=0;const second=await invoke(handler,{data,token});assert.deepEqual(first.json,second.json);assert.equal(calls.some(p=>p.includes('/storage/')),false);
 assert.equal((await invoke(handler,{data:{...data,phone:'0899999999'},token})).statusCode,409);
 assert.equal((await invoke(handler,{data,token:signed({requestId:id,exp:Date.now()+60000})})).statusCode,400);
 }finally{global.fetch=original;}
});
test('lookup requires both values and returns only masked status data',async()=>{
 const original=global.fetch;global.fetch=async url=>{const u=new URL(url);if(u.pathname.endsWith('/consume_rate_limit'))return Response.json(true);if(u.pathname.endsWith('/application_reviews'))return Response.json([]);assert.equal(u.searchParams.get('id_card'),'eq.'+data.idCard);assert.equal(u.searchParams.get('payload->>phone'),'eq.'+data.phone);return Response.json([{id:'id',application_number:'number',payload:data,course_snapshot:course,status:'accepted',schedule_snapshot:null}]);};
 try{const r=await invoke(status,{idCard:data.idCard,phone:data.phone});assert.equal(r.statusCode,200);assert.match(r.json.applications[0].name,/\*\*\*/);const output=JSON.stringify(r.json);for(const secret of [data.idCard,data.phone,data.houseNo+'"',data.lastNameThai])assert.equal(output.includes(secret),false);assert.equal((await invoke(status,{idCard:data.idCard})).statusCode,400);assert.equal((await invoke(status,{idCard:data.idCard,phone:data.phone},{origin:'https://evil.example'})).statusCode,403);}finally{global.fetch=original;}
});
test('every admin action denies missing or unlisted sessions; login cookie is HttpOnly',async()=>{
 for(const action of ['list','detail','document','review'])assert.equal((await invoke(admin,{action})).statusCode,401);
 const original=global.fetch;let allowed=false;
 global.fetch=async url=>{const path=new URL(url).pathname;if(path.endsWith('/consume_rate_limit'))return Response.json(true);if(path.endsWith('/token'))return Response.json({user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},access_token:'test-token',expires_in:3600});if(path.endsWith('/user'))return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});if(path.endsWith('/admin_users'))return Response.json(allowed?[{user_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',display_name:'Admin'}]:[]);throw Error(path);};
 try{assert.equal((await invoke(admin,{action:'list'},{cookie:'sptc_admin=test-token'})).statusCode,403);assert.equal((await invoke(session,{action:'login',email:'a@example.com',password:'test'})).statusCode,403);allowed=true;const r=await invoke(session,{action:'login',email:'a@example.com',password:'test'});assert.equal(r.statusCode,200);assert.match(r.headers['Set-Cookie'],/HttpOnly; SameSite=Strict; Path=\/api; Max-Age=3600; Secure/);assert.equal(JSON.stringify(r.json).includes('test-token'),false);}finally{global.fetch=original;}
});
