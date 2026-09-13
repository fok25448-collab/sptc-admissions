// Pure shared definition: used by the browser and by PDF layout tests.
export function buildApplicationPdf(a,images={}){
 const d=a.payload||{},c=a.course_snapshot||{},schedule=a.schedule_snapshot||{};
 const value=(v)=>String(v??'').trim()||'—';
 const date=v=>{if(!v)return '—';const x=new Date(v);return Number.isFinite(+x)?x.toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'}):value(v);};
 const fullName=(d.prefix||'')+value(d.firstNameThai)+' '+value(d.lastNameThai);
 const born=new Date(d.birthDate),asOf=new Date(a.created_at);let age=asOf.getUTCFullYear()-born.getUTCFullYear();if(asOf.toISOString().slice(5,10)<(d.birthDate||'').slice(5,10))age--;
 const line=(text,extra={})=>({text,margin:[0,3,0,3],...extra});
 const section=text=>line(text,{bold:true,fillColor:'#eeeeee',margin:[0,8,0,3]});
 const photo=()=>images.portrait?{image:images.portrait,fit:[65,85],alignment:'center'}:{table:{widths:[65],body:[[{text:'รูปถ่าย\n1 นิ้ว',alignment:'center',margin:[0,24,0,24]}]]},layout:{hLineColor:()=> '#999999',vLineColor:()=> '#999999'}};
 const field=(label,v)=>({text:[{text:label+' ',bold:true},value(v)],margin:[0,2,0,2]});
 const row=(...items)=>({columns:items.map(([l,v])=>field(l,v)),columnGap:10});
 const body=[
 {columns:[images.logo?{image:images.logo,fit:[55,65],width:65}:{text:'',width:65},{stack:[{text:'วิทยาลัยเทคนิคสมุทรปราการ',bold:true,fontSize:17,alignment:'center'},{text:'ใบสมัครเข้าศึกษาต่อรอบโควตา (แนะแนว)',bold:true,fontSize:14,alignment:'center'},{text:'ประจำปีการศึกษา '+value(a.admission_year)+'  ระดับ '+value(c.level),alignment:'center'},{text:'เลขใบสมัคร '+value(a.application_number),fontSize:10,alignment:'center',margin:[0,5,0,0]}]}, {...photo(),width:75}]},
 section('1. ข้อมูลผู้สมัคร'),
 row(['ชื่อ – นามสกุล',fullName],['สัญชาติ / ศาสนา',value(d.nationality)+' / '+value(d.religion)]),
 row(['เกิดวันที่',date(d.birthDate)],['อายุ',Number.isFinite(age)?age+' ปี':'—']),
 row(['ความพิการ',d.disability==='yes'?'พิการ: '+value(d.disabilityType):d.disability==='no'?'ไม่พิการ':'—']),
 row(['เลขบัตรประชาชน',d.idCard],['หมายเลขโทรศัพท์',d.phone]),
 section('2. ที่อยู่ที่ติดต่อได้'),
 line(d.address||'บ้านเลขที่ '+value(d.houseNo)+'  หมู่ '+value(d.moo)+'  หมู่บ้าน '+value(d.village)+'  ซอย '+value(d.soi)+'  ถนน '+value(d.road)),
 line('ตำบล / แขวง '+value(d.subdistrict)+'  อำเภอ / เขต '+value(d.district)+'  จังหวัด '+value(d.province)+'  รหัสไปรษณีย์ '+value(d.postalCode)),
 section('3. การศึกษาและสาขาที่ประสงค์สมัคร'),
 row(['กำลังศึกษา / วุฒิ',d.educationLevel],['เกรดเฉลี่ย 5 ภาคเรียน',Number(d.gpa).toFixed(2)]),
 line('สถานศึกษา '+value(d.schoolName)+'  จังหวัด '+value(d.schoolProvince)),
 ...(c.level==='ปวส.'?[field('แผนการเรียน / สาขางาน',d.studyPlan)]:[]),
 line('สาขาวิชาที่สมัคร '+value(c.name)+'  ระดับ '+value(c.level)+'  '+value(c.system),{bold:true}),
 section('4. หลักฐานประกอบการสมัคร'),
 line('1) ระเบียนผลการเรียน / ใบรับรองเกรดเฉลี่ย 5 ภาคเรียน (ไม่ต่ำกว่า 2.00'+(c.level==='ปวส.'?' สาขาวิชาไฟฟ้าไม่ต่ำกว่า 2.50':'')+')'),
 line('2) สำเนาทะเบียนบ้าน     3) สำเนาบัตรประชาชน'),
 line('4) รูปถ่ายหน้าตรง ขนาด 1 นิ้ว ถ่ายไม่เกิน 6 เดือน จำนวน 2 รูป'),
 field('ช่องทางยื่นหลักฐาน',d.submissionChannel==='in_person'?'นำใบสมัครและหลักฐานไปยื่นที่วิทยาลัย':'แนบเอกสารออนไลน์'),
 line('ข้าพเจ้าขอรับรองว่าข้อมูลและหลักฐานที่ให้ไว้เป็นความจริง'),
 {columns:[{stack:[line('ลงชื่อ ................................................ ผู้สมัคร'),line('('+fullName+')'),line('วันที่ ................................................')],alignment:'center'},{stack:[line('สำหรับเจ้าหน้าที่งานทะเบียน'),line('ตรวจสอบหลักฐาน ................................................'),line('ลงชื่อ ................................................ เจ้าหน้าที่')],alignment:'center'}],margin:[0,10,0,8]},
 {text:'ตัดตามแนวนี้ ........................................................................................................................................',fontSize:9,color:'#777777',margin:[0,4,0,8]},
 {unbreakable:true,stack:[{columns:[{stack:[{text:'บัตรประจำตัวผู้สมัคร',bold:true,fontSize:14},{text:'วิทยาลัยเทคนิคสมุทรปราการ',bold:true},line('เลขใบสมัคร '+value(a.application_number)+'  วันที่สมัคร '+date(a.created_at)),line('ชื่อ – นามสกุล '+fullName),line('ระดับ '+value(c.level)+'  สาขา '+value(c.name)+'  '+value(c.system)),line('ลงชื่อ ........................................................ ผู้สมัคร') ]},{...photo(),width:80}]},
 line('ประกาศผลคัดเลือก '+value(schedule.selection)+' · รายงานตัว / ชำระเงิน '+value(schedule.reporting),{fontSize:9}),line('ประกาศผู้มีสิทธิมอบตัว '+value(schedule.enrollment),{fontSize:9}),line('* นำบัตรนี้มาทุกครั้งที่ติดต่อกับทางวิทยาลัยฯ',{bold:true,fontSize:10})]}
 ];
 return {pageSize:'A4',pageMargins:[35,26,35,26],defaultStyle:{font:'Sarabun',fontSize:10,lineHeight:1.05},content:body,info:{title:'ใบสมัคร '+a.application_number,author:'วิทยาลัยเทคนิคสมุทรปราการ',subject:'ใบสมัครรอบโควตา (แนะแนว)'},footer:(page,pages)=>pages>1?{text:page+' / '+pages,alignment:'right',margin:[0,0,35,0],fontSize:8}:null};
}
