/* ===== Theme preset (logo-based) ===== */
const THEME_PRESETS = {
  gold:     { accent1:"#d4af37", accent2:"#f5e27a", accentRGB:"212,175,55", glassA:.85, glassStrongA:.95, glassSoftA:.28 },
  neonblue: { accent1:"#1da1f2", accent2:"#7fe0ff", accentRGB:"29,161,242",  glassA:.84, glassStrongA:.94, glassSoftA:.26 }
};

function _clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
function _luma(r,g,b){
  const sr=r/255, sg=g/255, sb=b/255;
  const f=(u)=> (u<=0.03928? u/12.92 : Math.pow((u+0.055)/1.055, 2.4));
  return 0.2126*f(sr) + 0.7152*f(sg) + 0.0722*f(sb);
}
function _pickOnColor(r,g,b){ return _luma(r,g,b) > 0.62 ? "#00121a" : "#ffffff"; }

function _rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s=0, l=(max+min)/2;
  const d=max-min;
  if(d!==0){
    s = d/(1-Math.abs(2*l-1));
    switch(max){
      case r: h=((g-b)/d)%6; break;
      case g: h=(b-r)/d + 2; break;
      default: h=(r-g)/d + 4;
    }
    h=Math.round(h*60); if(h<0) h+=360;
  }
  return {h,s,l};
}
function _hslToRgb(h,s,l){
  const c=(1-Math.abs(2*l-1))*s;
  const x=c*(1-Math.abs((h/60)%2-1));
  const m=l-c/2;
  let r=0,g=0,b=0;
  if(0<=h && h<60){ r=c; g=x; b=0; }
  else if(60<=h && h<120){ r=x; g=c; b=0; }
  else if(120<=h && h<180){ r=0; g=c; b=x; }
  else if(180<=h && h<240){ r=0; g=x; b=c; }
  else if(240<=h && h<300){ r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}

function setThemeVars(cfg){
  try{
    const root=document.documentElement;
    if(cfg.accent1) root.style.setProperty("--accent1", cfg.accent1);
    if(cfg.accent2) root.style.setProperty("--accent2", cfg.accent2);
    if(cfg.accentRGB) root.style.setProperty("--accentRGB", cfg.accentRGB);

    if(typeof cfg.glassA==="number") root.style.setProperty("--glassA", cfg.glassA.toFixed(2));
    if(typeof cfg.glassStrongA==="number") root.style.setProperty("--glassStrongA", cfg.glassStrongA.toFixed(2));
    if(typeof cfg.glassSoftA==="number") root.style.setProperty("--glassSoftA", cfg.glassSoftA.toFixed(2));

    const rgb=(cfg.accentRGB||"212,175,55").split(",").map(v=>parseInt(v.trim(),10));
    if(rgb.length===3 && rgb.every(n=>Number.isFinite(n))){
      const on=_pickOnColor(rgb[0],rgb[1],rgb[2]);
      root.style.setProperty("--accentText", on);
      root.style.setProperty("--accentOn", on);
    }
  }catch(e){}
}

function computeAutoThemeFromLogo(imgEl){
  try{
    const canvas=document.createElement("canvas");
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    const size=64;
    canvas.width=size; canvas.height=size;
    ctx.clearRect(0,0,size,size);
    ctx.drawImage(imgEl,0,0,size,size);
    const data=ctx.getImageData(0,0,size,size).data;

    let r=0,g=0,b=0,c=0;
    for(let i=0;i<data.length;i+=4){
      const a=data[i+3];
      if(a<40) continue;
      const rr=data[i], gg=data[i+1], bb=data[i+2];
      if(rr>245 && gg>245 && bb>245) continue;  // ignore near-white
      if(rr<18 && gg<18 && bb<18) continue;     // ignore near-black
      r+=rr; g+=gg; b+=bb; c++;
    }
    if(c<60) return null;
    r=Math.round(r/c); g=Math.round(g/c); b=Math.round(b/c);

    const hsl=_rgbToHsl(r,g,b);
    const h=hsl.h;
    const a1=_hslToRgb(h, _clamp(hsl.s*1.15,0.55,0.95), 0.55);
    const a2=_hslToRgb(h, _clamp(hsl.s*0.95,0.45,0.85), 0.72);

    return {
      accent1: `rgb(${a1.r},${a1.g},${a1.b})`,
      accent2: `rgb(${a2.r},${a2.g},${a2.b})`,
      accentRGB: `${a1.r},${a1.g},${a1.b}`,
      glassA: 0.84,
      glassStrongA: 0.94,
      glassSoftA: 0.26
    };
  }catch(e){ return null; }
}

async function initTheme(){
  const sp=new URLSearchParams(location.search);
  const qTheme=(sp.get("theme")||"").toLowerCase();
  const stored=(localStorage.getItem("88_theme")||"").toLowerCase();
  const mode=(qTheme || stored || "auto");

  if(mode!=="auto" && THEME_PRESETS[mode]){
    setThemeVars(THEME_PRESETS[mode]);
    return;
  }

  const imgEl = document.querySelector(".logoImg") || document.querySelector("#loader img");
  if(!imgEl) return;
  try{
    if(!imgEl.complete) await imgEl.decode();
  }catch(e){}
  const cfg = computeAutoThemeFromLogo(imgEl);
  if(cfg) setThemeVars(cfg);
}
document.addEventListener("DOMContentLoaded", initTheme);
