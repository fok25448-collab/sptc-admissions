-- Only the four courses actually present in the original application array.
-- Review before enabling admissions. The old course-page fallback was DEMO data.
insert into public.courses(id,name,level,system,category,description,quota,published,sort_order) values
('P001','ช่างยนต์','ปวช.','ระบบปกติ','ประเภทวิชาอุตสาหกรรม','เรียนรู้เกี่ยวกับเครื่องยนต์ การซ่อมบำรุง และระบบต่างๆ ของยานยนต์',40,true,1),
('P002','ช่างกลโรงงาน','ปวช.','ระบบปกติ','ประเภทวิชาอุตสาหกรรม','ศึกษาเกี่ยวกับเครื่องมือกล การผลิตชิ้นส่วน และการควบคุมเครื่องจักร',35,true,2),
('DS001','เทคนิคยานยนต์ (ทวิภาคี)','ปวส.','ระบบทวิภาคี','ประเภทวิชาอุตสาหกรรม','ศึกษาเทคนิคยานยนต์สมัยใหม่กับสถานประกอบการ',25,true,3),
('BS001','เทคโนโลยียานยนต์ (ต่อเนื่อง)','ปริญญาตรี','ระบบทวิภาคี','ประเภทวิชาเทคโนโลยีบัณฑิต','ศึกษาด้านเทคโนโลยียานยนต์สมัยใหม่ในระดับปริญญาตรี',25,true,4)
on conflict(id) do nothing;
