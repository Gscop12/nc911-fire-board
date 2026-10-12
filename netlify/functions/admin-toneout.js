const crypto = require('node:crypto');
const URL = 'https://mltufhymfuywjavvppjj.supabase.co';
const validDepartments = ['Deer','Ponca','Jasper','Parthenon','Compton','Hasty','Mt. Judea','Mt. Sherman','Lurton-Pelsor'];
const validTypes = ['medical','fire','rescue','training','cancellation','announcement','weather'];
const validChannels = ['shiloh','jasper_mountain','j_george'];
const reply = (statusCode, message) => ({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({message})});
exports.handler = async (event) => {
 if(event.httpMethod!=='POST')return reply(405,'POST required');
 if((event.body||'').length>6000)return reply(413,'Request too large');
 const configured=process.env.NC_FIRE_ADMIN_PASSWORD;
 const key=process.env.NC_FIRE_SUPABASE_SERVICE_ROLE_KEY;
 if(!configured||!key)return reply(503,'Administrator setup incomplete: hosting secrets not configured.');
 let input;
 try{input=JSON.parse(event.body||'{}')}catch{return reply(400,'Invalid request')}
 const supplied=String(input.password||'');
 const providedHash=crypto.createHash('sha256').update(supplied).digest();
 const expectedHash=crypto.createHash('sha256').update(configured).digest();
 if(!supplied||!crypto.timingSafeEqual(providedHash,expectedHash))return reply(401,'Incorrect administrator password');
 if(input.action==='verify')return reply(200,'Administrator password accepted');
 if(input.action!=='publish')return reply(400,'Invalid action');
 const r=input.record||{};
 if(!validDepartments.includes(r.department)||!validTypes.includes(r.incident_type)||!validChannels.includes(r.source_channel))return reply(400,'Invalid department, incident type, or channel');
 const description=String(r.public_description||'').trim();
 if(!description||description.length>1200)return reply(400,'Description must be 1–1200 characters');
 const parsedTime=new Date(r.occurred_at);
 if(!Number.isFinite(parsedTime.getTime())||Math.abs(Date.now()-parsedTime.getTime())>86400000)return reply(400,'Date must be within 24 hours of now');
 const payload={department_names:[r.department],incident_type:r.incident_type,source_channel:r.source_channel,occurred_at:parsedTime.toISOString(),public_description:'[TEST — NOT A REAL DISPATCH] '+description};
 try{
  const response=await fetch(URL+'/rest/v1/published_toneouts',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
  if(!response.ok){console.error('Toneout insert failed, HTTP',response.status);return reply(502,'Could not publish test toneout. Check hosting configuration and database permissions.')}
  return reply(200,'Test toneout published');
 }catch(e){console.error('Toneout publish error',e.name);return reply(502,'Database unavailable')}
};
