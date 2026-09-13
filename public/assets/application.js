import {FIELDS,DOCUMENTS,validateApplicant} from '/assets/application-model.js';
import {downloadApplication} from '/assets/application-pdf.js';
const $=id=>document.getElementById(id),esc=App.escape,form=$('quotaForm');
let courses=[],step=0,busy=false,request=null,result=null;
const groups=[['prefix','firstNameThai','lastNameThai','nationality','religion','birthDate','disability','disabilityType','idCard','phone','houseNo','moo','village','soi','road','subdistrict','district','province','postalCode'],['educationLevel','schoolName','schoolProvince','studyPlan','gpa','courseId'],['submissionChannel']];
const options={prefix:['นาย','นางสาว'],disability:[['no','ไม่พิการ'],['yes','พิการ']],educationLevel:['ม.3','ม.6','ปวช.'],submissionChannel:[['online','แนบเอกสารทั้งหมดออนไลน์'],['in_person','พิมพ์ใบสมัครและนำหลักฐานไปยื่นที่วิทยาลัย']]};
const types={birthDate:'date',phone:'tel',idCard:'text',gpa:'number'};
function field(key){const [label,max,required=true]=FIELDS[key];let content;
 if(options[key]||key==='courseId'){content=`<select name="${key}" id="${key}" ${required?'required':''}><option value="">กรุณาเลือก</option>${(options[key]||[]).map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return `<option value="${v}">${t}</option>`;}).join('')}</select>`;}
 else content=`<input name="${key}" id="${key}" type="${types[key]||'text'}" maxlength="${max}" ${required?'required':''} ${['idCard','phone','postalCode'].includes(key)?'inputmode="numeric"':''} ${key==='gpa'?'min="0" max="4" step="0.01"':''} ${key==='birthDate'?'max="'+new Date().toISOString().slice(0,10)+'"':''}>`;
 return `<label id="field-${key}" for="${key}">${label}${required?' *':''}${content}<small class="field-error" id="error-${key}"></small>${key==='birthDate'?'<small>เลือกวันเกิดตามปฏิทิน ระบบจะแสดงเป็น พ.ศ. ในใบสมัคร</small>':''}</label>`;
}
$('stepContent').innerHTML=groups.map((keys,i)=>`<section class="form-step ${i===0?'active':''}" data-step="${i}"><h2>${['ข้อมูลส่วนตัวและที่อยู่ที่ติดต่อได้','ข้อมูลการศึกษาและสาขาที่สมัคร','รูปถ่ายและหลักฐานการสมัคร'][i]}</h2><div class="quota-grid">${keys.map(field).join('')}</div>${i===1?'<p id="courseNote" class="quota-note">เลือกหลักสูตรเพื่อดูเกณฑ์เกรดเฉลี่ย</p>':i===2?'<div id="fileFields"></div><p class="quota-note">รูปถ่ายหน้าตรง 1 นิ้ว ถ่ายไม่เกิน 6 เดือน กรุณาเตรียมรูปจริง 2 รูปเมื่อนำเอกสารไปยื่น หากเลือกยื่นที่วิทยาลัย สามารถแนบเฉพาะรูปถ่ายแล้วดาวน์โหลดใบสมัครได้</p>':''}</section>`).join('')+'<section class="form-step" data-step="3"><h2>ตรวจสอบข้อมูลก่อนส่ง</h2><div id="reviewData"></div><label><input type="checkbox" name="terms" required>ข้าพเจ้ารับรองว่าข้อมูลและเอกสารเป็นความจริง และยินยอมให้วิทยาลัยใช้ข้อมูลเพื่อดำเนินการรับสมัครและตรวจสอบผล</label><small class="field-error" id="error-terms"></small><p>หลังส่งสำเร็จจะได้รับเลขใบสมัครและดาวน์โหลด PDF ได้</p></section>';
$('fileFields').innerHTML=Object.entries(DOCUMENTS).map(([k,d])=>`<label>${d.label}<input type="file" id="file-${k}" accept="${d.accept}"><small>${k==='portrait'?'JPG / PNG ไม่เกิน 2 MB':'PDF / JPG / PNG ไม่เกิน 5 MB'}</small><small class="field-error" id="error-file-${k}"></small></label>`).join('')+'<img id="portraitPreview" class="portrait-preview" alt="ตัวอย่างรูปถ่ายผู้สมัคร" hidden>';
$('nationality').value='ไทย';$('disability').value='no';$('submissionChannel').value='online';
function current(){return Object.fromEntries(new FormData(form));}
function course(){return courses.find(c=>c.id===$('courseId').value);}
function message(text){$('appMessage').className=text?'quota-alert':'';$('appMessage').textContent=text;}
function conditional(){const disabled=$('disability').value!=='yes';$('field-disabilityType').hidden=disabled;$('disabilityType').required=!disabled;
 const pvs=course()?.level==='ปวส.';$('field-studyPlan').hidden=!pvs;$('studyPlan').required=pvs;
 for(const k of Object.keys(DOCUMENTS))$('file-'+k).required=k==='portrait'||$('submissionChannel').value==='online';
 if(course())$('courseNote').textContent=course().level+' '+course().system+' · เกรดเฉลี่ยขั้นต่ำ '+Number(course().min_gpa??2).toFixed(2);
}
function fileErrors(){const errors={};for(const [k,d]of Object.entries(DOCUMENTS)){const f=$('file-'+k).files[0];if(!f&&$('file-'+k).required)errors['file-'+k]='กรุณาแนบ'+d.label;else if(f&&(!d.accept.split(',').includes(f.type)||f.size>d.max||f.size===0))errors['file-'+k]='ชนิดหรือขนาดไฟล์ไม่ถูกต้อง';}return errors;}
function validate(all=false){const {errors}=validateApplicant({...current(),terms:all?form.elements.terms.checked:true},course());const active=all?errors:Object.fromEntries(Object.entries(errors).filter(([key])=>groups[step]?.includes(key)));if(all||step===2)Object.assign(active,fileErrors());
 document.querySelectorAll('.field-error').forEach(e=>e.textContent='');form.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));
 for(const [key,error]of Object.entries(active)){if($('error-'+key))$('error-'+key).textContent=error;$(key)?.setAttribute('aria-invalid','true');}
 if(Object.keys(active).length){message(Object.values(active).join('\n'));const key=Object.keys(active)[0];if(all){const index=groups.findIndex(g=>g.includes(key));show(index>=0?index:key.startsWith('file-')?2:3);}($(key)||$('file-'+key))?.focus();return false;}message('');return true;
}
function show(index){step=index;document.querySelectorAll('.form-step').forEach((e,i)=>{e.classList.toggle('active',i===step);e.classList.toggle('slide-in-right',i===step);});document.querySelectorAll('.quota-steps li').forEach((e,i)=>{e.classList.toggle('current',i===step);if(i===step)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});$('previous').hidden=step===0;$('next').hidden=step===3;$('submit').hidden=step!==3;
 if(step===3){const data=current();$('reviewData').innerHTML='<table class="quota-table">'+Object.entries(FIELDS).filter(([k])=>data[k]).map(([k,[label]])=>`<tr><th>${label}</th><td>${esc(k==='courseId'?course()?.name+' '+course()?.level+' '+course()?.system:k==='disability'?data[k]==='no'?'ไม่พิการ':'พิการ':k==='submissionChannel'?data[k]==='online'?'ออนไลน์':'ยื่นที่วิทยาลัย':data[k])}</td></tr>`).join('')+Object.keys(DOCUMENTS).map(k=>`<tr><th>${DOCUMENTS[k].label}</th><td>${esc($('file-'+k).files[0]?.name||'นำไปยื่นที่วิทยาลัย')}</td></tr>`).join('')+'</table>';}
}
$('next').onclick=()=>{if(validate())show(step+1);};$('previous').onclick=()=>show(step-1);
form.addEventListener('change',()=>{request=null;conditional();});
let previewUrl; $('file-portrait').addEventListener('change',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const f=$('file-portrait').files[0];$('portraitPreview').hidden=!f;if(f){previewUrl=URL.createObjectURL(f);$('portraitPreview').src=previewUrl;}});
form.addEventListener('submit',async e=>{e.preventDefault();if(busy||!validate(true))return;busy=true;$('submit').disabled=true;$('previous').disabled=true;
 // Freeze inputs while signing/uploading so a request can always be retried unchanged.
 const {data}=validateApplicant({...current(),terms:form.elements.terms.checked},course());const files=Object.fromEntries(Object.keys(DOCUMENTS).map(k=>[k,$('file-'+k).files[0]]).filter(([,f])=>f));
 form.querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
 try{let photo;try{photo=await createImageBitmap(files.portrait);}catch{throw new Error('ไม่สามารถอ่านรูปถ่ายได้ กรุณาเลือกไฟล์ JPG หรือ PNG ที่เปิดดูได้ตามปกติ');}photo.close();message('กำลังอัปโหลดและบันทึกใบสมัคร กรุณารอสักครู่');
  if(!request){const metadata={};for(const [k,f]of Object.entries(files))metadata[k]={name:f.name,size:f.size,type:f.type,sha256:await App.sha256(f)};request={id:crypto.randomUUID(),metadata};}
  if(!request.prepared)request.prepared=await App.api('application-prepare',{requestId:request.id,data,files:request.metadata});
  request.uploaded??=new Set();
  await Promise.all(request.prepared.files.filter(f=>!request.uploaded.has(f.kind)).map(async f=>{await App.upload(f.uploadUrl,files[f.kind]);request.uploaded.add(f.kind);}));
  const response=await App.api('applications',{token:request.prepared.token,data});result=response.application;
  if(!result)throw new Error('ยังไม่ได้รับรายละเอียดใบสมัคร กรุณาลองส่งอีกครั้ง');
  try{localStorage.removeItem('sptc-quota-draft');}catch{}
  form.hidden=true;$('success').hidden=false;$('receipt').textContent='เลขใบสมัคร '+result.application_number;message('');$('success').scrollIntoView({block:'start'});
 }catch(error){message(error.message);}finally{busy=false;form.querySelectorAll('input,select,button').forEach(e=>e.disabled=false);}
});
$('downloadPdf').onclick=async()=>{const b=$('downloadPdf');b.disabled=true;try{await downloadApplication(result,$('file-portrait').files[0]);message('');}catch(e){message('ดาวน์โหลดไม่สำเร็จ: '+e.message);}finally{b.disabled=false;}};
async function load(){try{message('กำลังโหลดหลักสูตร');const r=await App.api('courses');courses=r.courses.filter(c=>['ปวช.','ปวส.'].includes(c.level)&&c.accepting_applications);$('academicYear').textContent=r.admissionYear;$('courseId').innerHTML='<option value="">เลือกสาขาวิชาและระบบการเรียน</option>'+courses.map(c=>`<option value="${esc(c.id)}">${esc(c.level+' · '+c.name+' · '+c.system)}</option>`).join('');const selected=new URLSearchParams(location.search).get('course');if(courses.some(c=>c.id===selected))$('courseId').value=selected;if(r.admissionsOpen===false)message('ยังไม่เปิดรับสมัคร กรุณาติดต่อเจ้าหน้าที่');else message('');conditional();}catch(e){message(e.message);const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='โหลดหลักสูตรอีกครั้ง';retry.onclick=load;$('appMessage').append(retry);}}
$('saveDraft').onclick=()=>{try{localStorage.setItem('sptc-quota-draft',JSON.stringify({data:current(),expires:Date.now()+7*86400000}));message('บันทึกแบบร่างบนอุปกรณ์นี้ 7 วัน (รวมข้อมูลส่วนตัว) เมื่อกลับมากรอกต่อให้เลือกไฟล์ใหม่ หากใช้เครื่องสาธารณะ กรุณาลบแบบร่างหลังใช้งาน');}catch{message('อุปกรณ์นี้ไม่อนุญาตให้บันทึกแบบร่าง');}};
try{const draft=JSON.parse(localStorage.getItem('sptc-quota-draft')||'null');if(draft?.expires>Date.now()){
 const box=document.createElement('div');box.className='quota-note';box.append('มีแบบร่างที่บันทึกไว้บนอุปกรณ์นี้ ');
 for(const [label,action]of [['กรอกต่อ',()=>{for(const [k,v]of Object.entries(draft.data||{}))if(form.elements[k]&&k!=='terms')form.elements[k].value=v;conditional();box.remove();}],['ลบแบบร่าง',()=>{localStorage.removeItem('sptc-quota-draft');box.remove();}]]){const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=label;b.onclick=action;box.append(b);}form.prepend(box);
 }else localStorage.removeItem('sptc-quota-draft');}catch{}
conditional();show(0);load();
