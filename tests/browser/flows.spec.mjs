import {test,expect} from '@playwright/test';
const courses=Array.from({length:8},(_,i)=>({id:'P00'+(i+1),name:'หลักสูตร '+(i+1),level:i<5?'ปวช.':'ปวส.',system:'ระบบปกติ',category:'ประเภทวิชาอุตสาหกรรม',description:'รายละเอียดหลักสูตรทดสอบ',quota:40,positions:[],accepting_applications:true,image:null}));
const pdf={name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nTest')};
async function setup(page){
 await page.route('https://www.google.com/maps/**',route=>route.fulfill({contentType:'text/html',body:''}));
 await page.route('**/api/courses',route=>route.fulfill({json:{courses}}));
 // Tests use deterministic local content; production keeps the original remote artwork/fonts.
 await page.route(/https:\/\/(images\.unsplash\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\//,route=>route.abort());
}
async function fillFirst(page){
 for(const [name,value]of Object.entries({firstNameThai:'ทดสอบ',lastNameThai:'ระบบ',firstNameEng:'Test',lastNameEng:'User',idCard:'1101700203451',birthDate:'2005-01-01',phone:'0812345678',email:'test@example.com',address:'ที่อยู่ทดสอบ'}))await page.locator(`[name="${name}"]`).fill(value);
 // Derive a checksum for the synthetic ID fixture.
 await page.locator('[name=idCard]').fill(await page.evaluate(()=>{const p='110170020345';let sum=0;for(let i=0;i<12;i++)sum+=+p[i]*(13-i);return p+(11-sum%11)%10;}));
 await page.locator('label').filter({has:page.locator('[name=gender][value="ชาย"]')}).click();
 await page.locator('[name=nationality]').selectOption('ไทย');await page.locator('[name=religion]').selectOption('พุทธ');
}
async function fillSecond(page){
 await page.locator('[name=educationLevel]').selectOption({index:1});await page.locator('[name=schoolName]').fill('โรงเรียนทดสอบ');await page.locator('[name=schoolProvince]').selectOption('สมุทรปราการ');await page.locator('[name=graduationYear]').selectOption({index:1});await page.locator('[name=gpa]').fill('3.50');
 await page.locator('label').filter({has:page.locator('[name=schoolType][value="รัฐบาล"]')}).click();await page.locator('#eduFile').setInputFiles(pdf);
}
test('all pages load with one shared shell on mobile, tablet and desktop',async({page})=>{
 await setup(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,820,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/','/courses','/application','/contact']){
   await page.goto(path,{waitUntil:'domcontentloaded'});await expect(page.locator('nav')).toHaveCount(1);await expect(page.locator('footer')).toHaveCount(1);
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   if(width===390){await page.locator('#mobileMenuBtn').click();await expect(page.locator('#mobileMenu')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#mobileMenu')).toBeHidden();}
  }
 }
 expect(errors).toEqual([]);
});
test('load more appends, stops at end, counts/filter and course selection work',async({page})=>{
 await setup(page);await page.goto('/courses');await expect(page.locator('.course-card-enhanced')).toHaveCount(6);
 await page.locator('#loadMoreBtn').click();await expect(page.locator('.course-card-enhanced')).toHaveCount(8);await expect(page.locator('#loadMoreBtn')).toBeHidden();await expect(page.locator('#filteredCount')).toHaveText('8');
 await page.locator('[data-level-id="ปวส."]').click();await expect(page.locator('.course-card-enhanced')).toHaveCount(3);
 await page.locator('.course-card-enhanced').first().click();await expect(page.locator('#courseModal')).toBeVisible();
 await page.locator('#courseModal a[href^="/application"]').click();await expect(page.locator('#selectedCourseText')).toHaveText('หลักสูตร 6');
});
test('draft persists and rapid next clicks cannot skip a step',async({page})=>{
 await setup(page);page.on('dialog',d=>d.accept());await page.goto('/application');await fillFirst(page);await page.locator('#saveDraftBtn').click();await page.reload();await expect(page.locator('[name=firstNameThai]')).toHaveValue('ทดสอบ');
 await page.locator('#nextBtn').evaluate(el=>{el.click();el.click();el.click();});await expect(page.locator('#step2')).toBeVisible();await expect(page.locator('#step3')).toBeHidden();
});
test('application uploads once; retry after failed save uses same proof and shows actual receipt',async({page})=>{
 await setup(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 let prepares=0,uploads=0,submits=0;const proofs=[];
 await page.route('**/api/application-prepare',route=>{prepares++;return route.fulfill({json:{token:'same-proof',uploadUrl:'http://localhost:3000/mock-upload'}});});
 await page.route('**/mock-upload',route=>{uploads++;return route.fulfill({json:{Key:'staged'}});});
 await page.route('**/api/applications',route=>{submits++;proofs.push(route.request().postDataJSON().token);return submits===1?route.fulfill({status:503,json:{error:'ทดสอบการเชื่อมต่อขัดข้อง'}}):route.fulfill({json:{status:'success',applicationNumber:'SPTC-2569-00000001'}});});
 await page.goto('/application?course=P001');await fillFirst(page);await page.locator('#nextBtn').click();await expect(page.locator('#step2')).toBeVisible();await fillSecond(page);await page.locator('#nextBtn').click();await expect(page.locator('#step3')).toBeVisible();await page.locator('#nextBtn').click();await expect(page.locator('#step4')).toBeVisible();await page.locator('[name=terms]').check();
 await page.locator('#submitBtn').click();await expect(page.locator('#loadingOverlay')).toBeHidden();await expect(page.locator('#successModal')).toBeHidden();
 await page.locator('#submitBtn').click();await expect(page.locator('#successModal')).toBeVisible();await expect(page.locator('#appNumberDisplay')).toHaveText('SPTC-2569-00000001');
 expect([prepares,uploads,submits]).toEqual([1,1,2]);expect(proofs).toEqual(['same-proof','same-proof']);expect(errors).toEqual([]);
});
test('contact form saves all fields and does not clear data on failure',async({page})=>{
 await setup(page);page.on('dialog',d=>d.accept());let payload,calls=0;
 await page.route('**/api/contact',route=>{payload=route.request().postDataJSON();calls++;return calls===1?route.fulfill({status:503,json:{error:'ไม่สำเร็จ'}}):route.fulfill({json:{status:'success'}});});
 await page.goto('/contact');await page.locator('#name').fill('ผู้ทดสอบ');await page.locator('#email').fill('test@example.com');await page.locator('#subject').selectOption('course');await page.locator('#message').fill('สอบถามหลักสูตร');await page.locator('[type=submit]').click();await expect(page.locator('#message')).toHaveValue('สอบถามหลักสูตร');const id=payload.requestId;await page.locator('[type=submit]').click();await expect(page.locator('#message')).toHaveValue('');expect(payload.subject).toBe('course');expect(payload.requestId).toBe(id);
});
