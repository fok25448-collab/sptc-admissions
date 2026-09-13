export const DOCUMENTS={
 portrait:{label:'รูปถ่ายหน้าตรง ขนาด 1 นิ้ว',accept:'image/jpeg,image/png',max:2*1024*1024},
 transcript:{label:'ระเบียนผลการเรียน / ใบรับรองเกรดเฉลี่ย 5 ภาคเรียน',accept:'application/pdf,image/jpeg,image/png',max:5*1024*1024},
 house_registration:{label:'สำเนาทะเบียนบ้าน',accept:'application/pdf,image/jpeg,image/png',max:5*1024*1024},
 id_card:{label:'สำเนาบัตรประชาชน',accept:'application/pdf,image/jpeg,image/png',max:5*1024*1024}
};
export const STATUSES={pending:'รับใบสมัครแล้ว',under_review:'กำลังตรวจสอบ',needs_documents:'รอเอกสารเพิ่มเติม',accepted:'อนุมัติ / ผ่านการคัดเลือก',rejected:'ไม่ผ่านการคัดเลือก',reported:'รายงานตัวแล้ว',cancelled:'ยกเลิกใบสมัคร'};
export const DEFAULT_SCHEDULE={selection:'18 ธันวาคม 2569',reporting:'21–25 ธันวาคม 2569',enrollment:'30 เมษายน 2570'};
export const FIELDS={
 prefix:['คำนำหน้า',20],firstNameThai:['ชื่อ',100],lastNameThai:['นามสกุล',100],nationality:['สัญชาติ',80],religion:['ศาสนา',80],birthDate:['วันเดือนปีเกิด',10],disability:['ความพิการ',10],disabilityType:['ประเภทความพิการ',200,false],idCard:['เลขบัตรประชาชน',13],phone:['หมายเลขโทรศัพท์',10],
 houseNo:['บ้านเลขที่',40],moo:['หมู่',20,false],village:['ชื่อหมู่บ้าน',100,false],soi:['ซอย',100,false],road:['ถนน',100,false],subdistrict:['ตำบล / แขวง',100],district:['อำเภอ / เขต',100],province:['จังหวัด',100],postalCode:['รหัสไปรษณีย์',5],
 educationLevel:['ระดับการศึกษาที่ใช้สมัคร',20],schoolName:['โรงเรียน / วิทยาลัย',200],schoolProvince:['จังหวัดของสถานศึกษา',100],studyPlan:['แผนการเรียน / สาขางาน',200,false],gpa:['เกรดเฉลี่ย 5 ภาคเรียน',4],courseId:['สาขาวิชาที่สมัคร',80],submissionChannel:['ช่องทางยื่นหลักฐาน',20]
};
export function validId(value){if(!/^\d{13}$/.test(value)||/^(\d)\1{12}$/.test(value))return false;let sum=0;for(let i=0;i<12;i++)sum+=Number(value[i])*(13-i);return (11-sum%11)%10===Number(value[12]);}
export function validateApplicant(input,course){
 const errors={},data={};
 if(!input||typeof input!=='object')return {errors:{form:'ข้อมูลไม่ถูกต้อง'},data};
 for(const [key,[label,max,required=true]]of Object.entries(FIELDS)){
  const value=typeof input[key]==='number'?String(input[key]):input[key];
  data[key]=typeof value==='string'?value.trim():'';
  if((required&&!data[key])||data[key].length>max)errors[key]='กรุณาตรวจสอบ'+label;
 }
 if(!['นาย','นางสาว'].includes(data.prefix))errors.prefix='กรุณาเลือกคำนำหน้า';
 if(!validId(data.idCard))errors.idCard='เลขบัตรประชาชนไม่ถูกต้อง';
 if(!/^0[689]\d{8}$/.test(data.phone))errors.phone='กรุณากรอกเบอร์มือถือ 10 หลัก';
 if(!/^\d{5}$/.test(data.postalCode))errors.postalCode='กรุณากรอกรหัสไปรษณีย์ 5 หลัก';
 const date=new Date(data.birthDate+'T00:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==data.birthDate||date>new Date()||date.getUTCFullYear()<1900)errors.birthDate='กรุณาตรวจสอบวันเกิด';
 if(!['no','yes'].includes(data.disability))errors.disability='กรุณาระบุความพิการ';
 if(data.disability==='yes'&&!data.disabilityType)errors.disabilityType='กรุณาระบุประเภทความพิการ';
 if(data.disability==='no')data.disabilityType='';
 if(!/^(?:[0-3](?:\.\d{1,2})?|4(?:\.0{1,2})?)$/.test(data.gpa))errors.gpa='เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00–4.00';
 else data.gpa=Number(data.gpa);
 if(!['ม.3','ม.6','ปวช.'].includes(data.educationLevel))errors.educationLevel='กรุณาเลือกวุฒิการศึกษาที่ใช้สมัคร';
 if(course){
  if(!['ปวช.','ปวส.'].includes(course.level))errors.courseId='แบบฟอร์มนี้รองรับระดับ ปวช. และ ปวส.';
  if(course.level==='ปวช.'&&data.educationLevel!=='ม.3')errors.educationLevel='สมัคร ปวช. ใช้วุฒิ ม.3';
  if(course.level==='ปวส.'&&!['ม.6','ปวช.'].includes(data.educationLevel))errors.educationLevel='สมัคร ปวส. ใช้วุฒิ ม.6 หรือ ปวช.';
  if(course.level==='ปวส.'&&!data.studyPlan)errors.studyPlan='กรุณาระบุแผนการเรียน / สาขางาน';
  if(Number(data.gpa)<Number(course.min_gpa??2))errors.gpa='หลักสูตรนี้กำหนดเกรดเฉลี่ยขั้นต่ำ '+Number(course.min_gpa??2).toFixed(2);
 }
 if(!['online','in_person'].includes(data.submissionChannel))errors.submissionChannel='กรุณาเลือกช่องทางยื่นหลักฐาน';
 data.terms=input.terms===true||input.terms==='on';if(!data.terms)errors.terms='กรุณายืนยันความถูกต้องของข้อมูล';
 data.formVersion=2;
 return {data,errors};
}
export function nextStepFor(status,schedule=DEFAULT_SCHEDULE){
 schedule=schedule||DEFAULT_SCHEDULE;
 return {pending:'รอเจ้าหน้าที่ตรวจสอบใบสมัครและเอกสาร',under_review:'เจ้าหน้าที่กำลังตรวจสอบ กรุณาติดตามสถานะอีกครั้ง',needs_documents:'กรุณานำใบสมัครพร้อมเอกสารที่ระบุไปยื่นกับเจ้าหน้าที่งานทะเบียน',accepted:`รายงานตัวพร้อมชำระเงิน ${schedule.reporting} และติดตามประกาศผู้มีสิทธิมอบตัว ${schedule.enrollment}`,reported:`รายงานตัวเรียบร้อยแล้ว ติดตามประกาศผู้มีสิทธิมอบตัว ${schedule.enrollment}`,rejected:'ติดต่อเจ้าหน้าที่งานทะเบียนเพื่อสอบถามรายละเอียด',cancelled:'ใบสมัครถูกยกเลิก ติดต่อเจ้าหน้าที่หากต้องการสอบถาม'}[status]||'ติดต่อเจ้าหน้าที่งานทะเบียน';
}
