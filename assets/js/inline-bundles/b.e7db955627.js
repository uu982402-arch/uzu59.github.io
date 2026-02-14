/* slot/index.html inline#1 */
function hideLoader(){
  const l=document.getElementById("loader");
  if(!l) return;
  l.classList.add("hide");
  setTimeout(()=>l.remove(),450);
}
window.addEventListener("load", hideLoader);
setTimeout(hideLoader,2500);

(function(){
  const key="scam_popup_date";
  const today=new Date().toISOString().slice(0,10);
  if(localStorage.getItem(key)!==today){
    const el=document.getElementById("scamPopup");
    if(el) el.style.display="flex";
  }
})();
function closeScam(){
  const today=new Date().toISOString().slice(0,10);
  localStorage.setItem("scam_popup_date",today);
  const el=document.getElementById("scamPopup");
  if(el) el.style.display="none";
}
