'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Bot, Image as ImageIcon, Mic, Zap } from 'lucide-react';

export default function TelegramAnimation() {
  const [slide, setSlide] = useState(0); // 0 = Text, 1 = Media, 2 = News
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    const runSequence = () => {
      setStep(0);

      if (slide === 0) {
        timeouts.push(setTimeout(() => setStep(1), 500));
        timeouts.push(setTimeout(() => setStep(2), 2000));
        timeouts.push(setTimeout(() => setStep(3), 3500));
        timeouts.push(setTimeout(() => setSlide(1), 8000));
      } else if (slide === 1) {
        timeouts.push(setTimeout(() => setStep(1), 500));
        timeouts.push(setTimeout(() => setStep(2), 1500));
        timeouts.push(setTimeout(() => setStep(3), 3000));
        timeouts.push(setTimeout(() => setStep(4), 4500));
        timeouts.push(setTimeout(() => setSlide(2), 9000));
      } else {
        timeouts.push(setTimeout(() => setStep(1), 500));
        timeouts.push(setTimeout(() => setStep(2), 2500));
        timeouts.push(setTimeout(() => setSlide(0), 7000));
      }
    };

    runSequence();
    return () => timeouts.forEach(clearTimeout);
  }, [slide]);

  return (
    <div className="relative mx-auto h-[580px] w-full max-w-[420px]">
      <div className="absolute inset-x-0 bottom-28 top-0 overflow-hidden rounded-[24px] border border-[#2A2A2A] bg-[#141414]/95 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#1C1C1C]/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C9A84C]/10 text-[#C9A84C]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F0F0F0]">TradeMynd Bot</p>
              <p className="text-[10px] text-[#C9A84C]">bot</p>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-[#4CAF7A] shadow-[0_0_8px_rgba(76,175,122,0.6)]" />
        </div>

        <div className="no-scrollbar relative h-full space-y-4 overflow-y-auto p-4 pb-20">
          <AnimatePresence mode="wait">
            {slide === 0 && (
              <motion.div key="slide-text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {step >= 1 && (
                  <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-[#3B82F6]/30 bg-[#3B82F6]/20 px-4 py-3 text-sm text-[#F0F0F0]">
                      <p>XAUUSD me long liya 2340 pe, stop 2330, target 2365</p>
                      <p className="mt-1 text-right text-[10px] text-white/40">10:42 AM</p>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 px-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '300ms' }} />
                  </motion.div>
                )}

                {step >= 3 && (
                  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex justify-start">
                    <div className="w-full max-w-[95%] overflow-hidden rounded-xl border border-[#C9A84C]/30 bg-[#1C1C1C] shadow-lg">
                      <div className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#C9A84C]/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-[#C9A84C]" />
                          <span className="text-sm font-semibold text-[#F0F0F0]">XAUUSD</span>
                          <span className="rounded bg-[#4CAF7A]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#4CAF7A]">LONG</span>
                        </div>
                        <span className="text-[10px] text-[#888888]">Just now</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-4 pb-2">
                        <div>
                          <p className="text-[10px] text-[#888888]">Entry</p>
                          <p className="font-mono text-sm text-[#F0F0F0]">2340.0</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">Stop</p>
                          <p className="font-mono text-sm text-[#C0504A]">2330.0</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">Target</p>
                          <p className="font-mono text-sm text-[#4CAF7A]">2365.0</p>
                        </div>
                      </div>
                      <div className="border-t border-[#2A2A2A] px-4 py-2">
                        <div className="flex items-center gap-2 text-[10px] text-[#4CAF7A]">
                          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#4CAF7A] text-black">✓</span>
                          Logged to Journal
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {slide === 1 && (
              <motion.div key="slide-media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {step >= 1 && (
                  <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="flex justify-end">
                    <div className="flex items-center gap-3 rounded-2xl rounded-tr-sm border border-[#3B82F6]/30 bg-[#3B82F6]/20 px-4 py-3 text-sm text-[#F0F0F0]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B82F6]/30">
                        <Mic className="h-4 w-4 text-[#3B82F6]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 4, 3, 2].map((h, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [4, 12, 4] }}
                              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                              className="w-0.5 rounded-full bg-[#3B82F6]"
                              style={{ height: h * 2 }}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-white/40">0:12 • Voice Note</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 2 && (
                  <motion.div initial={{ opacity: 0, x: 20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="flex justify-end">
                    <div className="max-w-[70%] overflow-hidden rounded-2xl rounded-tr-sm border border-[#3B82F6]/30 bg-[#3B82F6]/20 p-1">
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-[#000]/40">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-[#3B82F6]/50" />
                        </div>
                        <svg className="absolute inset-0 h-full w-full opacity-30" preserveAspectRatio="none">
                          <path d="M0,50 Q20,40 40,60 T80,30 T120,50 T160,20" fill="none" stroke="#3B82F6" strokeWidth="2" />
                        </svg>
                      </div>
                      <p className="px-2 py-1 text-right text-[10px] text-white/40">10:43 AM</p>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 px-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C9A84C]" style={{ animationDelay: '300ms' }} />
                  </motion.div>
                )}

                {step >= 4 && (
                  <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex justify-start">
                    <div className="w-full max-w-[95%] overflow-hidden rounded-xl border border-[#C9A84C]/30 bg-[#1C1C1C] shadow-lg">
                      <div className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#C9A84C]/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-[#C9A84C]" />
                          <span className="text-sm font-semibold text-[#F0F0F0]">XAUUSD</span>
                          <span className="rounded bg-[#4CAF7A]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#4CAF7A]">LONG</span>
                        </div>
                        <span className="text-[10px] text-[#888888]">Just now</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-4 pb-2">
                        <div>
                          <p className="text-[10px] text-[#888888]">Entry</p>
                          <p className="font-mono text-sm text-[#F0F0F0]">2340.0</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">Stop</p>
                          <p className="font-mono text-sm text-[#C0504A]">2330.0</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#888888]">Target</p>
                          <p className="font-mono text-sm text-[#4CAF7A]">2365.0</p>
                        </div>
                      </div>
                      <div className="border-t border-[#2A2A2A] px-4 py-2">
                        <div className="flex items-center gap-2 text-[10px] text-[#4CAF7A]">
                          <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#4CAF7A] text-black">✓</span>
                          Logged to Journal
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {slide === 2 && (
              <motion.div key="slide-news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                {step >= 1 && (
                  <motion.div initial={{ opacity: 0, x: -20, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="flex justify-start">
                    <div className="w-full max-w-[90%] overflow-hidden rounded-2xl rounded-tl-sm border border-[#C0504A]/40 bg-[#1C1C1C]">
                      <div className="border-b border-[#C0504A]/20 bg-[#C0504A]/10 px-3 py-2">
                        <p className="flex items-center gap-2 text-xs font-semibold text-[#C0504A]">
                          <Activity className="h-3 w-3" /> RED FOLDER ALERT
                        </p>
                      </div>
                      <div className="space-y-2 p-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#888888]">Event</span>
                          <span className="font-medium text-[#F0F0F0]">US Non-Farm Payrolls</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#888888]">Time</span>
                          <span className="font-mono text-[#E8C97A]">18:30 IST (12m)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#888888]">Impact</span>
                          <span className="font-bold text-[#C0504A]">HIGH</span>
                        </div>
                        <div className="mt-2 rounded border border-[#C0504A]/20 bg-[#C0504A]/10 p-2">
                          <p className="leading-snug text-[#F0F0F0]">You have an open XAUUSD long. Consider reducing risk before release.</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step >= 2 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-[#2A2A2A] bg-[#1C1C1C] px-4 py-2.5 text-xs italic text-[#888888]">
                      <p>Stay away from noise. We have the context covered.</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {((slide === 0 && step >= 3) || (slide === 1 && step >= 4) || (slide === 2 && step >= 1)) && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-6 right-6 z-20 rounded-xl border border-[#C9A84C]/30 bg-[#141414]/95 p-4 shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-2 w-2 animate-pulse rounded-full bg-[#C9A84C]" />
                <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-[#C9A84C] opacity-75" />
              </div>
              <div className="flex-1">
                {slide === 2 ? (
                  <>
                    <p className="text-xs font-semibold text-[#C0504A]">RISK MANAGEMENT</p>
                    <p className="text-[11px] text-[#888888]">News alert delivered • 2 open trades affected</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[#E8C97A]">LIVE UPDATE</p>
                    <p className="text-[11px] text-[#888888]">Streak: 3W | R avg: 1.8 | Behavior: Disciplined</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
