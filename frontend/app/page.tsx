'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Flame,
  LineChart,
  MessageSquare,
  PieChart,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Area, AreaChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Trade = { instrument: string; direction: 'LONG' | 'SHORT'; r: string; result: 'WIN' | 'LOSS' | 'BE' };

type Feature = {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  span: string;
};

type Step = { title: string; desc: string; icon: React.ComponentType<{ className?: string }> };

const feed: Trade[] = [
  { instrument: 'XAUUSD', direction: 'LONG', r: '+2.4R', result: 'WIN' },
  { instrument: 'BTCUSD', direction: 'SHORT', r: '-1.0R', result: 'LOSS' },
  { instrument: 'EURUSD', direction: 'LONG', r: '+1.6R', result: 'WIN' },
  { instrument: 'NAS100', direction: 'SHORT', r: '+2.1R', result: 'WIN' },
  { instrument: 'ETHUSD', direction: 'LONG', r: '-0.7R', result: 'LOSS' },
  { instrument: 'GBPJPY', direction: 'SHORT', r: '+1.2R', result: 'WIN' },
  { instrument: 'SPX500', direction: 'LONG', r: '0.0R', result: 'BE' },
  { instrument: 'USDJPY', direction: 'SHORT', r: '+1.9R', result: 'WIN' },
];

const features: Feature[] = [
  { title: 'Log via Telegram', desc: 'Send screenshots, text, or voice notes. Entries are captured instantly.', icon: MessageSquare, span: 'md:col-span-2' },
  { title: 'AI Trade Analysis', desc: 'Auto-extracts instrument, direction, entry/exit, and outcome.', icon: Bot, span: 'md:col-span-2' },
  { title: 'Emotion Tracking', desc: 'Map emotional state to execution quality and consistency.', icon: Activity, span: 'md:col-span-2' },
  { title: 'R-Multiple Stats', desc: 'Measure edge with risk-adjusted metrics, not vanity PnL snapshots.', icon: BarChart3, span: 'md:col-span-3' },
  { title: 'Performance Charts', desc: 'Session-level trend views for equity, behavior, and trade quality.', icon: LineChart, span: 'md:col-span-3' },
  { title: 'Streak Tracking', desc: 'Understand momentum and protect against revenge or overtrading loops.', icon: Flame, span: 'md:col-span-6' },
];

const steps: Step[] = [
  { title: 'Send screenshot/text to bot', desc: 'Forward trade evidence through Telegram.', icon: MessageSquare },
  { title: 'AI extracts trade data', desc: 'Trade details are parsed and normalized.', icon: Zap },
  { title: 'Dashboard updates', desc: 'Journal, analytics, and metrics refresh live.', icon: LineChart },
  { title: 'Review insights', desc: 'Spot patterns and improve decision quality.', icon: ShieldCheck },
];

const chartData = [
  { day: 'Mon', equity: 100200, vol: 6 },
  { day: 'Tue', equity: 100980, vol: 8 },
  { day: 'Wed', equity: 100450, vol: 5 },
  { day: 'Thu', equity: 101380, vol: 11 },
  { day: 'Fri', equity: 102040, vol: 9 },
  { day: 'Sat', equity: 101910, vol: 3 },
  { day: 'Sun', equity: 102640, vol: 7 },
];

const testimonials = [
  {
    q: 'The journaling friction vanished. I log more and my weekly review is finally consistent.',
    n: 'Alex R.',
    r: 'Futures Trader',
  },
  {
    q: 'Bloomberg energy, SaaS speed. I can identify execution leaks in minutes now.',
    n: 'Priya M.',
    r: 'FX Swing Trader',
  },
  {
    q: 'R-multiple and streak context changed how I size risk and protect discipline.',
    n: 'Daniel K.',
    r: 'Crypto Day Trader',
  },
];

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const visible = useInView(ref, { once: true, amount: 0.7 });
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let start: number | null = null;
    const duration = 1300;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to]);

  return (
    <span ref={ref}>
      {v.toLocaleString()}
      {suffix}
    </span>
  );
}

function FlowCard({ step, i }: { step: Step; i: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const Icon = step.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: i * 0.08 }}
      className="relative rounded-2xl border border-[#2A2A2A] bg-[#141414]/80 p-6 backdrop-blur-md"
    >
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#C9A84C]/10 text-[#C9A84C]">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mb-2 text-sm font-semibold text-[#F0F0F0]">{step.title}</p>
      <p className="text-sm text-[#888888]">{step.desc}</p>
      <span className="absolute right-5 top-5 rounded-full border border-[#2A2A2A] px-2 py-0.5 text-[10px] text-[#555555]">0{i + 1}</span>
    </motion.div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const cursorX = useMotionValue(-999);
  const cursorY = useMotionValue(-999);
  const cx = useSpring(cursorX, { stiffness: 170, damping: 30, mass: 0.45 });
  const cy = useSpring(cursorY, { stiffness: 170, damping: 30, mass: 0.45 });

  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const gxs = useSpring(gx, { stiffness: 120, damping: 24, mass: 0.7 });
  const gys = useSpring(gy, { stiffness: 120, damping: 24, mass: 0.7 });

  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const txs = useSpring(tx, { stiffness: 110, damping: 16, mass: 0.5 });
  const tys = useSpring(ty, { stiffness: 110, damping: 16, mass: 0.5 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 180);
      cursorY.set(e.clientY - 180);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [cursorX, cursorY]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.6 + 1,
        delay: Math.random() * 8,
        dur: Math.random() * 8 + 8,
      })),
    []
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0C0C0C] text-[#F0F0F0]">
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-[360px] w-[360px] rounded-full opacity-35 blur-3xl md:block"
        style={{
          x: cx,
          y: cy,
          background: 'radial-gradient(circle at center, rgba(201,168,76,0.32), rgba(138,109,47,0.14) 45%, rgba(0,0,0,0) 75%)',
        }}
      />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[#2A2A2A] bg-[#0C0C0C]/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-[#F0F0F0]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#C9A84C]">
              <TrendingUp className="h-4 w-4" />
            </span>
            TRADEMYND
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888] transition hover:border-[#3A3A3A] hover:text-[#F0F0F0]">
              Pricing
            </Link>
            <Link href="/login" className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#888888] transition hover:border-[#3A3A3A] hover:text-[#F0F0F0]">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#0C0C0C] shadow-[0_0_28px_rgba(201,168,76,0.35)] transition hover:brightness-110">
              Start Free
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section
          className="relative flex min-h-screen items-center overflow-hidden px-6 pt-24 lg:px-8"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            gx.set(((e.clientX - r.left) / r.width - 0.5) * 24);
            gy.set(((e.clientY - r.top) / r.height - 0.5) * 24);
          }}
          onMouseLeave={() => {
            gx.set(0);
            gy.set(0);
          }}
        >
          <div className="absolute inset-0">
            <motion.div className="hero-grid absolute inset-0 opacity-45" style={{ x: gxs, y: gys }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(138,109,47,0.24),transparent_32%),radial-gradient(circle_at_80%_18%,rgba(201,168,76,0.22),transparent_42%),radial-gradient(circle_at_78%_74%,rgba(76,175,122,0.12),transparent_35%)]" />
            <div className="hero-candles absolute -bottom-14 left-0 right-0 h-72 opacity-25" />
            {particles.map((p) => (
              <span
                key={p.id}
                className="particle-dot absolute rounded-full bg-[#C9A84C]/45"
                style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}
              />
            ))}
          </div>

          <div className="relative mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/35 bg-[#C9A84C]/10 px-3 py-1 text-xs font-medium tracking-wide text-[#E8C97A]">
                <Sparkles className="h-3.5 w-3.5" /> AI-Powered Trading Intelligence
              </p>
              <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">Your Trading Mind, Upgraded.</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#888888]">
                Telegram-first journaling for serious traders. Capture every trade, decode behavior patterns, and improve execution quality with AI.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href="/register" className="glow-button inline-flex items-center justify-center rounded-xl bg-[#C9A84C] px-6 py-3 text-sm font-semibold text-[#0C0C0C]">Start Free</Link>
                <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1C1C1C]/70 px-6 py-3 text-sm font-semibold text-[#F0F0F0] transition hover:border-[#C9A84C]/45 hover:text-[#F0F0F0]">
                  See It In Action <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 text-left">
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]/70 p-4"><p className="text-xl font-semibold text-[#C9A84C]"><CountUp to={2400} suffix="+" /></p><p className="mt-1 text-xs text-[#888888]">Trades Logged</p></div>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]/70 p-4"><p className="text-xl font-semibold text-[#4CAF7A]"><CountUp to={87} suffix="%" /></p><p className="mt-1 text-xs text-[#888888]">Weekly Review Rate</p></div>
                <div className="rounded-xl border border-[#2A2A2A] bg-[#141414]/70 p-4"><p className="text-xl font-semibold text-[#8A6D2F]"><CountUp to={49} suffix="/10" /></p><p className="mt-1 text-xs text-[#888888]">Trader Satisfaction</p></div>
              </div>
            </motion.div>

            <motion.div className="relative" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, delay: 0.2 }}>
              <div className="absolute -inset-10 rounded-[42px] bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.28),rgba(138,109,47,0.16),transparent_65%)] blur-2xl" />
              <motion.div
                style={{ rotateX: txs, rotateY: tys, transformPerspective: 1200 }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const x = (e.clientX - r.left) / r.width;
                  const y = (e.clientY - r.top) / r.height;
                  ty.set((x - 0.5) * 14);
                  tx.set((0.5 - y) * 14);
                }}
                onMouseLeave={() => {
                  tx.set(0);
                  ty.set(0);
                }}
                className="relative rounded-[26px] border border-[#2A2A2A] bg-[#141414]/90 p-4 shadow-[0_24px_120px_rgba(0,0,0,0.65)]"
              >
                <div className="mb-4 flex items-center gap-2 border-b border-[#2A2A2A] pb-3 text-xs text-[#888888]"><span className="h-2.5 w-2.5 rounded-full bg-[#C0504A]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E8C97A]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7A]" /><span className="ml-2">dashboard.trademynd.app</span></div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] p-3 sm:col-span-2">
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-[#555555]">Equity Curve</p>
                    <div className="h-28 rounded-lg bg-[#0C0C0C]/80 p-2">
                      {mounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="equity" stroke="#C9A84C" strokeWidth={2} fill="url(#heroArea)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full rounded-md bg-[linear-gradient(120deg,rgba(201,168,76,0.15),rgba(138,109,47,0.08),rgba(201,168,76,0.15))]" />
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] p-3"><p className="text-[11px] uppercase tracking-wider text-[#555555]">Win Rate</p><p className="mt-3 text-3xl font-semibold text-[#4CAF7A]">68%</p><p className="mt-1 text-xs text-[#555555]">+7% this week</p></div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] p-3"><p className="text-[11px] uppercase tracking-wider text-[#555555]">Best Pair</p><p className="mt-3 text-lg font-semibold">XAUUSD</p><p className="mt-1 text-xs text-[#4CAF7A]">+4.6R net</p></div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] p-3"><p className="text-[11px] uppercase tracking-wider text-[#555555]">Risk Events</p><p className="mt-3 text-lg font-semibold">2 Flags</p><p className="mt-1 text-xs text-[#C0504A]">NY open overtrading</p></div>
                  <div className="rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] p-3"><p className="text-[11px] uppercase tracking-wider text-[#555555]">Streak</p><p className="mt-3 text-lg font-semibold">5 Wins</p><p className="mt-1 text-xs text-[#4CAF7A]">Discipline intact</p></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="relative z-20 border-y border-[#2A2A2A] bg-[#0C0C0C]"><div className="ticker-fade mx-auto max-w-[1800px] overflow-hidden"><div className="ticker-track flex min-w-max items-center gap-6 py-3">{[...feed, ...feed, ...feed].map((t, i) => (<div key={`${t.instrument}-${i}`} className="flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#141414]/90 px-4 py-1.5 text-xs"><span className="font-semibold">{t.instrument}</span><span className={t.direction === 'LONG' ? 'text-[#C9A84C]' : 'text-[#C0504A]'}>{t.direction}</span><span className="text-[#555555]">-</span><span className={t.result === 'WIN' ? 'text-[#4CAF7A]' : t.result === 'LOSS' ? 'text-[#C0504A]' : 'text-[#888888]'}>{t.r}</span><span className="rounded bg-[#1C1C1C]/80 px-1.5 py-0.5 text-[10px] text-[#555555]">{t.result}</span></div>))}</div></div></section>

        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }} className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">Feature Stack</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">Built for serious iteration, not vanity dashboards</h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">{features.map((f, i) => {const Icon = f.icon; return (<motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45, delay: i * 0.06 }} className={`feature-card relative overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#141414]/70 p-6 backdrop-blur-xl ${f.span}`}><div className="feature-card-bg absolute inset-0 rounded-2xl" /><div className="relative z-10"><span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#C9A84C]"><Icon className="h-5 w-5" /></span><h3 className="text-lg font-semibold">{f.title}</h3><p className="mt-2 text-sm leading-relaxed text-[#888888]">{f.desc}</p></div></motion.div>);})}</div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }} className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8A6D2F]">How It Works</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">From raw trade evidence to actionable review in four steps</h2>
          </motion.div>
          <div className="relative"><div className="pointer-events-none absolute left-[8%] right-[8%] top-8 hidden h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent lg:block" /><div className="grid grid-cols-1 gap-4 lg:grid-cols-4">{steps.map((s, i) => (<FlowCard key={s.title} step={s} i={i} />))}</div></div>
        </section>

        <section id="demo" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6 }} className="mb-12 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-[#4CAF7A]">Dashboard Preview</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">A control room for execution quality</h2>
          </motion.div>
          <div className="relative"><div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_center,rgba(201,168,76,0.26),rgba(138,109,47,0.14),transparent_70%)] blur-3xl" />
            <motion.div initial={{ opacity: 0, y: 20, rotateX: 9 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }} className="relative overflow-hidden rounded-[28px] border border-[#2A2A2A] bg-[#141414]/90 p-4 shadow-[0_34px_120px_rgba(0,0,0,0.65)]" style={{ transformPerspective: 1400 }}>
              <div className="mb-4 flex items-center justify-between border-b border-[#2A2A2A] px-2 pb-3 text-sm"><div className="flex items-center gap-2 text-[#888888]"><span className="h-2.5 w-2.5 rounded-full bg-[#C0504A]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E8C97A]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7A]" /><span className="ml-2">TradeMind Terminal</span></div><span className="rounded-full border border-[#2A2A2A] bg-[#1C1C1C]/80 px-3 py-1 text-xs text-[#888888]">Live Sync - Telegram</span></div>
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/80 p-4 lg:col-span-8"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">Equity + R-Multiple Trend</p><p className="text-xs text-[#4CAF7A]">+4.8% week</p></div><div className="h-72">{mounted ? (<ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A84C" stopOpacity={0.65} /><stop offset="95%" stopColor="#C9A84C" stopOpacity={0} /></linearGradient><linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4CAF7A" stopOpacity={0.45} /><stop offset="95%" stopColor="#4CAF7A" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} /><XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }} axisLine={false} tickLine={false} width={70} /><YAxis yAxisId="right" orientation="right" hide /><Tooltip contentStyle={{ background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#F0F0F0' }} labelStyle={{ color: 'rgba(255,255,255,0.85)' }} /><Area yAxisId="left" type="monotone" dataKey="equity" stroke="#C9A84C" fill="url(#equityFill)" strokeWidth={2.4} /><Bar yAxisId="right" dataKey="vol" fill="url(#volumeFill)" radius={[5, 5, 0, 0]} opacity={0.7} /></AreaChart></ResponsiveContainer>) : (<div className="h-full w-full rounded-xl bg-[linear-gradient(120deg,rgba(201,168,76,0.14),rgba(138,109,47,0.08),rgba(76,175,122,0.12))]" />)}</div></div>
                <div className="space-y-4 lg:col-span-4"><div className="rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/80 p-4"><p className="text-xs uppercase tracking-wider text-[#555555]">Win Rate</p><p className="mt-2 text-3xl font-semibold text-[#4CAF7A]">71%</p><p className="mt-1 text-xs text-[#888888]">Last 30 trades</p></div><div className="rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/80 p-4"><p className="text-xs uppercase tracking-wider text-[#555555]">Average R</p><p className="mt-2 text-3xl font-semibold text-[#C9A84C]">1.48R</p><p className="mt-1 text-xs text-[#888888]">Per closed setup</p></div><div className="rounded-2xl border border-[#2A2A2A] bg-[#0C0C0C]/80 p-4"><p className="text-xs uppercase tracking-wider text-[#555555]">Loss Clusters</p><p className="mt-2 text-3xl font-semibold text-[#C0504A]">2</p><p className="mt-1 text-xs text-[#888888]">Both after overtrading</p></div></div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.6 }} className="mb-10 text-center"><p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">Social Proof</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Trusted by disciplined traders</h2></motion.div>
          <div className="grid gap-4 md:grid-cols-3">{testimonials.map((t, i) => (<motion.article key={t.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.45, delay: i * 0.07 }} className="rounded-2xl border border-[#2A2A2A] bg-[#141414]/70 p-6 backdrop-blur-sm"><div className="mb-4 flex items-center gap-1 text-[#C9A84C]">{Array.from({ length: 5 }).map((_, s) => (<Star key={s} className="h-4 w-4 fill-current" />))}</div><p className="text-sm leading-relaxed text-[#888888]">&ldquo;{t.q}&rdquo;</p><div className="mt-5 border-t border-[#2A2A2A] pt-4"><p className="text-sm font-semibold">{t.n}</p><p className="text-xs text-[#888888]">{t.r}</p></div></motion.article>))}</div>
        </section>

        <section className="px-6 pb-24 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-[#2A2A2A] bg-[linear-gradient(145deg,#141414,#1C1C1C_55%,#141414)]">
            <div className="relative p-8 sm:p-12 lg:p-16"><div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(138,109,47,0.23),transparent_42%),radial-gradient(circle_at_85%_90%,rgba(201,168,76,0.2),transparent_48%)]" />
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6 }} className="relative z-10 mx-auto max-w-3xl text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[#C9A84C]">Final CTA</p>
                <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Stop Guessing. Start Growing.</h2>
                <p className="mx-auto mt-4 max-w-xl text-[#888888]">Build a professional feedback loop around your decisions. Join the waitlist for priority access.</p>
                <form className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row" onSubmit={(e) => e.preventDefault()}>
                  <input type="email" placeholder="you@tradingdesk.com" className="h-12 flex-1 rounded-xl border border-[#2A2A2A] bg-[#0C0C0C]/85 px-4 text-sm text-[#F0F0F0] outline-none transition placeholder:text-[#555555] focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/30" />
                  <button type="submit" className="cta-pulse h-12 rounded-xl bg-[#C9A84C] px-6 text-sm font-semibold text-[#0C0C0C] shadow-[0_0_28px_rgba(201,168,76,0.4)] transition hover:brightness-110">Join Waitlist</button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2A2A2A] px-6 py-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-[#555555]">
          <p>(c) {new Date().getFullYear()} Trademynd. Built for serious traders.</p>
          <span className="inline-flex items-center gap-1 text-[#888888]"><PieChart className="h-3.5 w-3.5" /> Performance-first journaling</span>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes grid-pan { 0% { transform: translate3d(0,0,0);} 100% { transform: translate3d(40px,40px,0);} }
        @keyframes candle-drift { 0% { transform: translateX(-3%) translateY(0);} 50% { transform: translateX(3%) translateY(-8px);} 100% { transform: translateX(-3%) translateY(0);} }
        @keyframes particle-float { 0%,100% { transform: translateY(0); opacity: .28;} 50% { transform: translateY(-13px); opacity: .85;} }
        @keyframes ticker-scroll { 0% { transform: translateX(0);} 100% { transform: translateX(-33.333%);} }
        @keyframes feature-border-spin { 0% { transform: rotate(0);} 100% { transform: rotate(360deg);} }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 rgba(201,168,76,.45), 0 0 24px rgba(201,168,76,.25);} 50% { box-shadow: 0 0 22px rgba(201,168,76,.68), 0 0 38px rgba(201,168,76,.35);} }

        .hero-grid { background-image: linear-gradient(rgba(201,168,76,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,.12) 1px, transparent 1px); background-size: 64px 64px; animation: grid-pan 16s linear infinite; }
        .hero-candles { background: repeating-linear-gradient(90deg, rgba(76,175,122,.35) 0 2px, transparent 2px 18px), repeating-linear-gradient(90deg, rgba(192,80,74,.32) 9px 11px, transparent 11px 30px); mask-image: linear-gradient(to top, rgba(0,0,0,.9), transparent 85%); animation: candle-drift 13s ease-in-out infinite; }
        .particle-dot { animation-name: particle-float; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .ticker-track { width: max-content; animation: ticker-scroll 36s linear infinite; }
        .ticker-fade { mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }

        .feature-card::before { content: ''; position: absolute; inset: -80%; background: conic-gradient(from 180deg, rgba(201,168,76,0), rgba(201,168,76,.6), rgba(138,109,47,.4), rgba(201,168,76,0)); animation: feature-border-spin 7s linear infinite; opacity: 0; transition: opacity .25s ease; }
        .feature-card::after { content: ''; position: absolute; inset: 1px; background: rgba(13,17,23,.86); border-radius: 1rem; }
        .feature-card:hover::before { opacity: 1; }
        .feature-card-bg { background: radial-gradient(circle at 10% 10%, rgba(201,168,76,.08), transparent 45%); }
        .glow-button:hover { box-shadow: 0 0 28px rgba(201,168,76,.5); }
        .cta-pulse { animation: pulse-glow 2.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
