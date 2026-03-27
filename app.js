// ══════════════════════════════════════════
// CORE
// ══════════════════════════════════════════
let GK=localStorage.getItem('groq_api_key')||'';
// ================= AI CORE FUNCTIONS =================

// Safe JSON parser
function pj(txt){
  try{ return JSON.parse(txt); }
  catch{
    try{
      const m = txt.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) : null;
    }catch{return null;}
  }
}

// GROQ API CALL
async function groq(system, user, maxTokens = 900) {
  const key = (localStorage.getItem('groq_key') || '').trim();

  if (!key) {
    throw new Error('No Groq API key found');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.4,
      max_tokens: maxTokens
    })
  });

  const raw = await res.text();
  console.log('GROQ RAW RESPONSE:', raw);

  if (!res.ok) {
    let msg = raw;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message || raw;
    } catch {}
    throw new Error(`Groq error ${res.status}: ${msg}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Groq returned invalid JSON');
  }

  const content = data?.choices?.[0]?.message?.content;

  if (content === null || content === undefined) {
    throw new Error('Groq returned null/undefined content');
  }

  const cleaned = String(content).trim();

  if (!cleaned) {
    throw new Error('Groq returned empty content');
  }

  return cleaned;
}

// ================= AI PREDICTIONS =================

async function genPred(topic){
  const sys = `You are a geopolitical analyst.
Return ONLY JSON:
{
 "title":string,
 "probability":number,
 "summary":string
}`;
  const txt = await groq(sys, topic);
  return pj(txt);
}

async function explainPred(topic){
  const sys = `Explain geopolitical prediction.
Return ONLY JSON:
{
 "drivers":[string,string],
 "risks":[string,string],
 "impact":string
}`;
  const txt = await groq(sys, topic);
  return pj(txt);
}

// ================= SCENARIO =================

async function runScenario(topic){
  const sys = `Generate scenario analysis.
Return ONLY JSON:
{
 "best":string,
 "worst":string,
 "most_likely":string
}`;
  const txt = await groq(sys, topic);
  const d = pj(txt);

  document.getElementById('scenario-output').innerHTML = `
    <div><b>BEST:</b> ${d?.best || '-'}</div>
    <div><b>WORST:</b> ${d?.worst || '-'}</div>
    <div><b>MOST LIKELY:</b> ${d?.most_likely || '-'}</div>
  `;
}

// ================= TIMELINE =================

async function genTimeline(topic){
  const sys = `Generate timeline.
Return ONLY JSON:
{
 "events":[string,string,string]
}`;
  const txt = await groq(sys, topic);
  const d = pj(txt);

  document.getElementById('timeline-output').innerHTML =
    (d?.events || []).map(e=>`<div>• ${e}</div>`).join('');
}

// ================= BIAS DETECTOR =================

async function analyzeBias(text){
  const sys = `Detect bias.
Return ONLY JSON:
{
 "bias":string,
 "score":number
}`;
  const txt = await groq(sys, text);
  const d = pj(txt);

  document.getElementById('bias-output').innerHTML = `
    <div>Bias: ${d?.bias || '-'}</div>
    <div>Score: ${d?.score || '-'}</div>
  `;
}

// ================= COUNTRY BRIEF =================

async function openBrief(code,name){
  const cm=document.getElementById('cm');
  const cc=document.getElementById('cm-content');
  cm.classList.add('open');
  cc.innerHTML='<div class="lb2"><div class="sp"></div>BUILDING LIVE COUNTRY BRIEF...</div>';

  const country=await fetchRestCountry(code, name);
  const arts=await fetchLiveArticles(`"${name}" OR ${name} geopolitics OR ${name} economy OR ${name} security`, 6);

  const flag=country?.flag || '🌐';
  const region=country?.region || '-';
  const capital=(country?.capital||[])[0] || '-';
  const population=country?.population ? Number(country.population).toLocaleString('en-US') : '-';
  const currencies=country?.currencies ? Object.values(country.currencies).map(x=>x.name).join(', ') : '-';
  const languages=country?.languages ? Object.values(country.languages).join(', ') : '-';

  let aiBlock='';
  if(GK){
    const prompt = JSON.stringify({
      country:name,
      facts:{region,capital,population,currencies,languages},
      headlines:arts.map(a=>a.title).slice(0,5)
    });
    const sys='Geopolitical analyst. Return ONLY valid JSON: {"summary":string,"economy":string,"security":string,"outlook":string}';
    const txt=await groq(sys,prompt,900);
    const d=pj(txt);
    if(d){
      aiBlock = `
        <div class="sec">AI SUMMARY</div>
        <div style="background:var(--panel);border:1px solid var(--border2);border-left:3px solid var(--accent);border-radius:3px;padding:12px;margin-bottom:10px;font-size:14px;line-height:1.65">${esc(d.summary||'-')}</div>
        <div class="g3" style="margin-bottom:10px">
          <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">ECONOMY</div><div style="font-size:14px;line-height:1.6">${esc(d.economy||'-')}</div></div>
          <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">SECURITY</div><div style="font-size:14px;line-height:1.6">${esc(d.security||'-')}</div></div>
          <div class="card ca"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">OUTLOOK</div><div style="font-size:14px;line-height:1.6">${esc(d.outlook||'-')}</div></div>
        </div>`;
    }
  }

  cc.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:36px">${flag}</div>
      <div>
        <div style="font-family:var(--fh);font-size:14px;color:var(--accent);letter-spacing:3px">${esc((name||code||'Country').toUpperCase())}</div>
        <div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-top:3px">LIVE COUNTRY BRIEF · ${new Date().toLocaleDateString()}</div>
      </div>
      <button onclick="document.getElementById('cm').classList.remove('open')" style="margin-left:auto;background:transparent;border:1px solid var(--border2);color:var(--subtle);padding:4px 9px;border-radius:2px;cursor:pointer;font-family:var(--fm)">CLOSE</button>
    </div>

    <div class="g3" style="margin-bottom:12px">
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">REGION</div><div style="font-size:15px;color:var(--text)">${esc(region)}</div></div>
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">CAPITAL</div><div style="font-size:15px;color:var(--text)">${esc(capital)}</div></div>
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">POPULATION</div><div style="font-size:15px;color:var(--text)">${esc(population)}</div></div>
      <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">CURRENCIES</div><div style="font-size:14px;color:var(--text)">${esc(currencies)}</div></div>
      <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">LANGUAGES</div><div style="font-size:14px;color:var(--text)">${esc(languages)}</div></div>
      <div class="card ca"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">LIVE HEADLINES</div><div style="font-size:15px;color:var(--text)">${arts.length}</div></div>
    </div>

    ${aiBlock}

    <div class="sec">LIVE HEADLINES</div>
    <div>
      ${arts.length ? arts.map(a=>`
        <a class="nc" href="${a.link}" target="_blank">
          <div style="font-family:var(--fm);font-size:13px;color:var(--accent);margin-bottom:3px">${esc(a.source)} · ${timeAgoLite(a.published)}</div>
          <div style="font-size:15px;color:var(--text);line-height:1.55">${esc(a.title)}</div>
        </a>
      `).join('') : '<div class="card">No live headlines found for this country right now.</div>'}
    </div>
  `;
}

async function loadRisk(){
  const rg=document.getElementById('rg');
  if(!rg) return;
  rg.innerHTML='<div class="lb2"><div class="sp"></div>COMPUTING LIVE RISK...</div>';

  const arts=await fetchLiveArticles('war OR conflict OR coup OR sanctions OR protest OR missile OR troop', 20);

  if(!arts.length){
    rg.innerHTML='<div class="lb2">LIVE RISK FEED UNAVAILABLE</div>';
    return;
  }

  const scoreMap={};
  for(const a of arts){
    const codes=a.countries.length ? a.countries : ['GLOBAL'];
    for(const code of codes){
      if(!scoreMap[code]) scoreMap[code]={code,score:0,headline:a.title};
      scoreMap[code].score += Math.max(8, Math.round(a.score/3));
      if(a.score > (scoreMap[code].top||0)){ scoreMap[code].top=a.score; scoreMap[code].headline=a.title; }
    }
  }

  const rows=Object.values(scoreMap)
    .filter(x=>x.code!=='GLOBAL')
    .map(x=>{
      x.score=Math.min(100,x.score);
      x.tag=riskTag(x.score);
      x.name=CN[x.code] || x.code;
      return x;
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,12);

  rg.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-family:var(--fm);font-size:11px;color:var(--muted)">LIVE RISK = headline-weighted geopolitical signal score</div>
      <div style="font-family:var(--fm);font-size:11px;color:var(--muted)">Updated ${now()}</div>
    </div>
    ${rows.map(r=>`
      <div class="rrow">
        <div style="min-width:112px">
          <div style="font-size:15px;color:var(--text);font-weight:700">${esc(r.name)}</div>
          <div class="tag ${r.tag.cls}" style="margin-top:3px">${r.tag.txt}</div>
        </div>
        <div style="flex:1">
          <div style="height:8px;background:var(--border2);border-radius:4px;overflow:hidden;margin-bottom:6px">
            <div style="height:100%;width:${r.score}%;background:${r.tag.col};border-radius:4px"></div>
          </div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.45">${esc(r.headline)}</div>
        </div>
        <div style="font-family:var(--fm);font-size:18px;color:${r.tag.col};min-width:48px;text-align:right">${r.score}</div>
      </div>
    `).join('')}
  `;
}

async function loadClimate(){
  const ind=document.getElementById('clim-indicators');
  const dis=document.getElementById('disasters-grid');
  const env=document.getElementById('env-risk-grid');
  const ctry=document.getElementById('clim-countries');
  if(!ind || !dis || !env || !ctry) return;

  ind.innerHTML='<div class="lb2" style="grid-column:1/-1"><div class="sp"></div>LOADING CLIMATE SIGNALS...</div>';
  dis.innerHTML='';
  env.innerHTML='';
  ctry.innerHTML='';

  const [eonet, quakes] = await Promise.all([fetchEONETOpen(), fetchUSGSQuakes()]);

  const wildfires=eonet.filter(e=>(e.categories||[]).some(c=>/wildfires/i.test(c.title))).length;
  const storms=eonet.filter(e=>(e.categories||[]).some(c=>/severe storms/i.test(c.title))).length;
  const volcanoes=eonet.filter(e=>(e.categories||[]).some(c=>/volcanoes/i.test(c.title))).length;
  const quakeCount=quakes.length;

  ind.innerHTML = [
    ['Open EONET Events', eonet.length, '🌍'],
    ['Wildfires', wildfires, '🔥'],
    ['Storm Systems', storms, '🌪'],
    ['Significant Quakes', quakeCount, '🫨']
  ].map(([label,val,icon])=>`
    <div class="clim-card fi">
      <div class="clim-icon">${icon}</div>
      <div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">${esc(label)}</div>
      <div style="font-size:22px;font-weight:700;color:var(--text)">${val}</div>
    </div>
  `).join('');

  const disasterRows = [
    ...eonet.slice(0,6).map(e=>({
      title:e.title,
      sub:(e.categories||[]).map(x=>x.title).join(', '),
      when:e.geometry?.[0]?.date || '',
      sev:'monitor'
    })),
    ...quakes.slice(0,4).map(q=>({
      title:q.properties?.title || 'Earthquake',
      sub:`Magnitude ${q.properties?.mag ?? '-'}`,
      when:q.properties?.time ? new Date(q.properties.time).toISOString() : '',
      sev:(q.properties?.mag||0)>=6 ? 'high' : 'watch'
    }))
  ].slice(0,8);

  dis.innerHTML = disasterRows.map(d=>`
    <div class="card cc dis-row">
      <div style="flex:1">
        <div style="font-size:15px;color:var(--text);font-weight:600;margin-bottom:4px">${esc(d.title)}</div>
        <div style="font-size:13px;color:var(--subtle);margin-bottom:4px">${esc(d.sub)}</div>
        <div style="font-family:var(--fm);font-size:12px;color:var(--muted)">${timeAgoLite(d.when)} · ${shortDate(d.when)}</div>
      </div>
      <div class="tag ${d.sev==='high'?'o':'a'}">${d.sev.toUpperCase()}</div>
    </div>
  `).join('');

  env.innerHTML = [
    ['Middle East', 'Heat stress · water risk · dust events', 'HIGH'],
    ['South Asia', 'Flood / heatwave overlap', 'HIGH'],
    ['Mediterranean', 'Drought / wildfire pressure', 'WATCH'],
    ['Pacific Ring', 'Seismic / volcanic exposure', 'WATCH']
  ].map(([r,desc,tag])=>`
    <div class="card ca">
      <div style="font-family:var(--fh);font-size:14px;color:var(--accent);margin-bottom:5px">${esc(r)}</div>
      <div style="font-size:14px;color:var(--subtle);line-height:1.55;margin-bottom:7px">${esc(desc)}</div>
      <span class="tag ${tag==='HIGH'?'o':'a'}">${tag}</span>
    </div>
  `).join('');

  ctry.innerHTML = ['India','USA','Brazil','Indonesia','Japan','Philippines'].map(c=>`
    <div class="card cc" style="margin-bottom:8px">
      <div style="font-size:15px;color:var(--text);font-weight:700">${c}</div>
      <div style="font-size:13px;color:var(--subtle);margin-top:4px">Climate watch compiled from current global hazard signals.</div>
    </div>
  `).join('');
}

// ================= MY FEED =================

async function loadFeed(){
  renderFeedChips();

  const res=document.getElementById('feed-results');
  const curator=document.getElementById('feed-curator');
  if(!res || !curator) return;

  res.innerHTML='<div class="lb2"><div class="sp"></div>CURATING LIVE FEED...</div>';
  curator.style.display='none';

  const query = (feedTopics && feedTopics.length)
    ? feedTopics.slice(0,4).join(' OR ')
    : 'geopolitics OR war OR diplomacy OR energy';

  const arts=await fetchLiveArticles(query, 12);

  if(!arts.length){
    res.innerHTML='<div class="lb2">NO LIVE FEED ITEMS FOUND</div>';
    return;
  }

  if(GK){
    const sys='Intelligence curator. Return ONLY valid JSON: {"note":string}';
    const txt=await groq(sys, arts.slice(0,6).map(a=>a.title).join('\n'), 300);
    const d=pj(txt);
    if(d?.note){
      curator.style.display='block';
      curator.textContent=d.note;
    }
  }

  res.innerHTML = arts.map(a=>`
    <a class="feed-card fi" href="${a.link}" target="_blank">
      <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:5px">
        <div style="font-size:15px;color:var(--text);font-weight:700;line-height:1.45">${esc(a.title)}</div>
        <span class="tag c">${esc(a.source)}</span>
      </div>
      <div style="font-size:13px;color:var(--subtle);line-height:1.55;margin-bottom:6px">${esc(a.summary || 'Live geopolitical signal from current reporting.')}</div>
      <div style="font-family:var(--fm);font-size:12px;color:var(--muted)">${timeAgoLite(a.published)} · ${shortDate(a.published)}</div>
    </a>
  `).join('');
}
function saveKey(){const k=document.getElementById('ak-in').value.trim();if(!k.startsWith('gsk_')){document.getElementById('ak-err').textContent='Key must start with gsk_';return;}GK=k;localStorage.setItem('groq_key',k);document.getElementById('api-modal').classList.remove('open');}

function showToast(msg){
  let t=document.getElementById('goe-toast');
  if(!t){t=document.createElement('div');t.id='goe-toast';
    t.style.cssText='position:fixed;top:60px;right:16px;background:#1e293b;border:1px solid #ef4444;color:#fca5a5;font-size:14px;padding:10px 14px;border-radius:6px;z-index:9999;max-width:360px;line-height:1.5;box-shadow:0 4px 20px rgba(0,0,0,.5)';
    document.body.appendChild(t);}
  t.textContent=msg;t.style.display='block';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.display='none';},7000);
}
function pj(t){if(!t)return null;try{return JSON.parse(t);}catch{}const m=t.match(/[\[\{][\s\S]*[\]\}]/);if(m)try{return JSON.parse(m[0]);}catch{}return null;}
function now(){return new Date().toLocaleTimeString();}
// ══════════════════════════════════════════
// LIVE INTELLIGENCE HELPERS
// ══════════════════════════════════════════
const LIVE_ALIAS = {
  'united states':'USA','usa':'USA','u.s.':'USA','america':'USA',
  'united kingdom':'GBR','uk':'GBR','britain':'GBR',
  'russia':'RUS','ukraine':'UKR','china':'CHN','india':'IND','pakistan':'PAK',
  'iran':'IRN','israel':'ISR','palestine':'PSE','gaza':'PSE',
  'taiwan':'TWN','japan':'JPN','north korea':'PRK','south korea':'KOR',
  'turkey':'TUR','syria':'SYR','iraq':'IRQ','yemen':'YEM','sudan':'SDN',
  'ethiopia':'ETH','somalia':'SOM','lebanon':'LBN','afghanistan':'AFG',
  'germany':'DEU','france':'FRA','italy':'ITA','spain':'ESP','poland':'POL',
  'saudi arabia':'SAU','uae':'ARE','qatar':'QAT','egypt':'EGY',
  'mexico':'MEX','brazil':'BRA','venezuela':'VEN','colombia':'COL',
  'nigeria':'NGA','kenya':'KEN','myanmar':'MMR','belarus':'BLR'
};

function esc(s=''){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}
function shortDate(d){
  try{return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}
  catch{return d || '';}
}
function timeAgoLite(dateStr){
  const diff=(Date.now()-new Date(dateStr).getTime())/1000;
  if(!Number.isFinite(diff)) return '';
  if(diff<60) return `${Math.floor(diff)}s ago`;
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
function riskScoreFromText(text=''){
  const t=text.toLowerCase();
  let s=8;
  if(/war|invasion|missile|airstrike|bomb|attack|nuclear/.test(t)) s+=35;
  if(/sanction|troops|military|drone|ceasefire|frontline/.test(t)) s+=18;
  if(/protest|riot|coup|election|crisis|collapse/.test(t)) s+=12;
  if(/flood|wildfire|earthquake|cyclone|storm|drought/.test(t)) s+=10;
  return Math.min(100, s);
}
function riskTag(score){
  if(score>=80) return {txt:'CRITICAL', cls:'r', col:'#ef4444'};
  if(score>=60) return {txt:'HIGH', cls:'o', col:'#f97316'};
  if(score>=40) return {txt:'WATCH', cls:'a', col:'var(--accent4)'};
  return {txt:'MONITOR', cls:'g', col:'var(--accent3)'};
}
function detectCountryCodes(text=''){
  const t=text.toLowerCase();
  const hits=new Set();
  for(const [name,code] of Object.entries(LIVE_ALIAS)){
    if(t.includes(name)) hits.add(code);
  }
  return [...hits];
}

async function fetchGuardianLive(query='war OR conflict OR diplomacy OR sanctions', limit=12){
  const url=`https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&show-fields=headline,thumbnail,trailText&order-by=newest&page-size=${limit}&api-key=test`;
  const r=await fetch(url);
  const d=await r.json();
  if(d.response?.status!=='ok') throw new Error('Guardian failed');
  const results=d.response?.results||[];
  return results.map(a=>({
    title:a.fields?.headline||a.webTitle||'Untitled',
    summary:a.fields?.trailText||'',
    link:a.webUrl||'#',
    source:'The Guardian',
    published:a.webPublicationDate||new Date().toISOString(),
    image:a.fields?.thumbnail||'',
    countries:detectCountryCodes((a.fields?.headline||a.webTitle||'')+' '+(a.fields?.trailText||'')),
    score:riskScoreFromText((a.fields?.headline||a.webTitle||'')+' '+(a.fields?.trailText||''))
  }));
}

async function fetchHNLive(limit=12){
  const ids=await fetch('https://hacker-news.firebaseio.com/v0/newstories.json').then(r=>r.json());
  const top=ids.slice(0,60);
  const items=await Promise.all(top.map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json()).catch(()=>null)));
  const geo=/war|conflict|russia|ukraine|china|iran|israel|nato|nuclear|taiwan|gaza|coup|missile|sanction|troops|military/i;
  return items
    .filter(x=>x && x.title && x.url && geo.test(x.title))
    .slice(0,limit)
    .map(x=>({
      title:x.title,
      summary:'',
      link:x.url,
      source:'HN',
      published:new Date((x.time||0)*1000).toISOString(),
      image:'',
      countries:detectCountryCodes(x.title),
      score:riskScoreFromText(x.title)
    }));
}

async function fetchLiveArticles(query='war OR conflict OR diplomacy OR sanctions', limit=12){
  try{
    const a=await fetchGuardianLive(query, limit);
    if(a.length) return a;
  }catch{}
  try{
    const b=await fetchHNLive(limit);
    if(b.length) return b;
  }catch{}
  return [];
}

async function fetchRestCountry(codeOrName,nameFallback=''){
  const tryUrls = [];
  if(codeOrName && codeOrName.length===3){
    tryUrls.push(`https://restcountries.com/v3.1/alpha/${encodeURIComponent(codeOrName)}`);
  }
  if(nameFallback){
    tryUrls.push(`https://restcountries.com/v3.1/name/${encodeURIComponent(nameFallback)}?fullText=true`);
    tryUrls.push(`https://restcountries.com/v3.1/name/${encodeURIComponent(nameFallback)}`);
  }
  if(codeOrName && codeOrName.length!==3){
    tryUrls.push(`https://restcountries.com/v3.1/name/${encodeURIComponent(codeOrName)}?fullText=true`);
    tryUrls.push(`https://restcountries.com/v3.1/name/${encodeURIComponent(codeOrName)}`);
  }

  for(const u of tryUrls){
    try{
      const r=await fetch(u);
      if(!r.ok) continue;
      const d=await r.json();
      const c=Array.isArray(d)?d[0]:d;
      if(c) return c;
    }catch{}
  }
  return null;
}

async function fetchEONETOpen(){
  try{
    const r=await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30');
    const d=await r.json();
    return d.events || [];
  }catch{return [];}
}

async function fetchUSGSQuakes(){
  try{
    const r=await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson');
    const d=await r.json();
    return d.features || [];
  }catch{return [];}
}
// ================= LIVE INTELLIGENCE ENGINE =================

async function getLiveNews(query="geopolitics"){
  try{
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(query)}&order-by=newest&page-size=10&api-key=test`;
    const r = await fetch(url);
    const d = await r.json();

    return (d.response?.results || []).map(x=>({
      title:x.webTitle,
      url:x.webUrl,
      time:x.webPublicationDate,
      source:"Guardian"
    }));
  }catch{
    return [];
  }
}

function calcRisk(text){
  let s = 10;
  const t = text.toLowerCase();

  if(/war|missile|nuclear|attack/.test(t)) s+=40;
  if(/military|troops|sanctions/.test(t)) s+=20;
  if(/protest|crisis|conflict/.test(t)) s+=15;

  return Math.min(100,s);
}

function formatTime(t){
  return new Date(t).toLocaleString();
}
function setTheme(t,btn){document.body.className=t?'theme-'+t:'';document.querySelectorAll('.thm-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
function show(id,btn){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.nt').forEach(t=>t.classList.remove('active'));document.getElementById('panel-'+id).classList.add('active');if(btn)btn.classList.add('active');if(id==='kg')initKG();if(id==='map')initMap();if(id==='feed')loadFeed();}
document.getElementById('api-modal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
document.getElementById('cm').addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});

// ══════════════════════════════════════════
// MAP
// ══════════════════════════════════════════
const CR={PSE:95,SYR:94,YEM:91,SDN:89,UKR:88,AFG:83,MMR:85,HTI:82,SOM:80,CAF:75,IRQ:68,ETH:74,LBN:72,IRN:61,PRK:58,NGA:58,RUS:60,LBY:70,MLI:65,COD:72,VEN:55,TWN:55,PAK:52,TUR:44,MEX:40,DZA:40,EGY:45,AZE:40,GEO:45,ARM:42,BGR:18,ROU:20,HUN:20,POL:16,GRC:22,THA:35,PHL:40,IDN:32,MYS:20,VNM:25,KOR:20,IND:30,CHN:42,JPN:12,AUS:10,NZL:8,CAN:11,USA:18,BRA:32,COL:42,PER:33,CHL:18,ARG:35,BOL:35,ECU:38,URY:10,ZAF:35,KEN:38,GHA:22,SEN:25,CMR:42,MOZ:38,DEU:12,FRA:14,GBR:15,ITA:18,ESP:15,PRT:12,NLD:10,BEL:12,CHE:8,AUT:10,SWE:9,NOR:8,DNK:9,FIN:10,IRL:10,HRV:15,CZE:12,SVK:14,EST:14,LVA:15,LTU:16,CYP:30,SAU:38,ARE:20,QAT:20,JOR:35,ISR:62,MAR:40,TUN:35,KAZ:30,UZB:32,TJK:40,KGZ:35,MNG:20,BGD:42,NPL:35,LKA:40,SGP:12,GTM:45,NER:60,BLR:45,MDA:38,SRB:28};
function rc(c){const r=CR[c]||12;if(r>=80)return'#ef4444';if(r>=60)return'#f97316';if(r>=40)return'#eab308';if(r>=20)return'#22c55e';return'#2563eb';}
function rl(c){const r=CR[c]||12;if(r>=80)return'CRITICAL';if(r>=60)return'HIGH RISK';if(r>=40)return'ELEVATED';if(r>=20)return'STABLE';return'MONITORING';}
const N2A={4:'AFG',8:'ALB',12:'DZA',24:'AGO',32:'ARG',36:'AUS',40:'AUT',50:'BGD',56:'BEL',68:'BOL',76:'BRA',100:'BGR',116:'KHM',120:'CMR',124:'CAN',140:'CAF',144:'LKA',152:'CHL',156:'CHN',170:'COL',180:'COD',188:'CRI',191:'HRV',192:'CUB',196:'CYP',203:'CZE',208:'DNK',218:'ECU',818:'EGY',231:'ETH',246:'FIN',250:'FRA',276:'DEU',288:'GHA',300:'GRC',320:'GTM',332:'HTI',340:'HND',348:'HUN',356:'IND',360:'IDN',364:'IRN',368:'IRQ',372:'IRL',376:'ISR',380:'ITA',392:'JPN',400:'JOR',398:'KAZ',404:'KEN',408:'PRK',410:'KOR',414:'KWT',417:'KGZ',422:'LBN',434:'LBY',484:'MEX',496:'MNG',504:'MAR',508:'MOZ',524:'NPL',528:'NLD',554:'NZL',562:'NER',566:'NGA',578:'NOR',586:'PAK',604:'PER',608:'PHL',616:'POL',620:'PRT',634:'QAT',642:'ROU',643:'RUS',682:'SAU',686:'SEN',706:'SOM',710:'ZAF',724:'ESP',729:'SDN',752:'SWE',756:'CHE',760:'SYR',762:'TJK',764:'THA',788:'TUN',792:'TUR',800:'UGA',804:'UKR',784:'ARE',826:'GBR',840:'USA',858:'URY',860:'UZB',862:'VEN',704:'VNM',887:'YEM',894:'ZMB',716:'ZWE',703:'SVK',233:'EST',428:'LVA',440:'LTU',498:'MDA',688:'SRB',275:'PSE',104:'MMR',112:'BLR',31:'AZE',268:'GEO',51:'ARM',646:'RWA'};
const CN={AFG:'Afghanistan',ALB:'Albania',DZA:'Algeria',AGO:'Angola',ARG:'Argentina',AUS:'Australia',AUT:'Austria',BGD:'Bangladesh',BEL:'Belgium',BRA:'Brazil',BGR:'Bulgaria',CAN:'Canada',CAF:'C.A.R.',CHL:'Chile',CHN:'China',COL:'Colombia',COD:'D.R.Congo',HRV:'Croatia',CUB:'Cuba',CZE:'Czechia',DNK:'Denmark',ECU:'Ecuador',EGY:'Egypt',ETH:'Ethiopia',FIN:'Finland',FRA:'France',DEU:'Germany',GHA:'Ghana',GRC:'Greece',HTI:'Haiti',HND:'Honduras',HUN:'Hungary',IND:'India',IDN:'Indonesia',IRN:'Iran',IRQ:'Iraq',IRL:'Ireland',ISR:'Israel',ITA:'Italy',JPN:'Japan',JOR:'Jordan',KAZ:'Kazakhstan',KEN:'Kenya',PRK:'N.Korea',KOR:'S.Korea',KWT:'Kuwait',KGZ:'Kyrgyzstan',LBN:'Lebanon',LBY:'Libya',MEX:'Mexico',MNG:'Mongolia',MAR:'Morocco',MOZ:'Mozambique',NPL:'Nepal',NLD:'Netherlands',NZL:'N.Zealand',NGA:'Nigeria',NOR:'Norway',PAK:'Pakistan',PNG:'Papua NG',PER:'Peru',PHL:'Philippines',POL:'Poland',PRT:'Portugal',QAT:'Qatar',ROU:'Romania',RUS:'Russia',SAU:'S.Arabia',SEN:'Senegal',SOM:'Somalia',ZAF:'S.Africa',ESP:'Spain',SDN:'Sudan',SWE:'Sweden',CHE:'Switzerland',SYR:'Syria',TJK:'Tajikistan',THA:'Thailand',TUN:'Tunisia',TUR:'Turkey',UGA:'Uganda',UKR:'Ukraine',ARE:'UAE',GBR:'UK',USA:'USA',URY:'Uruguay',UZB:'Uzbekistan',VEN:'Venezuela',VNM:'Vietnam',YEM:'Yemen',ZMB:'Zambia',ZWE:'Zimbabwe',MMR:'Myanmar',LKA:'SriLanka',PSE:'Palestine',SRB:'Serbia',MDA:'Moldova',BLR:'Belarus',AZE:'Azerbaijan',GEO:'Georgia',ARM:'Armenia',MYS:'Malaysia',SGP:'Singapore',BOL:'Bolivia',MLI:'Mali',NIC:'Nicaragua',LBR:'Liberia',CMR:'Cameroon',NER:'Niger',SLE:'SierraLeone',TWN:'Taiwan',SVK:'Slovakia',EST:'Estonia',LVA:'Latvia',LTU:'Lithuania',CYP:'Cyprus',ISL:'Iceland',GTM:'Guatemala',CRI:'CostaRica'};
let mZb,mG;
function initMap(){
  const wrap=document.getElementById('map-wrap');
  const svg=d3.select('#world-svg');
  if(svg.selectAll('g').size()>0)return;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const proj=d3.geoNaturalEarth1().scale(W/6.3).translate([W/2,H/2]);
  const path=d3.geoPath().projection(proj);
  mG=svg.append('g');
  mZb=d3.zoom().scaleExtent([0.4,10]).on('zoom',e=>mG.attr('transform',e.transform));
  svg.call(mZb);
  mG.append('rect').attr('width',W).attr('height',H).attr('fill','#060400').attr('opacity',0.9);
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(r=>r.json()).then(world=>{
    const ctrs=topojson.feature(world,world.objects.countries);
    mG.append('path').datum(d3.geoGraticule()()).attr('d',path).attr('stroke','rgba(255,170,0,.04)').attr('stroke-width',0.5).attr('fill','none');
    mG.selectAll('.ctr').data(ctrs.features).enter().append('path').attr('class','ctr').attr('d',path)
      .attr('fill',d=>{const a=N2A[+d.id]||'';return rc(a);}).attr('stroke','#111').attr('stroke-width',0.4).attr('opacity',0.92)
      .on('mouseover',function(ev,d){const a=N2A[+d.id]||'',r=CR[a]||12,nm=CN[a]||(a?a:'Unknown Region');d3.select(this).attr('opacity',1).attr('stroke','#ffaa00').attr('stroke-width',1.2);const tt=document.getElementById('mtt');tt.style.display='block';tt.innerHTML=`<div style="color:var(--accent);margin-bottom:2px;letter-spacing:2px">${nm}</div><div>Risk: <b style="color:${rc(a)}">${r}/100</b></div><div style="color:var(--subtle);font-size:14px;margin-top:1px">${rl(a)}</div><div style="font-size:14px;color:var(--muted);margin-top:2px">Click to explore country</div>`;tt.style.left=(ev.clientX+12)+'px';tt.style.top=(ev.clientY-18)+'px';})
      .on('mousemove',function(ev){const tt=document.getElementById('mtt');tt.style.left=(ev.clientX+12)+'px';tt.style.top=(ev.clientY-18)+'px';})
      .on('mouseout',function(){d3.select(this).attr('opacity',0.92).attr('stroke','#111').attr('stroke-width',0.4);document.getElementById('mtt').style.display='none';})
      .on('click',function(ev,d){const a=N2A[+d.id]||'',nm=CN[a]||(a?a:null);if(nm||a){zoomToCountry(d,a||'',nm||a,path,proj);}});
    // Add country name labels for larger countries
    mG.selectAll('.clabel').data(ctrs.features).enter().append('text').attr('class','clabel')
      .attr('transform',d=>{try{const c=path.centroid(d);return`translate(${c})`;}catch{return'translate(-9999,-9999)';}})
      .attr('text-anchor','middle').attr('font-size','10px').attr('font-family','Share Tech Mono,monospace')
      .attr('fill','rgba(255,255,255,0.55)').attr('pointer-events','none')
      .text(d=>{const a=N2A[+d.id]||'';const nm=CN[a]||'';
        // Only label countries with risk data and short names
        if(!a||!CR[a])return'';const bb=path.bounds(d);const w=Math.abs(bb[1][0]-bb[0][0]);return w>30?nm:'';});
  });
}

// ══ COUNTRY DRILL-DOWN ══
let countryViewActive=false;
const COUNTRY_NEWS={
  USA:{states:[{name:'Texas',news:'Border security crisis; Abbott declares emergency'},{name:'California',news:'Tech layoffs; wildfire season begins early'},{name:'New York',news:'Financial markets volatile; housing affordability crisis'},{name:'Florida',news:'Hurricane season prep; political tensions rise'},{name:'Washington DC',news:'Congressional deadlock on budget; defence bill stalled'}]},
  IND:{states:[{name:'Jammu & Kashmir',news:'Infiltration attempts thwarted at LoC; security heightened'},{name:'Manipur',news:'Ethnic violence continues; curfew in parts of Imphal'},{name:'Maharashtra',news:'Economic powerhouse; industrial output up 6%'},{name:'Punjab',news:'Agricultural protests; stubble burning season'},{name:'Rajasthan',news:'Border infrastructure boost near Pakistan border'}]},
  CHN:{states:[{name:'Xinjiang',news:'Ongoing crackdown; surveillance infrastructure expanded'},{name:'Tibet',news:'Access restricted; protests reported near Lhasa'},{name:'Guangdong',news:'Manufacturing hub; exports up despite tariffs'},{name:'Shanghai',news:'Financial centre; FTZ expansion in progress'},{name:'Taiwan Strait Coast',news:'Military exercises conducted; tensions high'}]},
  RUS:{states:[{name:'Moscow Oblast',news:'War economy in full swing; mobilisation continues'},{name:'Kursk Oblast',news:'Active conflict zone; North Korean troops deployed'},{name:'Kaliningrad',news:'NATO encirclement concerns; military buildup'},{name:'Siberia',news:'Resource extraction boom; pipeline deal with China'},{name:'Chechnya',news:'Kadyrov forces active in Ukraine theatre'}]},
  BRA:{states:[{name:'Amazônia',news:'Deforestation at 5-year high; climate pressure mounts'},{name:'São Paulo',news:'Economic capital; inflation easing slowly'},{name:'Rio de Janeiro',news:'Crime rates spike; security crackdown announced'},{name:'Mato Grosso',news:'Agribusiness boom; soy exports record high'},{name:'Pará',news:'Indigenous land disputes; illegal mining crackdown'}]},
  UKR:{states:[{name:'Donetsk',news:'Active frontline; Russian forces advance near Avdiivka'},{name:'Zaporizhzhia',news:'Counter-offensive recaptures three villages'},{name:'Kherson',news:'Cross-river shelling continues; dam infrastructure at risk'},{name:'Kharkiv',news:'Missile strike kills 14; evacuation zones expanded'},{name:'Kyiv',news:'Capital under drone threat; air defence active'}]},
  IRN:{states:[{name:'Khuzestan',news:'Oil province; protests over water shortages'},{name:'Tehran',news:'Economic protests; government cracks down on dissent'},{name:'Hormozgan',news:'Strait of Hormuz military exercises conducted'},{name:'Isfahan',news:'Nuclear facility at Fordow; enrichment at 84%'},{name:'Kurdistan',news:'Cross-border PKK operations; Turkish airstrikes'}]},
  ISR:{states:[{name:'Gaza Envelope',news:'Constant rocket alert; kibbutzim rebuilding'},{name:'West Bank',news:'Settler violence; IDF raids in Jenin'},{name:'Haifa',news:'Port targeted by Houthi missiles; Iron Dome active'},{name:'Tel Aviv',news:'Protests demanding hostage deal; PM under pressure'},{name:'Eilat',news:'Port struck by Houthi ballistic missile; intercepted'}]},
  PAK:{states:[{name:'KPK',news:'TTP attacks intensify; military operations in North Waziristan'},{name:'Balochistan',news:'BLA separatist attacks; China CPEC workers targeted'},{name:'Punjab',news:'Flood damage recovery; economic strain'},{name:'Sindh',news:'Political tensions; MQM vs PPP standoff'},{name:'Gilgit-Baltistan',news:'China border infrastructure; Karakoram Highway expanded'}]},
  DEU:{states:[{name:'Berlin',news:'Scholz loses confidence vote; snap elections imminent'},{name:'Bavaria',news:'CSU leads polls; AfD surge in eastern suburbs'},{name:'North Rhine-Westphalia',news:'Industrial heartland; steel plant closures'},{name:'Hamburg',news:'Port traffic down; trade war impact visible'},{name:'Saxony',news:'AfD stronghold; migration debate dominates'}]},
};
function getCountryNews(iso){return COUNTRY_NEWS[iso]||{states:[{name:'Northern Region',news:'Intelligence signals being monitored'},{name:'Capital District',news:'Political situation under observation'},{name:'Border Areas',news:'Regional security assessment ongoing'},{name:'Economic Zones',news:'Trade and investment activity tracked'}]};}

function zoomToCountry(feature,iso,name,pathFn,projFn){
  countryViewActive=true;
  _cdpIso=iso;_cdpName=name;
  document.getElementById('mtt').style.display='none';
  // Show country detail panel
  const panel=document.getElementById('country-detail-panel');
  panel.style.display='flex';
  document.getElementById('cdp-name').textContent=name;
  document.getElementById('cdp-iso').textContent=iso;
  const r=CR[iso]||12;
  document.getElementById('cdp-risk').textContent=r+'/100';
  document.getElementById('cdp-risk').style.color=rc(iso);
  document.getElementById('cdp-level').textContent=rl(iso);
  // Render states
  const newsData=getCountryNews(iso);
  const sg=document.getElementById('cdp-states');
  sg.innerHTML=newsData.states.map(s=>`
    <div style="background:var(--panel2);border:1px solid var(--border2);border-radius:3px;padding:10px;margin-bottom:7px">
      <div style="font-family:var(--fm);font-size:14px;color:var(--accent);letter-spacing:2px;margin-bottom:4px">📍 ${s.name.toUpperCase()}</div>
      <div style="font-size:14px;color:var(--text);line-height:1.5">${s.news}</div>
    </div>`).join('');
  // Zoom map to country
  const wrap=document.getElementById('map-wrap');
  const W=wrap.clientWidth,H=wrap.clientHeight;
  const [[x0,y0],[x1,y1]]=pathFn.bounds(feature);
  const dx=x1-x0,dy=y1-y0;
  const padFactor=0.75;
  const scale=Math.min(8,padFactor/Math.max(dx/W,dy/H));
  const tx=W/2-(x0+x1)/2*scale;
  const ty=H/2-(y0+y1)/2*scale;
  d3.select('#world-svg').transition().duration(800).call(mZb.transform,d3.zoomIdentity.translate(tx,ty).scale(scale));
}
function closeCountryView(){
  countryViewActive=false;
  document.getElementById('country-detail-panel').style.display='none';
  mr();
}

function mz(f){d3.select('#world-svg').transition().duration(280).call(mZb.scaleBy,f);}
function mr(){d3.select('#world-svg').transition().duration(450).call(mZb.transform,d3.zoomIdentity);}
// Category-specific risk overrides for map coloring
const MAP_FILTERS={
  all:null,
  conflict:{PSE:98,SYR:96,YEM:93,SDN:91,UKR:90,AFG:87,MMR:88,HTI:84,SOM:82,CAF:78,IRQ:72,ETH:76,LBN:74,IRN:65,RUS:63,LBY:72,NGA:60,COD:74,ISR:68,PAK:55,MLI:68,NER:63},
  economic:{USA:35,CHN:60,RUS:78,DEU:42,GBR:40,JPN:28,FRA:38,ITA:45,BRA:50,ARG:70,VEN:88,TUR:75,IRN:85,PRK:80,NGA:65,EGY:58,ZAF:55,PAK:72,IDN:32,IND:30,KOR:20,AUS:18,CAN:22,SGP:10,SAU:40},
  climate:{BGD:95,NLD:78,PAK:88,IND:72,AUS:68,BRA:70,IDN:75,PHL:78,VNM:72,THA:65,CHN:60,USA:45,RUS:42,CAN:30,DEU:28,GBR:30,FRA:32,SOM:82,KEN:70,ETH:75,SDN:80,NGA:68,ZAF:55,EGY:60,MAR:52},
  political:{RUS:85,CHN:80,PRK:95,IRN:88,BLR:75,SYR:90,VEN:78,CUB:70,NGA:65,PAK:62,THA:48,TUR:58,HUN:42,BGR:35,SRB:38,UKR:88,ISR:70,IND:35,USA:30,BRA:45,ARG:55,MEX:52,COL:48}
};
let currentMapFilter='all';
function mf(f,b){
  document.querySelectorAll('#panel-map .fbar .fp').forEach(p=>p.classList.remove('active'));
  b.classList.add('active');
  currentMapFilter=f;
  const overrides=MAP_FILTERS[f];
  d3.selectAll('.ctr').attr('fill',function(d){
    const a=N2A[+d.id]||'';
    if(!overrides) return rc(a);
    const r=overrides[a]!==undefined?overrides[a]:(CR[a]||12);
    if(r>=80)return'#ef4444';if(r>=60)return'#f97316';if(r>=40)return'#eab308';if(r>=20)return'#22c55e';return'#2563eb';
  });
  // Update legend label
  const labels={all:'RISK LEVEL',conflict:'CONFLICT INTENSITY',economic:'ECONOMIC RISK',climate:'CLIMATE VULNERABILITY',political:'POLITICAL INSTABILITY'};
  const leg=document.querySelector('.mleg div:first-child');
  if(leg) leg.textContent=labels[f]||'RISK LEVEL';
}

let _cdpIso='',_cdpName='';
function openBriefFromMap(){if(_cdpIso&&_cdpName)openBrief(_cdpIso,_cdpName);}

// ── 3D GLOBE ──
let is3D=false,globe3D=null;
function toggle3D(){
  is3D=!is3D;
  const btn=document.getElementById('btn-3d');
  const svgEl=document.getElementById('world-svg');
  const wrap=document.getElementById('globe-canvas-wrap');
  if(is3D){
    btn.style.background='rgba(255,170,0,.15)';
    svgEl.style.display='none';
    wrap.style.display='block';
    init3DGlobe(wrap);
  } else {
    btn.style.background='transparent';
    svgEl.style.display='';
    wrap.style.display='none';
    if(globe3D&&globe3D._animId){cancelAnimationFrame(globe3D._animId);globe3D=null;}
  }
}
function init3DGlobe(container){
  if(globe3D&&globe3D._animId){cancelAnimationFrame(globe3D._animId);globe3D=null;}
  container.innerHTML='';
  // Use device pixel ratio for sharp rendering
  const W=container.clientWidth||900, H=container.clientHeight||600;
  const DPR=Math.min(window.devicePixelRatio||1,2);
  const canvas=document.createElement('canvas');
  canvas.width=W*DPR; canvas.height=H*DPR;
  canvas.style.cssText=`width:${W}px;height:${H}px;cursor:grab;display:block`;
  container.appendChild(canvas);
  const ctx=canvas.getContext('2d');
  ctx.scale(DPR,DPR);

  const R=Math.min(W,H)*0.44;
  const cx=W/2, cy=H/2;
  const proj=d3.geoOrthographic().scale(R).translate([cx,cy]).clipAngle(90).precision(0.3);
  const path=d3.geoPath().projection(proj).context(ctx);
  const graticule=d3.geoGraticule().step([15,15])();

  let rot=[10,-20,0], drag=null, spinning=true, spinSpeed=0.12;
  let worldData=null, labelsData=[];
  let hoveredISO='', animRunning=false;

  // ── DRAW ONE FRAME ──
  function draw(){
    ctx.clearRect(0,0,W,H);

    // 1. Atmosphere glow (outer ring)
    const atm=ctx.createRadialGradient(cx,cy,R*0.92,cx,cy,R*1.18);
    atm.addColorStop(0,'rgba(0,180,255,0.13)');
    atm.addColorStop(0.5,'rgba(0,100,200,0.06)');
    atm.addColorStop(1,'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx,cy,R*1.18,0,Math.PI*2);
    ctx.fillStyle=atm; ctx.fill();

    // 2. Ocean fill with radial gradient (light from top-left)
    ctx.beginPath(); path({type:'Sphere'});
    const ocean=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,R*0.05,cx,cy,R);
    ocean.addColorStop(0,'#0d2137');
    ocean.addColorStop(0.5,'#071525');
    ocean.addColorStop(1,'#030c18');
    ctx.fillStyle=ocean; ctx.fill();

    // 3. Graticule grid
    ctx.beginPath(); path(graticule);
    ctx.strokeStyle='rgba(0,180,255,0.07)'; ctx.lineWidth=0.5; ctx.stroke();

    // 4. Countries — fill with risk colors
    if(worldData){
      worldData.forEach(f=>{
        const iso=N2A[+f.id]||'';
        const col=rc(iso); // e.g. "#ef4444"
        const isHovered=iso===hoveredISO;

        // Parse hex to rgb for opacity control
        ctx.beginPath(); path(f);

        if(isHovered){
          ctx.fillStyle=col+'ff';
          ctx.shadowColor=col; ctx.shadowBlur=12;
        } else {
          ctx.fillStyle=col+'cc';
          ctx.shadowBlur=0;
        }
        ctx.fill();
        ctx.shadowBlur=0;

        // Border
        ctx.beginPath(); path(f);
        ctx.strokeStyle=isHovered?'rgba(255,220,0,0.9)':'rgba(0,0,0,0.55)';
        ctx.lineWidth=isHovered?1.2:0.35;
        ctx.stroke();
      });

      // 5. Country name labels
      ctx.textAlign='center'; ctx.textBaseline='middle';
      worldData.forEach(f=>{
        const iso=N2A[+f.id]||'';
        const name=CN[iso]||'';
        if(!name) return;
        try{
          const c=path.centroid(f);
          if(!c||isNaN(c[0])||isNaN(c[1])) return;
          // Only show label if centroid is on visible hemisphere
          const bounds=path.bounds(f);
          const w=Math.abs(bounds[1][0]-bounds[0][0]);
          const h=Math.abs(bounds[1][1]-bounds[0][1]);
          if(w<18||h<8) return; // too small
          const shortName=name.length>9?name.slice(0,8):name;
          ctx.font=`bold ${w>60?11:9}px Share Tech Mono,monospace`;
          // Shadow for readability
          ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=4;
          ctx.fillStyle=iso===hoveredISO?'#ffffff':'rgba(255,245,200,0.82)';
          ctx.fillText(shortName,c[0],c[1]);
          ctx.shadowBlur=0;
        }catch{}
      });
    } else {
      // Loading state
      ctx.fillStyle='rgba(255,170,0,0.5)';
      ctx.font='13px Share Tech Mono,monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('LOADING MAP DATA...',cx,cy);
    }

    // 6. Globe rim
    ctx.beginPath(); path({type:'Sphere'});
    ctx.strokeStyle='rgba(0,180,255,0.35)'; ctx.lineWidth=1.5; ctx.stroke();

    // 7. Specular highlight (light glint top-left)
    const spec=ctx.createRadialGradient(cx-R*0.35,cy-R*0.35,0,cx-R*0.2,cy-R*0.2,R*0.55);
    spec.addColorStop(0,'rgba(255,255,255,0.07)');
    spec.addColorStop(1,'rgba(255,255,255,0)');
    ctx.beginPath(); path({type:'Sphere'});
    ctx.fillStyle=spec; ctx.fill();
  }

  // ── ANIMATION LOOP ──
  function animate(){
    globe3D._animId=requestAnimationFrame(animate);
    if(spinning&&!drag){rot[0]+=spinSpeed; proj.rotate(rot);}
    draw();
  }

  // ── LOAD WORLD DATA ──
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r=>r.json())
    .then(world=>{
      worldData=topojson.feature(world,world.objects.countries).features;
      // Immediately draw with data
      proj.rotate(rot); draw();
      globe3D={_animId:null};
      animate();
    })
    .catch(()=>{
      // Show error on globe
      draw();
      globe3D={_animId:null};
      animate();
    });

  // ── DRAG TO ROTATE ──
  canvas.addEventListener('mousedown',e=>{
    drag={x:e.clientX,y:e.clientY,r:[...rot]};
    canvas.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!drag)return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    rot=[drag.r[0]+dx*0.28, Math.max(-85,Math.min(85,drag.r[1]-dy*0.28)),0];
    proj.rotate(rot);
  });
  window.addEventListener('mouseup',()=>{drag=null; canvas.style.cursor='grab';});

  // ── SCROLL TO ZOOM ──
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const newR=Math.max(80,Math.min(Math.min(W,H)*0.7,proj.scale()*(e.deltaY<0?1.1:0.9)));
    proj.scale(newR);
  },{passive:false});

  // ── DOUBLE CLICK = TOGGLE SPIN ──
  canvas.addEventListener('dblclick',()=>{spinning=!spinning;});

  // ── HOVER TOOLTIP ──
  let _hoverFrame=null;
  canvas.addEventListener('mousemove',e=>{
    if(drag||!worldData)return;
    if(_hoverFrame)cancelAnimationFrame(_hoverFrame);
    _hoverFrame=requestAnimationFrame(()=>{
      const rect=canvas.getBoundingClientRect();
      const mx=(e.clientX-rect.left), my=(e.clientY-rect.top);
      const inv=proj.invert([mx,my]);
      const tt=document.getElementById('mtt');
      if(!inv){tt.style.display='none';hoveredISO='';return;}
      let found=null;
      for(const f of worldData){try{if(d3.geoContains(f,inv)){found=f;break;}}catch{}}
      if(found){
        const iso=N2A[+found.id]||'';
        hoveredISO=iso;
        const nm=CN[iso]||(iso||'Unknown Region');
        const r=CR[iso]||12;
        tt.style.display='block';
        tt.innerHTML=`<div style="font-family:var(--fh);font-size:13px;color:var(--accent);letter-spacing:2px;margin-bottom:4px">${nm}</div>
          <div style="font-family:var(--fm);font-size:12px">Risk: <b style="color:${rc(iso)}">${r}/100</b> — <span style="color:${rc(iso)}">${rl(iso)}</span></div>
          <div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-top:3px">Click for intel brief · Drag to rotate · Scroll to zoom</div>`;
        tt.style.left=(e.clientX+16)+'px'; tt.style.top=(e.clientY-22)+'px';
      } else {
        tt.style.display='none'; hoveredISO='';
      }
    });
  });
  canvas.addEventListener('mouseleave',()=>{document.getElementById('mtt').style.display='none';hoveredISO='';});

  // ── CLICK = OPEN BRIEF ──
  canvas.addEventListener('click',e=>{
    if(!worldData)return;
    const rect=canvas.getBoundingClientRect();
    const inv=proj.invert([e.clientX-rect.left, e.clientY-rect.top]);
    if(!inv)return;
    for(const f of worldData){
      try{
        if(d3.geoContains(f,inv)){
          const iso=N2A[+f.id]||''; const nm=CN[iso]||iso;
          if(nm) openBrief(iso,nm);
          break;
        }
      }catch{}
    }
  });

  // Info hint
  const hint=document.createElement('div');
  hint.style.cssText='position:absolute;bottom:12px;right:12px;font-family:var(--fm);font-size:11px;color:var(--muted);pointer-events:none;letter-spacing:1px';
  hint.textContent='DRAG · SCROLL ZOOM · DBL-CLICK SPIN · CLICK COUNTRY';
  container.style.position='relative';
  container.appendChild(hint);
}

// ══════════════════════════════════════════
// NEWS
// ══════════════════════════════════════════
// NEWS ENGINE
// ══════════════════════════════════════════
const SK={critical:['war','invasion','nuclear','attack','killed','airstrike','bombing','massacre','hostage','explosion'],high:['conflict','military','sanctions','troops','coup','protest','missile','crisis','emergency','threat'],medium:['tension','dispute','warning','election','summit','deal','agreement']};
function gsev(t){const s=(t||'').toLowerCase();if(SK.critical.some(k=>s.includes(k)))return'critical';if(SK.high.some(k=>s.includes(k)))return'high';if(SK.medium.some(k=>s.includes(k)))return'medium';return'low';}
const SC={critical:'#ef4444',high:'#f97316',medium:'#f59e0b',low:'#22c55e'};
let _allNewsItems=[];
let _newsRefreshTimer=null;

// ── RSS SOURCES (verified working URLs) ──
const RSS_SOURCES=[
  {tag:'BBC',     url:'https://feeds.bbci.co.uk/news/world/rss.xml'},
  {tag:'BBC-BIZ', url:'https://feeds.bbci.co.uk/news/business/rss.xml'},
  {tag:'BBC-TECH',url:'https://feeds.bbci.co.uk/news/technology/rss.xml'},
  {tag:'AJ',      url:'https://www.aljazeera.com/xml/rss/all.xml'},
  {tag:'DW',      url:'https://rss.dw.com/rdf/rss-en-all'},
  {tag:'France24',url:'https://www.france24.com/en/rss'},
  {tag:'NPR',     url:'https://feeds.npr.org/1004/rss.xml'},
  {tag:'Guardian',url:'https://www.theguardian.com/world/rss'},
  {tag:'Guardian-Eco',url:'https://www.theguardian.com/business/rss'},
  {tag:'VOA',     url:'https://www.voanews.com/api/zm_iegmvq$gqmi'},
  {tag:'TIME',    url:'https://time.com/feed/'},
  {tag:'Reuters', url:'https://feeds.reuters.com/reuters/topNews'},
];

// ── GDELT: fetch multiple topic queries in parallel ──
const GDELT_QUERIES=[
  'war conflict military killed',
  'sanctions diplomacy geopolitics summit',
  'nuclear missile weapons',
  'economy trade tariff recession',
  'election protest coup government',
  'earthquake flood disaster climate',
  'AI technology chip semiconductor',
];
async function fetchGDELTQuery(q){
  try{
    const url=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=10&format=json&timespan=6h`;
    const r=await fetch(url,{signal:AbortSignal.timeout(7000)});
    if(!r.ok) return [];
    const d=await r.json();
    return (d.articles||[]).map(a=>({
      title:a.title||'',link:a.url||'#',
      source:(a.domain||'').replace('www.','').split('.')[0].toUpperCase().slice(0,12),
      pubDate:a.seendate||'',desc:'',
      verified:true
    }));
  }catch{return [];}
}

// ── RSS via rss2json proxy ──
async function fetchRSS(src){
  try{
    const url=`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(src.url)}&count=10`;
    const r=await fetch(url,{signal:AbortSignal.timeout(8000)});
    if(!r.ok) return [];
    const d=await r.json();
    if(d.status!=='ok'||!d.items?.length) return [];
    return d.items.map(i=>({
      title:(i.title||'').replace(/<[^>]*>/g,'').trim(),
      link:i.link||'#',
      source:src.tag,
      pubDate:i.pubDate||'',
      desc:(i.description||i.content||'').replace(/<[^>]*>/g,'').trim().slice(0,220),
      verified:true
    })).filter(i=>i.title.length>10);
  }catch{return [];}
}

// ── Claude AI web search for BREAKING news ──
async function fetchClaudeBreaking(){
  try{
    const today=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1500,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        system:'You are a real-time news aggregator. Search for the latest breaking world news from today. Return ONLY valid JSON array, no markdown: [{"title":string,"source":string,"url":string,"category":"conflict"|"politics"|"economy"|"disaster"|"tech","severity":"critical"|"high"|"medium"|"low","summary":string,"pubDate":string}]. Get 12-15 items spanning geopolitics, conflicts, economy, technology, disasters.',
        messages:[{role:'user',content:`Search for breaking world news today ${today}. Find real headlines from BBC, Reuters, Al Jazeera, AP News. Return JSON array only.`}]
      })
    });
    const d=await r.json();
    // Extract text from response (may include tool_use blocks)
    const textBlocks=(d.content||[]).filter(b=>b.type==='text');
    const txt=textBlocks.map(b=>b.text).join('');
    const match=txt.match(/\[[\s\S]*\]/);
    if(!match) return [];
    const items=JSON.parse(match[0]);
    return items.map(i=>({
      title:i.title||'',link:i.url||'#',
      source:i.source||'Claude+Search',
      pubDate:i.pubDate||new Date().toISOString(),
      desc:i.summary||'',
      cat:i.category||'politics',
      severity:i.severity||'medium',
      aiVerified:true
    }));
  }catch(e){console.warn('[Claude news]',e);return [];}
}

function detectCategory(text){
  const t=text.toLowerCase();
  if(/war|kill|attack|missile|airstrike|conflict|troops|coup|invasion|bomb|military|ceasefire|frontline|hostage|rocket|shelling/.test(t)) return 'conflict';
  if(/earthquake|flood|cyclone|hurricane|wildfire|drought|disaster|tsunami|volcano|storm|fire|deaths|killed/.test(t)) return 'disaster';
  if(/gdp|economy|trade|market|tariff|inflation|bank|crypto|bitcoin|oil|recession|imf|stocks|interest rate|currency/.test(t)) return 'economy';
  if(/ai|tech|chip|semiconductor|nvidia|microsoft|apple|samsung|digital|cyber|ev|electric|space|robot|software/.test(t)) return 'tech';
  return 'politics';
}
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

async function loadNews() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="loading-card">
      <div class="sp"></div>
      <div class="loading-text" style="margin-top:8px">Fetching latest headlines...</div>
    </div>
  `;

  const sources = [
    { name: 'TheGuardian', fn: tryGuardian },
    { name: 'GNews', fn: tryCurrentsAPI },
    { name: 'HackerNews', fn: tryHNRecent },
  ];

  for (const src of sources) {
    try {
      const articles = await src.fn();
      if (articles && articles.length >= 3) {
        renderNews(articles, grid);
        return;
      }
    } catch (e) {
      console.log(src.name + ' failed:', e.message);
    }
  }

  grid.innerHTML = `
    <div class="error-card">
      <strong>Live news requires a free GNews API key for better coverage.</strong><br><br>
      Get one in 30 seconds at
      <a href="https://gnews.io/register" target="_blank" style="color:var(--accent)">gnews.io</a><br><br>

      <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
        <input id="gnews-inp" type="text" placeholder="Paste GNews key here..."
          style="flex:1;background:var(--panel2);border:1px solid var(--border2);border-radius:5px;color:var(--text);font-size:12px;padding:8px 10px;font-family:var(--fm);outline:none">
        <button onclick="saveGNews()" style="background:var(--accent);color:#000;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;font-weight:700;font-size:12px">Load →</button>
      </div>
    </div>
  `;
}

function saveGNews() {
  const key = document.getElementById('gnews-inp')?.value?.trim();
  if (key) {
    localStorage.setItem('wm_gnews_key', key);
    loadNews();
  }
}

async function tryGuardian() {
  const GUARDIAN_KEY = localStorage.getItem('wm_guardian_key') || 'test';
  const topics = ['war','conflict','military','sanctions','ukraine','russia','china','iran','israel','nato','nuclear','missile'];
  const q = topics.slice(0,5).join('%20OR%20');
  const url = `https://content.guardianapis.com/search?q=${q}&show-fields=headline,thumbnail,trailText&order-by=newest&page-size=12&api-key=${GUARDIAN_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.response?.status !== 'ok') throw new Error('Guardian API error');

  const results = data.response?.results || [];
  if (!results.length) throw new Error('No Guardian results');

  return results.map(a => ({
    title: a.fields?.headline || a.webTitle,
    link: a.webUrl,
    sourceName: 'The Guardian',
    pubDate: a.webPublicationDate,
    thumbnail: a.fields?.thumbnail || ''
  }));
}

async function tryCurrentsAPI() {
  const key = localStorage.getItem('wm_gnews_key') || '';
  if (!key) throw new Error('No GNews key');

  const url = `https://gnews.io/api/v4/search?q=war+conflict+military+ukraine+russia+china+iran+israel&lang=en&max=12&sortby=publishedAt&apikey=${key}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.errors) throw new Error(data.errors.join(', '));
  if (!data.articles?.length) throw new Error('No articles');

  return data.articles.map(a => ({
    title: a.title,
    link: a.url,
    sourceName: a.source?.name || 'GNews',
    pubDate: a.publishedAt,
    thumbnail: a.image || ''
  }));
}

async function tryHNRecent() {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/newstories.json');
  const ids = await res.json();

  const top60 = ids.slice(0, 60);
  const stories = await Promise.all(
    top60.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then(r => r.json())
        .catch(() => null)
    )
  );

  const geoKw = ['war','conflict','russia','ukraine','china','nato','iran','israel','military','sanction','nuclear','taiwan','gaza','coup','invasion','geopolit','army','troops','missile','bomb','attack'];

  const filtered = stories
    .filter(s => s && s.title && s.url)
    .filter(s => geoKw.some(k => (s.title || '').toLowerCase().includes(k)))
    .slice(0, 12);

  if (!filtered.length) throw new Error('No recent geo stories on HN');

  return filtered.map(s => ({
    title: s.title,
    link: s.url,
    sourceName: (() => {
      try { return new URL(s.url).hostname.replace('www.',''); }
      catch { return 'HN'; }
    })(),
    pubDate: new Date(s.time * 1000).toISOString(),
    thumbnail: ''
  }));
}

function renderNews(articles, grid) {
  const now = Date.now();

  grid.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:8px">' +
    articles.map((a, i) => {
      const age = now - new Date(a.pubDate).getTime();
      const isToday = age < 86400000;
      const isThisWeek = age < 604800000;
      const ageColor = isToday ? '#22c55e' : isThisWeek ? 'var(--accent)' : 'var(--muted)';
      const ageBadge = isToday ? 'TODAY' : isThisWeek ? 'THIS WEEK' : 'RECENT';

      return `
        <a class="news-card" href="${a.link}" target="_blank" rel="noopener">
          <div class="news-idx">${String(i + 1).padStart(2, '0')}</div>
          <div class="news-body">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <div class="news-source">${a.sourceName}</div>
              <span style="font-size:9px;font-family:var(--fm);color:${ageColor}">${ageBadge}</span>
            </div>
            <div class="news-headline">${a.title}</div>
            <div class="news-time">${timeAgo(a.pubDate)} · ${new Date(a.pubDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
          ${a.thumbnail ? `<img class="news-img" src="${a.thumbnail}" alt="" onerror="this.style.display='none'">` : ''}
        </a>
      `;
    }).join('') +
    '</div>';

  const updated = document.getElementById('news-updated');
  if (updated) {
    updated.textContent = 'Updated ' + new Date().toLocaleTimeString() + ' · Live news';
  }
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}
const FALLBACK_NEWS=[{t:'Ukraine-Russia: Latest frontline developments and ceasefire talks',s:'AP',sv:'critical'},{t:'Middle East tensions escalate as regional powers exchange warnings',s:'Reuters',sv:'high'},{t:'US-China trade talks resume amid semiconductor export restrictions',s:'FT',sv:'medium'},{t:'NATO summit addresses Eastern European security posture',s:'BBC',sv:'high'},{t:'Global food security threatened by active conflict zones',s:'UN News',sv:'high'},{t:'Crypto markets volatile following US regulatory announcements',s:'Bloomberg',sv:'medium'},{t:'Climate summit: Nations commit to new emissions reduction targets',s:'Guardian',sv:'low'},{t:'Iran nuclear negotiations at critical juncture — IAEA report',s:'Reuters',sv:'critical'},{t:'North Korea conducts ICBM test over Sea of Japan',s:'AP',sv:'critical'},{t:'India overtakes China in GDP growth forecasts for 2025',s:'IMF',sv:'low'},{t:'Taiwan Strait: US carrier group freedom of navigation operation',s:'CNN',sv:'high'},{t:'Global semiconductor shortage easing as new fabs come online',s:'WSJ',sv:'low'}];
function fbNews(){document.getElementById('nu').textContent='⚡ '+now()+' · STATIC FEED';document.getElementById('ng').innerHTML=FALLBACK_NEWS.map((a,i)=>{const cl=SC[a.sv];return`<div class="nc fi" style="animation-delay:${i*.03}s"><div style="font-family:var(--fm);font-size:14px;color:${cl};letter-spacing:2px;margin-bottom:3px">${a.sv.toUpperCase()} · ${a.s}</div><div style="font-size:15px;font-weight:600;color:var(--text);line-height:1.35">${a.t}</div></div>`;}).join('');}
const NEWS_CATEGORY_MAP={
  conflict:['Gaza','Israel','Ukraine','Russia','War','Military','Conflict','Ceasefire','ICBM','Missile','Hamas','Houthi','Troops','Airstrike','Offensive','Frontline','Armed','Coup','Junta','Rebel','Taliban'],
  politics:['Election','Summit','Diplomacy','Treaty','Sanction','NATO','UN','Parliament','Government','Impeachment','President','Prime Minister','Senate','Congress','Bundestag','Lira','Expel','Diplomat','Arrest Warrant','Accord','G20','Vote','Policy','Minister','ICC'],
  economy:['GDP','Economy','Trade','Market','Oil','Tariff','Rate','Bank','Crypto','Bitcoin','Revenue','Profit','IMF','Recession','Inflation','Exports','Manufacturing','Commodity','Stock','Fund','Investment','Bailout'],
  disaster:['Flood','Earthquake','Cyclone','Wildfire','Drought','Volcano','Hurricane','Tsunami','Storm','Disaster','Climate','Rainfall','Deaths','Killed','Emergency','Curfew','Evacuation'],
  tech:['AI','Semiconductor','GPU','Tech','Chip','Data','Microsoft','Nvidia','Apple','Samsung','TSMC','Cyber','Digital','Software','Fintech','Space','Lunar','BYD','EV','Electric']
};

/*
  GOE non-working tabs replacement
  Paste this in app.js by replacing the section from:
  // LIVE TV CHANNELS
  ...through the final DOMContentLoaded init block.

  This code is designed for your current index.html IDs.
  It keeps MAP / NEWS / MARKETS untouched.
  It uses existing helpers already present in app.js:
  GK, groq(), pj(), esc(), shortDate(), timeAgoLite(), showToast(),
  fetchLiveArticles(), fetchRestCountry(), fetchEONETOpen(), fetchUSGSQuakes(), CN.
*/

// ══════════════════════════════════════════
// LIVE TV
// ══════════════════════════════════════════
const CHANNELS = [
  { id:'france24', name:'France 24 English', cat:'intl', thumb:'🇫🇷', desc:'Global affairs · Europe · diplomacy', hls:'https://amg01894-france24-france24english-iphone-ott.amagi.tv/playlist.m3u8' },
  { id:'dw', name:'DW English', cat:'intl', thumb:'🇩🇪', desc:'Europe · world news · policy', hls:'https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/index.m3u8' },
  { id:'arirang', name:'Arirang World', cat:'asia', thumb:'🇰🇷', desc:'Asia · Korea · business', hls:'https://amg00640-arirang-arirang-rakuten-xfd0r.amagi.tv/playlist.m3u8' },
  { id:'newsasia', name:'CNA', cat:'asia', thumb:'🇸🇬', desc:'Asia-Pacific · current affairs', hls:'https://d2e1asnsl7br7j.cloudfront.net/out/v1/6dba182e7d8a4f9a8df2ec4f7f0d0ea1/index.m3u8' },
  { id:'aljazeera', name:'Al Jazeera English', cat:'mideast', thumb:'🇶🇦', desc:'Middle East · global coverage', hls:'https://live-hls-web-aje.getaj.net/AJE/index.m3u8' },
  { id:'trt', name:'TRT World', cat:'mideast', thumb:'🇹🇷', desc:'Middle East · geopolitics', hls:'https://tv-trtworld.live.trt.com.tr/master_720.m3u8' },
  { id:'cgtn', name:'CGTN', cat:'intl', thumb:'🇨🇳', desc:'China · global business · diplomacy', hls:'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8' },
  { id:'cnbc', name:'CNBC', cat:'finance', thumb:'💹', desc:'Markets · finance · macro', hls:'https://cnbc-live.akamaized.net/hls/live/2032260/cnbc/master.m3u8' }
];

let chanFilter = 'all';
let _lastChannelId = null;

function cf(filter, btn) {
  chanFilter = filter;
  document.querySelectorAll('#chan-fbar .fp').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderChannels();
}

function renderChannels() {
  const grid = document.getElementById('chan-grid');
  if (!grid) return;

  const rows = chanFilter === 'all'
    ? CHANNELS
    : CHANNELS.filter(c => c.cat === chanFilter);

  grid.innerHTML = rows.map(c => `
    <div class="chan-card fi" onclick="playChannel('${c.id}')">
      <div class="chan-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${c.thumb}</span>
          <div class="chan-name">${esc(c.name)}</div>
        </div>
        <div class="chan-live"><div class="chan-live-dot"></div>LIVE</div>
      </div>
      <div style="padding:9px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px">
        <div style="font-size:13px;color:var(--subtle)">${esc(c.desc)}</div>
        <button class="btn-p" style="font-size:12px;padding:4px 10px">▶ WATCH</button>
      </div>
    </div>
  `).join('');
}

function playChannel(id) {
  const channel = CHANNELS.find(x => x.id === id);
  if (!channel) return;

  _lastChannelId = id;
  const wrap = document.getElementById('active-channel');
  const video = document.getElementById('live-video');
  const error = document.getElementById('video-error');
  if (!wrap || !video || !error) return;

  wrap.style.display = 'block';
  document.getElementById('ac-thumb').textContent = channel.thumb;
  document.getElementById('ac-name').textContent = channel.name;
  error.style.display = 'none';
  video.pause();
  video.removeAttribute('src');
  video.load();

  if (wrap._hls) {
    wrap._hls.destroy();
    wrap._hls = null;
  }

  if (window.Hls && Hls.isSupported()) {
    const hls = new Hls({ enableWorker:true, lowLatencyMode:true, maxBufferLength:20 });
    hls.loadSource(channel.hls);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data && data.fatal) showVideoError();
    });
    wrap._hls = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = channel.hls;
    video.play().catch(() => {});
  } else {
    showVideoError();
  }

  wrap.scrollIntoView({ behavior:'smooth', block:'start' });
}

function showVideoError() {
  const error = document.getElementById('video-error');
  if (!error) return;
  error.innerHTML = `⚠ STREAM UNAVAILABLE — this feed may be geo-blocked or temporarily offline.<br><span style="color:var(--subtle)">Try another channel or run on localhost.</span><br><button onclick="tryNextChannel()" class="btn-p" style="margin-top:8px;font-size:11px;padding:4px 10px">TRY NEXT CHANNEL</button>`;
  error.style.display = 'block';
}

function tryNextChannel() {
  if (!CHANNELS.length) return;
  const idx = Math.max(0, CHANNELS.findIndex(c => c.id === _lastChannelId));
  const next = CHANNELS[(idx + 1) % CHANNELS.length];
  playChannel(next.id);
}

function closeChannel() {
  const wrap = document.getElementById('active-channel');
  const video = document.getElementById('live-video');
  if (!wrap || !video) return;
  wrap.style.display = 'none';
  video.pause();
  video.removeAttribute('src');
  video.load();
  if (wrap._hls) {
    wrap._hls.destroy();
    wrap._hls = null;
  }
}

// ══════════════════════════════════════════
// AI PREDICTIONS
// ══════════════════════════════════════════
async function loadPred() {
  const grid = document.getElementById('pgrid');
  if (!grid) return;
  grid.innerHTML = '<div class="lb2"><div class="sp"></div>BUILDING LIVE PREDICTIONS...</div>';

  const live = await fetchLiveArticles('war OR conflict OR election OR sanctions OR oil OR cyber OR ai regulation OR supply chain', 16);
  if (!live.length) {
    grid.innerHTML = '<div class="lb2">LIVE PREDICTION SIGNALS NOT AVAILABLE</div>';
    return;
  }

  const rows = live.slice(0, 6).map((a, i) => {
    const probability = Math.max(32, Math.min(91, a.score + (a.countries?.length ? 8 : 0)));
    const level = probability >= 75 ? 'high' : probability >= 50 ? 'medium' : 'low';
    const color = level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#22c55e';
    const signals = [a.source, timeAgoLite(a.published), ...(a.countries?.length ? a.countries : ['GLOBAL'])].slice(0, 4);

    return `
      <div class="pred ${level} fi" style="animation-delay:${i * 0.05}s">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="font-size:15px;font-weight:600;color:var(--text);line-height:1.45;flex:1">${esc(a.title)}</div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-family:var(--fm);font-size:22px;font-weight:700;color:${color}">${probability}%</div>
            <div style="font-family:var(--fm);font-size:12px;color:var(--muted)">PROB</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--subtle);line-height:1.55;margin-bottom:8px">${esc(a.summary || 'Live predictive signal built from current reporting and escalation keywords.')}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">${signals.map(s => `<span class="tag c">${esc(s)}</span>`).join('')}</div>
        <div style="font-size:12px;color:var(--muted)">${shortDate(a.published)} · <a href="${a.link}" target="_blank" style="color:var(--accent)">Open source ↗</a></div>
      </div>`;
  }).join('');

  grid.innerHTML = rows;
}

async function genPred() {
  const grid = document.getElementById('pgrid');
  if (!grid) return;

  const live = await fetchLiveArticles('war OR conflict OR sanctions OR election OR energy OR cyber', 10);
  if (!GK) {
    await loadPred();
    return;
  }

  grid.innerHTML = '<div class="lb2"><div class="sp"></div>AI GENERATING PREDICTIONS...</div>';
  const sys = 'You are a geopolitical forecasting analyst. Return ONLY valid JSON array: [{"t":string,"p":number,"lv":"low"|"medium"|"high","b":string,"sigs":string[]}]';
  const usr = JSON.stringify({ headlines: live.map(x => ({ title:x.title, source:x.source, published:x.published })) });
  const txt = await groq(sys, usr, 1200);
  const data = pj(txt);

  if (!Array.isArray(data) || !data.length) {
    await loadPred();
    return;
  }

  grid.innerHTML = data.slice(0, 6).map((p, i) => {
    const prob = Number(p.p) || 50;
    const level = p.lv || (prob >= 75 ? 'high' : prob >= 50 ? 'medium' : 'low');
    const color = level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#22c55e';
    return `
      <div class="pred ${level} fi" style="animation-delay:${i * 0.05}s">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
          <div style="font-size:15px;font-weight:600;color:var(--text);line-height:1.45;flex:1">${esc(p.t || 'Untitled prediction')}</div>
          <div style="text-align:center;flex-shrink:0">
            <div style="font-family:var(--fm);font-size:22px;font-weight:700;color:${color}">${prob}%</div>
            <div style="font-family:var(--fm);font-size:12px;color:var(--muted)">PROB</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--subtle);line-height:1.55;margin-bottom:8px">${esc(p.b || '')}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">${(p.sigs || []).map(s => `<span class="tag c">${esc(s)}</span>`).join('')}</div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════
// COUNTRY BRIEFS
// ══════════════════════════════════════════
const BRIEF_COUNTRIES = [
  { code:'IND', name:'India', region:'asia' },
  { code:'CHN', name:'China', region:'asia' },
  { code:'JPN', name:'Japan', region:'asia' },
  { code:'PAK', name:'Pakistan', region:'asia' },
  { code:'USA', name:'United States', region:'americas' },
  { code:'BRA', name:'Brazil', region:'americas' },
  { code:'GBR', name:'United Kingdom', region:'europe' },
  { code:'DEU', name:'Germany', region:'europe' },
  { code:'FRA', name:'France', region:'europe' },
  { code:'UKR', name:'Ukraine', region:'europe' },
  { code:'ISR', name:'Israel', region:'middleeast' },
  { code:'IRN', name:'Iran', region:'middleeast' },
  { code:'SAU', name:'Saudi Arabia', region:'middleeast' },
  { code:'ARE', name:'UAE', region:'middleeast' },
  { code:'EGY', name:'Egypt', region:'africa' },
  { code:'NGA', name:'Nigeria', region:'africa' },
  { code:'ETH', name:'Ethiopia', region:'africa' },
  { code:'ZAF', name:'South Africa', region:'africa' }
];

let briefFilter = 'all';

function rfilt(region, btn) {
  briefFilter = region;
  document.querySelectorAll('#rfbar .fp').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBriefs();
}

function renderBriefs() {
  const wrap = document.getElementById('cg2');
  if (!wrap) return;
  const list = briefFilter === 'all' ? BRIEF_COUNTRIES : BRIEF_COUNTRIES.filter(c => c.region === briefFilter);

  wrap.innerHTML = list.map(c => `
    <div class="card cc fi" style="cursor:pointer" onclick="openBrief('${c.code}','${c.name.replace(/'/g, "\\'")}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
        <div>
          <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(c.name)}</div>
          <div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-top:2px">${esc(c.code)} · ${esc(c.region.toUpperCase())}</div>
        </div>
        <span class="tag c">BRIEF</span>
      </div>
      <div style="font-size:13px;color:var(--subtle);line-height:1.5">Open live intelligence brief with facts, headlines, and AI summary.</div>
    </div>
  `).join('');
}

async function openBrief(code, name) {
  const cm = document.getElementById('cm');
  const cc = document.getElementById('cm-content');
  if (!cm || !cc) return;

  cm.classList.add('open');
  cc.innerHTML = '<div class="lb2"><div class="sp"></div>BUILDING LIVE COUNTRY BRIEF...</div>';

  const country = await fetchRestCountry(code, name);
  const arts = await fetchLiveArticles(`"${name}" OR ${name} geopolitics OR ${name} economy OR ${name} security`, 8);

  const flag = country?.flag || '🌐';
  const region = country?.region || '-';
  const capital = (country?.capital || [])[0] || '-';
  const population = country?.population ? Number(country.population).toLocaleString('en-US') : '-';
  const currencies = country?.currencies ? Object.values(country.currencies).map(x => x.name).join(', ') : '-';
  const languages = country?.languages ? Object.values(country.languages).join(', ') : '-';

  let aiBlock = '';
  if (GK) {
    const sys = 'You are a geopolitical analyst. Return ONLY valid JSON: {"summary":string,"economy":string,"security":string,"outlook":string}';
    const usr = JSON.stringify({
      country: name,
      facts: { region, capital, population, currencies, languages },
      headlines: arts.map(a => a.title).slice(0, 5)
    });
    const txt = await groq(sys, usr, 900);
    const d = pj(txt);
    if (d) {
      aiBlock = `
        <div class="sec">AI SUMMARY</div>
        <div style="background:var(--panel);border:1px solid var(--border2);border-left:3px solid var(--accent);border-radius:3px;padding:12px;margin-bottom:10px;font-size:14px;line-height:1.65">${esc(d.summary || '-')}</div>
        <div class="g3" style="margin-bottom:10px">
          <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">ECONOMY</div><div style="font-size:14px;line-height:1.6">${esc(d.economy || '-')}</div></div>
          <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">SECURITY</div><div style="font-size:14px;line-height:1.6">${esc(d.security || '-')}</div></div>
          <div class="card ca"><div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-bottom:4px">OUTLOOK</div><div style="font-size:14px;line-height:1.6">${esc(d.outlook || '-')}</div></div>
        </div>`;
    }
  }

  cc.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:36px">${flag}</div>
      <div>
        <div style="font-family:var(--fh);font-size:14px;color:var(--accent);letter-spacing:3px">${esc((name || code || 'Country').toUpperCase())}</div>
        <div style="font-family:var(--fm);font-size:14px;color:var(--muted);margin-top:3px">LIVE COUNTRY BRIEF · ${new Date().toLocaleDateString()}</div>
      </div>
      <button onclick="document.getElementById('cm').classList.remove('open')" style="margin-left:auto;background:transparent;border:1px solid var(--border2);color:var(--subtle);padding:4px 9px;border-radius:2px;cursor:pointer;font-family:var(--fm)">CLOSE</button>
    </div>

    <div class="g3" style="margin-bottom:12px">
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">REGION</div><div style="font-size:15px;color:var(--text)">${esc(region)}</div></div>
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">CAPITAL</div><div style="font-size:15px;color:var(--text)">${esc(capital)}</div></div>
      <div class="card cc"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">POPULATION</div><div style="font-size:15px;color:var(--text)">${esc(population)}</div></div>
      <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">CURRENCIES</div><div style="font-size:14px;color:var(--text)">${esc(currencies)}</div></div>
      <div class="card cp"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">LANGUAGES</div><div style="font-size:14px;color:var(--text)">${esc(languages)}</div></div>
      <div class="card ca"><div style="font-family:var(--fm);font-size:14px;color:var(--muted)">LIVE HEADLINES</div><div style="font-size:15px;color:var(--text)">${arts.length}</div></div>
    </div>

    ${aiBlock}

    <div class="sec">LIVE HEADLINES</div>
    <div>
      ${arts.length ? arts.map(a => `
        <a class="nc" href="${a.link}" target="_blank">
          <div style="font-family:var(--fm);font-size:13px;color:var(--accent);margin-bottom:3px">${esc(a.source)} · ${timeAgoLite(a.published)}</div>
          <div style="font-size:15px;color:var(--text);line-height:1.55">${esc(a.title)}</div>
        </a>
      `).join('') : '<div class="card">No live headlines found for this country right now.</div>'}
    </div>
  `;
}

// ══════════════════════════════════════════
// KNOWLEDGE GRAPH
// ══════════════════════════════════════════
let kgMode = 'conflict';
let kgZoom = 1;
let kgPan = { x: 0, y: 0 };
let kgDraggingNode = null;
let kgDraggingCanvas = false;
let kgLast = { x: 0, y: 0 };
let KG = { nodes: [], links: [] };

const KG_PRESETS = {
  conflict: {
    nodes: [
      { id:'IND', label:'India', group:'country', x:200, y:200 },
      { id:'CHN', label:'China', group:'country', x:420, y:160 },
      { id:'PAK', label:'Pakistan', group:'country', x:320, y:300 },
      { id:'USA', label:'United States', group:'country', x:640, y:180 },
      { id:'RUS', label:'Russia', group:'country', x:560, y:320 },
      { id:'OIL', label:'Energy Markets', group:'sector', x:760, y:300 }
    ],
    links: [
      { a:'IND', b:'CHN', type:'border tension' },
      { a:'IND', b:'PAK', type:'security rivalry' },
      { a:'CHN', b:'USA', type:'strategic competition' },
      { a:'RUS', b:'CHN', type:'alignment' },
      { a:'RUS', b:'OIL', type:'commodity shock' },
      { a:'USA', b:'IND', type:'partnership' }
    ]
  },
  trade: {
    nodes: [
      { id:'USA', label:'United States', group:'country', x:180, y:180 },
      { id:'CHN', label:'China', group:'country', x:410, y:130 },
      { id:'IND', label:'India', group:'country', x:330, y:330 },
      { id:'EU', label:'European Union', group:'country', x:620, y:180 },
      { id:'SEA', label:'Shipping', group:'sector', x:520, y:330 },
      { id:'OIL', label:'Oil', group:'sector', x:720, y:320 }
    ],
    links: [
      { a:'USA', b:'CHN', type:'tariffs' },
      { a:'IND', b:'CHN', type:'manufacturing competition' },
      { a:'EU', b:'USA', type:'allied trade' },
      { a:'SEA', b:'OIL', type:'transport exposure' },
      { a:'CHN', b:'SEA', type:'export routes' },
      { a:'IND', b:'EU', type:'market access' }
    ]
  },
  energy: {
    nodes: [
      { id:'SAU', label:'Saudi Arabia', group:'country', x:200, y:170 },
      { id:'IRN', label:'Iran', group:'country', x:410, y:130 },
      { id:'RUS', label:'Russia', group:'country', x:620, y:160 },
      { id:'EU', label:'European Union', group:'country', x:720, y:320 },
      { id:'CHN', label:'China', group:'country', x:470, y:320 },
      { id:'OIL', label:'Brent / WTI', group:'sector', x:260, y:320 }
    ],
    links: [
      { a:'SAU', b:'OIL', type:'production' },
      { a:'IRN', b:'OIL', type:'strait risk' },
      { a:'RUS', b:'EU', type:'supply leverage' },
      { a:'CHN', b:'IRN', type:'buying link' },
      { a:'CHN', b:'SAU', type:'energy demand' },
      { a:'RUS', b:'CHN', type:'pipeline alignment' }
    ]
  }
};

function initKG() {
  const bar = document.getElementById('kgfbar');
  if (!bar) return;

  bar.innerHTML = `
    <button class="fp active" onclick="setKGMode('conflict', this)">CONFLICT</button>
    <button class="fp" onclick="setKGMode('trade', this)">TRADE</button>
    <button class="fp" onclick="setKGMode('energy', this)">ENERGY</button>
  `;
  setKGMode('conflict', bar.querySelector('.fp'));
  setupKGEvents();
}

function setKGMode(mode, btn) {
  kgMode = mode;
  document.querySelectorAll('#kgfbar .fp').forEach(el => el.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const preset = KG_PRESETS[mode];
  KG = {
    nodes: preset.nodes.map(n => ({ ...n })),
    links: preset.links.map(l => ({ ...l }))
  };
  renderKG();
}

function kgColor(group) {
  if (group === 'country') return '#00ff88';
  if (group === 'sector') return '#00d4ff';
  return '#f59e0b';
}

function renderKG() {
  const svg = document.getElementById('kg-svg');
  if (!svg) return;

  const vbW = 1000;
  const vbH = 560;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);

  const tx = kgPan.x;
  const ty = kgPan.y;
  const sc = kgZoom;

  const linkHtml = KG.links.map(l => {
    const a = KG.nodes.find(n => n.id === l.a);
    const b = KG.nodes.find(n => n.id === l.b);
    if (!a || !b) return '';
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return `
      <g>
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
        <rect x="${mx - 48}" y="${my - 11}" width="96" height="22" rx="10" fill="rgba(10,16,22,.88)" stroke="rgba(0,255,136,.15)"></rect>
        <text x="${mx}" y="${my + 4}" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="monospace">${esc(l.type)}</text>
      </g>`;
  }).join('');

  const nodeHtml = KG.nodes.map(n => `
    <g class="kg-node" data-id="${n.id}" transform="translate(${n.x},${n.y})" style="cursor:grab">
      <circle r="28" fill="rgba(5,12,19,.92)" stroke="${kgColor(n.group)}" stroke-width="2.5"></circle>
      <circle r="34" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1"></circle>
      <text text-anchor="middle" y="-2" fill="#e2e8f0" font-size="13" font-weight="700">${esc(n.label)}</text>
      <text text-anchor="middle" y="14" fill="#7dd3fc" font-size="10" font-family="monospace">${esc(n.group)}</text>
    </g>
  `).join('');

  svg.innerHTML = `
    <defs>
      <pattern id="kg-grid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,.035)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${vbW}" height="${vbH}" fill="url(#kg-grid)"></rect>
    <g id="kg-world" transform="translate(${tx},${ty}) scale(${sc})">
      ${linkHtml}
      ${nodeHtml}
    </g>
  `;
}

function setupKGEvents() {
  const svg = document.getElementById('kg-svg');
  if (!svg || svg._kgBound) return;
  svg._kgBound = true;

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    kz(e.deltaY < 0 ? 1.12 : 0.89);
  });

  svg.addEventListener('pointerdown', e => {
    const node = e.target.closest('.kg-node');
    const pt = svgPoint(svg, e.clientX, e.clientY);

    if (node) {
      kgDraggingNode = node.getAttribute('data-id');
      svg.setPointerCapture(e.pointerId);
      kgLast = pt;
      return;
    }

    kgDraggingCanvas = true;
    svg.setPointerCapture(e.pointerId);
    kgLast = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener('pointermove', e => {
    if (kgDraggingNode) {
      const pt = svgPoint(svg, e.clientX, e.clientY);
      const n = KG.nodes.find(x => x.id === kgDraggingNode);
      if (n) {
        const dx = (pt.x - kgLast.x) / kgZoom;
        const dy = (pt.y - kgLast.y) / kgZoom;
        n.x += dx;
        n.y += dy;
        kgLast = pt;
        renderKG();
      }
      return;
    }

    if (kgDraggingCanvas) {
      kgPan.x += e.clientX - kgLast.x;
      kgPan.y += e.clientY - kgLast.y;
      kgLast = { x: e.clientX, y: e.clientY };
      renderKG();
    }
  });

  svg.addEventListener('pointerup', () => {
    kgDraggingNode = null;
    kgDraggingCanvas = false;
  });

  svg.addEventListener('pointerleave', () => {
    kgDraggingNode = null;
    kgDraggingCanvas = false;
  });
}

function svgPoint(svg, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const screenCTM = svg.getScreenCTM();
  return pt.matrixTransform(screenCTM.inverse());
}

function kz(mult) {
  kgZoom = Math.max(0.5, Math.min(2.4, kgZoom * mult));
  renderKG();
}

function kzr() {
  kgZoom = 1;
  kgPan = { x: 0, y: 0 };
  renderKG();
}

// ══════════════════════════════════════════
// RISK MONITOR
// ══════════════════════════════════════════
function riskTag(score) {
  if (score >= 80) return { label:'CRITICAL', color:'#ef4444' };
  if (score >= 60) return { label:'HIGH', color:'#f97316' };
  if (score >= 40) return { label:'WATCH', color:'#eab308' };
  return { label:'LOW', color:'#22c55e' };
}

async function loadRisk() {
  const rg = document.getElementById('rg');
  if (!rg) return;
  rg.innerHTML = '<div class="lb2"><div class="sp"></div>COMPUTING LIVE RISK...</div>';

  const arts = await fetchLiveArticles('war OR conflict OR coup OR sanctions OR protest OR missile OR troop', 20);

  if (!arts.length) {
    rg.innerHTML = '<div class="lb2">LIVE RISK FEED UNAVAILABLE</div>';
    return;
  }

  const scoreMap = {};
  for (const a of arts) {
    const codes = a.countries?.length ? a.countries : ['GLOBAL'];
    for (const code of codes) {
      if (!scoreMap[code]) scoreMap[code] = { code, score: 0, headline: a.title, top: 0 };
      scoreMap[code].score += Math.max(8, Math.round((a.score || 24) / 3));
      if ((a.score || 0) > scoreMap[code].top) {
        scoreMap[code].top = a.score || 0;
        scoreMap[code].headline = a.title;
      }
    }
  }

  const rows = Object.values(scoreMap)
    .filter(x => x.code !== 'GLOBAL')
    .map(x => {
      x.score = Math.min(100, x.score);
      x.tag = riskTag(x.score);
      x.name = CN?.[x.code] || x.code;
      return x;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  rg.innerHTML = `
    <div class="g3">
      ${rows.map(r => `
        <div class="card cc fi">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">${esc(r.name)}</div>
              <div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-top:2px">${esc(r.code)}</div>
            </div>
            <div style="padding:4px 8px;border-radius:999px;background:${r.tag.color}22;color:${r.tag.color};font-family:var(--fm);font-size:11px;border:1px solid ${r.tag.color}55">${r.tag.label}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="font-family:var(--fm);font-size:28px;color:${r.tag.color};font-weight:700">${r.score}</div>
            <div style="flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden">
              <div style="width:${r.score}%;height:100%;background:${r.tag.color}"></div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(r.headline)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ══════════════════════════════════════════
// CLIMATE
// ══════════════════════════════════════════
async function loadClimate() {
  const indicators = document.getElementById('clim-indicators');
  const disastersGrid = document.getElementById('disasters-grid');
  const envRiskGrid = document.getElementById('env-risk-grid');
  const countryWatch = document.getElementById('clim-countries');
  if (!indicators || !disastersGrid || !envRiskGrid || !countryWatch) return;

  indicators.innerHTML = `
    <div class="card cc"><div style="font-family:var(--fm);font-size:11px;color:var(--muted)">GLOBAL TEMP ANOMALY</div><div style="font-size:24px;color:var(--accent)">+1.4°C</div></div>
    <div class="card cc"><div style="font-family:var(--fm);font-size:11px;color:var(--muted)">EXTREME EVENTS</div><div style="font-size:24px;color:var(--accent2)">LIVE</div></div>
    <div class="card cc"><div style="font-family:var(--fm);font-size:11px;color:var(--muted)">AIR QUALITY PRESSURE</div><div style="font-size:24px;color:var(--accent3)">ELEVATED</div></div>
    <div class="card cc"><div style="font-family:var(--fm);font-size:11px;color:var(--muted)">SEA / STORM RISK</div><div style="font-size:24px;color:#f59e0b">WATCH</div></div>
  `;

  disastersGrid.innerHTML = '<div class="lb2"><div class="sp"></div>LOADING DISASTERS...</div>';

  const [eonet, quakes] = await Promise.all([
    fetchEONETOpen ? fetchEONETOpen() : Promise.resolve([]),
    fetchUSGSQuakes ? fetchUSGSQuakes() : Promise.resolve([])
  ]);

  const disasterCards = [];

  if (Array.isArray(eonet)) {
    for (const ev of eonet.slice(0, 8)) {
      const title = ev.title || ev.name || 'Event';
      const cat = (ev.categories || []).map(c => c.title || c).join(', ') || 'Disaster';
      const when = ev.geometry?.[0]?.date || ev.closed || ev.opened || '';
      disasterCards.push(`
        <div class="card cp fi">
          <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">
            <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(title)}</div>
            <span class="tag c">${esc(cat)}</span>
          </div>
          <div style="font-size:13px;color:var(--subtle)">${when ? esc(shortDate(when)) : 'Recent event'}</div>
        </div>
      `);
    }
  }

  if (Array.isArray(quakes)) {
    for (const q of quakes.slice(0, 6)) {
      const mag = q.properties?.mag ?? '-';
      const place = q.properties?.place || 'Earthquake event';
      const time = q.properties?.time ? shortDate(q.properties.time) : '';
      disasterCards.push(`
        <div class="card ca fi">
          <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">
            <div style="font-size:15px;font-weight:700;color:var(--text)">M ${esc(String(mag))}</div>
            <span class="tag c">EARTHQUAKE</span>
          </div>
          <div style="font-size:13px;color:var(--text);line-height:1.5">${esc(place)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(time)}</div>
        </div>
      `);
    }
  }

  disastersGrid.innerHTML = disasterCards.length
    ? disasterCards.join('')
    : '<div class="card">No active climate or disaster alerts were returned right now.</div>';

  const envRows = [
    ['South Asia', 'Heatwaves · water stress · flooding', '#f97316'],
    ['Middle East', 'Extreme heat · water scarcity · shipping chokepoints', '#ef4444'],
    ['Europe', 'Energy-weather linkage · wildfire belts', '#eab308'],
    ['East Asia', 'Typhoon exposure · supply-chain concentration', '#00d4ff'],
    ['Africa', 'Drought pockets · food vulnerability', '#22c55e'],
    ['Americas', 'Hurricanes · wildfire corridors', '#a855f7']
  ];

  envRiskGrid.innerHTML = envRows.map(([name, desc, color]) => `
    <div class="card cc fi" style="border-left:3px solid ${color}">
      <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">${esc(name)}</div>
      <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(desc)}</div>
    </div>
  `).join('');

  countryWatch.innerHTML = `
    <div class="g3">
      ${[
        ['India', 'Monsoon variability · heatwave risk'],
        ['China', 'Flooding zones · industrial river basins'],
        ['Saudi Arabia', 'Water dependence · heat stress'],
        ['United States', 'Hurricanes · wildfire states'],
        ['Brazil', 'Rainforest pressure · drought pockets'],
        ['Australia', 'Bushfire cycles · reef exposure']
      ].map(([c, d]) => `
        <div class="card cc fi">
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">${esc(c)}</div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(d)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ══════════════════════════════════════════
// SCENARIO
// ══════════════════════════════════════════
const SC_PRESETS = [
  'Iran blocks the Strait of Hormuz',
  'China begins blockade around Taiwan',
  'Russia halts additional gas supplies to Europe',
  'Major cyberattack hits global banking infrastructure',
  'Escalation on India-China border'
];

const SC_FOCUS = ['Markets', 'Oil', 'Shipping', 'Supply Chains', 'Security', 'Diplomacy'];
let scFocusSelected = ['Markets', 'Oil', 'Security'];

function initScenarioUI() {
  const presets = document.getElementById('sc-presets');
  const focus = document.getElementById('sc-focus');
  if (!presets || !focus) return;

  presets.innerHTML = SC_PRESETS.map(p => `
    <button class="fp" onclick="useScenarioPreset('${p.replace(/'/g, "\\'")}')">${esc(p)}</button>
  `).join('');

  renderScenarioFocus();
}

function useScenarioPreset(text) {
  const input = document.getElementById('sc-trigger');
  if (input) input.value = text;
}

function renderScenarioFocus() {
  const focus = document.getElementById('sc-focus');
  if (!focus) return;
  focus.innerHTML = SC_FOCUS.map(x => `
    <button class="fp ${scFocusSelected.includes(x) ? 'active' : ''}" onclick="toggleScenarioFocus('${x}')">${esc(x)}</button>
  `).join('');
}

function toggleScenarioFocus(name) {
  if (scFocusSelected.includes(name)) {
    scFocusSelected = scFocusSelected.filter(x => x !== name);
  } else {
    scFocusSelected.push(name);
  }
  renderScenarioFocus();
}

async function runScenario() {
  const trigger = (document.getElementById('sc-trigger')?.value || '').trim();
  const horizon = document.getElementById('sc-horizon')?.value || '7d';
  const out = document.getElementById('sc-results');
  if (!out) return;

  if (!trigger) {
    out.innerHTML = '<div class="lb2">ENTER A TRIGGER EVENT TO RUN THE SCENARIO</div>';
    return;
  }

  out.innerHTML = '<div class="lb2"><div class="sp"></div>SIMULATING CASCADING EFFECTS...</div>';

  const live = await fetchLiveArticles(trigger, 8);

  if (GK) {
    const sys = 'You are a geopolitical scenario analyst. Return ONLY valid JSON: {"summary":string,"best":string,"base":string,"worst":string,"impacts":[{"k":string,"v":string}],"countries":[string],"markets":[string]}';
    const usr = JSON.stringify({
      trigger,
      horizon,
      focus: scFocusSelected,
      liveSignals: live.map(x => x.title)
    });
    const txt = await groq(sys, usr, 1200);
    const d = pj(txt);

    if (d) {
      out.innerHTML = `
        <div class="card cc fi" style="margin-bottom:10px">
          <div style="font-family:var(--fm);font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:6px">AI SUMMARY</div>
          <div style="font-size:14px;color:var(--text);line-height:1.7">${esc(d.summary || '-')}</div>
        </div>

        <div class="g3" style="margin-bottom:10px">
          <div class="card cc"><div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-bottom:5px">BEST CASE</div><div style="font-size:13px;line-height:1.6">${esc(d.best || '-')}</div></div>
          <div class="card cp"><div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-bottom:5px">BASE CASE</div><div style="font-size:13px;line-height:1.6">${esc(d.base || '-')}</div></div>
          <div class="card ca"><div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-bottom:5px">WORST CASE</div><div style="font-size:13px;line-height:1.6">${esc(d.worst || '-')}</div></div>
        </div>

        <div class="g2">
          <div class="card cc">
            <div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-bottom:6px">SYSTEM IMPACTS</div>
            ${(d.impacts || []).map(x => `
              <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,.06)">
                <div style="font-size:13px;color:var(--accent)">${esc(x.k || 'Impact')}</div>
                <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(x.v || '-')}</div>
              </div>
            `).join('')}
          </div>
          <div class="card cp">
            <div style="font-family:var(--fm);font-size:11px;color:var(--muted);margin-bottom:6px">AFFECTED COUNTRIES / MARKETS</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${(d.countries || []).map(x => `<span class="tag c">${esc(x)}</span>`).join('')}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${(d.markets || []).map(x => `<span class="tag c">${esc(x)}</span>`).join('')}</div>
          </div>
        </div>
      `;
      return;
    }
  }

  const fallbackImpacts = [
    ['Oil', 'Energy prices likely become volatile as traders price in disruption risk.'],
    ['Markets', 'Equities may rotate to defensives while risk assets see pressure.'],
    ['Shipping', 'Insurance costs and transit delays can rise around exposed routes.'],
    ['Diplomacy', 'Emergency calls, mediation pushes, and alliance signalling usually intensify.']
  ];

  out.innerHTML = `
    <div class="card cc fi" style="margin-bottom:10px">
      <div style="font-family:var(--fm);font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:6px">LIVE FALLBACK SCENARIO</div>
      <div style="font-size:14px;color:var(--text);line-height:1.7">This scenario model uses current reporting and risk heuristics because no AI key is active. Trigger: <span style="color:var(--accent2)">${esc(trigger)}</span> · Horizon: ${esc(horizon)}</div>
    </div>
    <div class="g2">
      ${fallbackImpacts.map(([k, v]) => `
        <div class="card cp">
          <div style="font-size:14px;color:var(--accent);margin-bottom:6px">${esc(k)}</div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(v)}</div>
        </div>
      `).join('')}
    </div>
    <div class="sec">RELATED LIVE SIGNALS</div>
    <div>${live.length ? live.map(a => `
      <a class="nc" href="${a.link}" target="_blank">
        <div style="font-family:var(--fm);font-size:12px;color:var(--accent)">${esc(a.source)} · ${timeAgoLite(a.published)}</div>
        <div style="font-size:14px;color:var(--text);line-height:1.55">${esc(a.title)}</div>
      </a>
    `).join('') : '<div class="card">No related live sources found right now.</div>'}</div>
  `;
}

// ══════════════════════════════════════════
// TIMELINE
// ══════════════════════════════════════════
const TL_PRESETS = [
  ['India', 'China'],
  ['United States', 'China'],
  ['Russia', 'Ukraine'],
  ['Iran', 'Israel'],
  ['India', 'Pakistan']
];

function initTimelineUI() {
  const quick = document.getElementById('tl-quick');
  if (!quick) return;
  quick.innerHTML = TL_PRESETS.map(([a, b]) => `
    <button class="fp" onclick="useTimelinePair('${a.replace(/'/g, "\\'")}','${b.replace(/'/g, "\\'")}')">${esc(a)} ↔ ${esc(b)}</button>
  `).join('');
}

function useTimelinePair(a, b) {
  const A = document.getElementById('tl-a');
  const B = document.getElementById('tl-b');
  if (A) A.value = a;
  if (B) B.value = b;
}

async function loadTimeline() {
  const a = (document.getElementById('tl-a')?.value || '').trim();
  const b = (document.getElementById('tl-b')?.value || '').trim();
  const out = document.getElementById('tl-results');
  if (!out) return;

  if (!a || !b) {
    out.innerHTML = '<div class="lb2">ENTER BOTH ENTITIES TO LOAD TIMELINE</div>';
    return;
  }

  out.innerHTML = '<div class="lb2"><div class="sp"></div>BUILDING TIMELINE...</div>';
  const live = await fetchLiveArticles(`"${a}" AND "${b}" OR ${a} ${b} relations`, 8);

  if (GK) {
    const sys = 'You are a geopolitical historian. Return ONLY valid JSON: {"summary":string,"events":[{"year":string,"title":string,"desc":string}]}';
    const usr = JSON.stringify({
      entityA: a,
      entityB: b,
      liveSignals: live.map(x => x.title)
    });
    const txt = await groq(sys, usr, 1100);
    const d = pj(txt);

    if (d?.events?.length) {
      out.innerHTML = `
        <div class="card cc fi" style="margin-bottom:10px">
          <div style="font-family:var(--fm);font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:6px">RELATIONSHIP SUMMARY</div>
          <div style="font-size:14px;color:var(--text);line-height:1.7">${esc(d.summary || '-')}</div>
        </div>
        ${d.events.map(ev => `
          <div class="card cp fi" style="margin-bottom:10px;border-left:3px solid var(--accent)">
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="min-width:90px;font-family:var(--fm);font-size:18px;color:var(--accent2)">${esc(ev.year || '-')}</div>
              <div>
                <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">${esc(ev.title || '-')}</div>
                <div style="font-size:13px;color:var(--subtle);line-height:1.6">${esc(ev.desc || '-')}</div>
              </div>
            </div>
          </div>
        `).join('')}
      `;
      return;
    }
  }

  const fallback = [
    { year:'Historic phase', title:`${a} and ${b} develop strategic context`, desc:'Initial rivalry, alignment, or regional interactions shape the long-term relationship.' },
    { year:'Turning point', title:'Major diplomatic or security event', desc:'A crisis, treaty, summit, or border issue changes the trajectory of ties.' },
    { year:'Recent phase', title:'Current competitive / cooperative pattern', desc:'Trade, military posture, diplomacy, and global alignments define the present period.' }
  ];

  out.innerHTML = `
    <div class="card cc fi" style="margin-bottom:10px">
      <div style="font-family:var(--fm);font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:6px">LIVE TIMELINE FALLBACK</div>
      <div style="font-size:14px;color:var(--text);line-height:1.7">Timeline generated from structural relationship analysis and available current coverage for ${esc(a)} and ${esc(b)}.</div>
    </div>
    ${fallback.map(ev => `
      <div class="card cp fi" style="margin-bottom:10px;border-left:3px solid var(--accent)">
        <div style="display:flex;gap:12px;align-items:flex-start">
          <div style="min-width:90px;font-family:var(--fm);font-size:18px;color:var(--accent2)">${esc(ev.year)}</div>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">${esc(ev.title)}</div>
            <div style="font-size:13px;color:var(--subtle);line-height:1.6">${esc(ev.desc)}</div>
          </div>
        </div>
      </div>
    `).join('')}
    <div class="sec">RELATED LIVE SOURCES</div>
    <div>${live.length ? live.map(a => `
      <a class="nc" href="${a.link}" target="_blank">
        <div style="font-family:var(--fm);font-size:12px;color:var(--accent)">${esc(a.source)} · ${timeAgoLite(a.published)}</div>
        <div style="font-size:14px;color:var(--text);line-height:1.55">${esc(a.title)}</div>
      </a>
    `).join('') : '<div class="card">No direct live sources found for this pair right now.</div>'}</div>
  `;
}

// ══════════════════════════════════════════
// BIAS DETECTOR
// ══════════════════════════════════════════
const BIAS_TOPICS = ['Gaza ceasefire', 'Taiwan Strait tensions', 'Ukraine war', 'US-China tech rivalry', 'India border security'];

function initBias() {
  const wrap = document.getElementById('bias-trends');
  if (!wrap) return;
  wrap.innerHTML = BIAS_TOPICS.map(t => `
    <button class="fp" onclick="useBiasTopic('${t.replace(/'/g, "\\'")}')">${esc(t)}</button>
  `).join('');
}

function useBiasTopic(topic) {
  const input = document.getElementById('bias-input');
  if (input) input.value = topic;
}

function frameFromSource(src='') {
  const s = src.toLowerCase();
  if (s.includes('bbc')) return { name:'BBC', angle:'institutional / procedural' };
  if (s.includes('al jazeera')) return { name:'Al Jazeera', angle:'human impact / regional' };
  if (s.includes('xinhua') || s.includes('cgtn')) return { name:'Chinese state media', angle:'state stability / sovereignty' };
  if (s.includes('rt') || s.includes('sputnik')) return { name:'Russian state media', angle:'counter-western / strategic narrative' };
  if (s.includes('reuters')) return { name:'Reuters', angle:'wire / market-sensitive' };
  return { name:src || 'Source', angle:'editorial framing varies' };
}

async function analyzeBias() {
  const topic = (document.getElementById('bias-input')?.value || '').trim();
  const out = document.getElementById('bias-results');
  if (!out) return;

  if (!topic) {
    out.innerHTML = '<div class="lb2">ENTER A TOPIC TO ANALYZE MEDIA NARRATIVES</div>';
    return;
  }

  out.innerHTML = '<div class="lb2"><div class="sp"></div>COMPARING MEDIA FRAMES...</div>';
  const live = await fetchLiveArticles(topic, 12);

  if (GK && live.length) {
    const sys = 'You are a media framing analyst. Return ONLY valid JSON: {"summary":string,"rows":[{"source":string,"frame":string,"bias":number,"tone":string}],"takeaway":string}';
    const usr = JSON.stringify({
      topic,
      headlines: live.map(x => ({ source:x.source, title:x.title, summary:x.summary }))
    });
    const txt = await groq(sys, usr, 1000);
    const d = pj(txt);

    if (d?.rows?.length) {
      out.innerHTML = `
        <div class="card cc fi" style="margin-bottom:10px">
          <div style="font-family:var(--fm);font-size:11px;color:var(--accent);letter-spacing:2px;margin-bottom:6px">AI MEDIA READOUT</div>
          <div style="font-size:14px;color:var(--text);line-height:1.7">${esc(d.summary || '-')}</div>
        </div>
        <div class="g2" style="margin-bottom:10px">
          ${d.rows.map(r => `
            <div class="card cp fi">
              <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">
                <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(r.source || '-')}</div>
                <div style="font-family:var(--fm);font-size:14px;color:var(--accent2)">${Number(r.bias || 0)}/100</div>
              </div>
              <div style="font-size:13px;color:var(--subtle);line-height:1.6;margin-bottom:6px">${esc(r.frame || '-')}</div>
              <div style="font-size:12px;color:var(--muted)">Tone: ${esc(r.tone || '-')}</div>
            </div>
          `).join('')}
        </div>
        <div class="card ca fi"><div style="font-size:13px;color:var(--text);line-height:1.65">${esc(d.takeaway || '-')}</div></div>
      `;
      return;
    }
  }

  const rows = live.slice(0, 6).map(x => {
    const f = frameFromSource(x.source);
    const bias = Math.min(92, Math.max(28, Math.round((x.score || 40) * 1.2)));
    return { source:f.name, frame:f.angle, bias, title:x.title };
  });

  out.innerHTML = `
    <div class="g2" style="margin-bottom:10px">
      ${rows.map(r => `
        <div class="card cp fi">
          <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">
            <div style="font-size:15px;font-weight:700;color:var(--text)">${esc(r.source)}</div>
            <div style="font-family:var(--fm);font-size:14px;color:var(--accent2)">${r.bias}/100</div>
          </div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.6;margin-bottom:6px">${esc(r.frame)}</div>
          <div style="font-size:13px;color:var(--text);line-height:1.55">${esc(r.title)}</div>
        </div>
      `).join('')}
    </div>
    <div class="card cc fi">
      <div style="font-size:13px;color:var(--text);line-height:1.65">Fallback bias analysis compares source framing style, tone, and escalation emphasis from current coverage. Add a Groq API key for deeper narrative decomposition.</div>
    </div>
  `;
}

// ══════════════════════════════════════════
// MY FEED
// ══════════════════════════════════════════
const FEED_TOPICS = [
  'Middle East conflict',
  'India-China',
  'Energy markets',
  'AI regulation',
  'US-China rivalry',
  'Crypto',
  'Supply chains',
  'Europe security',
  'Climate risk',
  'Defense technology'
];

let userFeedTopics = JSON.parse(localStorage.getItem('goe_topics') || '["Middle East conflict","India-China","Energy markets","AI regulation"]');

function toggleFeedProfile() {
  const box = document.getElementById('feed-profile');
  if (!box) return;
  box.style.display = box.style.display === 'none' || !box.style.display ? 'block' : 'none';
  renderFeedTopicPicker();
}

function renderFeedTopicPicker() {
  const wrap = document.getElementById('feed-topics-wrap');
  if (!wrap) return;
  wrap.innerHTML = FEED_TOPICS.map(t => `
    <button class="fp ${userFeedTopics.includes(t) ? 'active' : ''}" style="margin:4px" onclick="toggleFeedTopic('${t.replace(/'/g, "\\'")}')">${esc(t)}</button>
  `).join('');
}

function toggleFeedTopic(topic) {
  if (userFeedTopics.includes(topic)) {
    userFeedTopics = userFeedTopics.filter(x => x !== topic);
  } else {
    userFeedTopics.push(topic);
  }
  renderFeedTopicPicker();
}

function saveFeed() {
  localStorage.setItem('goe_topics', JSON.stringify(userFeedTopics));
  loadFeed();
  const box = document.getElementById('feed-profile');
  if (box) box.style.display = 'none';
}

async function loadFeed() {
  const chips = document.getElementById('feed-chips');
  const results = document.getElementById('feed-results');
  const curator = document.getElementById('feed-curator');
  if (!chips || !results || !curator) return;

  chips.innerHTML = userFeedTopics.map(t => `<span class="tag c">${esc(t)}</span>`).join('');
  results.innerHTML = '<div class="lb2"><div class="sp"></div>LOADING YOUR FEED...</div>';

  const q = userFeedTopics.slice(0, 4).join(' OR ');
  const live = await fetchLiveArticles(q, 16);

  if (GK && live.length) {
    const sys = 'You are an intelligence feed curator. Return ONLY valid JSON: {"curator":string,"priority":[string],"items":[{"title":string,"why":string,"source":string,"link":string}]}';
    const usr = JSON.stringify({
      topics: userFeedTopics,
      headlines: live.map(x => ({ title:x.title, source:x.source, link:x.link }))
    });
    const txt = await groq(sys, usr, 1100);
    const d = pj(txt);

    if (d?.items?.length) {
      curator.style.display = 'block';
      curator.innerHTML = `
        <div style="font-family:var(--fm);font-size:11px;color:var(--accent3);letter-spacing:2px;margin-bottom:6px">AI CURATOR NOTE</div>
        <div>${esc(d.curator || '-')}</div>
        <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${(d.priority || []).map(x => `<span class="tag c">${esc(x)}</span>`).join('')}</div>
      `;

      results.innerHTML = d.items.map(it => `
        <a class="nc" href="${it.link || '#'}" target="_blank">
          <div style="font-family:var(--fm);font-size:12px;color:var(--accent)">${esc(it.source || 'Source')}</div>
          <div style="font-size:15px;color:var(--text);line-height:1.5;margin:4px 0">${esc(it.title || '-')}</div>
          <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(it.why || '-')}</div>
        </a>
      `).join('');
      return;
    }
  }

  curator.style.display = 'none';
  results.innerHTML = live.length ? live.map(a => `
    <a class="nc" href="${a.link}" target="_blank">
      <div style="font-family:var(--fm);font-size:12px;color:var(--accent)">${esc(a.source)} · ${timeAgoLite(a.published)}</div>
      <div style="font-size:15px;color:var(--text);line-height:1.5;margin:4px 0">${esc(a.title)}</div>
      <div style="font-size:13px;color:var(--subtle);line-height:1.55">${esc(a.summary || 'Live item matched to your selected interests.')}</div>
    </a>
  `).join('') : '<div class="card">No feed items found right now. Try different interests.</div>';
}

// ══════════════════════════════════════════
// ASK AI
// ══════════════════════════════════════════
const AI_SUGS = [
  'What are the top geopolitical risks this week?',
  'How could Middle East escalation affect oil prices?',
  'Summarize India-China tensions in simple terms.',
  'What should investors watch in the next 7 days?',
  'Which countries are most unstable right now?'
];

function initAI() {
  const sugs = document.getElementById('ai-sugs');
  const hist = document.getElementById('ai-hist');
  if (!sugs || !hist) return;

  sugs.innerHTML = AI_SUGS.map(s => `
    <button class="fp" onclick="askSuggestion('${s.replace(/'/g, "\\'")}')">${esc(s)}</button>
  `).join('');

  hist.innerHTML = `
    <div class="msg ai">
      <div class="who">AI ANALYST</div>
      <div class="bubble">Ask about geopolitics, markets, conflict risk, climate exposure, supply chains, or country outlooks.</div>
    </div>
  `;
}

function askSuggestion(text) {
  const box = document.getElementById('ai-in');
  if (box) box.value = text;
}

function pushAIMessage(role, text) {
  const hist = document.getElementById('ai-hist');
  if (!hist) return;

  const safeText = (text === null || text === undefined) ? '[No AI response]' : String(text);

  hist.innerHTML += `
    <div class="msg ${role === 'user' ? 'you' : 'ai'}">
      <div class="who">${role === 'user' ? 'YOU' : 'AI ANALYST'}</div>
      <div class="bubble">${esc(safeText).replace(/\n/g, '<br>')}</div>
    </div>
  `;

  hist.scrollTop = hist.scrollHeight;
}

async function sendAI() {
  const input = document.getElementById('ai-in');
  if (!input) return;

  const q = input.value.trim();
  if (!q) return;

  pushAIMessage('user', q);
  input.value = '';

  try {
    const live = await fetchLiveArticles(q, 8);

    const sys = 'You are a geopolitical intelligence analyst. Answer clearly, directly, and simply. Use the live signals if relevant. Keep the answer readable and useful.';
    const usr = JSON.stringify({
      question: q,
      liveSignals: live.map(x => ({
        title: x.title,
        source: x.source,
        published: x.published,
        summary: x.summary
      }))
    });

    const txt = await groq(sys, usr, 900);

    if (txt === null || txt === undefined) {
      throw new Error('AI returned null');
    }

    const finalText = String(txt).trim();

    if (!finalText) {
      throw new Error('AI returned empty text');
    }

    pushAIMessage('ai', finalText);

  } catch (e) {
    console.error('ASK AI ERROR:', e);
    pushAIMessage('ai', 'AI error: ' + (e.message || e));
  }
}
// ══════════════════════════════════════════
// MARKETS — ALPHA VANTAGE
// Paste this above the final DOMContentLoaded block
// ══════════════════════════════════════════

function getAVKey() {
  return (localStorage.getItem('alpha_vantage_key') || '').trim();
}

function fmtNum(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

const INDEX_SYMBOLS = [
  { s:'SPY', n:'S&P 500 ETF' },
  { s:'QQQ', n:'NASDAQ 100 ETF' },
  { s:'EPI', n:'India ETF' }
];

const COMMODITIES = [
  { s:'BRENT', n:'Brent Crude', v:'Live proxy', c:'--', u:'flat', rawChange:0, open:'--', high:'--', low:'--', prev:'--', chartType:'commodity' },
  { s:'GOLD', n:'Gold', v:'Live proxy', c:'--', u:'flat', rawChange:0, open:'--', high:'--', low:'--', prev:'--', chartType:'commodity' },
  { s:'NATGAS', n:'Natural Gas', v:'Live proxy', c:'--', u:'flat', rawChange:0, open:'--', high:'--', low:'--', prev:'--', chartType:'commodity' }
];

async function fetchAVStock(symbol, name) {
  const key = getAVKey();
  if (!key) throw new Error('Missing Alpha Vantage key');

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  if (d.Note) throw new Error(d.Note);
  if (d['Error Message']) throw new Error(d['Error Message']);

  const q = d['Global Quote'];
  if (!q || !q['05. price']) throw new Error(`No stock data for ${symbol}`);

  const price = Number(q['05. price'] || 0);
  const open = Number(q['02. open'] || 0);
  const high = Number(q['03. high'] || 0);
  const low = Number(q['04. low'] || 0);
  const prev = Number(q['08. previous close'] || 0);
  const pct = Number(String(q['10. change percent'] || '0').replace('%', ''));

  return {
    s: symbol,
    n: name,
    v: fmtNum(price),
    c: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    u: pct >= 0 ? 'up' : 'down',
    rawChange: pct,
    open: fmtNum(open),
    high: fmtNum(high),
    low: fmtNum(low),
    prev: fmtNum(prev),
    chartType: 'stock'
  };
}

async function fetchCryptoLive() {
  const key = getAVKey();
  if (!key) return [];

  const coins = [
    { symbol:'BTC', name:'Bitcoin' }
  ];

  const results = await Promise.allSettled(
    coins.map(async c => {
      const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=${c.symbol}&market=USD&apikey=${key}`;
      const r = await fetch(url);
      const d = await r.json();

      console.log('CRYPTO RAW', c.symbol, d);

      if (d.Note) throw new Error(d.Note);
      if (d['Error Message']) throw new Error(d['Error Message']);

      const ts = d['Time Series (Digital Currency Daily)'];
      if (!ts) throw new Error('No crypto data');

      const rows = Object.entries(ts);
      if (rows.length < 2) throw new Error('Not enough crypto rows');

      const latestBar = rows[0][1];
      const prevBar = rows[1][1];

      const close = Number(latestBar['4a. close (USD)']);
      const open = Number(latestBar['1a. open (USD)']);
      const high = Number(latestBar['2a. high (USD)']);
      const low = Number(latestBar['3a. low (USD)']);
      const prevClose = Number(prevBar['4a. close (USD)']);

      if (![close, open, high, low, prevClose].every(Number.isFinite)) {
        throw new Error('Invalid crypto numeric fields');
      }

      const pct = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;

      return {
        s: c.symbol,
        n: c.name,
        v: fmtNum(close),
        c: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
        u: pct >= 0 ? 'up' : 'down',
        rawChange: pct,
        open: fmtNum(open),
        high: fmtNum(high),
        low: fmtNum(low),
        prev: fmtNum(prevClose),
        chartType: 'crypto'
      };
    })
  );

  return results
    .filter(x => x.status === 'fulfilled')
    .map(x => x.value);
}

async function fetchForexLive() {
  const key = getAVKey();
  if (!key) return [];

  const pairs = [
    { from:'USD', to:'INR', s:'USD/INR', n:'Dollar / Rupee' }
  ];

  const results = await Promise.allSettled(
    pairs.map(async p => {
      const quoteUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${p.from}&to_currency=${p.to}&apikey=${key}`;
      const qr = await fetch(quoteUrl);
      const qd = await qr.json();

      console.log('FOREX RATE RAW', p.s, qd);

      if (qd.Note) throw new Error(qd.Note);
      if (qd['Error Message']) throw new Error(qd['Error Message']);

      const ex = qd['Realtime Currency Exchange Rate'];
      if (!ex) throw new Error('No forex realtime rate');

      const rate = Number(ex['5. Exchange Rate']);
      if (!Number.isFinite(rate)) throw new Error('Invalid forex rate');

      await new Promise(r => setTimeout(r, 1200));

      const dailyUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${p.from}&to_symbol=${p.to}&outputsize=compact&apikey=${key}`;
      const dr = await fetch(dailyUrl);
      const dd = await dr.json();

      console.log('FOREX DAILY RAW', p.s, dd);

      if (dd.Note) throw new Error(dd.Note);
      if (dd['Error Message']) throw new Error(dd['Error Message']);

      const ts = dd['Time Series FX (Daily)'];
      if (!ts) throw new Error('No forex daily data');

      const rows = Object.entries(ts);
      if (rows.length < 2) throw new Error('Not enough forex daily rows');

      const latestBar = rows[0][1];
      const prevBar = rows[1][1];

      const open = Number(latestBar['1. open']);
      const high = Number(latestBar['2. high']);
      const low = Number(latestBar['3. low']);
      const prevClose = Number(prevBar['4. close']);

      if (![open, high, low, prevClose].every(Number.isFinite)) {
        throw new Error('Invalid forex daily numeric fields');
      }

      const pct = prevClose ? ((rate - prevClose) / prevClose) * 100 : 0;

      return {
        s: p.s,
        n: p.n,
        v: fmtNum(rate),
        c: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
        u: pct >= 0 ? 'up' : 'down',
        rawChange: pct,
        open: fmtNum(open),
        high: fmtNum(high),
        low: fmtNum(low),
        prev: fmtNum(prevClose),
        chartType: 'fx'
      };
    })
  );

  return results
    .filter(x => x.status === 'fulfilled')
    .map(x => x.value);
}

async function fetchAVRSI(symbol) {
  const key = getAVKey();
  if (!key) return null;

  try {
    const url = `https://www.alphavantage.co/query?function=RSI&symbol=${encodeURIComponent(symbol)}&interval=daily&time_period=14&series_type=close&apikey=${key}`;
    const r = await fetch(url);
    const d = await r.json();

    if (d.Note) throw new Error(d.Note);
    if (d['Error Message']) throw new Error(d['Error Message']);

    const ts = d['Technical Analysis: RSI'];
    if (!ts) return null;

    const first = Object.entries(ts)[0];
    if (!first) return null;

    return Number(first[1]['RSI']);
  } catch {
    return null;
  }
}

function getCommodities() {
  return COMMODITIES;
}

function renderMarketCards(targetId, rows, clickToHero = true) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = rows.length ? rows.map(x => `
    <div class="card cc fi" ${clickToHero ? `onclick='setHeroFromMarket("${x.s}")' style="cursor:pointer"` : ''}>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${x.s}</div>
          <div style="font-size:12px;color:var(--muted)">${x.n}</div>
        </div>
        <div style="font-family:var(--fm);font-size:12px;color:${x.u === 'up' ? '#22c55e' : x.u === 'down' ? '#ef4444' : 'var(--muted)'}">${x.c}</div>
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:8px">${x.v}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;font-size:11px;color:var(--subtle)">
        <div>Open: <span style="color:var(--text)">${x.open}</span></div>
        <div>High: <span style="color:var(--text)">${x.high}</span></div>
        <div>Low: <span style="color:var(--text)">${x.low}</span></div>
        <div>Prev: <span style="color:var(--text)">${x.prev}</span></div>
      </div>
    </div>
  `).join('') : '<div class="card">No data available.</div>';
}

function renderStrip(allRows) {
  const strip = document.getElementById('markets-strip');
  if (!strip) return;

  strip.innerHTML = allRows.length ? allRows.map(x => `
    <span class="tick-chip">${x.s} ${x.v} <span style="color:${x.u === 'up' ? '#22c55e' : x.u === 'down' ? '#ef4444' : 'var(--muted)'}">${x.c}</span></span>
  `).join('') : '<span class="tick-chip">NO LIVE MARKET DATA</span>';
}

function renderWatchlist(allRows) {
  const box = document.getElementById('markets-watchlist');
  if (!box) return;

  box.innerHTML = allRows.length ? allRows.map(x => `
    <div class="nc" onclick='setHeroFromMarket("${x.s}")' style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:13px;color:var(--text)">${x.s}</div>
          <div style="font-size:11px;color:var(--muted)">${x.n}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--accent)">${x.v}</div>
          <div style="font-size:11px;color:${x.u === 'up' ? '#22c55e' : x.u === 'down' ? '#ef4444' : 'var(--muted)'}">${x.c}</div>
        </div>
      </div>
    </div>
  `).join('') : '<div class="card">No symbols loaded.</div>';
}

function renderQuickCompare(allRows) {
  const box = document.getElementById('markets-quick-grid');
  if (!box) return;

  box.innerHTML = allRows.slice(0, 6).map(x => `
    <div class="card cp fi" onclick='setHeroFromMarket("${x.s}")' style="cursor:pointer">
      <div style="font-size:12px;color:var(--muted)">${x.s}</div>
      <div style="font-size:18px;color:var(--text);font-weight:700">${x.v}</div>
      <div style="font-size:12px;color:${x.u === 'up' ? '#22c55e' : x.u === 'down' ? '#ef4444' : 'var(--muted)'}">${x.c}</div>
    </div>
  `).join('');
}

function renderTopMovers(allRows) {
  const box = document.getElementById('top-movers');
  if (!box) return;

  const rows = [...allRows]
    .filter(x => Number.isFinite(x.rawChange))
    .sort((a, b) => Math.abs(b.rawChange) - Math.abs(a.rawChange))
    .slice(0, 5);

  box.innerHTML = rows.length ? rows.map(x => `
    <div class="nc" onclick='setHeroFromMarket("${x.s}")' style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:13px;color:var(--text)">${x.s}</div>
          <div style="font-size:11px;color:var(--muted)">${x.n}</div>
        </div>
        <div style="font-size:12px;color:${x.u === 'up' ? '#22c55e' : '#ef4444'}">${x.c}</div>
      </div>
    </div>
  `).join('') : '<div class="card">No movers available.</div>';
}

function renderHeroChart(rawChange) {
  const svg = document.getElementById('market-mini-chart');
  if (!svg) return;

  const w = 800;
  const h = 220;
  const points = [];
  let base = 110;

  for (let i = 0; i < 24; i++) {
    const drift = (rawChange || 0) * 0.35;
    const noise = (Math.sin(i / 2.3) * 10) + (Math.cos(i / 3.7) * 6);
    const y = Math.max(18, Math.min(200, base - drift * i * 0.6 - noise));
    points.push([i * (w / 23), y]);
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const stroke = rawChange >= 0 ? '#22c55e' : '#ef4444';
  const fill = rawChange >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)';

  svg.innerHTML = `
    <path d="${area}" fill="${fill}"></path>
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
  `;
}

let _marketAllRows = [];

function setHeroFromMarket(symbol) {
  const row = _marketAllRows.find(x => x.s === symbol);
  if (!row) return;

  const ids = {
    symbol:'hero-symbol',
    name:'hero-name',
    price:'hero-price',
    change:'hero-change',
    open:'hero-open',
    high:'hero-high',
    low:'hero-low',
    prev:'hero-prev'
  };

  document.getElementById(ids.symbol).textContent = row.s;
  document.getElementById(ids.name).textContent = row.n;
  document.getElementById(ids.price).textContent = row.v;

  const changeEl = document.getElementById(ids.change);
  changeEl.textContent = row.c;
  changeEl.style.color = row.u === 'up' ? '#22c55e' : row.u === 'down' ? '#ef4444' : 'var(--muted)';

  document.getElementById(ids.open).textContent = row.open;
  document.getElementById(ids.high).textContent = row.high;
  document.getElementById(ids.low).textContent = row.low;
  document.getElementById(ids.prev).textContent = row.prev;

  renderHeroChart(row.rawChange || 0);
}

async function loadMarkets() {
  const updated = document.getElementById('markets-updated');
  const ig = document.getElementById('ig');
  const cg = document.getElementById('cg');
  const fg = document.getElementById('fg');

  if (updated) updated.textContent = 'Loading Alpha Vantage market data...';

  try {
    const key = getAVKey();
    if (!key) {
      if (updated) updated.textContent = 'Missing Alpha Vantage key.';
      if (ig) ig.innerHTML = '<div class="card">Missing Alpha Vantage key.</div>';
      if (cg) cg.innerHTML = '<div class="card">Missing Alpha Vantage key.</div>';
      if (fg) fg.innerHTML = '<div class="card">Missing Alpha Vantage key.</div>';
      return;
    }

    let indices = [];
    let crypto = [];
    let forex = [];
    const commodities = getCommodities();

    // STOCKS
    try {
      indices = [];
      for (const x of INDEX_SYMBOLS) {
        const row = await fetchAVStock(x.s, x.n);
        indices.push(row);
        await new Promise(r => setTimeout(r, 1200));
      }
      renderMarketCards('ig', indices, true);
    } catch (e) {
      console.error('INDICES ERROR:', e);
      if (ig) ig.innerHTML = `<div class="card">Indices failed: ${e.message || e}</div>`;
    }

    // CRYPTO
    try {
      crypto = await fetchCryptoLive();
      if (crypto.length) {
        renderMarketCards('cg', crypto, true);
      } else {
        if (cg) cg.innerHTML = '<div class="card">Crypto returned no rows.</div>';
      }
    } catch (e) {
      console.error('CRYPTO ERROR:', e);
      if (cg) cg.innerHTML = `<div class="card">Crypto failed: ${e.message || e}</div>`;
    }

    // FOREX
    try {
      forex = await fetchForexLive();
      if (forex.length) {
        renderMarketCards('fg', forex, true);
      } else {
        if (fg) fg.innerHTML = '<div class="card">Forex returned no rows.</div>';
      }
    } catch (e) {
      console.error('FOREX ERROR:', e);
      if (fg) fg.innerHTML = `<div class="card">Forex failed: ${e.message || e}</div>`;
    }

    renderMarketCards('og', commodities, false);

    _marketAllRows = [...indices, ...crypto, ...forex];
    renderStrip(_marketAllRows);
    renderWatchlist(_marketAllRows);
    renderQuickCompare(_marketAllRows);
    renderTopMovers(_marketAllRows);

    if (_marketAllRows.length) {
      setHeroFromMarket(_marketAllRows[0].s);
    }

    const summary = document.getElementById('markets-summary');
    if (summary) {
      summary.innerHTML = `
        <div class="summary-row"><span>Status</span><strong>Live</strong></div>
        <div class="summary-row"><span>Indices</span><strong>${indices.length}</strong></div>
        <div class="summary-row"><span>Crypto</span><strong>${crypto.length}</strong></div>
        <div class="summary-row"><span>Commodities</span><strong>${commodities.length}</strong></div>
        <div class="summary-row"><span>Forex</span><strong>${forex.length}</strong></div>
        <div class="summary-row"><span>RSI (Hero)</span><strong>--</strong></div>
      `;
    }

    if (updated) {
      updated.textContent =
        'Updated ' + new Date().toLocaleTimeString() +
        ' · Indices: Alpha Vantage · Crypto: Alpha Vantage · Forex: Alpha Vantage';
    }

    if (!_marketAllRows.length && updated) {
      updated.textContent = 'No usable Alpha Vantage data returned. Check console logs.';
    }

  } catch (e) {
    console.error('MARKETS LOAD FAILED:', e);
    if (updated) updated.textContent = 'Markets load failed: ' + (e.message || e);
  }
}
// ================= MARKETS ENGINE (ALPHA VANTAGE) =================

function getAVKey() {
  return (localStorage.getItem('alpha_vantage_key') || '').trim();
}

function fmtNum(v){
  const n = Number(v || 0);
  if(!Number.isFinite(n)) return '--';
  return n >= 1 ? n.toFixed(2) : n.toFixed(4);
}

// ---------- STOCK ----------
async function fetchAVStock(symbol, name){
  const key = getAVKey();
  if(!key) throw new Error('Missing API key');

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log("STOCK RAW:", d);

  if(!d['Global Quote']) throw new Error('No stock data');

  const q = d['Global Quote'];

  const price = Number(q['05. price']);
  const prev = Number(q['08. previous close']);
  const pct = ((price - prev)/prev)*100;

  return {
    s: symbol,
    n: name,
    v: fmtNum(price),
    c: pct.toFixed(2)+'%',
    u: pct >= 0 ? 'up':'down',
    rawChange: pct,
    open: fmtNum(q['02. open']),
    high: fmtNum(q['03. high']),
    low: fmtNum(q['04. low']),
    prev: fmtNum(prev)
  };
}

// ---------- CRYPTO ----------
async function fetchCrypto(){
  const key = getAVKey();

  const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=BTC&market=USD&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log("CRYPTO RAW:", d);

  const ts = d['Time Series (Digital Currency Daily)'];
  if(!ts) return [];

  const rows = Object.values(ts);
  const latest = rows[0];
  const prev = rows[1];

  const close = Number(latest['4a. close (USD)']);
  const prevClose = Number(prev['4a. close (USD)']);
  const pct = ((close - prevClose)/prevClose)*100;

  return [{
    s:'BTC',
    n:'Bitcoin',
    v:fmtNum(close),
    c:pct.toFixed(2)+'%',
    u:pct>=0?'up':'down',
    rawChange:pct,
    open:fmtNum(latest['1a. open (USD)']),
    high:fmtNum(latest['2a. high (USD)']),
    low:fmtNum(latest['3a. low (USD)']),
    prev:fmtNum(prevClose)
  }];
}

// ---------- FOREX ----------
async function fetchForex(){
  const key = getAVKey();

  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=INR&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log("FOREX RAW:", d);

  const ex = d['Realtime Currency Exchange Rate'];
  if(!ex) return [];

  const rate = Number(ex['5. Exchange Rate']);

  return [{
    s:'USD/INR',
    n:'Dollar / Rupee',
    v:fmtNum(rate),
    c:'Live',
    u:'flat',
    rawChange:0,
    open:'--',
    high:'--',
    low:'--',
    prev:'--'
  }];
}

// ---------- LOAD MARKETS ----------
async function loadMarkets(){
  console.log('LOAD MARKETS RUNNING');
  document.getElementById('markets-updated').textContent = 'loadMarkets started...';

  const ig = document.getElementById('ig');
  const cg = document.getElementById('cg');
  const fg = document.getElementById('fg');

  try{
    const stock = await fetchAVStock('SPY','S&P 500 ETF');
    ig.innerHTML = `<div class="card">${stock.s} ${stock.v} (${stock.c})</div>`;
  }catch(e){
    ig.innerHTML = `<div class="card">Stock error</div>`;
    console.error(e);
  }

  try{
    const crypto = await fetchCrypto();
    cg.innerHTML = crypto.length
      ? `<div class="card">${crypto[0].s} ${crypto[0].v}</div>`
      : `<div class="card">Crypto failed</div>`;
  }catch(e){
    cg.innerHTML = `<div class="card">Crypto error</div>`;
    console.error(e);
  }

  try{
    const forex = await fetchForex();
    fg.innerHTML = forex.length
      ? `<div class="card">${forex[0].s} ${forex[0].v}</div>`
      : `<div class="card">Forex failed</div>`;
  }catch(e){
    fg.innerHTML = `<div class="card">Forex error</div>`;
    console.error(e);
  }
}
// ══════════════════════════════════════════
// MARKETS ENGINE — MINIMAL WORKING VERSION
// ══════════════════════════════════════════

function getAVKey() {
  return (localStorage.getItem('alpha_vantage_key') || '').trim();
}

function marketFmt(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

async function fetchMarketStock() {
  const key = getAVKey();
  if (!key) throw new Error('Missing Alpha Vantage key');

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log('MARKET STOCK RAW', d);

  if (d.Note) throw new Error(d.Note);
  if (d.Information) throw new Error(d.Information);
  if (d['Error Message']) throw new Error(d['Error Message']);

  const q = d['Global Quote'];
  if (!q || !q['05. price']) throw new Error('No stock data returned');

  const price = Number(q['05. price']);
  const open = Number(q['02. open']);
  const high = Number(q['03. high']);
  const low = Number(q['04. low']);
  const prev = Number(q['08. previous close']);
  const pct = Number(String(q['10. change percent'] || '0').replace('%', ''));

  return {
    s: 'SPY',
    n: 'S&P 500 ETF',
    v: marketFmt(price),
    c: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    u: pct >= 0 ? 'up' : 'down',
    rawChange: pct,
    open: marketFmt(open),
    high: marketFmt(high),
    low: marketFmt(low),
    prev: marketFmt(prev)
  };
}

async function fetchMarketCrypto() {
  const key = getAVKey();
  if (!key) throw new Error('Missing Alpha Vantage key');

  const url = `https://www.alphavantage.co/query?function=DIGITAL_CURRENCY_DAILY&symbol=BTC&market=USD&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log('MARKET CRYPTO RAW', d);

  if (d.Note) throw new Error(d.Note);
  if (d.Information) throw new Error(d.Information);
  if (d['Error Message']) throw new Error(d['Error Message']);

  const ts = d['Time Series (Digital Currency Daily)'];
  if (!ts) throw new Error('No crypto data returned');

  const rows = Object.values(ts);
  if (rows.length < 2) throw new Error('Not enough crypto rows');

  const latest = rows[0];
  const prevBar = rows[1];

  const close = Number(latest['4a. close (USD)']);
  const open = Number(latest['1a. open (USD)']);
  const high = Number(latest['2a. high (USD)']);
  const low = Number(latest['3a. low (USD)']);
  const prev = Number(prevBar['4a. close (USD)']);
  const pct = prev ? ((close - prev) / prev) * 100 : 0;

  return {
    s: 'BTC',
    n: 'Bitcoin',
    v: marketFmt(close),
    c: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
    u: pct >= 0 ? 'up' : 'down',
    rawChange: pct,
    open: marketFmt(open),
    high: marketFmt(high),
    low: marketFmt(low),
    prev: marketFmt(prev)
  };
}

async function fetchMarketForex() {
  const key = getAVKey();
  if (!key) throw new Error('Missing Alpha Vantage key');

  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=INR&apikey=${key}`;
  const r = await fetch(url);
  const d = await r.json();

  console.log('MARKET FOREX RAW', d);

  if (d.Note) throw new Error(d.Note);
  if (d.Information) throw new Error(d.Information);
  if (d['Error Message']) throw new Error(d['Error Message']);

  const ex = d['Realtime Currency Exchange Rate'];
  if (!ex) throw new Error('No forex data returned');

  const rate = Number(ex['5. Exchange Rate']);

  return {
    s: 'USD/INR',
    n: 'Dollar / Rupee',
    v: marketFmt(rate),
    c: 'LIVE',
    u: 'flat',
    rawChange: 0,
    open: '--',
    high: '--',
    low: '--',
    prev: '--'
  };
}

function renderMiniHeroChart(changeValue) {
  const svg = document.getElementById('market-mini-chart');
  if (!svg) return;

  const w = 800;
  const h = 220;
  const points = [];
  let base = 110;

  for (let i = 0; i < 24; i++) {
    const drift = (changeValue || 0) * 0.3;
    const noise = Math.sin(i / 2.1) * 10 + Math.cos(i / 3.2) * 6;
    const y = Math.max(18, Math.min(200, base - drift * i * 0.6 - noise));
    points.push([i * (w / 23), y]);
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const stroke = changeValue >= 0 ? '#22c55e' : '#ef4444';
  const fill = changeValue >= 0 ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)';

  svg.innerHTML = `
    <path d="${area}" fill="${fill}"></path>
    <path d="${path}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
  `;
}

function setMarketHero(row) {
  const symbol = document.getElementById('hero-symbol');
  const name = document.getElementById('hero-name');
  const price = document.getElementById('hero-price');
  const change = document.getElementById('hero-change');
  const open = document.getElementById('hero-open');
  const high = document.getElementById('hero-high');
  const low = document.getElementById('hero-low');
  const prev = document.getElementById('hero-prev');

  if (symbol) symbol.textContent = row.s;
  if (name) name.textContent = row.n;
  if (price) price.textContent = row.v;
  if (change) {
    change.textContent = row.c;
    change.style.color = row.u === 'up' ? '#22c55e' : row.u === 'down' ? '#ef4444' : 'var(--muted)';
  }
  if (open) open.textContent = row.open;
  if (high) high.textContent = row.high;
  if (low) low.textContent = row.low;
  if (prev) prev.textContent = row.prev;

  renderMiniHeroChart(row.rawChange || 0);
}

function renderSimpleMarketCard(targetId, row) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = `
    <div class="card cc">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${row.s}</div>
          <div style="font-size:12px;color:var(--muted)">${row.n}</div>
        </div>
        <div style="font-family:var(--fm);font-size:12px;color:${row.u === 'up' ? '#22c55e' : row.u === 'down' ? '#ef4444' : 'var(--muted)'}">${row.c}</div>
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:8px">${row.v}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;font-size:11px;color:var(--subtle)">
        <div>Open: <span style="color:var(--text)">${row.open}</span></div>
        <div>High: <span style="color:var(--text)">${row.high}</span></div>
        <div>Low: <span style="color:var(--text)">${row.low}</span></div>
        <div>Prev: <span style="color:var(--text)">${row.prev}</span></div>
      </div>
    </div>
  `;
}

async function loadMarkets() {
  const updated = document.getElementById('markets-updated');
  const summary = document.getElementById('markets-summary');
  const strip = document.getElementById('markets-strip');
  const watch = document.getElementById('markets-watchlist');
  const quick = document.getElementById('markets-quick-grid');
  const movers = document.getElementById('top-movers');

  if (updated) updated.textContent = 'Loading market data...';

  try {
    const key = getAVKey();
    if (!key) {
      if (updated) updated.textContent = 'Missing Alpha Vantage key';
      return;
    }

    const stock = await fetchMarketStock();
    await new Promise(r => setTimeout(r, 1200));

    const crypto = await fetchMarketCrypto();
    await new Promise(r => setTimeout(r, 1200));

    const forex = await fetchMarketForex();

    renderSimpleMarketCard('ig', stock);
    renderSimpleMarketCard('cg', crypto);
    renderSimpleMarketCard('fg', forex);

    const commodityBox = document.getElementById('og');
    if (commodityBox) {
      commodityBox.innerHTML = `
        <div class="card cc">
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">Commodities</div>
          <div style="font-size:13px;color:var(--subtle)">Keep your existing commodity source or add one later.</div>
        </div>
      `;
    }

    setMarketHero(stock);

    if (strip) {
      strip.innerHTML = `
        <span class="tick-chip">${stock.s} ${stock.v} <span style="color:${stock.u === 'up' ? '#22c55e' : '#ef4444'}">${stock.c}</span></span>
        <span class="tick-chip">${crypto.s} ${crypto.v} <span style="color:${crypto.u === 'up' ? '#22c55e' : '#ef4444'}">${crypto.c}</span></span>
        <span class="tick-chip">${forex.s} ${forex.v} <span style="color:var(--muted)">${forex.c}</span></span>
      `;
    }

    if (watch) {
      watch.innerHTML = `
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${stock.s}</span><span>${stock.v}</span></div></div>
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${crypto.s}</span><span>${crypto.v}</span></div></div>
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${forex.s}</span><span>${forex.v}</span></div></div>
      `;
    }

    if (quick) {
      quick.innerHTML = `
        <div class="card cp"><div style="font-size:12px;color:var(--muted)">${stock.s}</div><div style="font-size:18px;color:var(--text);font-weight:700">${stock.v}</div><div style="font-size:12px;color:${stock.u === 'up' ? '#22c55e' : '#ef4444'}">${stock.c}</div></div>
        <div class="card cp"><div style="font-size:12px;color:var(--muted)">${crypto.s}</div><div style="font-size:18px;color:var(--text);font-weight:700">${crypto.v}</div><div style="font-size:12px;color:${crypto.u === 'up' ? '#22c55e' : '#ef4444'}">${crypto.c}</div></div>
        <div class="card cp"><div style="font-size:12px;color:var(--muted)">${forex.s}</div><div style="font-size:18px;color:var(--text);font-weight:700">${forex.v}</div><div style="font-size:12px;color:var(--muted)">${forex.c}</div></div>
      `;
    }

    if (movers) {
      movers.innerHTML = `
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${stock.s}</span><span style="color:${stock.u === 'up' ? '#22c55e' : '#ef4444'}">${stock.c}</span></div></div>
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${crypto.s}</span><span style="color:${crypto.u === 'up' ? '#22c55e' : '#ef4444'}">${crypto.c}</span></div></div>
        <div class="nc"><div style="display:flex;justify-content:space-between"><span>${forex.s}</span><span>${forex.c}</span></div></div>
      `;
    }

    if (summary) {
      summary.innerHTML = `
        <div class="summary-row"><span>Status</span><strong>Live</strong></div>
        <div class="summary-row"><span>Indices</span><strong>1</strong></div>
        <div class="summary-row"><span>Crypto</span><strong>1</strong></div>
        <div class="summary-row"><span>Commodities</span><strong>--</strong></div>
        <div class="summary-row"><span>Forex</span><strong>1</strong></div>
      `;
    }

    if (updated) {
      updated.textContent = 'Updated ' + new Date().toLocaleTimeString() + ' · Alpha Vantage live';
    }
  } catch (e) {
    console.error('MARKETS ERROR', e);
    if (updated) updated.textContent = 'Markets failed: ' + (e.message || e);
    const ig = document.getElementById('ig');
    const cg = document.getElementById('cg');
    const fg = document.getElementById('fg');
    if (ig) ig.innerHTML = `<div class="card">Stock error: ${e.message || e}</div>`;
    if (cg) cg.innerHTML = `<div class="card">Crypto waiting</div>`;
    if (fg) fg.innerHTML = `<div class="card">Forex waiting</div>`;
  }
}
// ══════════════════════════════════════════
// MARKETS ENGINE — TWELVE DATA HIGH WORKING VERSION
// ══════════════════════════════════════════

function getTDKey() {
  return (localStorage.getItem('twelve_data_key') || '').trim();
}

function tdNum(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '--';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function tdPct(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function marketCacheSet(key, data) {
  localStorage.setItem(key, JSON.stringify({
    ts: Date.now(),
    data
  }));
}

function marketCacheGet(key, maxAgeMs = 1000 * 60 * 3) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

const TD_GROUPS = {
  indices: [
    { symbol: 'SPY', label: 'S&P 500 ETF' },
    { symbol: 'QQQ', label: 'NASDAQ 100 ETF' },
    { symbol: 'DIA', label: 'Dow Jones ETF' }
  ],
  crypto: [
    { symbol: 'BTC/USD', label: 'Bitcoin' },
    { symbol: 'ETH/USD', label: 'Ethereum' },
    { symbol: 'SOL/USD', label: 'Solana' }
  ],
  forex: [
    { symbol: 'USD/INR', label: 'Dollar / Rupee' },
    { symbol: 'EUR/USD', label: 'Euro / Dollar' },
    { symbol: 'USD/JPY', label: 'Dollar / Yen' }
  ],
  commodities: [
    { symbol: 'XAU/USD', label: 'Gold' },
    { symbol: 'XAG/USD', label: 'Silver' },
    { symbol: 'BRENT', label: 'Brent Crude' }
  ]
};

let TD_MARKET_ROWS = [];
let TD_MARKET_REFRESH = null;
let TD_ACTIVE_HERO = 'SPY';
let TD_LOADING_MARKETS = false;

async function fetchTDQuote(symbol, label) {
  const key = getTDKey();
  if (!key) throw new Error('Missing Twelve Data key');

  const cacheKey = `td_quote_${symbol}`;
  const cached = marketCacheGet(cacheKey, 1000 * 60 * 2);
  if (cached) return cached;

  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
  const res = await fetch(url);
  const data = await res.json();

  console.log('TD QUOTE RAW', symbol, data);

  if (data?.status === 'error') {
    throw new Error(data.message || `Quote failed for ${symbol}`);
  }

  if (!data || !data.symbol) {
    throw new Error(`No quote returned for ${symbol}`);
  }

  const price = Number(data.close || data.price || 0);
  const open = Number(data.open || 0);
  const high = Number(data.high || 0);
  const low = Number(data.low || 0);
  const prev = Number(data.previous_close || 0);
  const pct = Number(data.percent_change || 0);

  const row = {
    s: data.symbol || symbol,
    n: label,
    v: tdNum(price),
    c: tdPct(pct),
    u: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    rawChange: pct,
    open: tdNum(open),
    high: tdNum(high),
    low: tdNum(low),
    prev: tdNum(prev),
    rawPrice: price
  };

  marketCacheSet(cacheKey, row);
  return row;
}

async function fetchTDGroup(items) {
  const rows = [];

  for (const item of items) {
    try {
      const row = await fetchTDQuote(item.symbol, item.label);
      rows.push(row);
    } catch (e) {
      console.error('TD SYMBOL ERROR', item.symbol, e);
      rows.push({
        s: item.symbol,
        n: item.label,
        v: '--',
        c: 'N/A',
        u: 'flat',
        rawChange: 0,
        open: '--',
        high: '--',
        low: '--',
        prev: '--',
        rawPrice: 0,
        error: e.message || String(e)
      });
    }
  }

  return rows;
}

function tdColor(row) {
  return row.u === 'up' ? '#22c55e' : row.u === 'down' ? '#ef4444' : 'var(--muted)';
}
async function fetchTDHistory(symbol) {
  const key = getTDKey();
  if (!key) return [];

  try {
    const cleanSymbol = String(symbol || '').trim();
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(cleanSymbol)}&interval=1day&outputsize=20&apikey=${key}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log('TD HISTORY RAW', cleanSymbol, data);

    if (data?.status === 'error') return [];
    if (!Array.isArray(data?.values)) return [];

    return [...data.values]
      .reverse()
      .map(x => Number(x.close))
      .filter(v => Number.isFinite(v));
  } catch (e) {
    console.error('TD HISTORY ERROR', symbol, e);
    return [];
  }
}

function renderTDMiniChart(values, trend = 'flat') {
  const chart = document.getElementById('market-mini-chart');
  if (!chart) return;

  chart.setAttribute('viewBox', '0 0 800 220');
  chart.setAttribute('preserveAspectRatio', 'none');

  if (!Array.isArray(values) || values.length < 2) {
    chart.innerHTML = `
      <text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-size="14">
        No chart data
      </text>
    `;
    return;
  }

  const width = 800;
  const height = 220;
  const pad = 18;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + ((max - v) / range) * (height - pad * 2);
    return [x, y];
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const up = trend !== 'down';
  const stroke = up ? '#22c55e' : '#ef4444';
  const fill = up ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';

  chart.innerHTML = `
    <path d="${areaPath}" fill="${fill}"></path>
    <path d="${linePath}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
  `;
}

async function renderTDHero(row) {
  if (!row) return;

  const currentSymbol = row.s;

  const symbol = document.getElementById('hero-symbol');
  const name = document.getElementById('hero-name');
  const price = document.getElementById('hero-price');
  const change = document.getElementById('hero-change');
  const open = document.getElementById('hero-open');
  const high = document.getElementById('hero-high');
  const low = document.getElementById('hero-low');
  const prev = document.getElementById('hero-prev');

  if (symbol) symbol.textContent = row.s;
  if (name) name.textContent = row.n;
  if (price) price.textContent = row.v;
  if (change) {
    change.textContent = row.c;
    change.style.color = tdColor(row);
  }
  if (open) open.textContent = row.open;
  if (high) high.textContent = row.high;
  if (low) low.textContent = row.low;
  if (prev) prev.textContent = row.prev;

  let history = await fetchTDHistory(row.s);

  // If user switched hero while history was loading, stop here
  if (TD_ACTIVE_HERO !== currentSymbol) return;

  if (!history || history.length < 2) {
    const base = Number(row.rawPrice || 100);
    const pct = Number(row.rawChange || 0) / 100;
    history = [
      base * (1 - pct * 0.8),
      base * (1 - pct * 0.5),
      base * (1 - pct * 0.3),
      base * (1 - pct * 0.1),
      base
    ];
  }

  renderTDMiniChart(history, row.u);
}

function renderTDGrid(targetId, rows) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = rows.map(row => `
    <div class="card cc fi" onclick="setTDHeroBySymbol('${row.s.replace(/'/g, "\\'")}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text)">${row.s}</div>
          <div style="font-size:12px;color:var(--muted)">${row.n}</div>
        </div>
        <div style="font-family:var(--fm);font-size:12px;color:${tdColor(row)}">${row.c}</div>
      </div>
      <div style="font-size:20px;font-weight:700;color:var(--accent);margin-bottom:8px">${row.v}</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;font-size:11px;color:var(--subtle)">
        <div>Open: <span style="color:var(--text)">${row.open}</span></div>
        <div>High: <span style="color:var(--text)">${row.high}</span></div>
        <div>Low: <span style="color:var(--text)">${row.low}</span></div>
        <div>Prev: <span style="color:var(--text)">${row.prev}</span></div>
      </div>
      ${row.error ? `<div style="margin-top:8px;font-size:11px;color:#f59e0b">${row.error}</div>` : ''}
    </div>
  `).join('');
}

function renderTDStrip(rows) {
  const el = document.getElementById('markets-strip');
  if (!el) return;

  el.innerHTML = rows.map(row => `
    <span class="tick-chip">${row.s} ${row.v} <span style="color:${tdColor(row)}">${row.c}</span></span>
  `).join('');
}

function renderTDWatchlist(rows) {
  const el = document.getElementById('markets-watchlist');
  if (!el) return;

  el.innerHTML = rows.map(row => `
    <div class="nc" onclick="setTDHeroBySymbol('${row.s.replace(/'/g, "\\'")}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:13px;color:var(--text)">${row.s}</div>
          <div style="font-size:11px;color:var(--muted)">${row.n}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:13px;color:var(--accent)">${row.v}</div>
          <div style="font-size:11px;color:${tdColor(row)}">${row.c}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderTDQuick(rows) {
  const el = document.getElementById('markets-quick-grid');
  if (!el) return;

  el.innerHTML = rows.slice(0, 8).map(row => `
    <div class="card cp fi" onclick="setTDHeroBySymbol('${row.s.replace(/'/g, "\\'")}')" style="cursor:pointer">
      <div style="font-size:12px;color:var(--muted)">${row.s}</div>
      <div style="font-size:18px;color:var(--text);font-weight:700">${row.v}</div>
      <div style="font-size:12px;color:${tdColor(row)}">${row.c}</div>
    </div>
  `).join('');
}

function renderTDMovers(rows) {
  const el = document.getElementById('top-movers');
  if (!el) return;

  const movers = [...rows]
    .filter(x => Number.isFinite(x.rawChange))
    .sort((a, b) => Math.abs(b.rawChange) - Math.abs(a.rawChange))
    .slice(0, 6);

  el.innerHTML = movers.map(row => `
    <div class="nc" onclick="setTDHeroBySymbol('${row.s.replace(/'/g, "\\'")}')" style="cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:13px;color:var(--text)">${row.s}</div>
          <div style="font-size:11px;color:var(--muted)">${row.n}</div>
        </div>
        <div style="font-size:12px;color:${tdColor(row)}">${row.c}</div>
      </div>
    </div>
  `).join('');
}

function renderTDSummary(groups) {
  const el = document.getElementById('markets-summary');
  if (!el) return;

  const all = Object.values(groups).flat();
  const loaded = all.filter(x => x.v !== '--').length;
  const up = all.filter(x => x.u === 'up').length;
  const down = all.filter(x => x.u === 'down').length;

  el.innerHTML = `
    <div class="summary-row"><span>Status</span><strong>Live</strong></div>
    <div class="summary-row"><span>Loaded</span><strong>${loaded}</strong></div>
    <div class="summary-row"><span>Indices</span><strong>${groups.indices.length}</strong></div>
    <div class="summary-row"><span>Crypto</span><strong>${groups.crypto.length}</strong></div>
    <div class="summary-row"><span>Commodities</span><strong>${groups.commodities.length}</strong></div>
    <div class="summary-row"><span>Forex</span><strong>${groups.forex.length}</strong></div>
    <div class="summary-row"><span>Advancing</span><strong>${up}</strong></div>
    <div class="summary-row"><span>Declining</span><strong>${down}</strong></div>
  `;
}

function setTDHeroBySymbol(symbol) {
  TD_ACTIVE_HERO = symbol;
  const row = TD_MARKET_ROWS.find(x => x.s === symbol);
  if (row) {
    renderTDHero(row).catch(err => console.error(err));
  }
}

async function loadMarkets() {
    if (TD_LOADING_MARKETS) return;
  TD_LOADING_MARKETS = true;
  const updated = document.getElementById('markets-updated');
  if (updated) updated.textContent = 'Loading Twelve Data market feed...';

  const key = getTDKey();
  if (!key) {
    if (updated) updated.textContent = 'Missing Twelve Data key';
    return;
  }

  try {
    const indices = await fetchTDGroup(TD_GROUPS.indices);
    const crypto = await fetchTDGroup(TD_GROUPS.crypto);
    const forex = await fetchTDGroup(TD_GROUPS.forex);
    const commodities = await fetchTDGroup(TD_GROUPS.commodities);

    TD_MARKET_ROWS = [...indices, ...crypto, ...forex, ...commodities];

    renderTDGrid('ig', indices);
    renderTDGrid('cg', crypto);
    renderTDGrid('fg', forex);
    renderTDGrid('og', commodities);

    renderTDStrip(TD_MARKET_ROWS);
    renderTDWatchlist(TD_MARKET_ROWS);
    renderTDQuick(TD_MARKET_ROWS);
    renderTDMovers(TD_MARKET_ROWS);
    renderTDSummary({ indices, crypto, forex, commodities });

    const hero =
  TD_MARKET_ROWS.find(x => x.s === TD_ACTIVE_HERO) ||
  TD_MARKET_ROWS.find(x => x.v !== '--') ||
  TD_MARKET_ROWS[0];

if (hero) {
  TD_ACTIVE_HERO = hero.s;
  renderTDHero(hero).catch(err => console.error(err));
}

    if (updated) {
      updated.textContent = 'Updated ' + new Date().toLocaleTimeString() + ' · Twelve Data live';
    }
  } catch (e) {
    console.error('TWELVE DATA MARKETS ERROR', e);
    if (updated) updated.textContent = 'Markets failed: ' + (e.message || e);
  }
}

function startMarketsAutoRefresh() {
  if (TD_MARKET_REFRESH) clearInterval(TD_MARKET_REFRESH);

  TD_MARKET_REFRESH = setInterval(() => {
    if (!document.hidden) {
      loadMarkets().catch(err => console.error(err));
    }
  }, 180000); // 3 minutes
}
// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  renderChannels();
  loadMarkets();
  startMarketsAutoRefresh();
  loadPred();
  renderBriefs();
  initKG();
  loadRisk();
  loadClimate();
  initScenarioUI();
  initTimelineUI();
  initBias();
  loadFeed();
  initAI();
});

