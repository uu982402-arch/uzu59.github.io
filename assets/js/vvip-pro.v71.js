/* v71 VVIP Pro Collapse state persistence */
(function(){
  function keyFor(el){
    try{
      var k = el.getAttribute('data-prokey') || el.id || '';
      var p = location.pathname || 'page';
      return 'vvip_pro_open:' + p + ':' + k;
    }catch(e){
      return 'vvip_pro_open:page';
    }
  }

  function hydrate(el){
    var noStore = (el.getAttribute('data-pro-nostore') === '1');
    if(noStore){
      try{ el.open = false; el.removeAttribute('open'); }catch(e){}
      return;
    }
    var k = keyFor(el);
    try{
      var v = localStorage.getItem(k);
      if(v === '1') el.open = true;
    }catch(e){}

    el.addEventListener('toggle', function(){
      try{ localStorage.setItem(k, el.open ? '1':'0'); }catch(e){}
    });
  }

  function init(){
    var list = document.querySelectorAll('details.vvip-pro');
    if(!list || !list.length) return;
    list.forEach(hydrate);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
