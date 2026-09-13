import test from 'node:test';import assert from 'node:assert/strict';
import {hash,signed} from '../server/core.js';import handler from '../api/applications.js';
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.APP_SECRET='test-secret'.repeat(4);process.env.APP_ORIGIN='https://admission.example';
const data={firstNameThai:'ทดสอบ',lastNameThai:'ระบบ',firstNameEng:'Test',lastNameEng:'User',idCard:'1101700203450',birthDate:'2005-01-01',gender:'ชาย',nationality:'ไทย',religion:'พุทธ',phone:'0812345678',email:'test@example.com',address:'Test',educationLevel:'ม.3',schoolName:'Test',schoolProvince:'สมุทรปราการ',graduationYear:'2569',schoolType:'รัฐบาล',courseId:'P001',gpa:3.5,terms:true};
const p=data.idCard.slice(0,12);let sum=0;for(let i=0;i<12;i++)sum+=+p[i]*(13-i);data.idCard=p+(11-sum%11)%10;
test('file verified then copied privately before commit; retry returns same receipt',async()=>{
 const bytes=Buffer.from('%PDF-1.7\ntest');const id='11111111-1111-4111-8111-111111111111';
 const token=signed({requestId:id,dataHash:hash(JSON.stringify(data)),file:{name:'test.pdf',type:'application/pdf',size:bytes.length,sha256:hash(bytes),ext:'pdf'},path:'staging/'+id+'.pdf',year:2569,exp:Date.now()+60000});
 let committed=null;const calls=[];const original=global.fetch;
 global.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;calls.push(path);
  if(path.endsWith('/consume_rate_limit'))return Response.json(true);
  if(path.endsWith('/applications'))return Response.json(committed?[committed]:[]);
  if(path.includes('/object/authenticated/'))return new Response(bytes);
  if(path.includes('/object/admission-documents/')){assert.equal(options.headers['x-upsert'],'false');assert.deepEqual(options.body,bytes);return Response.json({Key:'saved'});}
  if(path.endsWith('/submit_application')){const body=JSON.parse(options.body);assert.ok(body.p_document_path.startsWith('documents/'));committed={application_number:'SPTC-2569-00000001',payload_hash:body.p_payload_hash};return Response.json(committed);}
  throw Error('Unexpected path '+path);
 };
 const invoke=async()=>{const res={setHeader(){},end(value){this.json=JSON.parse(value);}};await handler({method:'POST',headers:{origin:process.env.APP_ORIGIN,'content-type':'application/json'},body:{data,token}},res);return res;};
 try{const first=await invoke();assert.equal(first.statusCode,200);assert.equal(first.json.applicationNumber,'SPTC-2569-00000001');calls.length=0;const second=await invoke();assert.deepEqual(first.json,second.json);assert.equal(calls.some(p=>p.includes('/storage/')),false);}
 finally{global.fetch=original;}
});
