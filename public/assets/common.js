/* Shared transport/helpers. No database secrets or direct table permissions in the browser. */
window.App={
 async api(path,data){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  try{
   const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:controller.signal});
   const result=await response.json().catch(()=>({error:'การเชื่อมต่อขัดข้อง กรุณาลองใหม่'}));
   if(!response.ok)throw new Error(result.error||'ไม่สามารถดำเนินการได้');return result;
  }catch(e){if(e.name==='AbortError')throw new Error('การเชื่อมต่อใช้เวลานาน กรุณาลองส่งอีกครั้ง ระบบจะตรวจสอบคำขอเดิมให้');throw e;}
  finally{clearTimeout(timer);}
 },
 escape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
 image(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}},
 async courses(){const result=await App.api('courses');if(!Array.isArray(result.courses))throw new Error('ข้อมูลหลักสูตรไม่ถูกต้อง');return result.courses;},
 error(container,message,retry){
  container.replaceChildren();const box=document.createElement('div');box.className='api-message';box.setAttribute('role','alert');box.textContent=message;
  if(retry){const b=document.createElement('button');b.type='button';b.textContent='ลองใหม่';b.onclick=retry;box.append(b);}container.append(box);
 },
 async sha256(file){const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');},
 async upload(url,file){
  const data=new FormData();data.append('cacheControl','3600');data.append('',file);
  const response=await fetch(url,{method:'PUT',headers:{'x-upsert':'false'},body:data,signal:AbortSignal.timeout(120000)});
  // A retry may encounter the immutable staging object from a prior successful upload.
  if(!response.ok){const error=await response.json().catch(()=>({}));if(!['409','Duplicate'].includes(String(error.statusCode||error.error)))throw new Error('อัปโหลดเอกสารไม่สำเร็จ กรุณาลองส่งอีกครั้ง');}
 }
};
// Preserve compatibility with old ?page links without depending on Apps Script.
const legacyPage=new URLSearchParams(location.search).get('page');
if(['home','courses','application','contact'].includes(legacyPage))location.replace(legacyPage==='home'?'/':'/'+legacyPage);
document.addEventListener('DOMContentLoaded',()=>{
 const year=document.getElementById('currentYear');if(year)year.textContent=new Date().getFullYear();
 const page=document.body.dataset.page;
 document.querySelectorAll('nav a').forEach(a=>{
  const active=new URL(a.href).pathname===(page==='home'?'/':'/'+page);
  if(active){a.setAttribute('aria-current','page');a.classList.add('font-bold');if(!a.classList.contains('text-white')){a.classList.add('text-blue-900');a.classList.remove('text-gray-600');}}
 });
 const menu=document.getElementById('mobileMenu'),button=document.getElementById('mobileMenuBtn');
 if(button&&menu){
  button.setAttribute('aria-label','เปิดหรือปิดเมนู');button.setAttribute('aria-controls','mobileMenu');
  const sync=()=>button.setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));
  new MutationObserver(sync).observe(menu,{attributes:true,attributeFilter:['class']});sync();
 }
});
document.addEventListener('DOMContentLoaded',()=>{
 const button=document.getElementById('mobileMenuBtn'),menu=document.getElementById('mobileMenu');
 const close=()=>{menu?.classList.add('hidden');if(button)button.innerHTML='<i class="fas fa-bars text-xl"></i>';};
 if(button&&menu){
  button.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('hidden');button.innerHTML=menu.classList.contains('hidden')?'<i class="fas fa-bars text-xl"></i>':'<i class="fas fa-times text-xl"></i>';});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&!button.contains(e.target))close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 }
 // Existing application/courses scroll buttons retain their page-specific handlers.
 if(['home','contact'].includes(document.body.dataset.page)){
  const back=document.getElementById('backToTop');
  if(back){window.addEventListener('scroll',()=>back.classList.toggle('hidden',scrollY<=300),{passive:true});if(!back.hasAttribute('onclick'))back.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));}
 }
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href').slice(1),target=id?document.getElementById(id):null;
  if(target){e.preventDefault();close();window.scrollTo({top:target.getBoundingClientRect().top+scrollY-80,behavior:'smooth'});}
 }));
});
