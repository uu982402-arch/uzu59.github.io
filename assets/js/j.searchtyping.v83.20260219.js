(()=> {
  const el = document.getElementById('searchTyping');
  if (!el) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { el.textContent = '88ST.Cloud'; return; }

  const text = '88ST.Cloud';
  let i = 0;

  const tick = () => {
    i = (i + 1) % (text.length + 1);
    el.textContent = text.slice(0, i);
    const nextDelay = (i === 0) ? 900 : (i === text.length ? 1400 : 140);
    setTimeout(tick, nextDelay);
  };

  // start with slight delay
  el.textContent = '';
  setTimeout(tick, 650);
})();
