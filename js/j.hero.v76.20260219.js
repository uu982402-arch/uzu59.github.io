/* HERO CAROUSEL v76 (no deps) */
(()=> {
  const root = document.getElementById('heroCarousel');
  if (!root) return;

  const track = root.querySelector('.heroTrack');
  const slides = Array.from(root.querySelectorAll('.heroSlide'));
  const dotsWrap = root.querySelector('.heroDots');
  const btnPrev = root.querySelector('.heroArrow.prev');
  const btnNext = root.querySelector('.heroArrow.next');

  if (!track || slides.length < 2 || !dotsWrap) return;

  const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoplayMs = prefersReduce ? 0 : Number(root.getAttribute('data-autoplay') || 0);

  dotsWrap.innerHTML = slides.map((_, i) =>
    `<button class="heroDot ${i===0?'is-on':''}" type="button" aria-label="${i+1}번 배너"></button>`
  ).join('');
  const dots = Array.from(dotsWrap.querySelectorAll('.heroDot'));

  const slideTo = (idx) => {
    const w = track.clientWidth || 1;
    track.scrollTo({ left: w * idx, behavior: 'smooth' });
  };
  const getIndex = () => {
    const w = track.clientWidth || 1;
    return Math.round(track.scrollLeft / w);
  };
  const sync = () => {
    const i = Math.max(0, Math.min(slides.length - 1, getIndex()));
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
  };

  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }, { passive: true });

  dots.forEach((d, i) => d.addEventListener('click', () => slideTo(i)));
  btnPrev && btnPrev.addEventListener('click', () => slideTo(Math.max(0, getIndex() - 1)));
  btnNext && btnNext.addEventListener('click', () => slideTo(Math.min(slides.length - 1, getIndex() + 1)));

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); slideTo(Math.max(0, getIndex() - 1)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); slideTo(Math.min(slides.length - 1, getIndex() + 1)); }
  });

  slides.forEach(s => {
    s.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a) return;
      const href = s.getAttribute('data-href');
      if (href) location.href = href;
    });
  });

  let timer = null;
  const start = () => {
    if (!autoplayMs || timer) return;
    timer = setInterval(() => {
      const i = getIndex();
      slideTo((i + 1) % slides.length);
    }, autoplayMs);
  };
  const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', start);

  start();
})();
