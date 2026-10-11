/* Presentation only. Existing API, cart and checkout scripts remain unchanged. */
(() => {
  function start() {
    const carousel = document.querySelector('.lumina-carousel');
    if (!carousel) return;
    const slides = Array.from(carousel.querySelectorAll('[data-lumina-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-lumina-go]'));
    const pause = carousel.querySelector('[data-lumina-pause]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0, timer, paused = reduced.matches, touching = false, focus = false, startX = null;
    function stop() { window.clearInterval(timer); }
    function schedule() {
      stop();
      if (!paused && !touching && !focus && !document.hidden && !reduced.matches) timer = window.setInterval(() => show(index + 1), 6500);
    }
    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === index);
        slide.setAttribute('aria-hidden', String(i !== index));
        slide.querySelectorAll('a,button').forEach(el => el.tabIndex = i === index ? 0 : -1);
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    }
    function move(next) { show(next); schedule(); }
    dots.forEach((dot,i) => dot.addEventListener('click', () => move(i)));
    carousel.querySelector('[data-lumina-prev]')?.addEventListener('click', () => move(index - 1));
    carousel.querySelector('[data-lumina-next]')?.addEventListener('click', () => move(index + 1));
    pause?.addEventListener('click', () => { paused = !paused; updatePause(); schedule(); });
    function updatePause() { if(pause) { pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'Retomar banners' : 'Pausar banners'); pause.textContent = paused ? '▷' : 'Ⅱ'; } }
    carousel.addEventListener('mouseenter', () => { touching = true; stop(); });
    carousel.addEventListener('mouseleave', () => { touching = false; schedule(); });
    carousel.addEventListener('focusin', () => { focus = true; stop(); });
    carousel.addEventListener('focusout', e => { if (!carousel.contains(e.relatedTarget)) { focus = false; schedule(); } });
    carousel.addEventListener('keydown', e => { if(e.key === 'ArrowRight') { e.preventDefault(); move(index + 1); } if(e.key === 'ArrowLeft') { e.preventDefault(); move(index - 1); } });
    carousel.addEventListener('touchstart', e => { startX = e.changedTouches[0]?.clientX ?? null; stop(); }, {passive:true});
    carousel.addEventListener('touchend', e => { const end = e.changedTouches[0]?.clientX; if(startX !== null && end !== undefined && Math.abs(end-startX)>50) move(index + (end<startX?1:-1)); startX=null; schedule(); }, {passive:true});
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { paused = reduced.matches; updatePause(); schedule(); });
    show(0); updatePause(); schedule();
    document.querySelectorAll('.busca-form .icone-svg').forEach(icon => { icon.tabIndex=0; icon.setAttribute('role','button'); icon.setAttribute('aria-label','Procurar produtos'); const open = () => icon.closest('form')?.querySelector('input')?.focus(); icon.addEventListener('click',open); icon.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}}); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
