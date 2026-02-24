'use client';

import Link from 'next/link';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import TelegramAnimation from '@/components/landing/TelegramAnimation';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  FileX2,
  MessageSquare,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Video,
} from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/trademynd';

const problemPoints = [
  { title: 'No feedback loop', description: 'No review. No correction.', icon: FileX2 },
  { title: 'You repeat the same mistakes', description: 'Old errors return. Again.', icon: Search },
  { title: 'Emotion destroys your edge', description: 'Reactive decisions take over.', icon: TrendingDown },
  { title: 'Tools break the habit', description: 'Too much effort. You stop.', icon: Compass },
];

const insightPoints = [
  'Fast enough to do every day.',
  'Simple enough to keep doing.',
  'Built where traders already are: Telegram.',
];

const solutionPoints = [
  { title: 'AI-powered journal in Telegram', description: 'Review becomes part of your normal flow.', icon: MessageSquare },
  { title: 'Capture in under 20 seconds', description: 'Log instantly. Keep momentum.', icon: Sparkles },
  { title: 'See patterns, not spreadsheets', description: 'Clear structure. Better decisions.', icon: Search },
];

const steps = [
  {
    title: 'Drop Your Trade',
    description: 'Screenshot, voice note, or type it. Inside Telegram.',
    icon: MessageSquare,
  },
  {
    title: 'AI Extracts Everything',
    description: 'Asset, entry, stop, target and R:R - extracted instantly.',
    icon: Sparkles,
  },
  {
    title: 'Spot Your Edge',
    description: 'See your patterns. Know your edge. Trade better.',
    icon: CheckCircle2,
  },
];

const whoItsFor = ['Serious retail traders.', 'Creators who value discipline over hype.', 'Anyone who wants clarity over chaos.'];
type HeroAudience = 'trader' | 'creator';

const heroCopy = {
  trader: {
    eyebrow: '83% of traders repeat the same losing pattern.',
    headlineLine1: "You Don't Lose From Bad Trades.",
    headlineLine2: 'You Lose From Never Reviewing Them.',
    subheadline: 'TradeMynd journals every trade in under 20 seconds - inside Telegram. Spot your patterns. Fix your mistakes. Trade better.',
    primaryCta: 'Log My First Trade',
    primaryHref: '/register',
    primaryExternal: false,
    secondaryCta: 'See How It Works',
    secondaryHref: '#how-it-works',
  },
  creator: {
    eyebrow: 'For Trading YouTubers & Educators',
    headlineLine1: 'Your Audience Wants to Win.',
    headlineLine2: 'Give Them the Tool That Helps.',
    subheadline:
      'TradeMynd is an AI trading journal inside Telegram. When you recommend it, your viewers get real results - and you become the creator who actually changed their game.',
    primaryCta: 'Explore the Partnership',
    primaryHref: CALENDLY_URL,
    primaryExternal: true,
    secondaryCta: 'See What Your Audience Gets',
    secondaryHref: '#solution',
  },
} as const;

const heroParticles = [
  { id: 1, left: 8, top: 16, size: 2.3, delay: 0.2, dur: 12.5 },
  { id: 2, left: 14, top: 38, size: 1.8, delay: 1.1, dur: 10.4 },
  { id: 3, left: 21, top: 54, size: 2.2, delay: 0.7, dur: 14.2 },
  { id: 4, left: 28, top: 24, size: 1.6, delay: 1.9, dur: 11.1 },
  { id: 5, left: 35, top: 66, size: 2.4, delay: 2.3, dur: 13.4 },
  { id: 6, left: 42, top: 31, size: 1.9, delay: 0.9, dur: 10.8 },
  { id: 7, left: 49, top: 48, size: 2.1, delay: 1.5, dur: 12.1 },
  { id: 8, left: 56, top: 18, size: 1.7, delay: 2.8, dur: 14.8 },
  { id: 9, left: 63, top: 60, size: 2.5, delay: 0.4, dur: 11.7 },
  { id: 10, left: 70, top: 28, size: 1.8, delay: 1.3, dur: 13.9 },
  { id: 11, left: 77, top: 46, size: 2.3, delay: 2.1, dur: 10.9 },
  { id: 12, left: 84, top: 22, size: 1.6, delay: 0.6, dur: 12.9 },
  { id: 13, left: 90, top: 57, size: 2.2, delay: 1.8, dur: 14.1 },
  { id: 14, left: 94, top: 34, size: 1.7, delay: 2.5, dur: 11.4 },
];

export default function CollaboratePage() {
  const [heroAudience, setHeroAudience] = useState<HeroAudience>('trader');
  const [isHeroCopyVisible, setIsHeroCopyVisible] = useState(true);
  const heroSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      revealNodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (heroSwapTimerRef.current) {
        clearTimeout(heroSwapTimerRef.current);
      }
    },
    []
  );

  const switchHeroAudience = (nextAudience: HeroAudience) => {
    if (heroAudience === nextAudience) {
      return;
    }

    if (heroSwapTimerRef.current) {
      clearTimeout(heroSwapTimerRef.current);
    }

    setIsHeroCopyVisible(false);
    heroSwapTimerRef.current = setTimeout(() => {
      setHeroAudience(nextAudience);
      setIsHeroCopyVisible(true);
    }, 150);
  };

  const activeHeroCopy = heroCopy[heroAudience];

  return (
    <div className="relative isolate min-h-screen bg-[#0C0C0C] text-[#F0F0F0]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="base-gradient absolute inset-0" />
        <div className="grain-layer absolute inset-0" />
      </div>

      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0C0C0C]/92">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-[#F0F0F0]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]">
              <TrendingUp className="h-4 w-4" />
            </span>
            TRADEMYND
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="btn-interactive rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888]">
              Home
            </Link>
            <Link href={CALENDLY_URL} target="_blank" rel="noreferrer" className="btn-interactive rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888]">
              Talk to Us
            </Link>
            <Link href="/register" className="btn-interactive rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#0C0C0C]">
              Start Free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-5 pt-[70px]">
          <div className="absolute inset-0">
            <div className="hero-grid absolute inset-0 opacity-45" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(138,109,47,0.24),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(201,168,76,0.22),transparent_42%),radial-gradient(circle_at_78%_74%,rgba(76,175,122,0.12),transparent_35%)]" />
            <div className="hero-candles absolute -bottom-14 left-0 right-0 h-72 opacity-25" />
            {heroParticles.map((p) => (
              <span
                key={p.id}
                className="particle-dot absolute rounded-full bg-[#C9A84C]/45"
                style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
              />
            ))}
          </div>

          <div className="relative mx-auto flex w-full max-w-[780px] flex-col items-center justify-center text-center">
            <p data-reveal style={{ '--reveal-delay': '40ms' } as CSSProperties} className="mb-2 text-[0.8rem] font-semibold tracking-[0.05em] text-[#E8C97A]">
              {activeHeroCopy.eyebrow}
            </p>

            <div className="relative inline-grid grid-cols-2 rounded-full border border-[#2A2A2A] bg-[#101010]/90 p-1">
              <span
                className={`absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full bg-[#C9A84C] transition-transform duration-300 ease-out ${
                  heroAudience === 'trader' ? 'translate-x-1' : 'translate-x-[calc(100%+2px)]'
                }`}
              />
              <button
                type="button"
                onClick={() => switchHeroAudience('trader')}
                className={`relative z-10 rounded-full px-5 py-2 text-[0.9rem] font-medium transition-colors duration-300 ${
                  heroAudience === 'trader' ? 'text-[#0C0C0C]' : 'text-[#CFCFCF]'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  I&apos;m a Trader
                </span>
              </button>
              <button
                type="button"
                onClick={() => switchHeroAudience('creator')}
                className={`relative z-10 rounded-full px-5 py-2 text-[0.9rem] font-medium transition-colors duration-300 ${
                  heroAudience === 'creator' ? 'text-[#0C0C0C]' : 'text-[#CFCFCF]'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  I&apos;m a Creator
                </span>
              </button>
            </div>

            <div className={`w-full transition-opacity duration-300 ease-out ${isHeroCopyVisible ? 'opacity-100' : 'opacity-0'}`}>
              <h1 className="mx-auto mt-4 max-w-[780px] text-balance text-[clamp(2.2rem,4vw,3.6rem)] font-semibold leading-[1.15] tracking-tight text-[#F0F0F0]">
                <span className="block">{activeHeroCopy.headlineLine1}</span>
                <span className="block">{activeHeroCopy.headlineLine2}</span>
              </h1>

              <p className="mx-auto mt-3 max-w-[640px] text-[1.03rem] leading-relaxed text-[#CFCFCF]">{activeHeroCopy.subheadline}</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={activeHeroCopy.primaryHref}
                  target={activeHeroCopy.primaryExternal ? '_blank' : undefined}
                  rel={activeHeroCopy.primaryExternal ? 'noreferrer' : undefined}
                  className="btn-interactive hero-primary-cta inline-flex items-center gap-2 rounded-xl border border-[#C9A84C] bg-[#C9A84C] px-6 py-3 text-[0.95rem] font-semibold text-[#0C0C0C] shadow-[0_8px_24px_rgba(201,168,76,0.26)]"
                >
                  {activeHeroCopy.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href={activeHeroCopy.secondaryHref} className="btn-interactive inline-flex items-center gap-2 rounded-xl border border-[#F0F0F0]/60 bg-transparent px-6 py-3 text-[0.95rem] font-medium text-[#F0F0F0]">
                  {activeHeroCopy.secondaryCta}
                  <Calendar className="h-4 w-4 text-[#F0F0F0]" />
                </Link>
              </div>
            </div>

            <div data-reveal style={{ '--reveal-delay': '180ms' } as CSSProperties} className="mt-5 w-full">
              <div className="mx-auto h-px w-full max-w-[680px] bg-gradient-to-r from-transparent via-[#C9A84C]/55 to-transparent" />
              <div className="mt-4 flex flex-wrap items-start justify-center gap-x-12 gap-y-4">
                <div className="text-center">
                  <p className="text-[1.8rem] font-semibold leading-none text-[#C9A84C]">4,200+</p>
                  <p className="mt-1 text-[0.8rem] text-[#B8B8B8]">Active Traders</p>
                </div>
                <div className="text-center">
                  <p className="text-[1.8rem] font-semibold leading-none text-[#C9A84C]">&lt;20s</p>
                  <p className="mt-1 text-[0.8rem] text-[#B8B8B8]">to Log</p>
                </div>
                <div className="text-center">
                  <p className="text-[1.8rem] font-semibold leading-none text-[#C9A84C]">12+</p>
                  <p className="mt-1 text-[0.8rem] text-[#B8B8B8]">Countries</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(7,7,7,0.82),rgba(10,10,10,0.9))]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/35 to-transparent" />
          <div className="pointer-events-none absolute left-[7%] right-[7%] top-[178px] hidden h-px bg-gradient-to-r from-transparent via-[#3A3A3A] to-transparent lg:block" />

          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">02 - The Pattern</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The Problem</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#888888]">80-90% lose money. Most know this pattern. Few break it.</p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <article
                  key={point.title}
                  className="problem-card rounded-2xl border border-[#2A2A2A] bg-[#121212]/88 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] tracking-[0.22em] text-[#555555]">0{index + 1}</span>
                    <span className="h-px w-8 bg-gradient-to-r from-[#3A3A3A] to-transparent" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#F0F0F0]">{point.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#888888]">{point.description}</p>
                  <span className="problem-icon mt-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0C0C0C]/70 text-[#C9A84C]">
                    <Icon className="h-4 w-4" />
                  </span>
                </article>
              );
            })}
          </div>
          <p className="mt-8 text-center text-base text-[#888888]">This pattern repeats - unless something changes.</p>
        </section>

        <section id="solution" className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/28 to-transparent" />

          <div data-reveal className="rounded-3xl border border-[#2A2A2A] bg-[#141414]/70 p-7 sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">03 - The Shift</p>
            <p className="mt-4 max-w-4xl text-lg leading-relaxed text-[#F0F0F0]">Journaling only works when it feels natural.</p>
            <div className="mt-6 space-y-3">
              {insightPoints.map((point, index) => (
                <div key={point} data-reveal style={{ '--reveal-delay': `${70 + index * 50}ms` } as CSSProperties} className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0C0C0C]/70 text-[#C9A84C]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-lg leading-relaxed text-[#F0F0F0]">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/28 to-transparent" />
          <div data-reveal>
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">04 - The Product</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The Solution - TradeMynd</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#888888]">Built to make review effortless.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {solutionPoints.map((point, index) => {
              const Icon = point.icon;
              return (
                <article key={point.title} data-reveal style={{ '--reveal-delay': `${70 + index * 50}ms` } as CSSProperties} className="card-interactive rounded-2xl border border-[#2A2A2A] bg-[#141414]/80 p-6">
                  <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#0C0C0C]/70 text-[#C9A84C]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-semibold text-[#F0F0F0]">{point.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#888888]">{point.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="relative mx-auto max-w-7xl px-6 pb-12 pt-8 lg:px-8">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/28 to-transparent" />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="flex flex-col gap-4">
              <div>
                <p data-reveal className="text-[0.75rem] uppercase tracking-[0.24em] text-[#C9A84C]">05 - The Flow</p>
                <h2 data-reveal style={{ '--reveal-delay': '50ms' } as CSSProperties} className="mt-2 text-[1.8rem] font-semibold tracking-tight">
                  How It Works
                </h2>
              </div>
              <div className="flex flex-col gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title}>
                    <article
                      data-reveal
                      style={{ '--reveal-delay': `${70 + index * 50}ms` } as CSSProperties}
                      className="flow-card card-interactive relative flex h-20 max-h-20 items-center gap-3 rounded-2xl border border-[#2A2A2A] border-l-[#C9A84C]/55 bg-[#141414]/80 px-4 py-[0.6rem]"
                    >
                      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" />
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2A2A2A] bg-[#0C0C0C]/70 text-[#C9A84C]">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-[0.14em] text-[#C9A84C]">0{index + 1}</span>
                          <h3 className="truncate text-[0.95rem] font-semibold text-[#F0F0F0]">{step.title}</h3>
                        </div>
                        <p className="mt-1 truncate text-[0.8rem] leading-[1.35] text-[#9A9A9A]">{step.description}</p>
                      </div>
                    </article>
                    {index < steps.length - 1 && (
                      <span className="pointer-events-none flex h-3 items-center justify-center text-sm leading-none text-[#C9A84C]/55">
                        ›
                      </span>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
            <div data-reveal style={{ '--reveal-delay': '110ms' } as CSSProperties} className="flex items-center justify-center lg:justify-end lg:pl-2">
              <TelegramAnimation />
            </div>
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/28 to-transparent" />
          <div data-reveal className="rounded-3xl border border-[#2A2A2A] bg-[#141414]/70 p-7 sm:p-10">
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">06 - The Fit</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Who It&apos;s For</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {whoItsFor.map((item, index) => (
                <div key={item} data-reveal style={{ '--reveal-delay': `${70 + index * 50}ms` } as CSSProperties} className="card-interactive rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/60 p-5 text-sm leading-relaxed text-[#888888]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-6 pb-24 pt-10 lg:px-8">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/28 to-transparent" />
          <div data-reveal className="mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-[#2A2A2A] bg-[linear-gradient(145deg,#141414,#1C1C1C_55%,#141414)]">
            <div className="relative p-8 sm:p-12 lg:p-16">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(138,109,47,0.23),transparent_42%),radial-gradient(circle_at_85%_90%,rgba(201,168,76,0.2),transparent_48%)]" />
              <div className="relative z-10">
                <h2 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-5xl">Try It. Or Talk to Us.</h2>
                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <article data-reveal style={{ '--reveal-delay': '70ms' } as CSSProperties} className="card-interactive rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/70 p-7">
                    <h3 className="text-2xl font-semibold text-[#F0F0F0]">Start Free</h3>
                    <p className="mt-2 text-sm text-[#888888]">No card required. Telegram-based.</p>
                    <Link href="/register" className="btn-interactive mt-6 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0C0C0C]">
                      Start Free
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>

                  <article data-reveal style={{ '--reveal-delay': '120ms' } as CSSProperties} className="card-interactive rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/70 p-7">
                    <h3 className="text-2xl font-semibold text-[#F0F0F0]">Talk to Us</h3>
                    <p className="mt-2 text-sm text-[#888888]">For creators or teams.</p>
                    <Link href={CALENDLY_URL} target="_blank" rel="noreferrer" className="btn-interactive mt-6 inline-flex items-center gap-2 rounded-xl border border-[#C9A84C]/45 bg-[#141414] px-6 py-3 text-sm font-semibold text-[#F0F0F0]">
                      Talk to Us
                      <Calendar className="h-4 w-4 text-[#C9A84C]" />
                    </Link>
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        @keyframes base-gradient-shift {
          0% {
            background-position: 48% 50%;
          }
          50% {
            background-position: 52% 48%;
          }
          100% {
            background-position: 50% 52%;
          }
        }

        @keyframes grid-pan {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(40px, 40px, 0);
          }
        }

        @keyframes candle-drift {
          0% {
            transform: translateX(-3%) translateY(0);
          }
          50% {
            transform: translateX(3%) translateY(-8px);
          }
          100% {
            transform: translateX(-3%) translateY(0);
          }
        }

        @keyframes particle-float {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.28;
          }
          50% {
            transform: translateY(-13px);
            opacity: 0.85;
          }
        }

        .base-gradient {
          background:
            radial-gradient(circle at 18% 18%, rgba(201, 168, 76, 0.12), transparent 34%),
            radial-gradient(circle at 82% 26%, rgba(138, 109, 47, 0.1), transparent 38%),
            linear-gradient(150deg, #0a0a0a 0%, #101010 38%, #141414 62%, #0e0e0e 100%);
          background-size: 160% 160%;
          animation: base-gradient-shift 36s ease-in-out infinite alternate;
        }

        .grain-layer {
          background-image: radial-gradient(rgba(240, 240, 240, 0.07) 0.75px, transparent 0.75px);
          background-size: 3px 3px;
          opacity: 0.05;
          mix-blend-mode: soft-light;
        }

        .hero-grid {
          background-image:
            linear-gradient(rgba(201, 168, 76, 0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 168, 76, 0.12) 1px, transparent 1px);
          background-size: 64px 64px;
          animation: grid-pan 16s linear infinite;
        }

        .hero-candles {
          background:
            repeating-linear-gradient(90deg, rgba(76, 175, 122, 0.35) 0 2px, transparent 2px 18px),
            repeating-linear-gradient(90deg, rgba(192, 80, 74, 0.32) 9px 11px, transparent 11px 30px);
          mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent 85%);
          animation: candle-drift 13s ease-in-out infinite;
        }

        .particle-dot {
          animation-name: particle-float;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        [data-reveal] {
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 360ms ease,
            transform 360ms ease;
          transition-delay: var(--reveal-delay, 0ms);
          will-change: opacity, transform;
        }

        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .btn-interactive {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            background-color 220ms ease,
            color 220ms ease,
            box-shadow 220ms ease;
        }

        .card-interactive {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .problem-card {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .flow-card {
          transition:
            transform 220ms ease,
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .problem-icon {
          opacity: 0.72;
          transition: opacity 220ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .btn-interactive:hover {
            transform: translateY(-1px);
          }

          .hero-primary-cta:hover {
            box-shadow: 0 10px 30px rgba(201, 168, 76, 0.35);
          }

          .card-interactive:hover {
            transform: translateY(-3px);
            border-color: #3a3a3a;
            box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
          }

          .problem-card:hover {
            transform: translateY(-3px);
            border-color: #474747;
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
          }

          .flow-card:hover {
            transform: translateY(-3px);
            border-color: rgba(201, 168, 76, 0.5);
            box-shadow: 0 14px 34px rgba(201, 168, 76, 0.12);
          }

          .problem-card:hover .problem-icon {
            opacity: 1;
          }
        }

        @media (hover: none), (pointer: coarse) {
          .base-gradient {
            animation: none;
            background-size: 100% 100%;
          }

          .hero-grid,
          .hero-candles,
          .particle-dot {
            animation: none;
          }

          .btn-interactive,
          .card-interactive,
          .problem-card,
          .problem-icon {
            transition: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .base-gradient {
            animation: none;
            background-size: 100% 100%;
          }

          .hero-grid,
          .hero-candles,
          .particle-dot {
            animation: none;
          }

          [data-reveal] {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
