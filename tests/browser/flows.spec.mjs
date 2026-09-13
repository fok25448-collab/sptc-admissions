import {readFileSync} from 'node:fs';
import {test,expect} from '@playwright/test';
import {data} from '../fixtures.mjs';
const courses=Array.from({length:8},(_,i)=>({id:'P00'+(i+1),name:'หลักสูตร '+(i+1),level:i<5?'ปวช.':'ปวส.',system:'ระบบปกติ',category:'ประเภทวิชาอุตสาหกรรม',description:'รายละเอียดหลักสูตรทดสอบ',quota:40,positions:[],accepting_applications:true,min_gpa:2,image:null}));
const schedule={selection:'18 ธันวาคม 2569',reporting:'21–25 ธันวาคม 2569',enrollment:'30 เมษายน 2570'};
const pdf={name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nTest')};
const portrait={name:'photo.png',mimeType:'image/png',buffer:readFileSync('tests/fixtures/portrait.png')};
async function setup(page){
 await page.route('https://www.google.com/maps/**',route=>route.fulfill({contentType:'text/html',body:''}));
 await page.route('**/api/courses',route=>route.fulfill({json:{courses,admissionYear:2570,admissionsOpen:true,schedule}}));
 await page.route(/https:\/\/(images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//,route=>route.abort());
}
async function fillFirst(page){
 await page.locator('[name=prefix]').selectOption('นาย');
 for(const k of ['firstNameThai','lastNameThai','nationality','religion','birthDate','idCard','phone','houseNo','moo','village','soi','road','subdistrict','district','province','postalCode'])await page.locator('[name='+k+']').fill(data[k]);
}
async function fillSecond(page){await page.locator('[name=educationLevel]').selectOption('ม.3');for(const k of ['schoolName','schoolProvince','gpa'])await page.locator('[name='+k+']').fill(String(data[k]));await page.locator('[name=courseId]').selectOption('P001');}
test('six pages share shell without overflow at mobile, tablet and desktop widths',async({page})=>{
 await setup(page);await page.route('**/api/admin-session',r=>r.fulfill({status:401,json:{error:'เข้าสู่ระบบ'}}));const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,820,1440]){await page.setViewportSize({width,height:900});for(const path of ['/','/courses','/application','/contact','/application-status','/admin']){
 await page.goto(path,{waitUntil:'domcontentloaded'});await expect(page.locator('nav')).toHaveCount(1);await expect(page.locator('footer')).toHaveCount(1);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(width===390){await page.locator('#mobileMenuBtn').click();await expect(page.locator('#mobileMenu')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#mobileMenu')).toBeHidden();}}}expect(errors).toEqual([]);
});
test('course selection carries into quota form',async({page})=>{await setup(page);await page.goto('/courses');await page.locator('#loadMoreBtn').click();await expect(page.locator('.course-card-enhanced')).toHaveCount(8);await page.locator('[data-level-id="ปวส."]').click();await page.locator('.course-card-enhanced').first().click();await page.locator('#courseModal a[href^="/application"]').click();await expect(page.locator('#courseId')).toHaveValue('P006');});
test('draft is saved only on request and can be restored or removed',async({page})=>{
 await setup(page);await page.goto('/application');await fillFirst(page);
 expect(await page.evaluate(()=>localStorage.getItem('sptc-quota-draft'))).toBeNull();
 await page.locator('#saveDraft').click();await page.reload();await page.getByRole('button',{name:'กรอกต่อ',exact:true}).click();await expect(page.locator('#firstNameThai')).toHaveValue(data.firstNameThai);
 await page.reload();await page.getByRole('button',{name:'ลบแบบร่าง',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('sptc-quota-draft'))).toBeNull();
});
for(const channel of ['online','in_person'])test('submit '+channel+', retry safely and download actual PDF',async({page})=>{
 await setup(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));let prepares=0,submits=0;const proofs=[];
 await page.route('**/api/application-prepare',r=>{prepares++;return r.fulfill({json:{token:'same-proof',files:Object.keys(r.request().postDataJSON().files).map(kind=>({kind,uploadUrl:'http://localhost:3000/mock-upload/'+kind}))}});});
 await page.route('**/mock-upload/*',r=>r.fulfill({json:{Key:'staged'}}));
 await page.route('**/api/applications',r=>{const b=r.request().postDataJSON();proofs.push(b.token);submits++;return submits===1?r.fulfill({status:503,json:{error:'ลองส่งอีกครั้ง'}}):r.fulfill({json:{application:{application_number:'SPTC-2570-00000001',admission_year:2570,payload:b.data,course_snapshot:courses[0],created_at:'2026-09-13T12:00:00Z',schedule_snapshot:schedule,status:'pending'}}});});
 await page.goto('/application');await fillFirst(page);await page.locator('#next').click();await fillSecond(page);await page.locator('#next').click();await page.locator('#submissionChannel').selectOption(channel);await page.locator('#file-portrait').setInputFiles(portrait);
 if(channel==='online')for(const k of ['transcript','house_registration','id_card'])await page.locator('#file-'+k).setInputFiles(pdf);
 await page.locator('#next').click();await page.locator('[name=terms]').check();await page.locator('#submit').click();await expect(page.locator('#appMessage')).toContainText('ลองส่งอีกครั้ง');await page.locator('#submit').click();await expect(page.locator('#success')).toBeVisible();expect(prepares).toBe(1);expect(proofs).toEqual(['same-proof','same-proof']);
 const downloaded=page.waitForEvent('download');await page.locator('#downloadPdf').click();const file=await downloaded;expect(file.suggestedFilename()).toBe('SPTC-2570-00000001.pdf');await file.saveAs('/tmp/sptc-pdf-qa/browser-'+channel+'.pdf');expect(errors).toEqual([]);
});
test('missing online documents blocked; PVS needs study plan and GPA',async({page})=>{await setup(page);await page.goto('/application');await fillFirst(page);await page.locator('#next').click();await fillSecond(page);await page.locator('#courseId').selectOption('P006');await page.locator('#educationLevel').selectOption('ม.6');await page.locator('#next').click();await expect(page.locator('#error-studyPlan')).not.toBeEmpty();await page.locator('#studyPlan').fill('วิทย์–คณิต');await page.locator('#next').click();await page.locator('#next').click();await expect(page.locator('#error-file-portrait')).not.toBeEmpty();await expect(page.locator('[data-step="2"]')).toBeVisible();});
test('student sees status, staff note and next steps via two exact fields',async({page})=>{await setup(page);let payload;await page.route('**/api/application-status',r=>{payload=r.request().postDataJSON();return r.fulfill({json:{applications:[{number:'SPTC-2570-00000001',year:2570,name:'ทด***',course:'ช่างยนต์',level:'ปวช.',system:'ระบบปกติ',statusLabel:'รอเอกสารเพิ่มเติม',nextStep:'นำเอกสารไปยื่นที่งานทะเบียน',note:'ขอสำเนาทะเบียนบ้าน',createdAt:'2026-09-13T12:00:00Z',channel:'in_person',history:[]}]}});});await page.goto('/application-status');await page.locator('[name=idCard]').fill(data.idCard);await page.locator('[name=phone]').fill(data.phone);await page.locator('form button').click();await expect(page.locator('#results')).toContainText('ขอสำเนาทะเบียนบ้าน');await expect(page.locator('#results')).toContainText('นำเอกสารไปยื่นที่งานทะเบียน');expect(payload).toEqual({idCard:data.idCard,phone:data.phone});});
test('admin can review physical documents and approve with a versioned request',async({page})=>{
 await setup(page);let saved;const a={id:'11111111-1111-4111-8111-111111111111',application_number:'SPTC-2570-00000001',admission_year:2570,payload:data,name:'ทดสอบ ระบบ',phone:data.phone,course_snapshot:courses[0],status:'needs_documents',submission_channel:'in_person',status_version:0,created_at:'2026-09-13T12:00:00Z'};
 await page.route('**/api/admin-session',r=>r.fulfill({json:{admin:{display_name:'เจ้าหน้าที่ทดสอบ'}}}));
 await page.route('**/api/admin',r=>{const b=r.request().postDataJSON();if(b.action==='list')return r.fulfill({json:{applications:[a],hasMore:false}});if(b.action==='detail')return r.fulfill({json:{application:a,documents:[],history:[]}});if(b.action==='review'){saved=b;a.status=b.status;a.status_version++;return r.fulfill({json:{saved:true}});}throw Error(b.action);});
 await page.goto('/admin');await page.locator('[data-open]').click();for(const k of ['portrait','transcript','house_registration','id_card'])await page.locator('#reviewForm [name='+k+']').check();await page.locator('#reviewForm [name=status]').selectOption('accepted');await page.locator('#reviewForm button[type=submit]').click();await expect(page.locator('#adminMessage')).toContainText('บันทึกผลแล้ว');expect(saved.version).toBe(0);expect(saved.status).toBe('accepted');expect(Object.values(saved.checks).every(Boolean)).toBe(true);
});
test('contact form saves all fields and does not clear data on failure',async({page})=>{
 await setup(page);page.on('dialog',d=>d.accept());let payload,calls=0;
 await page.route('**/api/contact',route=>{payload=route.request().postDataJSON();calls++;return calls===1?route.fulfill({status:503,json:{error:'ไม่สำเร็จ'}}):route.fulfill({json:{status:'success'}});});
 await page.goto('/contact');await page.locator('#name').fill('ผู้ทดสอบ');await page.locator('#email').fill('test@example.com');await page.locator('#subject').selectOption('course');await page.locator('#message').fill('สอบถามหลักสูตร');await page.locator('[type=submit]').click();await expect(page.locator('#message')).toHaveValue('สอบถามหลักสูตร');const id=payload.requestId;await page.locator('[type=submit]').click();await expect(page.locator('#message')).toHaveValue('');expect(payload.subject).toBe('course');expect(payload.requestId).toBe(id);
});
