import {buildApplicationPdf} from '/assets/pdf-definition.js';
let library;
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('โหลดส่วนสร้าง PDF ไม่สำเร็จ'));};document.head.append(s);});}
async function imageData(source){
 const blob=source instanceof Blob?source:await fetch(source).then(r=>{if(!r.ok)throw new Error('โหลดรูปภาพไม่สำเร็จ');return r.blob();});
 // Decode, orient and flatten PNG transparency to avoid renderer differences in PDFs.
 const bitmap=await createImageBitmap(blob);try{
  const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.92);
 }finally{bitmap.close();}
}
export async function downloadApplication(application,portrait){
 if(!application)throw new Error('ไม่พบข้อมูลใบสมัคร');
 if(!library)library=(async()=>{await script('/assets/pdfmake.min.js');await script('/assets/pdf-fonts.js');window.pdfMake.fonts={Sarabun:{normal:'Sarabun-400.ttf',bold:'Sarabun-700.ttf',italics:'Sarabun-400.ttf',bolditalics:'Sarabun-700.ttf'}};})().catch(e=>{library=null;throw e;});
 await library;
 const [logo,photo]=await Promise.all([imageData('/assets/college-logo.png'),portrait?imageData(portrait):null]);
 const definition=buildApplicationPdf(application,{logo,portrait:photo});
 await new Promise((resolve,reject)=>{try{window.pdfMake.createPdf(definition).getBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=application.application_number+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);resolve();});}catch(e){reject(e);}});
}
