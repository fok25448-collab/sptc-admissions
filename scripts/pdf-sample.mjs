// Synthetic fixtures only. Produces local QA samples, never reads real applicants.
import PdfPrinter from 'pdfmake';import {createWriteStream} from 'node:fs';import {readFile,mkdir} from 'node:fs/promises';import {buildApplicationPdf} from '../public/assets/pdf-definition.js';import {data} from '../tests/fixtures.mjs';import {DEFAULT_SCHEDULE} from '../shared/application-model.js';
const printer=new PdfPrinter({Sarabun:{normal:'public/assets/pdf-fonts/Sarabun-400.ttf',bold:'public/assets/pdf-fonts/Sarabun-700.ttf'}});
const logo='data:image/png;base64,'+(await readFile('public/assets/college-logo.png')).toString('base64');
await mkdir('/tmp/sptc-pdf-qa',{recursive:true});
for(const [i,level]of ['ปวช.','ปวส.'].entries()){
 const a={application_number:'SPTC-2570-0000000'+(i+1),admission_year:2570,created_at:'2026-09-13T10:00:00Z',payload:{...data,educationLevel:i?'ม.6':'ม.3',studyPlan:'วิทยาศาสตร์ – คณิตศาสตร์',submissionChannel:i?'in_person':'online'},course_snapshot:{level,name:i?'ไฟฟ้า':'ช่างยนต์',system:i?'ระบบสมทบ':'ระบบปกติ'},schedule_snapshot:DEFAULT_SCHEDULE};
 const doc=printer.createPdfKitDocument(buildApplicationPdf(a,{logo}));const stream=createWriteStream('/tmp/sptc-pdf-qa/'+(i?'pvs':'pvch')+'.pdf');doc.pipe(stream);doc.end();await new Promise((resolve,reject)=>{stream.on('finish',resolve);stream.on('error',reject);});
}
console.log('Synthetic PDF samples written to /tmp/sptc-pdf-qa');
