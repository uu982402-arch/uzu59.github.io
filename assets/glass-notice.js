/* Optional notice bar behavior */
(function(){
  try{
    var n=document.querySelector('.glass-notice');
    if(!n) return;
    var key='88_glass_notice_dismissed';
    if(localStorage.getItem(key)==='1'){ n.remove(); return; }
    var btn=n.querySelector('[data-dismiss]');
    if(btn){
      btn.addEventListener('click', function(){
        try{ localStorage.setItem(key,'1'); }catch(e){}
        n.remove();
      });
    }
  }catch(e){}
})();
