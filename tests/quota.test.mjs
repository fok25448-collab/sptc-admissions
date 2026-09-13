import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {validateApplicant,nextStepFor} from '../shared/application-model.js';
import {data} from './fixtures.mjs';
test('quota forms validate level, GPA, leap date, disability and phone/ID',()=>{
 const c={level:'ปวช.',min_gpa:2};assert.deepEqual(validateApplicant(data,c).errors,{});
 for(const [k,v]of Object.entries({idCard:'1111111111111',phone:'123',birthDate:'2009-02-29',educationLevel:'ม.6',gpa:'1.99'}))assert.ok(validateApplicant({...data,[k]:v},c).errors[k]);
 assert.ok(validateApplicant({...data,disability:'yes'},c).errors.disabilityType);
 const pvs={level:'ปวส.',min_gpa:2.5};assert.ok(validateApplicant({...data,educationLevel:'ม.6',gpa:'2.49'},pvs).errors.gpa);assert.ok(validateApplicant({...data,educationLevel:'ม.6'},pvs).errors.studyPlan);
 assert.deepEqual(validateApplicant({...data,educationLevel:'ม.6',studyPlan:'วิทย์–คณิต',gpa:'2.50'},pvs).errors,{});
 assert.match(nextStepFor('accepted',null),/21–25/);
});
test('quota SQL migration, private access, two channels, atomic review, replay and capacity',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const f of ['001_schema.sql','002_courses.sql','003_quota_workflow.sql','003_quota_workflow.sql'])await db.exec(await readFile('supabase/'+f,'utf8'));
 assert.equal((await db.query('select admission_year from public.site_settings')).rows[0].admission_year,2570);
 for(const t of ['applications','admin_users','application_documents','application_reviews'])assert.equal((await db.query(`select has_table_privilege('authenticated','public.${t}','select') as allowed`)).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('service_role','public.submit_application(uuid,text,jsonb,integer,text,text,text)','execute') as allowed")).rows[0].allowed,false);
 await db.exec("update public.site_settings set admissions_open=true;update public.courses set accepting_applications=true,quota=2 where id='P001';insert into public.admin_users(user_id,display_name)values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','เจ้าหน้าที่ทดสอบ');");
 const files=['portrait','transcript','house_registration','id_card'].map(kind=>({kind,path:'documents/request/'+kind,name:kind,type:'image/jpeg',size:123,sha256:'hash'}));
 const normalized=validateApplicant(data,{level:'ปวช.',min_gpa:2}).data;
 const submit=(id,d,fs=files,h='hash')=>db.query('select public.submit_quota_application($1,$2,$3,2570,$4) as result',[id,h,JSON.stringify(d),JSON.stringify(fs)]);
 const id='11111111-1111-4111-8111-111111111111';
 await assert.rejects(submit(id,normalized,files.slice(0,1)),/DOCUMENT_REQUIRED/);
 const first=(await submit(id,normalized)).rows[0].result;assert.deepEqual((await submit(id,normalized)).rows[0].result,first);
 await assert.rejects(submit(id,normalized,files,'different'),/IDEMPOTENCY_CONFLICT/);
 const second=(await submit('22222222-2222-4222-8222-222222222222',{...normalized,idCard:'1234567890123',submissionChannel:'in_person'},[{...files[0],path:'documents/second/portrait'}])).rows[0].result;
 assert.equal((await db.query('select status from public.applications where id=$1',[second.id])).rows[0].status,'needs_documents');
 await assert.rejects(submit('33333333-3333-4333-8333-333333333333',{...normalized,idCard:'1234567890124'}),/COURSE_FULL/);
 const checks=Object.fromEntries(files.map(f=>[f.kind,true])),actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const review=(rid,version,status,cs=checks,note='',who=actor)=>db.query('select public.review_quota_application($1,$2,$3,$4,$5,$6,$7,$8,$9)',[rid,who,first.id,version,status,note,'ขั้นตอนถัดไป',JSON.stringify(cs),rid+status]);
 await assert.rejects(review('44444444-4444-4444-8444-444444444444',0,'accepted',{}),/CHECK_DOCUMENTS_FIRST/);
 await assert.rejects(review('44444444-4444-4444-8444-444444444444',0,'reported'),/APPROVAL_REQUIRED/);
 await assert.rejects(review('44444444-4444-4444-8444-444444444444',0,'rejected'),/NOTE_REQUIRED/);
 await assert.rejects(review('44444444-4444-4444-8444-444444444444',0,'accepted',checks,'','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),/ADMIN_REQUIRED/);
 await review('44444444-4444-4444-8444-444444444444',0,'accepted');await review('44444444-4444-4444-8444-444444444444',0,'accepted');
 assert.equal((await db.query('select count(*)::int n from public.application_reviews')).rows[0].n,1);
 await assert.rejects(review('55555555-5555-4555-8555-555555555555',0,'reported'),/STALE_VERSION/);
 await review('55555555-5555-4555-8555-555555555555',1,'reported');
 assert.equal((await db.query('select status_version from public.applications where id=$1',[first.id])).rows[0].status_version,2);
 }finally{await db.close();}
});
