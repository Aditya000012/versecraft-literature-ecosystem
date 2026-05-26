'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CalendarEvent {
  event: string;
  year: string;
  description: string;
  person: string;
  category: 'Birthday' | 'Death' | 'Publication' | 'Event';
}

export default function LiteraryCalendar() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [eventData, setEventData] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const todayLocale = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const todayDateStr = new Date().toDateString();

        // Check localStorage Cache
        const cachedDate = localStorage.getItem('literaryCalendarDate');
        const cachedData = localStorage.getItem('literaryCalendar');

        if (cachedDate === todayDateStr && cachedData) {
          try {
            setEventData(JSON.parse(cachedData));
            setLoading(false);
            return;
          } catch (e) {
            console.error('Error parsing cached calendar data:', e);
          }
        }

        const prompt = `Today is ${todayLocale}. Tell me one significant event in literary history that happened on this date. It could be an author's birthday, a book's publication anniversary, an author's death anniversary, or a significant literary event. Respond in this exact JSON format with no markdown, no backticks: {"event": "brief title of the event", "year": "the year it happened", "description": "2-3 sentences about why this matters in literary history", "person": "the author or person involved", "category": "Birthday or Death or Publication or Event"}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            mode: 'default',
            history: [],
            filters: null,
          }),
        });

        if (!res.ok) {
          throw new Error('API failed');
        }

        const data = await res.json();
        const rawText = data.response || '';

        // Robust markdown backtick stripping
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        const parsed: CalendarEvent = JSON.parse(cleaned);

        if (parsed.event && parsed.year && parsed.description) {
          setEventData(parsed);
          localStorage.setItem('literaryCalendarDate', todayDateStr);
          localStorage.setItem('literaryCalendar', JSON.stringify(parsed));
        } else {
          throw new Error('Invalid parsed response');
        }
      } catch (err) {
        console.error('Error fetching literary calendar:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-center items-center min-h-[160px] animate-pulse">
        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold/50" />
        <span className="font-playfair text-gold italic text-sm">
          Consulting the literary calendar...
        </span>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-center items-center min-h-[160px]">
        <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold/30" />
        <span className="font-playfair text-gold/60 italic text-sm text-center">
          The calendar is resting today. Check back tomorrow.
        </span>
      </div>
    );
  }

  const category = eventData.category || 'Event';
  const categoryLower = category.toLowerCase();

  let badgeClass = '';
  if (categoryLower.includes('birthday')) {
    badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  } else if (categoryLower.includes('death')) {
    badgeClass = 'bg-purple-950/20 text-purple-300 border border-purple-500/20';
  } else if (categoryLower.includes('publication')) {
    badgeClass = 'bg-[#c9a84c]/10 text-gold border border-[#c9a84c]/20';
  } else {
    // default steel blue style
    badgeClass = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
  }

  const formattedDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass-card p-6 sm:p-8 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col gap-6 shadow-xl"
    >
      {/* Subtle left border in gold */}
      <div className="absolute top-0 left-0 bottom-0 w-[4px] bg-gold" />

      {/* Top row */}
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          {/* Calendar Icon */}
          <svg
            className="w-4 h-4 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="font-inter text-xs text-gold uppercase tracking-widest font-bold">
            {formattedDateStr}
          </span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider font-inter ${badgeClass}`}>
          {category}
        </span>
      </div>

      {/* Main content row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex-grow space-y-2">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-cream tracking-wide">
            {eventData.event}
          </h2>
          <p className="font-inter text-xs sm:text-sm text-cream/70 leading-relaxed font-light">
            {eventData.description}
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end justify-center flex-shrink-0">
          <span className="font-playfair text-gold text-4xl sm:text-5xl font-extrabold tracking-tighter">
            {eventData.year}
          </span>
        </div>
      </div>

      {/* Bottom row */}
      <div className="flex justify-between items-center w-full pt-4 border-t border-white/5">
        <span className="text-[9px] font-bold text-gold uppercase tracking-widest font-inter">
          On this day in literature
        </span>
        <span className="text-xs sm:text-sm font-playfair italic text-cream/80">
          — {eventData.person}
        </span>
      </div>
    </motion.div>
  );
}
