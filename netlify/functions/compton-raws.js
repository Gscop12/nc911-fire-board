const NESDIS = 'FA6507F6';
let cached = null;
let cacheTime = 0;
const pad = d => d.toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
exports.handler = async function(){
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120, s-maxage=300'};
 try {
  if(cached && Date.now()-cacheTime < 300000) return {statusCode:200,headers,body:JSON.stringify(cached)};
  const now=new Date(),start=new Date(now.getTime()-2*3600000);
  const url=`https://weather.nifc.gov/ords/prd/wx/station/data/${pad(start)}/${pad(new Date(now.getTime()+5*60000))}/0`;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  let response;
  try {response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});}finally{clearTimeout(timeout)}
  if(!response.ok)throw new Error('Upstream HTTP '+response.status);
  const json=await response.json();
  const data=Array.isArray(json)?json:Array.isArray(json.Data)?json.Data:[];
  const matches=data.filter(r=>String(r.Nesdisid||'').toUpperCase()===NESDIS);
  matches.sort((a,b)=>String(b.ObservationTime).localeCompare(String(a.ObservationTime)));
  if(!matches.length)throw new Error('No recent Compton station observation in NIFC response');
  cached=matches[0];cacheTime=Date.now();
  return {statusCode:200,headers,body:JSON.stringify(cached)};
 }catch(e){return {statusCode:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({error:e.message||'Weather feed unavailable'})};}
};
