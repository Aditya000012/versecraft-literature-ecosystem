'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import DailyVerse from '@/components/DailyVerse';
import MoodSelector from '@/components/MoodSelector';
import LiteraryCalendar from '@/components/LiteraryCalendar';

interface ChatSession {
  id: string;
  type: 'simple' | 'advanced';
  mode: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  filters?: {
    genre: string;
    era: string;
    language: string;
  };
  messages: { role: string; content: string; timestamp?: Date | string | number | null }[];
}

interface BookTeaser {
  title: string;
  author: string;
  thumbnail: string;
  poeticReason: string;
  infoLink: string;
}

const defaultTeasers: BookTeaser[] = [
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    thumbnail: 'https://books.google.com/books/content?id=bV5dAAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    poeticReason: 'A dark Victorian mirror reflecting the tragedy of aesthetic obsession and the decay of an untamed soul.',
    infoLink: 'https://books.google.com/books?id=bV5dAAAAMAAJ',
  },
  {
    title: 'Divan of Hafiz',
    author: 'Hafiz',
    thumbnail: 'https://books.google.com/books/content?id=h395DwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
    poeticReason: 'Ancient Sufi verses where divine ecstasy and longing intertwine like shadows dancing in a moonlit courtyard.',
    infoLink: 'https://books.google.com/books?id=h395DwAAQBAJ',
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    thumbnail: 'https://books.google.com/books/content?id=sz18AAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
    poeticReason: 'A chilling gothic inquiry into the hubris of creation, painted with the melancholic brush of romantic isolation.',
    infoLink: 'https://books.google.com/books?id=sz18AAAAMAAJ',
  },
];

const modeNames: Record<string, string> = {
  poetry: 'Poetry Mode',
  duel: 'Verse Duel',
  story: 'Story Seed',
  analysis: 'Literary Analysis',
  judgement: 'Judgement Mode',
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [firstName, setFirstName] = useState('Reader');
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [teasers, setTeasers] = useState<BookTeaser[]>(defaultTeasers);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(false);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Fetch Firestore profile (first name) and recent chats
  useEffect(() => {
    if (!user) return;

    const fetchProfileAndChats = async () => {
      try {
        // 1. Fetch Profile Name
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          const dispName = profileData.displayName || user.displayName || '';
          if (dispName) {
            setFirstName(dispName.split(' ')[0]);
          }
          
          // If they have interested genres, try to fetch fresh teasers
          const genres = profileData.interestedGenres || [];
          if (genres.length > 0) {
            fetchTeasersFromAPI(genres[0]);
          }
        }

        // 2. Fetch Last 3 Chat Sessions
        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatsRef, orderBy('createdAt', 'desc'), limit(3));
        const querySnap = await getDocs(q);
        const chatsList: ChatSession[] = [];
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          chatsList.push({
            id: docSnap.id,
            type: data.type || 'simple',
            mode: data.mode || 'poetry',
            createdAt: data.createdAt,
            filters: data.filters,
            messages: data.messages || [],
          });
        });
        setRecentChats(chatsList);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setChatsLoading(false);
      }
    };

    fetchProfileAndChats();
  }, [user]);

  const fetchTeasersFromAPI = async (favoriteGenre: string) => {
    setRecsLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: favoriteGenre }),
      });
      if (response.ok) {
        const data = await response.json();
        const apiRecs = data.recommendations || [];
        if (apiRecs.length >= 3) {
          setTeasers(
            apiRecs.slice(0, 3).map((item: { title: string; author?: string; authors?: string[]; thumbnail: string; poeticReason: string; infoLink: string }) => ({
              title: item.title,
              author: item.author || item.authors?.join(', ') || 'Unknown Author',
              thumbnail: item.thumbnail,
              poeticReason: item.poeticReason,
              infoLink: item.infoLink,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching teasers from API:', err);
    } finally {
      setRecsLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-none border-t border-[#1a1a1a] border-r animate-spin" />
          <span className="font-playfair text-base text-[#1a1a1a] font-medium italic tracking-wide">Opening sanctuary gates...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 w-full max-w-5xl mx-auto px-6 py-28 flex flex-col gap-20 select-none"
      style={{ animation: 'candlelight-breathe 24s infinite ease-in-out' }}
    >
      {/* Floating Dust Particles Background - Extremely Sparse and Low Opacity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="dust-particle w-1.5 h-1.5 top-[18%] left-[15%]" style={{ animationDelay: '0s', animationDuration: '24s' }} />
        <div className="dust-particle w-1 h-1 top-[40%] left-[85%]" style={{ animationDelay: '4s', animationDuration: '30s' }} />
        <div className="dust-particle w-1.2 h-1.2 top-[62%] left-[30%]" style={{ animationDelay: '9s', animationDuration: '36s' }} />
        <div className="dust-particle w-1 h-1 top-[80%] left-[70%]" style={{ animationDelay: '2s', animationDuration: '22s' }} />
      </div>

      {/* Style Overrides for Child Custom Components & Special Atmospheric Animations */}
      <style>{`
        /* Slow breathing candlelight glow */
        @keyframes candlelight-breathe {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.005) contrast(0.995); }
        }

        /* Faint drifting dust particles */
        @keyframes dust-drift {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          15% { opacity: 0.035; }
          85% { opacity: 0.035; }
          100% { transform: translateY(-80px) translateX(25px) rotate(180deg); opacity: 0; }
        }

        .dust-particle {
          position: absolute;
          background: rgba(26, 26, 26, 0.4);
          border-radius: 50%;
          pointer-events: none;
          animation: dust-drift 20s infinite linear;
        }

        /* Ink text gradient shine */
        .heading-ink-shine {
          background: linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 45%, #1a1a1a 90%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShine 16s linear infinite;
        }
        @keyframes textShine {
          to { background-position: 200% center; }
        }

        /* Overrides for DailyVerse */
        .daily-verse-paper-override > div {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 0 !important;
        }
        .daily-verse-paper-override p {
          color: rgba(26, 26, 26, 0.45) !important;
          font-family: var(--font-inter), sans-serif !important;
        }
        .daily-verse-paper-override p:first-of-type {
          text-transform: uppercase !important;
          letter-spacing: 0.25em !important;
          font-size: 8px !important;
          font-weight: 700 !important;
          color: rgba(26, 26, 26, 0.4) !important;
        }
        .daily-verse-paper-override blockquote {
          color: #1a1a1a !important;
          font-family: var(--font-playfair), serif !important;
          font-style: italic !important;
          font-size: 1.15rem !important;
          line-height: 1.8 !important;
          position: relative !important;
          padding: 1.5rem 0 !important;
          border-top: 1px dashed rgba(26, 26, 26, 0.08) !important;
          border-bottom: 1px dashed rgba(26, 26, 26, 0.08) !important;
          margin: 1.25rem 0 !important;
          text-align: center !important;
        }
        
        /* Overrides for LiteraryCalendar */
        .calendar-paper-override > div {
          background: rgba(255, 255, 255, 0.35) !important;
          border-radius: 4px !important;
          border: 1px solid rgba(26, 26, 26, 0.06) !important;
          border-left: 3px solid rgba(26, 26, 26, 0.6) !important;
          box-shadow: 0 4px 20px -2px rgba(26, 26, 26, 0.01) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 1.75rem !important;
          position: relative !important;
        }
        .calendar-paper-override .absolute.top-0.left-0.bottom-0.w-\[4px\].bg-gold {
          display: none !important;
        }
        .calendar-paper-override svg.text-gold {
          color: #1a1a1a !important;
          opacity: 0.6;
        }
        .calendar-paper-override span.text-gold {
          color: rgba(26, 26, 26, 0.5) !important;
          letter-spacing: 0.15em !important;
        }
        .calendar-paper-override h2.text-cream {
          color: #1a1a1a !important;
          font-family: var(--font-playfair), serif !important;
          font-size: 1.35rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.01em !important;
        }
        .calendar-paper-override p.text-cream\/70 {
          color: #2d2d2d !important;
          font-family: var(--font-inter), sans-serif !important;
          font-size: 0.85rem !important;
          line-height: 1.6 !important;
          font-weight: 300 !important;
        }
        
        /* Large elegant Year Stamp in background */
        .calendar-paper-override span.text-gold.text-4xl,
        .calendar-paper-override span.text-gold.text-5xl {
          color: rgba(26, 26, 26, 0.035) !important;
          font-family: var(--font-playfair), serif !important;
          font-weight: 800 !important;
          font-size: 4.5rem !important;
          position: absolute !important;
          right: 1.5rem !important;
          bottom: 0.75rem !important;
          pointer-events: none !important;
          user-select: none !important;
          font-style: italic !important;
          letter-spacing: -0.05em !important;
        }
        
        .calendar-paper-override .border-t.border-white\/5 {
          border-top: 1px dashed rgba(26, 26, 26, 0.08) !important;
          padding-top: 1rem !important;
        }
        .calendar-paper-override span.text-gold.uppercase {
          color: rgba(26, 26, 26, 0.5) !important;
          font-size: 9px !important;
          letter-spacing: 0.2em !important;
        }
        .calendar-paper-override span.text-cream\/80 {
          color: #2d2d2d !important;
          font-family: var(--font-playfair), serif !important;
          font-style: italic !important;
          font-weight: 600;
        }
        .calendar-paper-override .animate-pulse {
          background-color: rgba(255, 255, 255, 0.3) !important;
          border: 1px solid rgba(26, 26, 26, 0.06) !important;
          border-left: 3px solid rgba(26, 26, 26, 0.2) !important;
          border-radius: 4px !important;
        }
        .calendar-paper-override .animate-pulse span {
          color: #1a1a1a !important;
        }
        .calendar-paper-override .absolute.top-0.left-0.bottom-0.w-\[4px\].bg-gold\/50,
        .calendar-paper-override .absolute.top-0.left-0.bottom-0.w-\[4px\].bg-gold\/30 {
          display: none !important;
        }
        .calendar-paper-override .bg-rose-500\/10 {
          background-color: rgba(185, 28, 28, 0.035) !important;
          border: 1px solid rgba(185, 28, 28, 0.08) !important;
          color: #991b1b !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-purple-950\/20 {
          background-color: rgba(107, 33, 168, 0.035) !important;
          border: 1px solid rgba(107, 33, 168, 0.08) !important;
          color: #581c87 !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-\[\#c9a84c\]\/10 {
          background-color: rgba(133, 77, 14, 0.035) !important;
          border: 1px solid rgba(133, 77, 14, 0.08) !important;
          color: #713f12 !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-sky-500\/10 {
          background-color: rgba(3, 105, 161, 0.035) !important;
          border: 1px solid rgba(3, 105, 161, 0.08) !important;
          color: #075985 !important;
          border-radius: 2px !important;
        }

        /* Overrides for MoodSelector */
        .mood-paper-override p {
          color: rgba(26, 26, 26, 0.5) !important;
          letter-spacing: 0.2em !important;
          font-size: 9px !important;
          font-weight: 700 !important;
          margin-bottom: 1rem !important;
        }
        .mood-paper-override button {
          background-color: #FFFFFF !important;
          background-image: none !important;
          border: 1px solid rgba(26, 26, 26, 0.08) !important;
          border-radius: 4px !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.01) !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        
        /* Subtle, controlled scattered rotations */
        .mood-paper-override button:nth-child(1) { transform: rotate(-0.5deg); background-color: #FFFFFF !important; }
        .mood-paper-override button:nth-child(2) { transform: rotate(0.6deg); background-color: #FAF9F6 !important; }
        .mood-paper-override button:nth-child(3) { transform: rotate(-0.8deg); background-color: #F8F6F0 !important; }
        .mood-paper-override button:nth-child(4) { transform: rotate(0.4deg); background-color: #F6F4EB !important; }
        .mood-paper-override button:nth-child(5) { transform: rotate(-0.3deg); background-color: #FAF8F5 !important; }
        .mood-paper-override button:nth-child(6) { transform: rotate(0.7deg); background-color: #FFFFFF !important; }

        .mood-paper-override button:hover {
          background-color: #F3EFEB !important;
          border-color: rgba(26, 26, 26, 0.2) !important;
          transform: scale(1.02) rotate(0deg) !important;
          box-shadow: 0 4px 12px rgba(26, 26, 26, 0.04) !important;
          z-index: 10 !important;
        }
        .mood-paper-override button span {
          color: #1a1a1a !important;
        }
        .mood-paper-override button span.text-\[\#f5f0e8\]\/40 {
          color: #555555 !important;
          font-family: var(--font-playfair), serif !important;
          font-style: italic !important;
          font-size: 10px !important;
        }
        .mood-paper-override button.border-\[\#c9a84c\] {
          background-color: #F3EFEB !important;
          border: 1px solid rgba(26, 26, 26, 0.6) !important;
          box-shadow: 0 3px 8px rgba(26, 26, 26, 0.03) !important;
        }

        /* Ruled item indicator rules */
        .ruled-item {
          border-bottom: 1px dashed rgba(26, 26, 26, 0.06);
          position: relative;
        }
        .ruled-item::before {
          content: '•';
          position: absolute;
          left: -12px;
          color: rgba(26, 26, 26, 0.15);
          font-size: 12px;
          transition: color 0.2s ease, transform 0.2s ease;
        }
        .ruled-item:hover::before {
          color: rgba(26, 26, 26, 0.7);
          transform: translateX(2px);
        }

        /* Slowly expanding ink underlines on gateways */
        .gateway-btn {
          position: relative;
        }
        .gateway-btn::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 1px;
          background: #1a1a1a;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), left 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gateway-btn:hover::after {
          width: 100%;
          left: 0;
        }
      `}</style>

      {/* Welcome & Daily Verse Editorial Composition Block */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10 border-b border-[#1a1a1a]/10 pb-14"
      >
        {/* Welcome Section */}
        <div className="lg:col-span-7 space-y-6 relative pl-6 flex flex-col justify-center">
          {/* Vertical left ledger margin line */}
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-red-800/12 via-red-800/8 to-transparent" />
          
          <p className="text-[9px] tracking-[0.25em] uppercase font-bold text-[#1a1a1a]/40 font-inter">
            CHAMBER LOGS
          </p>
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            <span className="heading-ink-shine">Welcome back,</span> <br />
            <span className="italic font-normal text-[#1a1a1a]/85">{firstName}</span>
          </h1>
          <p className="font-inter text-sm text-[#2d2d2d]/75 leading-relaxed max-w-lg font-light">
            The candles are lit, and the ink is fresh. Which pathway shall your literary curiosity navigate today?
          </p>
          <div className="pt-1">
            <Link
              href="/profile?tab=preferences"
              className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/65 hover:text-[#1a1a1a] transition-all hover:underline decoration-1 underline-offset-4"
            >
              Edit Preferences →
            </Link>
          </div>
        </div>

        {/* Daily Verse Section */}
        <div className="lg:col-span-5 pl-6 lg:pl-12 lg:border-l lg:border-[#1a1a1a]/10 relative flex flex-col justify-center">
          <div className="daily-verse-paper-override">
            <DailyVerse />
          </div>
        </div>
      </motion.section>

      {/* Literary Calendar Archive Strip */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 max-w-4xl mx-auto w-full"
      >
        <div className="calendar-paper-override">
          <LiteraryCalendar />
        </div>
      </motion.section>

      {/* Mood Selector Scattered Notes Block */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full"
      >
        <div className="mood-paper-override">
          <MoodSelector />
        </div>
      </motion.section>

      {/* Quick Launch Gateways */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
        {/* Simple Companion */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/45 border border-[#1a1a1a]/5 p-8 rounded-sm shadow-[0_4px_16px_rgba(26,26,26,0.005)] relative group min-h-[260px] flex flex-col justify-between transition-all duration-300 hover:bg-white/70 hover:border-[#1a1a1a]/12 hover:shadow-[0_6px_20px_rgba(26,26,26,0.015)]"
        >
          {/* Crimson notebook margin indicator */}
          <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-red-800/10" />
          
          <div className="pl-2">
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#1a1a1a]/40 font-inter">
              CO-AUTHORS CHAMBER
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-2 select-none">
              Simple Companion
            </h2>
            <p className="font-inter text-xs text-[#2d2d2d]/75 mt-4 leading-relaxed max-w-sm italic font-light">
              &ldquo;An open page, a resting pen...&rdquo; Engage in warm creative dialogue. Prompt the companion to craft custom poems, trade verses in real-time, generate seeds, or submit writing to the critiques of Judgement Mode.
            </p>
          </div>

          <div className="mt-8 pl-2">
            <Link
              href="/chat/simple"
              className="gateway-btn inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a] pb-1 transition-all"
            >
              Launch Chat
              <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>

        {/* Advanced Chambers */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#F5F2EA]/50 border border-[#1a1a1a]/5 p-8 rounded-sm shadow-[0_4px_16px_rgba(26,26,26,0.005)] relative group min-h-[260px] flex flex-col justify-between transition-all duration-300 hover:bg-[#F5F2EA]/75 hover:border-[#1a1a1a]/12 hover:shadow-[0_6px_20px_rgba(26,26,26,0.015)]"
        >
          {/* Archival ink margin indicator */}
          <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/8" />

          <div className="pl-2">
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#1a1a1a]/40 font-inter">
              LITERARY VAULT
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1a1a1a] mt-2 select-none">
              Advanced Chambers
            </h2>
            <p className="font-inter text-xs text-[#2d2d2d]/75 mt-4 leading-relaxed max-w-sm font-serif font-light">
              Lock your dialogue into specific historical styles, eras, and scholars. Watch the entire interface settle into reflecting candlelit studies, Victorian shadows, or rain-slicked modern avenues.
            </p>
          </div>

          <div className="mt-8 pl-2">
            <Link
              href="/chat/advanced"
              className="gateway-btn inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a] pb-1 transition-all"
            >
              Enter Chambers
              <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Main Panel grid: Recent Activity vs Recommendations */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-16 relative z-10 pt-4 border-t border-[#1a1a1a]/10">
        {/* Left Column: Recent Activity (3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-[#1a1a1a]/10">
            <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              📜 Archived Correspondence
            </h3>
          </div>

          {chatsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border border-[#1a1a1a] border-t-transparent rounded-none animate-spin" />
            </div>
          ) : recentChats.length === 0 ? (
            <div className="py-8 pl-6 relative text-[#6b6b6b] text-xs font-light font-inter">
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/10" />
              ✒️ No recent sessions found. Launch a chat to begin scribing your anthology.
            </div>
          ) : (
            <div className="space-y-1 relative pl-6">
              {/* Margin border line */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-red-800/10" />

              {recentChats.map((c) => (
                <Link
                  key={c.id}
                  href={`/chat/${c.type}?id=${c.id}`}
                  className="block group py-3.5 pl-3 -ml-3 transition-colors ruled-item"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-3">
                        <span className="text-[7px] uppercase tracking-widest font-bold text-[#1a1a1a]/55 border border-[#1a1a1a]/10 px-1.5 py-0.5 rounded-sm bg-white select-none">
                          {c.type}
                        </span>
                        <h4 className="font-playfair text-base font-bold text-[#1a1a1a] group-hover:underline decoration-1 underline-offset-2">
                          {modeNames[c.mode] || c.mode}
                        </h4>
                      </div>
                      
                      {c.type === 'advanced' && c.filters && (
                        <p className="text-[10px] text-[#6b6b6b] mt-0.5 font-inter">
                          Chamber: {c.filters.genre} • {c.filters.era}
                        </p>
                      )}
                      
                      <p className="text-xs text-[#2d2d2d]/70 mt-1.5 font-inter italic max-w-md truncate">
                        &ldquo;{c.messages[c.messages.length - 1]?.content || 'Session initialized.'}&rdquo;
                      </p>
                    </div>

                    <div className="text-[10px] text-[#6b6b6b]/60 font-inter self-center whitespace-nowrap">
                      {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }) : 'Recent'}
                    </div>
                  </div>
                </Link>
              ))}
              <div className="pt-5">
                <Link
                  href="/chat/simple?sidebar=open"
                  className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/65 hover:text-[#1a1a1a] transition-all hover:underline decoration-1 underline-offset-4"
                >
                  View All History →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recommendations Teaser (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-[#1a1a1a]/10">
            <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              📚 Library Discoveries
            </h3>
            <Link
              href="/recommendations"
              className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 hover:underline font-inter flex items-center gap-0.5"
            >
              Full Page →
            </Link>
          </div>

          {recsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border border-[#1a1a1a] border-t-transparent rounded-none animate-spin" />
            </div>
          ) : (
            <div className="space-y-1 relative pl-6">
              {/* Margin line */}
              <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-red-800/10" />

              {teasers.map((book, index) => {
                const linkPhrases = ["Open Volume", "View Edition", "Read Fragment"];
                const linkLabel = linkPhrases[index % linkPhrases.length] || "Open Volume";
                return (
                  <div
                    key={book.title}
                    className="py-4 border-b border-[#1a1a1a]/5 flex gap-4 items-start relative pl-3 -ml-3 group"
                  >
                    <img
                      src={book.thumbnail}
                      alt={book.title}
                      className="w-14 h-20 shadow-[3px_3px_8px_rgba(26,26,26,0.12)] object-cover flex-shrink-0 border border-[#1a1a1a]/10 transition-transform duration-300 group-hover:scale-105 rounded-sm"
                    />
                    <div className="flex-grow min-w-0">
                      <h4 className="font-playfair text-sm font-bold text-[#1a1a1a] leading-snug">{book.title}</h4>
                      <p className="font-inter text-[10px] text-[#6b6b6b] italic mt-0.5">{book.author}</p>
                      <p className="font-inter text-[11px] text-[#2d2d2d]/75 leading-relaxed font-light mt-2 max-w-xs">
                        {book.poeticReason}
                      </p>
                      <a
                        href={book.infoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-[#1a1a1a]/85 hover:underline uppercase tracking-widest font-inter mt-3"
                      >
                        {linkLabel} ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
