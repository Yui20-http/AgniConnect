import { useEffect, useRef } from 'react';

/** Lightweight atmospheric motion and scroll reveals for the futuristic theme. */
const AmbientEffects = () => {
  const layerRef = useRef(null);

  useEffect(() => {
    const root = document.querySelector('.futuristic-ui');
    const layer = layerRef.current;
    if (!root || !layer) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let activeTilt = null;
    const moveGlow = (event) => {
      if (reduceMotion) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        root.style.setProperty('--pointer-x', `${event.clientX}px`);
        root.style.setProperty('--pointer-y', `${event.clientY}px`);
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.tilt-card');
        if (target !== activeTilt) {
          activeTilt?.classList.remove('tilt-active');
          activeTilt?.style.setProperty('--tilt-x', '0deg');
          activeTilt?.style.setProperty('--tilt-y', '0deg');
          activeTilt = target;
          activeTilt?.classList.add('tilt-active');
        }
        if (activeTilt && event.pointerType !== 'touch') {
          const rect = activeTilt.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          activeTilt.style.setProperty('--tilt-x', `${x * 7}deg`);
          activeTilt.style.setProperty('--tilt-y', `${y * -7}deg`);
        }
      });
    };
    window.addEventListener('pointermove', moveGlow, { passive: true });

    let observer;
    if (!reduceMotion && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    }

    const observe = () => {
      if (!observer) return;
      root.querySelectorAll('[data-reveal]:not([data-reveal-ready])').forEach((element) => {
        element.setAttribute('data-reveal-ready', 'true');
        observer.observe(element);
      });
    };
    observe();
    const mutationObserver = new MutationObserver(observe);
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('pointermove', moveGlow);
      activeTilt?.classList.remove('tilt-active');
      cancelAnimationFrame(raf);
      observer?.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div ref={layerRef} className="ambient-effects" aria-hidden="true">
      <span className="ambient-orb ambient-orb-a" />
      <span className="ambient-orb ambient-orb-b" />
      <span className="ambient-orb ambient-orb-c" />
      <span className="ambient-pointer-glow" />
    </div>
  );
};

export default AmbientEffects;
