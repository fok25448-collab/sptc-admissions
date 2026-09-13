import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export const fail=(status,message)=>{throw new HttpError(status,message);};
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function config(){
 const {SUPABASE_URL:url,SUPABASE_SERVICE_ROLE_KEY:key,APP_SECRET:secret,APP_ORIGIN:origin}=process.env;
 if(!url||!key||!secret||secret.length<32||!origin) fail(503,'ระบบยังตั้งค่าการเชื่อมต่อไม่ครบ กรุณาติดต่อเจ้าหน้าที่');
 return {url:url.replace(/\/$/,''),key,secret,origin};
}
export async function sb(path,options={}) {
 const {url,key}=config();
 const res=await fetch(url+path,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,...options.headers},signal:AbortSignal.timeout(20000)});
 if(!res.ok){
  const err=await res.json().catch(()=>({}));
  const e=new HttpError(502,'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่');e.code=err.code;e.upstream=res.status;e.detail=err.message;throw e;
 }
 return res;
}
export async function rest(path,options={}) {
 const res=await sb('/rest/v1/'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},body:options.body===undefined?undefined:JSON.stringify(options.body)});
 return res.status===204?null:res.json();
}
export const rpc=(name,body)=>rest('rpc/'+name,{method:'POST',body});
export function signed(payload){const b=Buffer.from(JSON.stringify(payload)).toString('base64url');return b+'.'+createHmac('sha256',config().secret).update(b).digest('base64url');}
export function verify(token){
 if(typeof token!=='string'||token.length>16000) fail(400,'ข้อมูลการอัปโหลดไม่ถูกต้อง');
 const [b,s,...extra]=token.split('.');
 const expected=createHmac('sha256',config().secret).update(b||'').digest('base64url');
 if(extra.length||!s||s.length!==expected.length||!timingSafeEqual(Buffer.from(s),Buffer.from(expected))) fail(400,'ข้อมูลการอัปโหลดไม่ถูกต้อง');
 let data;try{data=JSON.parse(Buffer.from(b,'base64url'));}catch{fail(400,'ข้อมูลการอัปโหลดไม่ถูกต้อง');}
 if(!Number.isFinite(data.exp)||data.exp<Date.now()) fail(410,'คำขอหมดอายุ กรุณาเลือกไฟล์และส่งใหม่');return data;
}
export async function rate(req,scope,limit){
 const ip=req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown';
 const key=createHmac('sha256',config().secret).update(scope+':'+String(ip).split(',')[0].trim()).digest('hex');
 if(!await rpc('consume_rate_limit',{p_key:key,p_limit:limit})) fail(429,'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่');
}
export function endpoint(method,fn){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
  if(req.method!==method){res.setHeader('Allow',method);fail(405,'ไม่รองรับคำขอนี้');}
  config();
  if(method!=='GET'){
   // Browser requests must be same-origin; non-browser clients cannot bypass rate/validation.
   const origin=req.headers.origin;
   if(origin&&origin!==config().origin) fail(403,'ต้นทางของคำขอไม่ถูกต้อง');
   if(req.headers['sec-fetch-site']==='cross-site') fail(403,'ต้นทางของคำขอไม่ถูกต้อง');
   if(!String(req.headers['content-type']||'').startsWith('application/json')) fail(415,'ต้องส่งข้อมูลแบบ JSON');
   if(typeof req.body==='string'){try{req.body=JSON.parse(req.body);}catch{fail(400,'ข้อมูล JSON ไม่ถูกต้อง');}}
   if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)) fail(400,'ข้อมูลไม่ถูกต้อง');
   if(Buffer.byteLength(JSON.stringify(req.body))>40000) fail(413,'ข้อมูลมีขนาดใหญ่เกินไป');
  }
  res.statusCode=200;res.end(JSON.stringify(await fn(req,res)));
 }catch(e){
  // Do not log names, ID cards, file contents, keys, or upstream bodies.
  console.error('api_error',e.status||500,e.code||e.name);
  res.statusCode=e.status||500;
  if(res.statusCode===429)res.setHeader('Retry-After','60');
  res.end(JSON.stringify({error:e.status?e.message:'เกิดข้อผิดพลาด กรุณาลองใหม่'}));
 }
};}
export function text(value,label,max=200){if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(400,`กรุณาตรวจสอบ${label}`);return value.trim();}
export function validId(id){if(!/^\d{13}$/.test(id)||/^(\d)\1{12}$/.test(id))return false;let s=0;for(let i=0;i<12;i++)s+=Number(id[i])*(13-i);return (11-s%11)%10===Number(id[12]);}
export function application(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'ข้อมูลใบสมัครไม่ถูกต้อง');
 const out={};
 for(const [key,label,max] of [['firstNameThai','ชื่อ',100],['lastNameThai','นามสกุล',100],['firstNameEng','ชื่อภาษาอังกฤษ',100],['lastNameEng','นามสกุลภาษาอังกฤษ',100],['idCard','เลขบัตรประชาชน',13],['birthDate','วันเกิด',10],['gender','เพศ',20],['nationality','สัญชาติ',80],['religion','ศาสนา',80],['phone','เบอร์โทร',10],['email','อีเมล',254],['address','ที่อยู่',2000],['educationLevel','วุฒิการศึกษา',100],['schoolName','ชื่อโรงเรียน',200],['schoolProvince','จังหวัด',100],['graduationYear','ปีที่จบ',30],['schoolType','ประเภทโรงเรียน',40],['courseId','หลักสูตร',80]])out[key]=text(input[key],label,max);
 if(!validId(out.idCard))fail(400,'เลขบัตรประชาชนไม่ถูกต้อง');
 if(!/^0[689]\d{8}$/.test(out.phone))fail(400,'เบอร์โทรศัพท์ไม่ถูกต้อง');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))fail(400,'อีเมลไม่ถูกต้อง');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(out.birthDate))fail(400,'วันเกิดไม่ถูกต้อง');
 const birth=new Date(out.birthDate+'T00:00:00Z'),now=new Date();
 if(!Number.isFinite(+birth)||birth.toISOString().slice(0,10)!==out.birthDate)fail(400,'วันเกิดไม่ถูกต้อง');
 let age=now.getUTCFullYear()-birth.getUTCFullYear();
 if(now.toISOString().slice(5,10)<out.birthDate.slice(5,10))age--;
 if(age<15||age>60)fail(400,'อายุต้องอยู่ระหว่าง 15 - 60 ปี');
 if(!/^(?:[0-3](?:\.\d{1,2})?|4(?:\.0{1,2})?)$/.test(String(input.gpa)))fail(400,'เกรดเฉลี่ยไม่ถูกต้อง');
 out.gpa=Number(input.gpa);
 if(input.terms!==true&&input.terms!=='on')fail(400,'กรุณายอมรับข้อกำหนดและเงื่อนไข');out.terms=true;
 return out;
}
export function fileMeta(file){
 const types={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
 if(!file||!types[file.type]||!Number.isInteger(file.size)||file.size<1||file.size>5*1024*1024||!/^[a-f0-9]{64}$/.test(file.sha256||''))fail(400,'ไฟล์ต้องเป็น PDF, JPG หรือ PNG ขนาดไม่เกิน 5MB');
 return {name:text(file.name,'ชื่อไฟล์',255),type:file.type,size:file.size,sha256:file.sha256,ext:types[file.type]};
}
export function validMagic(bytes,type){return type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;}
export async function courseForApplication(id){
 const [settings,courses]=await Promise.all([rest('site_settings?id=eq.1&select=*'),rest('courses?id=eq.'+encodeURIComponent(id)+'&select=*')]);
 const s=settings[0],c=courses[0];
 if(!s?.admissions_open)fail(409,'ยังไม่เปิดรับสมัคร กรุณาติดต่อเจ้าหน้าที่');
 if(!c?.published||!c?.accepting_applications)fail(409,'หลักสูตรนี้ยังไม่เปิดรับสมัคร');
 return {settings:s,course:c};
}
