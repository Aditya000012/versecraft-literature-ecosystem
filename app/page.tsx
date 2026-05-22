'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const steps = [
  {
    number: '01',
    title: 'Choose Your Path',
    desc: 'Enter as an explorer browsing the library, or cross the threshold to write alongside the muse.',
  },
  {
    number: '02',
    title: 'Set Your Vibe',
    desc: 'Select genres, historical eras, specific author styles, and languages to tune your AI companion.',
  },
  {
    number: '03',
    title: 'Let the Muse Speak',
    desc: 'Engage in deep literary chats, trade verses in duels, generate rich story starters, or request formal critique.',
  },
];

const features = [
  {
    icon: '💬',
    title: 'Simple Chat',
    desc: 'Engage in warm literary discourse with your AI companion, exploring authors, concepts, and creativity.',
  },
  {
    icon: '🎭',
    title: 'Advanced Chat',
    desc: 'Deepen your creative writing with custom-locked filters tailored to specific eras, styles, and genres.',
  },
  {
    icon: '📚',
    title: 'Digital Library',
    desc: 'Browse or search through thousands of classic publications and modern works powered by Google Books.',
  },
  {
    icon: '🍷',
    title: 'Recommendations',
    desc: 'Receive curated reading suggestions matching your custom vibe, detailed with poetic reasoning.',
  },
  {
    icon: '📜',
    title: 'Personal Anthology',
    desc: 'Save and cherish your dialogue creations, beautifully preserved inside your private reader archive.',
  },
  {
    icon: '⚔️',
    title: 'Verse Duel',
    desc: 'Challenge yourself with interactive poetry battles, trading poetic lines turn-by-turn with the AI.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-transparent">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="mb-4 px-3 py-1 rounded-full border border-gold/25 bg-gold/5 text-xs text-gold uppercase tracking-widest font-semibold font-inter shadow shadow-gold/5"
          >
            Whispers of the Ink
          </motion.div>

          <h1 className="font-playfair text-5xl sm:text-7xl font-bold text-cream leading-tight tracking-wide mb-6">
            Every great story begins with a <span className="text-gold italic font-medium">single word</span>.
          </h1>

          <p className="font-inter text-base sm:text-lg text-cream/70 max-w-2xl leading-relaxed mb-10">
            Versecraft is your literary companion — explore, create, analyse, and discover literature powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full sm:w-auto">
            <Link
              href="/auth"
              className="px-8 py-3.5 rounded-lg bg-gold hover:bg-gold-light text-[#0a0a1a] font-bold text-sm tracking-wider uppercase font-inter transition-all duration-300 shadow-lg shadow-gold/10 hover:shadow-gold/20 hover:-translate-y-0.5"
            >
              Begin Your Journey
            </Link>
            <Link
              href="/library"
              className="px-8 py-3.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-[#f5f0e8] font-bold text-sm tracking-wider uppercase font-inter transition-all duration-300 hover:-translate-y-0.5"
            >
              Explore Library
            </Link>
          </div>
        </motion.div>

        {/* Floating scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer font-inter text-[10px] text-cream/40 uppercase tracking-widest"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <span>Scroll Down</span>
          <div className="w-[1px] h-10 bg-gradient-to-b from-cream/40 to-transparent" />
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4 border-t border-white/5 relative z-10 bg-black/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-3xl sm:text-5xl font-bold text-cream mb-4">How It Works</h2>
            <p className="font-inter text-sm text-cream/50 max-w-lg mx-auto">
              Follow three simple movements to weave your thoughts into timeless verse and prose.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {steps.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: idx * 0.2, duration: 0.8 }}
                className="flex flex-col relative group"
              >
                <div className="font-playfair text-6xl font-extrabold text-gold/10 group-hover:text-gold/20 transition-colors mb-4">
                  {step.number}
                </div>
                <h3 className="font-playfair text-xl font-bold text-cream mb-2 group-hover:text-gold transition-colors">
                  {step.title}
                </h3>
                <p className="font-inter text-sm text-cream/60 leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="py-24 px-4 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-3xl sm:text-5xl font-bold text-cream mb-4">What You Can Do</h2>
            <p className="font-inter text-sm text-cream/50 max-w-lg mx-auto">
              Unlock the vault of creative writing with tools built specifically for readers and scribes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feat, idx) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="glass-card p-8 rounded-2xl border border-white/5 relative overflow-hidden transition-all shadow-lg shadow-black/20 hover:border-gold/30 group"
              >
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-3xl mb-4 text-gold">{feat.icon}</div>
                <h3 className="font-playfair text-lg font-bold text-cream mb-2 group-hover:text-gold transition-colors">
                  {feat.title}
                </h3>
                <p className="font-inter text-xs text-cream/60 leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 border-t border-white/5 bg-black/20 text-center relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
          <Link href="/" className="font-playfair text-xl font-bold text-gold tracking-wider">
            Versecraft
          </Link>
          <p className="font-inter text-xs text-cream/40 italic">
            Where literature lives and breathes. Crafted for the writers, readers, and dreamers.
          </p>
          <div className="font-inter text-[10px] text-cream/20 mt-4">
            &copy; {new Date().getFullYear()} Versecraft. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
