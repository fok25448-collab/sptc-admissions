import {endpoint,rate,config,rest,fail} from '../server/core.js';
import {requireAdmin,sessionCookie} from '../server/admissions.js';
export default endpoint('POST',async(req,res)=>{
 const {action}=req.body;
 if(action==='logout'){res.setHeader('Set-Cookie',sessionCookie('',0));return {ok:true};}
 if(action==='session')return {admin:await requireAdmin(req)};
 if(action!=='login')fail(400,'คำขอไม่ถูกต้อง');
 await rate(req,'admin-login',8);
 const {email,password}=req.body;
 if(typeof email!=='string'||email.length>254||typeof password!=='string'||password.length>1024)fail(400,'กรุณากรอกอีเมลและรหัสผ่าน');
 const c=config();
 const result=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password}),signal:AbortSignal.timeout(15000)});
 if(!result.ok)fail(401,'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
 const session=await result.json();
 const admins=await rest('admin_users?user_id=eq.'+encodeURIComponent(session.user.id)+'&active=eq.true&select=user_id,display_name');
 if(!admins[0])fail(403,'บัญชีนี้ไม่มีสิทธิ์เจ้าหน้าที่');
 res.setHeader('Set-Cookie',sessionCookie(session.access_token,Math.min(session.expires_in||3600,3600)));
 return {admin:admins[0]};
});
