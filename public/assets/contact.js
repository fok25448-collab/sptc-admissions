document.addEventListener('DOMContentLoaded',()=>{
            const contactForm = document.getElementById('contactForm');
            if (contactForm) {
                let sending=false, requestId=crypto.randomUUID(), fingerprint='';
                contactForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    if(sending)return;
                    
                    // 8.5.1: Simple validation - การตรวจสอบข้อมูลเบื้องต้น
                    const name = document.getElementById('name').value.trim();
                    const email = document.getElementById('email').value.trim();
                    const message = document.getElementById('message').value.trim();
                    
                    if (!name || !email || !message) {
                        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
                        return;
                    }
                    
                    // 8.5.2: Email validation - การตรวจสอบอีเมล
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        alert('กรุณากรอกอีเมลให้ถูกต้อง');
                        return;
                    }
                    
                    // Save the message once through the same-origin API.
                    const data=Object.fromEntries(new FormData(contactForm));
                    if(!data.subject){alert('กรุณาเลือกเรื่องที่ติดต่อ');return;}
                    const next=JSON.stringify(data);if(fingerprint&&fingerprint!==next)requestId=crypto.randomUUID();fingerprint=next;
                    const button=contactForm.querySelector('[type="submit"]');sending=true;button.disabled=true;
                    try{await App.api('contact',{...data,requestId});alert('ขอบคุณสำหรับข้อความของคุณ! เราจะติดต่อกลับภายใน 2-3 วันทำการ');contactForm.reset();requestId=crypto.randomUUID();fingerprint='';}
                    catch(error){alert(error.message);}
                    finally{sending=false;button.disabled=false;}
                });
            }
});
