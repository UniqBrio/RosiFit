import { parseMeetCsv } from '/home/user/RosiFit/src/data/meetCsv';
import { similarity, normalizeName } from '/home/user/RosiFit/supabase/functions/_shared/match.ts';
const first = ['Priya','Anita','Kavya','Divya','Meena','Lakshmi','Sneha','Pooja','Riya','Deepa','Nithya','Shreya'], last=['Sharma','Iyer','Nair','Reddy','Menon','Pillai','Rao','Krishnan','Das','Verma'];
const name = (i:number) => `${first[i%12]} ${last[(i*7)%10]} ${i}`;
for (const R of [10,100,500,1000,1500,5000]) {
  const csv = 'Full Name,First Seen,Time in Call\n' + Array.from({length:R},(_,i)=>`${name(i)},"Oct 1, 2026, 6:02:11 AM",45 min`).join('\n');
  const t=performance.now(); const p = parseMeetCsv(csv); const dt=performance.now()-t;
  console.log(`parseMeetCsv R=${R}: ${dt.toFixed(1)} ms, ${p.rows.length} rows, ${(csv.length/1024).toFixed(0)} KB`);
}
// Edge-function fuzzy matcher: for each CSV row that misses alias+canonical, similarity() against every member (R×N bigram computations)
for (const N of [1644, 5000]) {
  const members = Array.from({length:N},(_,i)=>normalizeName(name(i)+'x'));
  for (const R of [100, 500, 1000]) {
    const rows = Array.from({length:R},(_,i)=>normalizeName(name(i*3)+'y'));
    const t=performance.now(); let hits=0;
    for (const r of rows) { const scored = members.map(m=>similarity(r,m)).filter(s=>s>=0.8); hits+=scored.length; }
    console.log(`fuzzy R=${R} × N=${N}: ${(performance.now()-t).toFixed(0)} ms (${hits} candidates)`);
  }
}
