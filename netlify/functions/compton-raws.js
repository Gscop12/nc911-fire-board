// Compton RAWS (NESDIS FA6507F6) — NIFC public observation feed
const NESDIS = 'FA6507F6';
let cached = null;
let cacheTime = 0;
const pad = d => d.toISOString().replace(/[-:TZ.]/g, '').slice(0,14);
const headers = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'public, max-age=120, s-maxage=300' };
function respond(code, value) {
  return {statusCode:code,headers:code===200?headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(value)};
}
exports.handler = async function() {
  if (cached && Date.now()-cacheTime < 300000) return respond(200,cached);
  // One-hour window is sufficient for normally hourly RAWS observations.
  // Keep a second, wider window as a fallback if the station reports late.
  const now = Date.now(), windows=[75,180];
  let lastError='No Compton observation returned';
  for (const minutes of windows) {
    const start = new Date(now-minutes*60000);
    const end = new Date(now+5*60000);
    const url='https://weather.nifc.gov/ords/prd/wx/station/data/'+pad(start)+'/'+pad(end)+'/0';
    const controller = new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6500);
    try {
      const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'NewtonCountyFireBoard/1.0'}});
      if (!response.ok) {lastError='NIFC upstream HTTP '+response.status;continue;}
      const payload=await response.json();
      const data=Array.isArray(payload)?payload:Array.isArray(payload.Data)?payload.Data:[];
      const matches=data.filter(r=>String(r.Nesdisid||'').trim().toUpperCase()===NESDIS);
      matches.sort((a,b)=>Date.parse(b.ObservationTime||0)-Date.parse(a.ObservationTime||0));
      if (matches.length) {
        cached=matches[0];cacheTime=Date.now();
        return respond(200,cached);
      }
      lastError='NIFC returned '+data.length+' observations but none for Compton ('+NESDIS+') in the last '+minutes+' minutes';
    } catch(error) {
      lastError=error?.name==='AbortError'?'NIFC request timed out after 6.5 seconds':('NIFC request failed: '+(error?.message||String(error)));
    } finally {clearTimeout(timeout);}
  }
  return respond(503,{error:lastError,source:'NIFC',station:NESDIS,checkedWindowsMinutes:windows,checkedAt:new Date().toISOString()});
};
