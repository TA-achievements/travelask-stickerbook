
const DATA = window.STICKERBOOK_DATA;
const byId = Object.fromEntries(DATA.achievements.map(a => [String(a.id), a]));
const categories = ["Знания","Активность","Индивидуальные","Праздники"];
const monthRu = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function esc(s){ return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function initials(name){ return String(name||"").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function avatarHTML(m){
  return m.avatarSrc
    ? `<img src="${esc(m.avatarSrc)}" alt="${esc(m.name)}" loading="lazy">`
    : `<div class="avatar-fallback" aria-label="${esc(m.name)}">${esc(initials(m.name))}</div>`;
}
function achHTML(a, extra=""){
  if(!a) return "";
  return `<div class="achievement ${extra}" data-category="${esc(a.category||"")}" tabindex="0" role="button" aria-label="${esc(a.name)}">
    <div class="achievement-visual"><img src="${esc(a.src)}" alt="${esc(a.name)}" loading="lazy"></div>
    <div class="achievement-title">${esc(a.name)}</div>
  </div>`;
}
function enableAchievementInteraction(root=document){
  root.querySelectorAll(".achievement").forEach(el=>{
    if(el.dataset.bound) return;
    el.dataset.bound="1";
    const visual=el.querySelector(".achievement-visual");
    const reset=()=>{ if(!el.classList.contains("expanded")){ visual.style.transform="perspective(760px) rotateX(0deg) rotateY(0deg) translateZ(0)"; visual.style.removeProperty("--gx"); visual.style.removeProperty("--gy"); } };
    visual.addEventListener("pointermove",e=>{
      if(el.classList.contains("expanded") || matchMedia("(hover: none)").matches) return;
      const r=visual.getBoundingClientRect();
      const nx=(e.clientX-r.left)/r.width-.5;
      const ny=(e.clientY-r.top)/r.height-.5;
      // Deliberately pronounced tilt: up/down and left/right are clearly visible.
      const rx=(-ny*48).toFixed(2); const ry=(nx*48).toFixed(2);
      visual.style.transform=`perspective(760px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(16px)`;
      visual.style.setProperty("--gx", `${((nx+.5)*100).toFixed(0)}%`);
      visual.style.setProperty("--gy", `${((ny+.5)*100).toFixed(0)}%`);
    });
    visual.addEventListener("pointerleave",reset);
    const toggle=()=>{
      el.classList.toggle("expanded");
      if(!el.classList.contains("expanded")) reset();
    };
    el.addEventListener("click",toggle);
    el.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle();} });
  });
}
function setFilters(root=document){
  root.querySelectorAll(".filters").forEach(group=>{
    group.querySelectorAll(".filter").forEach(btn=>{
      btn.addEventListener("click",()=>{
        group.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
        const cat=btn.dataset.cat;
        const scope=group.dataset.scope ? document.querySelector(group.dataset.scope) : document;
        scope.querySelectorAll(".achievement[data-category]").forEach(el=>{
          el.classList.toggle("hidden",cat!=="Все" && el.dataset.category!==cat);
        });
      });
    });
  });
}
function tenureText(startDate){
  if(!startDate) return null;
  const start=new Date(startDate+"T00:00:00");
  const now=new Date();
  const anniversary=new Date(start);
  anniversary.setFullYear(start.getFullYear()+1);
  if(now>=anniversary) return null;
  return `С нами с ${monthRu[start.getMonth()]} ${start.getFullYear()} ♡`;
}
function renderTeam(){
  const grid=document.querySelector("#teamGrid");
  if(!grid) return;
  const cards=DATA.team.map(m=>`<a class="member-card" href="member.html?id=${encodeURIComponent(m.id)}" data-search="${esc((m.name+" "+m.role).toLowerCase())}">
    <div class="photo-paper">${avatarHTML(m)}</div>
    <div class="member-name">${esc(m.name)}</div>
    <div class="member-role">${esc(m.role)}</div>
  </a>`).join("");
  grid.innerHTML=cards;
  const q=document.querySelector("#memberSearch");
  const empty=document.querySelector("#teamEmpty");
  q?.addEventListener("input",()=>{
    const s=q.value.trim().toLowerCase();
    let visible=0;
    grid.querySelectorAll(".member-card").forEach(c=>{
      const show=c.dataset.search.includes(s);
      c.classList.toggle("hidden",!show);
      if(show) visible++;
    });
    empty?.classList.toggle("hidden",visible!==0);
  });
}
function renderHeroPhotos(){
  const target=document.querySelector("#heroPhotos");
  if(!target) return;
  const sample=DATA.team.filter(x=>x.avatarSrc).slice(0,4);
  target.innerHTML=sample.map((m,i)=>`<div class="polaroid">${avatarHTML(m)}${i===0?'<div class="caption">Команда TravelAsk ♡</div>':""}</div>`).join("");
}
function renderMember(){
  const host=document.querySelector("#memberRoot");
  if(!host) return;
  const id=new URLSearchParams(location.search).get("id") || DATA.team[0]?.id;
  const m=DATA.team.find(x=>String(x.id)===String(id));
  if(!m){host.innerHTML='<div class="empty">Участник не найден</div>';return;}
  document.title=`${m.name} — TravelAsk Стикербук`;
  const tenure=m.tenure ? byId[m.tenure] : null;
  const deps=(m.department||[]).map(x=>byId[x]).filter(Boolean);
  const regular=(m.achievements||[]).map(x=>byId[x]).filter(Boolean);
  const t=tenureText(m.startDate);
  host.innerHTML=`
    <a class="back" href="index.html">← К списку команды</a>
    <section class="profile-top">
      <div class="profile-left">
        <div class="profile-photo">${avatarHTML(m)}</div>
      </div>
      <div class="profile-main">
        <div class="name-ribbon">${esc(m.name)}</div>
        <div class="profile-role">${esc(m.role)}</div>
        ${(tenure||deps.length)?`<div class="special-badges profile-special profile-special-inline">
          ${tenure?achHTML(tenure):""}
          ${deps.map(a=>achHTML(a)).join("")}
        </div>`:""}
        ${t?`<div class="tenure-note">${esc(t)}</div>`:""}
      </div>
    </section>
    <div class="section-label">Ачивки</div>
    <div class="filters" data-scope="#memberAchievements">
      <button class="filter active" data-cat="Все">Все</button>
      ${categories.map(c=>`<button class="filter" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <section id="memberAchievements" class="achievement-grid">
      ${regular.length?regular.map(a=>achHTML(a)).join(""):'<div class="empty">Пока без обычных ачивок</div>'}
    </section>`;
  enableAchievementInteraction(host); setFilters(host);
}
function renderCatalog(){
  const host=document.querySelector("#catalogRoot");
  if(!host) return;
  const regular=DATA.achievements.filter(a=>a.type==="Обычная");
  host.innerHTML=categories.map(cat=>{
    const items=regular.filter(a=>a.category===cat);
    return `<section class="category-block"><h2 class="category-title">${cat}</h2><div class="achievement-grid">${items.map(a=>achHTML(a)).join("")}</div></section>`;
  }).join("");
  enableAchievementInteraction(host);
  setFilters(document);
}
document.addEventListener("DOMContentLoaded",()=>{
  renderHeroPhotos(); renderTeam(); renderMember(); renderCatalog();
});
