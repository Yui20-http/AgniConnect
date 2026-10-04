import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, Search, Sprout, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { categoryIcons } from '../utils/helpers';

const categories = ['Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Dairy'];

/** Scroll-linked marketplace hero using native page scrolling (no scroll lock). */
const ScrollMarketHero = ({ search, setSearch, onSearch }) => {
  const sectionRef = useRef(null);
  const imageRef = useRef(null);
  const titleRef = useRef(null);
  const taglineRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const travel = Math.max(1, section.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / travel));
        if (imageRef.current) imageRef.current.style.transform = `scale(${1 + progress * 0.09})`;
        if (titleRef.current) {
          const opacity = Math.max(0, 1 - progress * 2.1);
          titleRef.current.style.opacity = String(opacity);
          titleRef.current.style.transform = `translateY(${-progress * 34}px) scale(${1 - progress * 0.035})`;
          titleRef.current.style.filter = `blur(${progress * 8}px)`;
        }
        if (taglineRef.current) {
          const reveal = Math.max(0, Math.min(1, (progress - 0.48) * 2.3));
          taglineRef.current.style.opacity = String(reveal);
          taglineRef.current.style.transform = `translateY(${(1 - reveal) * 24}px)`;
          taglineRef.current.style.filter = `blur(${(1 - reveal) * 7}px)`;
        }
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} className="market-hero-scroll relative h-[155vh] min-h-[900px] bg-[#07120d]">
      <div className="sticky top-0 h-[100svh] min-h-[650px] overflow-hidden">
        <img src="/farm-hero.svg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[.09] lg:hidden" />
        <div className="absolute inset-0 bg-[#07120d]/80 lg:hidden" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-[34rem] w-[34rem] rounded-full border border-lime-100/10 shadow-[0_0_100px_rgba(163,230,53,.05)]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-[26rem] w-[26rem] rounded-full border border-lime-100/10" />
        <div className="relative mx-auto grid h-full max-w-[1440px] items-center gap-8 px-5 pb-12 pt-8 sm:px-8 lg:grid-cols-[1.04fr_.96fr] lg:gap-14 lg:px-12">
          <div ref={titleRef} className="relative z-10 max-w-2xl will-change-transform">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-200/20 bg-lime-200/[.06] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.18em] text-lime-200">
              <Sprout className="h-4 w-4" /> A closer connection to your food
            </div>
            <h1 className="max-w-[12ch] text-[clamp(2.8rem,6.3vw,6rem)] font-semibold leading-[.96] tracking-[-.065em] text-[#17251b]">
              Good food starts <span className="font-serif italic font-normal text-lime-300">closer</span> to home.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-100/65 sm:text-lg">Shop seasonal produce directly from the people who grow it. Clear prices, real farms, and delivery you can follow.</p>
            <form onSubmit={onSearch} className="mt-6 flex max-w-xl flex-col gap-2 rounded-2xl border border-emerald-100/15 bg-[#0c1b13]/90 p-2 shadow-[0_24px_70px_-34px_rgba(0,0,0,.85)] backdrop-blur-xl sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-100/50" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find fresh produce near you" className="h-12 w-full rounded-xl border-0 bg-transparent pl-10 pr-3 text-sm text-white outline-none ring-0 placeholder:text-emerald-100/35 focus:ring-0" /></div>
              <button type="submit" className="btn-primary h-12 px-6">Browse produce <ArrowRight className="h-4 w-4" /></button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <Link key={category} to={`/marketplace?category=${category}`} className="rounded-full border border-emerald-100/15 bg-white/[.04] px-3 py-1.5 text-xs font-medium text-emerald-50/75 transition hover:-translate-y-0.5 hover:border-lime-200/40 hover:bg-lime-200/[.08] hover:text-lime-100">{categoryIcons[category]} <span className="ml-1">{category}</span></Link>)}</div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-emerald-100/55"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" /> Direct from farms</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" /> Transparent pricing</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-lime-300" /> Tracked delivery</span></div>
          </div>
          <div className="relative mx-auto hidden w-full max-w-[590px] lg:block">
            <div ref={imageRef} className="relative h-[min(70vh,620px)] overflow-hidden rounded-[2rem] bg-[#d8e3d2] shadow-[0_32px_80px_-34px_rgba(20,45,27,.45)] will-change-transform">
              <img src="/farm-hero.svg" alt="Illustrated farm landscape with seasonal crops" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#102217]/75 via-transparent to-[#102217]/10" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white"><p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-semibold backdrop-blur">🌾 Farm to table, without the detour</p><p className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">Know who grew it. Enjoy what’s in season.</p></div>
            </div>
            <div className="float-gently absolute -bottom-5 right-4 rounded-2xl border border-[#e4e9df] bg-white p-5 shadow-[0_18px_50px_-25px_rgba(20,45,27,.35)]"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#7b887b]">This week’s harvest</p><p className="mt-1 text-sm font-semibold text-[#1d3323]">Fresh, local, in season 🍅 🥬</p></div>
          </div>
          <div ref={taglineRef} className="pointer-events-none absolute inset-x-6 top-1/2 z-20 mx-auto max-w-3xl -translate-y-1/2 text-center opacity-0 will-change-transform lg:inset-x-20">
            <p className="text-[10px] font-bold uppercase tracking-[.25em] text-lime-200">Grown nearby · Delivered with care</p>
            <p className="mt-4 text-4xl font-semibold leading-tight tracking-[-.04em] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,.7)] sm:text-6xl">Every harvest brings the farm closer.</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10"><div ref={progressRef} className="h-full origin-left scale-x-0 bg-lime-300 shadow-[0_0_16px_rgba(163,230,53,.65)]" /></div>
        <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[10px] font-bold uppercase tracking-[.25em] text-emerald-100/50"><span>Scroll to explore</span><ArrowDown className="h-4 w-4 animate-bounce text-lime-300" /></div>
      </div>
    </section>
  );
};

export default ScrollMarketHero;
