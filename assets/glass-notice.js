/* ===== Glass Notice Banner (shared) ===== */
(function(){
  const targets = Array.from(document.querySelectorAll('.notice-bar, .notice, .glass-notice'));
  if(!targets.length) return;

  const threshold = 60;

  function apply(){
    const scrolled = (window.scrollY || 0) > threshold;
    targets.forEach(el => el.classList.toggle('is-scrolled', scrolled));
  }

  apply();
  window.addEventListener('scroll', apply, { passive:true });
  window.addEventListener('pageshow', apply, { passive:true });
})();
