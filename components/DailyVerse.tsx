'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DailyVerse() {
  const [verse, setVerse] = useState('');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('');

  useEffect(() => {
    const today = new Date().toDateString();
    const cached = localStorage.getItem('dailyVerse');
    const cachedDate = localStorage.getItem('dailyVerseDate');

    if (cached && cachedDate === today) {
      setVerse(cached);
      setTheme(localStorage.getItem('dailyVerseTheme') || '');
      setLoading(false);
      return;
    }

    const themes = [
      'the passage of time and memory',
      'longing and distance',
      'the beauty of impermanence',
      'solitude and self discovery',
      'the sea and its mysteries',
      'autumn and loss',
      'first light and new beginnings',
      'the weight of unspoken words',
      'midnight and its secrets',
      'love worn down by years'
    ];

    const todayTheme = themes[new Date().getDate() % themes.length];
    setTheme(todayTheme);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Write a single short poem of 4 lines about ${todayTheme}. Make it vivid, emotional, and memorable. No title needed.`,
        mode: 'poetry',
        history: [],
        filters: null
      })
    })
      .then(res => res.json())
      .then(data => {
        const poem = data.response || '';
        setVerse(poem);
        localStorage.setItem('dailyVerse', poem);
        localStorage.setItem('dailyVerseDate', today);
        localStorage.setItem('dailyVerseTheme', todayTheme);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm p-8 text-center">
      <p className="text-[#c9a84c]/60 font-playfair italic animate-pulse">The muse is composing...</p>
    </div>
  );

  if (!verse) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full rounded-2xl border border-[#c9a84c]/20 bg-black/30 backdrop-blur-sm p-8"
    >
      <p className="text-[#c9a84c]/60 text-xs uppercase tracking-widest font-inter mb-4">✦ Verse of the Day</p>
      <p className="text-[#c9a84c]/40 text-xs font-inter italic mb-6">Today&apos;s theme: {theme}</p>
      <blockquote className="font-playfair text-[#f5f0e8] text-lg leading-relaxed italic whitespace-pre-line">
        {verse}
      </blockquote>
    </motion.div>
  );
}
