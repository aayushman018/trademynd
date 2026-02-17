'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.12
    }
  }
};

export default function Home() {
  return (
    <div className="bg-background min-h-screen font-sans text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed w-full top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight text-foreground">Trademynd</div>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/register" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-3xl mx-auto px-6 text-center mb-32">
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight"
            >
              Your trading journal, <br className="hidden sm:block" />
              <span className="text-muted-foreground">without the journaling.</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Send a screenshot, voice note, or trade log. Trademynd organizes and reflects your trades quietly.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button size="lg" className="rounded-full px-8 text-base">
                  Connect Telegram
                </Button>
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center">
                See how it works <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Visual Placeholder */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-16 bg-card rounded-2xl shadow-sm border border-border p-4 max-w-sm mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-700"
          >
            <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-foreground">Trademynd Bot</div>
                <div className="text-[10px] text-muted-foreground">bot</div>
              </div>
            </div>
            <div className="space-y-3 text-left">
              <div className="bg-primary/5 p-3 rounded-lg rounded-tl-none text-xs text-foreground max-w-[85%]">
                Processed: <strong>LONG BTCUSDT</strong> <br/>
                Entry: $45,200 → Exit: $46,100 <br/>
                Result: <strong>WIN (+1.8R)</strong>
              </div>
              <div className="bg-muted p-2 rounded-lg text-[10px] text-muted-foreground w-fit">
                Saved to dashboard • 10:42 AM
              </div>
            </div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 mb-32">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">How it works</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { title: "Send the trade", desc: "Screenshot, voice note, or text.", icon: MessageSquare },
              { title: "Trademynd organizes it", desc: "Clean, structured entry automatically.", icon: Zap },
              { title: "You review patterns", desc: "Calm insights, no noise.", icon: ShieldCheck }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-card rounded-full shadow-sm border border-border flex items-center justify-center mb-6 text-foreground">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Philosophy */}
        <section className="max-w-2xl mx-auto px-6 mb-32 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="space-y-6"
          >
            <p className="text-xl sm:text-2xl text-muted-foreground font-medium leading-relaxed">
              No signals. <br/>
              No strategies. <br/>
              No dopamine dashboards.
            </p>
            <p className="text-2xl sm:text-3xl text-foreground font-semibold mt-8">
              Just clear records and honest reflection.
            </p>
          </motion.div>
        </section>

        {/* Product Preview Cards */}
        <section className="max-w-4xl mx-auto px-6 mb-32">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card p-8 rounded-2xl shadow-sm border border-border"
            >
              <div className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Daily Summary</div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <span className="text-muted-foreground font-medium">Win Rate</span>
                  <span className="text-foreground font-bold">62%</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <span className="text-muted-foreground font-medium">Profit Factor</span>
                  <span className="text-foreground font-bold">1.8</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Mistakes</span>
                  <span className="text-foreground font-bold">0</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="bg-card p-8 rounded-2xl shadow-sm border border-border flex flex-col justify-center"
            >
              <div className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">Behavioral Insight</div>
              <p className="text-foreground italic leading-relaxed">
                "You tend to overtrade after a loss on XAUUSD. Consider taking a 15-minute break after any loss greater than 1R."
              </p>
            </motion.div>
          </div>
        </section>

        {/* Trust / Positioning */}
        <section className="max-w-2xl mx-auto px-6 mb-32 text-center">
          <motion.div
             initial={{ opacity: 0 }}
             whileInView={{ opacity: 1 }}
             viewport={{ once: true }}
             transition={{ duration: 0.8 }}
          >
            <p className="text-lg text-muted-foreground mb-2">Built for retail traders journaling under $1,000 accounts.</p>
            <p className="text-lg text-foreground font-medium">Costs less than one losing trade per month.</p>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-card p-12 rounded-3xl shadow-sm border border-border"
          >
            <h2 className="text-3xl font-bold text-foreground mb-8">Start journaling quietly.</h2>
            <Link href="/register">
              <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-md hover:shadow-lg transition-all">
                Connect Telegram
              </Button>
            </Link>
            <p className="mt-6 text-xs text-muted-foreground">No credit card required. Cancel anytime.</p>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border py-12 bg-background">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground">
          <div>© 2024 Trademynd. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
