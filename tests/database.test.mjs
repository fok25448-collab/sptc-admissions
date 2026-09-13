import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('SQL installs, denies public access, commits idempotently, and enforces capacity',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 const schema=await readFile('supabase/001_schema.sql','utf8');await db.exec(schema);await db.exec(schema);await db.exec(await readFile('supabase/002_courses.sql','utf8'));
 const r=await db.query(`select has_table_privilege('anon','public.applications','select') as readable,has_function_privilege('anon','public.submit_application(uuid,text,jsonb,integer,text,text,text)','execute') as callable`);
 assert.equal(r.rows[0].readable,false);assert.equal(r.rows[0].callable,false);
 await db.exec(`update public.site_settings set admissions_open=true;update public.courses set accepting_applications=true,quota=1 where id='P001';`);
 const submit=async(id,hash,card='1101700203450')=>db.query(`select public.submit_application($1,$2,$3,2569,$4,'test.pdf','hash') as result`,[id,hash,JSON.stringify({idCard:card,courseId:'P001',terms:true}),'documents/'+id+'.pdf']);
 const id='11111111-1111-4111-8111-111111111111';const first=await submit(id,'hash1');const again=await submit(id,'hash1');assert.deepEqual(first.rows,again.rows);
 assert.equal((await db.query('select count(*)::int as n from public.applications')).rows[0].n,1);
 await assert.rejects(submit(id,'DIFFERENT'),/IDEMPOTENCY_CONFLICT/);
 await assert.rejects(submit('22222222-2222-4222-8222-222222222222','hash2','1101700203451'),/COURSE_FULL/);
 const contactId='33333333-3333-4333-8333-333333333333';
 for(let i=0;i<2;i++)await db.query(`select public.submit_contact($1,'hash',$2)`,[contactId,JSON.stringify({name:'Test',email:'test@example.com',phone:'',subject:'course',message:'test'})]);
 assert.equal((await db.query('select count(*)::int as n from public.contact_messages')).rows[0].n,1);
 assert.equal((await db.query(`select public.consume_rate_limit('key',1) as allowed`)).rows[0].allowed,true);
 assert.equal((await db.query(`select public.consume_rate_limit('key',1) as allowed`)).rows[0].allowed,false);
 assert.equal((await db.query(`select public from storage.buckets`)).rows[0].public,false);
 }finally{await db.close();}
});
