'use client';

import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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

// Exactly 4 curated masterpieces to build the premium 4-column horizontal portfolio
const defaultTeasers: BookTeaser[] = [
  {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    thumbnail: 'https://covers.openlibrary.org/b/title/The%20Picture%20of%20Dorian%20Gray-M.jpg',
    poeticReason: 'A dark Victorian mirror reflecting the tragedy of aesthetic obsession and the decay of an untamed soul.',
    infoLink: 'https://books.google.com/books?id=bV5dAAAAMAAJ',
  },
  {
    title: 'Divan of Hafiz',
    author: 'Hafiz',
    thumbnail: 'https://covers.openlibrary.org/b/title/Divan%20of%20Hafiz-M.jpg',
    poeticReason: 'Ancient Sufi verses where divine ecstasy and longing intertwine like shadows dancing in a moonlit courtyard.',
    infoLink: 'https://books.google.com/books?id=h395DwAAQBAJ',
  },
  {
    title: 'Frankenstein',
    author: 'Mary Shelley',
    thumbnail: 'https://covers.openlibrary.org/b/title/Frankenstein-M.jpg',
    poeticReason: 'A chilling gothic inquiry into the hubris of creation, painted with the melancholic brush of romantic isolation.',
    infoLink: 'https://books.google.com/books?id=sz18AAAAMAAJ',
  },
  {
    title: 'The Waste Land',
    author: 'T.S. Eliot',
    thumbnail: 'https://covers.openlibrary.org/b/title/The%20Waste%20Land-M.jpg',
    poeticReason: 'A fractured modernist masterpiece traversing dry stone and shadow, seeking rain in a disillusioned post-war world.',
    infoLink: 'https://books.google.com/books?id=O4VdAAAAMAAJ',
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
  const [activeTransition, setActiveTransition] = useState<'simple' | 'advanced' | null>(null);

  // Animation states & refs
  const [isMobile, setIsMobile] = useState(false);
  const [ruledLineProgress, setRuledLineProgress] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [bloomActive, setBloomActive] = useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const bloomTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const dashboardContainerRef = React.useRef<HTMLDivElement | null>(null);

  // 1. Mobile screen check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 2. Ruled Lines Scroll Tracking
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? window.scrollY / totalHeight : 0;
      setRuledLineProgress(Math.min(Math.max(progress, 0), 1));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 3. Ink Droplet Fall Animation Loop
  useEffect(() => {
    if (isMobile) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    interface Droplet {
      x: number;
      y: number;
      radius: number;
      opacity: number;
      speed: number;
      state: 'falling' | 'dissolving';
    }

    const droplets: Droplet[] = [];
    const createDroplet = (staggerHeight = false, index = 0): Droplet => {
      const x = Math.random() * (canvas.width * 0.9) + canvas.width * 0.05;
      const y = staggerHeight ? (canvas.height * 0.65 * (index / 5)) : -10;
      return {
        x,
        y,
        radius: 2.5,
        opacity: 0.12,
        speed: 0.4,
        state: 'falling',
      };
    };

    for (let i = 0; i < 5; i++) {
      droplets.push(createDroplet(true, i));
    }

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      droplets.forEach((d, idx) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(26, 26, 26, ${d.opacity})`;
        ctx.fill();

        if (d.state === 'falling') {
          d.y += d.speed;
          d.speed += 0.008;
          d.opacity = 0.12;

          if (d.y > canvas.height * 0.65) {
            d.state = 'dissolving';
          }
        } else {
          d.radius += 0.3;
          d.opacity -= 0.004;

          if (d.opacity <= 0) {
            droplets[idx] = createDroplet(false);
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // 4. Cursor Ink Bloom Mouse Tracking
  useEffect(() => {
    if (isMobile) return;
    const container = dashboardContainerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      setBloomActive(true);

      if (bloomTimeoutRef.current) {
        clearTimeout(bloomTimeoutRef.current);
      }

      bloomTimeoutRef.current = setTimeout(() => {
        setBloomActive(false);
      }, 400);
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (bloomTimeoutRef.current) {
        clearTimeout(bloomTimeoutRef.current);
      }
    };
  }, [isMobile]);

  // High-performance Framer Motion scroll tracking
  const { scrollY } = useScroll();

  // Scroll transformations - Living Manuscript Drift Layer
  const parchmentY = useTransform(scrollY, [0, 2000], [0, -140]);
  const parchmentX = useTransform(scrollY, [0, 2000], [0, -40]);

  // Sparse faded literary fragments layer
  const fragmentY = useTransform(scrollY, [0, 2000], [0, -280]);
  const fragmentX = useTransform(scrollY, [0, 2000], [0, 50]);

  // Curved drifting parchment dust / fibers
  const dustY = useTransform(scrollY, [0, 2000], [0, -420]);
  const dustX = useTransform(scrollY, [0, 2000], [0, -70]);

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
    inferUserTasteAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const inferUserTasteAndFetch = async () => {
    if (!user) return;
    setRecsLoading(true);
    try {
      // Step 1 — Read the user's Firestore document at users/{uid}
      const profileRef = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(profileRef);
      if (!profileSnap.exists()) {
        setTeasers(defaultTeasers);
        return;
      }

      const profileData = profileSnap.data();
      const interestedGenres = profileData.interestedGenres || [];
      const wishlist = profileData.wishlist || [];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const anthology = profileData.anthology || []; // Extracted as requested

      let determinedGenre: string | null = null;

      // Step 2 — Determine the best genre using priority order

      interface WishlistItem {
        categories?: string | string[];
        category?: string | string[];
        genre?: string | string[];
      }

      // First priority: If wishlist has 3 or more items, look at categories and find the most common genre
      if (wishlist.length >= 3) {
        const genreCounts: Record<string, number> = {};
        wishlist.forEach((book: WishlistItem) => {
          const cats = book.categories || book.category || book.genre;
          if (cats) {
            const catList = Array.isArray(cats) ? cats : [cats];
            catList.forEach((c: string) => {
              if (c && typeof c === 'string') {
                const cleaned = c.trim();
                if (cleaned) {
                  genreCounts[cleaned] = (genreCounts[cleaned] || 0) + 1;
                }
              }
            });
          }
        });

        let maxCount = 0;
        let mostCommonGenre: string | null = null;
        Object.entries(genreCounts).forEach(([genre, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonGenre = genre;
          }
        });
        if (mostCommonGenre) {
          determinedGenre = mostCommonGenre;
        }
      }

      // Second priority: If interestedGenres array has at least one item, use interestedGenres[0]
      if (!determinedGenre && interestedGenres.length > 0 && interestedGenres[0]) {
        determinedGenre = interestedGenres[0];
      }

      // Third priority: Read the last 3 chats and find if any are type 'advanced' with filters.genre
      if (!determinedGenre) {
        const chatsRef = collection(db, 'users', user.uid, 'chats');
        const q = query(chatsRef, orderBy('createdAt', 'desc'), limit(3));
        const querySnap = await getDocs(q);
        for (let i = 0; i < querySnap.docs.length; i++) {
          const chatData = querySnap.docs[i].data();
          if (chatData.type === 'advanced' && chatData.filters?.genre) {
            determinedGenre = chatData.filters.genre;
            break;
          }
        }
      }

      // If none of the above yield a genre, silently fallback to defaultTeasers
      if (!determinedGenre) {
        setTeasers(defaultTeasers);
        return;
      }

      // Step 3 — If a genre was determined, call POST /api/recommendations
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: determinedGenre,
          era: '',
          author: '',
          language: 'English'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const apiRecs = data.recommendations || [];
        if (apiRecs.length > 0) {
          interface ApiBookItem {
            title: string;
            author?: string;
            authors?: string[];
            thumbnail?: string;
            poeticReason?: string;
            infoLink?: string;
          }

          const apiMapped: BookTeaser[] = apiRecs.map((item: ApiBookItem) => ({
            title: item.title,
            author: item.author || item.authors?.join(', ') || 'Unknown Author',
            thumbnail: item.thumbnail || `https://covers.openlibrary.org/b/title/${encodeURIComponent(item.title)}-M.jpg`,
            poeticReason: item.poeticReason || '',
            infoLink: item.infoLink || ''
          }));

          const filled = [...apiMapped];
          // If fewer than 4 fill remaining slots with defaultTeasers
          while (filled.length < 4) {
            filled.push(defaultTeasers[filled.length]);
          }
          setTeasers(filled.slice(0, 4));
        } else {
          setTeasers(defaultTeasers);
        }
      } else {
        setTeasers(defaultTeasers);
      }
    } catch (err) {
      console.error('Error in inferUserTasteAndFetch:', err);
      setTeasers(defaultTeasers);
    } finally {
      setRecsLoading(false);
    }
  };

  const handleChamberClick = (e: React.MouseEvent, type: 'simple' | 'advanced', path: string) => {
    e.preventDefault();
    setActiveTransition(type);
    // Snappy, premium transition: push route at 580ms during animation
    setTimeout(() => {
      router.push(path);
    }, 580);
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

  // Gateway Transition Class Helpers
  const isAdvanced = activeTransition === 'advanced';
  const overlayBg = isAdvanced ? 'bg-[#121212]' : 'bg-[#FAF6EC]';
  const overlayBorder = isAdvanced ? 'border-[#F8F4E9]/10' : 'border-[#1a1a1a]/10';
  const overlayTitle = isAdvanced ? 'text-[#FAF6EC]' : 'text-[#1a1a1a]';
  const overlayText = isAdvanced ? 'text-[#FAF6EC]/60' : 'text-[#1a1a1a]/60';

  return (
    <>
      {/* Ink droplet canvas */}
      {!isMobile && (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0"
          style={{ mixBlendMode: 'multiply' }}
        />
      )}

      <div
        ref={dashboardContainerRef}
        className="relative z-10 w-full flex flex-col gap-24 select-none overflow-hidden pb-20"
        style={{ animation: 'candlelight-ambience 28s infinite ease-in-out' }}
      >
        {/* Scroll-Responsive "Living Manuscript Drift" System (Background Layers) */}
        {/* 1. Deep Parchment Shadow Layer */}
        <motion.div 
          style={{ y: parchmentY, x: parchmentX }}
          className="manuscript-background-layer absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute top-[8%] left-[-10%] w-[1000px] h-[700px] bg-gradient-to-tr from-[#dcd1b8]/15 to-transparent rounded-full filter blur-[120px]" />
          <div className="absolute top-[48%] right-[-15%] w-[1100px] h-[800px] bg-gradient-to-bl from-[#dcd1b8]/12 to-transparent rounded-full filter blur-[150px]" />
        </motion.div>

        {/* 2. Literary Fragment Layer (Sparse, barely readable annotations with breathing animation) */}
        <motion.div 
          style={{ y: fragmentY, x: fragmentX }}
          className="manuscript-background-layer absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute top-[14%] right-[12%] font-playfair text-[#1a1a1a] text-sm italic tracking-widest fragment-breathe-1">
            *silentium est templum*
          </div>
          <div className="absolute top-[32%] left-[10%] font-playfair text-[#1a1a1a] text-[10px] tracking-[0.35em] fragment-breathe-2">
            N° 48.209 — CO-AUTHORS SANCTUARY
          </div>
          <div className="absolute top-[52%] right-[16%] font-playfair text-[#1a1a1a] text-xs italic fragment-breathe-3">
            “ad infinitum...”
          </div>
          <div className="absolute top-[75%] left-[8%] font-playfair text-[#1a1a1a] text-sm italic fragment-breathe-4">
            ex libris versecraft
          </div>
          <div className="absolute top-[92%] right-[10%] font-playfair text-[#1a1a1a] text-xs fragment-breathe-5">
            *codex manuscriptum*
          </div>
        </motion.div>

        {/* 3. Atmospheric Dust Layer (Paper fibers) */}
        <motion.div 
          style={{ y: dustY, x: dustX }}
          className="manuscript-background-layer absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute top-[28%] left-[18%] w-[1px] h-10 bg-[#1a1a1a]/15 rotate-[32deg] rounded-full filter blur-[0.5px]" />
          <div className="absolute top-[58%] left-[78%] w-[1px] h-12 bg-[#1a1a1a]/12 rotate-[-48deg] rounded-full filter blur-[0.5px]" />
          <div className="absolute top-[82%] left-[42%] w-[1px] h-8 bg-[#1a1a1a]/15 rotate-[20deg] rounded-full filter blur-[0.5px]" />
        </motion.div>

        {/* Overrides for Nested Children Components & Full-Width Custom Aesthetics */}
        <style>{`
          /* fragmentBreathe keyframe and breathing classes */
          @keyframes fragmentBreathe {
            0%, 100% { opacity: 0.015; }
            50% { opacity: 0.04; }
          }
          .fragment-breathe-1 { animation: fragmentBreathe 8s infinite ease-in-out; animation-delay: 0s; opacity: 0.015; }
          .fragment-breathe-2 { animation: fragmentBreathe 8s infinite ease-in-out; animation-delay: 2s; opacity: 0.015; }
          .fragment-breathe-3 { animation: fragmentBreathe 8s infinite ease-in-out; animation-delay: 4s; opacity: 0.015; }
          .fragment-breathe-4 { animation: fragmentBreathe 8s infinite ease-in-out; animation-delay: 1.5s; opacity: 0.015; }
          .fragment-breathe-5 { animation: fragmentBreathe 8s infinite ease-in-out; animation-delay: 3s; opacity: 0.015; }

          /* Slow breathing candlelight ambient background illumination */
          @keyframes candlelight-ambience {
            0%, 100% { filter: brightness(1) contrast(1); background-color: #F8F4E9; }
            33% { filter: brightness(1.002) contrast(0.998); background-color: #FAF7EF; }
            66% { filter: brightness(0.998) contrast(1.002); background-color: #F6F2E7; }
          }

        /* Hide heavy animations on mobile screen widths to prioritize performance */
        @media (max-width: 768px) {
          .manuscript-background-layer {
            display: none !important;
          }
        }

        /* Ink text gradient shine */
        @keyframes textShine {
          to { background-position: 200% center; }
        }
        @keyframes ink-breathe {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 1; }
        }
        .heading-ink-shine {
          background: linear-gradient(135deg, #1a1a1a 0%, #444444 50%, #1a1a1a 100%);
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShine 16s linear infinite, ink-breathe 10s infinite ease-in-out;
        }

        /* Faint starlight text shadows */
        @keyframes light-drift {
          0%, 100% { text-shadow: 0 0 0px transparent; opacity: 0.8; }
          50% { text-shadow: 0 0 1px rgba(26, 26, 26, 0.08); opacity: 0.95; }
        }
        .meta-breathe {
          animation: light-drift 12s infinite ease-in-out;
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
          font-size: 1.25rem !important;
          line-height: 1.85 !important;
          position: relative !important;
          padding: 1.75rem 0 !important;
          border-top: 1px dashed rgba(26, 26, 26, 0.08) !important;
          border-bottom: 1px dashed rgba(26, 26, 26, 0.08) !important;
          margin: 1.25rem 0 !important;
          text-align: center !important;
          transition: border-color 0.4s ease;
        }
        .daily-verse-paper-override:hover blockquote {
          border-color: rgba(26, 26, 26, 0.2) !important;
        }

        /* Edge-to-edge full width timeline ledger strip */
        .full-width-band {
          width: 100vw;
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
        }

        /* Feathered transitions from cream to charcoal */
        .full-width-band::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: linear-gradient(to bottom, #F8F4E9, transparent);
          pointer-events: none;
          z-index: 10;
        }
        .full-width-band::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: linear-gradient(to top, #F8F4E9, transparent);
          pointer-events: none;
          z-index: 10;
        }

        /* Dark styles for LiteraryCalendar inside band */
        .calendar-paper-override > div {
          background: transparent !important;
          border-radius: 0px !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 1rem 0 !important;
        }
        .calendar-paper-override svg.text-gold {
          color: rgba(248, 244, 233, 0.8) !important;
        }
        .calendar-paper-override span.text-gold {
          color: rgba(248, 244, 233, 0.5) !important;
          letter-spacing: 0.15em !important;
        }
        .calendar-paper-override h2.text-cream {
          color: #FAF6EC !important;
          font-family: var(--font-playfair), serif !important;
          font-size: 1.45rem !important;
          font-weight: 700 !important;
          letter-spacing: -0.01em !important;
        }
        .calendar-paper-override p.text-cream\/70 {
          color: rgba(248, 244, 233, 0.75) !important;
          font-family: var(--font-inter), sans-serif !important;
          font-size: 0.875rem !important;
          line-height: 1.6 !important;
          font-weight: 300 !important;
        }
        .calendar-paper-override span.text-gold.text-4xl,
        .calendar-paper-override span.text-gold.text-5xl {
          color: rgba(248, 244, 233, 0.045) !important;
          font-family: var(--font-playfair), serif !important;
          font-weight: 800 !important;
          font-size: 5rem !important;
          position: absolute !important;
          right: 0.5rem !important;
          bottom: 0.5rem !important;
          pointer-events: none !important;
          user-select: none !important;
          font-style: italic !important;
          letter-spacing: -0.05em !important;
          transition: transform 0.4s ease, color 0.4s ease !important;
        }
        .calendar-paper-override:hover span.text-gold.text-4xl,
        .calendar-paper-override:hover span.text-gold.text-5xl {
          color: rgba(248, 244, 233, 0.08) !important;
          transform: translateY(-2px) scale(1.02) !important;
        }
        .calendar-paper-override .border-t.border-white\/5 {
          border-top: 1px dashed rgba(248, 244, 233, 0.15) !important;
          padding-top: 1rem !important;
        }
        .calendar-paper-override span.text-gold.uppercase {
          color: rgba(248, 244, 233, 0.5) !important;
          font-size: 9px !important;
          letter-spacing: 0.2em !important;
        }
        .calendar-paper-override span.text-cream\/80 {
          color: #FAF6EC !important;
          font-family: var(--font-playfair), serif !important;
          font-style: italic !important;
          font-weight: 600;
        }
        .calendar-paper-override .animate-pulse {
          background-color: transparent !important;
          border: none !important;
        }
        .calendar-paper-override .animate-pulse span {
          color: rgba(248, 244, 233, 0.7) !important;
        }
        .calendar-paper-override .bg-rose-500\/10 {
          background-color: rgba(244, 63, 94, 0.08) !important;
          border: 1px solid rgba(244, 63, 94, 0.2) !important;
          color: #f43f5e !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-purple-950\/20 {
          background-color: rgba(168, 85, 247, 0.08) !important;
          border: 1px solid rgba(168, 85, 247, 0.2) !important;
          color: #c084fc !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-\[\#c9a84c\]\/10 {
          background-color: rgba(234, 179, 8, 0.08) !important;
          border: 1px solid rgba(234, 179, 8, 0.2) !important;
          color: #eab308 !important;
          border-radius: 2px !important;
        }
        .calendar-paper-override .bg-sky-500\/10 {
          background-color: rgba(56, 189, 248, 0.08) !important;
          border: 1px solid rgba(56, 189, 248, 0.2) !important;
          color: #38bdf8 !important;
          border-radius: 2px !important;
        }

        /* Overrides to completely remove obvious button blocks from MoodSelector */
        .mood-paper-override > div > p {
          display: none !important;
        }
        .mood-paper-override > div > div {
          display: flex !important;
          flex-wrap: wrap !important;
          justify-content: center !important;
          gap: 2.25rem !important;
          background: transparent !important;
          border: none !important;
        }
        .mood-paper-override button {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0.5rem 1.25rem !important;
          margin: 0 !important;
          display: inline-flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: auto !important;
          cursor: pointer !important;
          transition: all 0.35s cubic-bezier(0.19, 1, 0.22, 1) !important;
          position: relative !important;
        }

        /* Asymmetric note rotations */
        .mood-paper-override button:nth-child(1) { transform: rotate(-1.5deg) translateY(-2px) !important; }
        .mood-paper-override button:nth-child(2) { transform: rotate(1.2deg) translateY(3px) !important; }
        .mood-paper-override button:nth-child(3) { transform: rotate(-0.8deg) translateY(-4px) !important; }
        .mood-paper-override button:nth-child(4) { transform: rotate(1.8deg) translateY(2px) !important; }
        .mood-paper-override button:nth-child(5) { transform: rotate(-1.2deg) translateY(-2px) !important; }
        .mood-paper-override button:nth-child(6) { transform: rotate(0.9deg) translateY(4px) !important; }

        .mood-paper-override button:hover {
          transform: rotate(0deg) scale(1.04) !important;
          background: transparent !important;
        }
        .mood-paper-override button span.text-2xl {
          opacity: 0.75;
          transition: opacity 0.3s ease;
        }
        .mood-paper-override button:hover span.text-2xl {
          opacity: 1;
        }
        .mood-paper-override button span:nth-of-type(2) {
          color: #262626 !important;
          font-family: var(--font-playfair), serif !important;
          font-style: italic !important;
          font-size: 1.05rem !important;
          font-weight: 600 !important;
          margin-top: 0.15rem !important;
          border-bottom: 1px solid transparent !important;
          transition: border-color 0.35s ease, color 0.3s ease !important;
        }
        .mood-paper-override button:hover span:nth-of-type(2) {
          color: #000000 !important;
          border-color: #1a1a1a !important;
        }
        .mood-paper-override button span.text-\[\#f5f0e8\]\/40 {
          color: #5a5a5a !important;
          font-family: var(--font-inter), sans-serif !important;
          font-size: 0.75rem !important;
          font-style: normal !important;
          opacity: 0.6 !important;
          margin-top: 0.35rem !important;
        }
        .mood-paper-override button.border-\[\#c9a84c\] span:nth-of-type(2) {
          color: #000000 !important;
          border-color: #1a1a1a !important;
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
          transition: width 0.35s cubic-bezier(0.19, 1, 0.22, 1), left 0.35s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .gateway-btn:hover::after {
          width: 100%;
          left: 0;
        }

        /* Book spine split page transitions keyframes */
        @keyframes slideInLeftPage {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        @keyframes slideInRightPage {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }

        /* Ruled item indicator rules - dynamic archival timeline nodes */
        .timeline-entry {
          position: relative;
          padding-left: 2.5rem;
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }
        .timeline-entry::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.65rem;
          width: 8px;
          height: 8px;
          background-color: #F8F4E9;
          border: 1px solid rgba(26, 26, 26, 0.3);
          border-radius: 50%;
          z-index: 10;
          transition: all 0.35s ease;
        }
        .timeline-entry:hover::before {
          background-color: #1a1a1a;
          border-color: #1a1a1a;
          transform: scale(1.3);
          box-shadow: 0 0 4px rgba(26, 26, 26, 0.2);
        }
        .timeline-entry:hover {
          transform: translateY(-2px);
          padding-left: 2.75rem;
        }

        /* Book cover lift on horizontal curations list */
        .book-item-lift img {
          transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), box-shadow 0.4s cubic-bezier(0.19, 1, 0.22, 1) !important;
        }
        .book-item-lift:hover img {
          transform: translateY(-4px) scale(1.04);
          box-shadow: 6px 8px 18px rgba(26, 26, 26, 0.16) !important;
        }
      `}</style>

      {/* Cinematic Gateway Shut/Reveal Transition Overlay (Self-contained page gate) */}
      {activeTransition && (
        <div className="fixed inset-0 z-50 pointer-events-none flex overflow-hidden">
          {/* Left split-leaf page */}
          <div 
            className={`w-1/2 h-full ${overlayBg} ${overlayBorder} border-r flex items-center justify-end pr-12 md:pr-20 shadow-[12px_0_35px_rgba(0,0,0,0.12)]`}
            style={{
              animation: 'slideInLeftPage 0.45s forwards cubic-bezier(0.19, 1, 0.22, 1)',
              pointerEvents: 'auto'
            }}
          >
            <div className="text-right max-w-xs space-y-3">
              <span className="font-playfair text-xs italic opacity-40">Chamber portal...</span>
              <h2 className={`font-playfair text-2xl font-bold tracking-tight ${overlayTitle}`}>
                {activeTransition === 'simple' ? 'Opening Journal' : 'Entering Vaults'}
              </h2>
            </div>
          </div>
          {/* Right split-leaf page */}
          <div 
            className={`w-1/2 h-full ${overlayBg} ${overlayBorder} border-l flex items-center justify-start pl-12 md:pl-20 shadow-[-12px_0_35px_rgba(0,0,0,0.12)]`}
            style={{
              animation: 'slideInRightPage 0.45s forwards cubic-bezier(0.19, 1, 0.22, 1)',
              pointerEvents: 'auto'
            }}
          >
            <div className="text-left max-w-xs space-y-2">
              <span className="font-inter text-[9px] uppercase tracking-[0.25em] opacity-50">VERSECRAFT</span>
              <p className={`font-inter text-xs italic ${overlayText}`}>
                {activeTransition === 'simple' ? '“The Companion awaits...”' : '“Unlocking scholarly vaults...”'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Frame container */}
      <div className="w-full max-w-5xl mx-auto px-6 flex flex-col gap-24 relative z-10">
        {/* Scroll-Revealed Ruled Lines */}
        {Array.from({ length: 8 }).map((_, i) => {
          const threshold = i / 12;
          const active = ruledLineProgress >= threshold;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                width: active ? '100%' : '0%',
                height: '1px',
                background: 'rgba(26, 26, 26, 0.04)',
                top: `${((i + 1) / 9) * 100}%`,
                zIndex: 1,
                pointerEvents: 'none',
                transition: 'width 0.8s ease',
              }}
            />
          );
        })}
        
        {/* 1. Welcome Section (Expansive, asymmetrical full-width journal layout) */}
        <motion.section
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.19, 1, 0.22, 1] }}
          className="w-full space-y-8 relative pl-8 py-4"
        >
          {/* Crimson ledger vertical rule */}
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-red-800/15 via-red-800/8 to-transparent" />
          
          <div className="space-y-4">
            <p className="text-[9px] tracking-[0.25em] uppercase font-bold text-[#1a1a1a]/40 font-inter meta-breathe">
              CHAMBER LOGS
            </p>
            <h1 className="font-playfair text-5xl sm:text-6xl font-bold tracking-tight leading-tight select-none">
              <span className="heading-ink-shine">Welcome back,</span> <br />
              <span className="italic font-normal text-[#1a1a1a]/85">{firstName}</span>
            </h1>
            <p className="font-inter text-base text-[#2d2d2d]/75 leading-relaxed max-w-xl font-light">
              The candles are lit, and the ink is fresh. Which pathway shall your literary curiosity navigate today?
            </p>
          </div>
          
          <div className="pt-2">
            <Link
              href="/profile?tab=preferences"
              className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/65 hover:text-[#1a1a1a] transition-all hover:underline decoration-1 underline-offset-4"
            >
              Configure Preferences →
            </Link>
          </div>
        </motion.section>

        {/* 2. Verse of the Day (Naturally embedded centered manuscript flow) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
          className="w-full max-w-3xl mx-auto py-4"
        >
          <div className="daily-verse-paper-override">
            <DailyVerse />
          </div>
        </motion.section>

        {/* 3. Literary Calendar Archive Strip (Full-width edge-to-edge dark band) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.25, ease: [0.19, 1, 0.22, 1] }}
          className="full-width-band py-20 px-8 bg-[#121212] overflow-hidden flex flex-col justify-center"
        >
          <div className="w-full max-w-5xl mx-auto calendar-paper-override">
            <LiteraryCalendar />
          </div>
        </motion.section>

        {/* 4. Mood Selector (Scattered manuscript annotation thoughts) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
          className="w-full py-2 border-b border-[#1a1a1a]/5 pb-12"
        >
          <p className="text-center font-inter text-[9px] uppercase tracking-[0.25em] text-[#1a1a1a]/40 mb-10 select-none">
            ✦ How are you feeling today? ✦
          </p>
          <div className="mood-paper-override">
            <MoodSelector />
          </div>
        </motion.section>

        {/* 5. Chat Modes gateways (Book-style split page elevations) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Simple Companion Chamber */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.35, ease: [0.19, 1, 0.22, 1] }}
            className="gateway-card bg-white/45 border border-[#1a1a1a]/5 p-10 rounded-sm shadow-[0_4px_24px_rgba(26,26,26,0.005)] relative group min-h-[280px] flex flex-col justify-between hover:bg-white/70"
          >
            {/* Crimson vertical notebook indicator */}
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-red-800/10" />
            
            <div className="pl-3 space-y-4">
              <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#1a1a1a]/40 font-inter">
                CO-AUTHORS CHAMBER
              </span>
              <h2 className="font-playfair text-3xl font-bold text-[#1a1a1a] select-none group-hover:text-black transition-colors duration-300">
                Simple Companion
              </h2>
              <p className="font-inter text-xs text-[#2d2d2d]/75 leading-relaxed italic font-light group-hover:text-black transition-colors duration-300">
                &ldquo;An open page, a resting pen...&rdquo; Engage in warm, conversational dialogue. Prompt the companion to craft custom poems, trade verses in real-time, generate seeds, or submit writing to Judgement Mode.
              </p>
            </div>

            <div className="mt-8 pl-3">
              <Link
                href="/chat/simple"
                onClick={(e) => handleChamberClick(e, 'simple', '/chat/simple')}
                className="gateway-btn inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a] pb-1 transition-all"
              >
                Launch Chat
                <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </motion.div>

          {/* Advanced Chambers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, delay: 0.4, ease: [0.19, 1, 0.22, 1] }}
            className="gateway-card bg-[#F5F2EA]/50 border border-[#1a1a1a]/5 p-10 rounded-sm shadow-[0_4px_24px_rgba(26,26,26,0.005)] relative group min-h-[280px] flex flex-col justify-between hover:bg-[#F5F2EA]/75"
          >
            {/* Archival ink vertical indicator */}
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-[#1a1a1a]/8" />

            <div className="pl-3 space-y-4">
              <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#1a1a1a]/40 font-inter">
                LITERARY VAULT
              </span>
              <h2 className="font-playfair text-3xl font-bold text-[#1a1a1a] select-none group-hover:text-black transition-colors duration-300">
                Advanced Chambers
              </h2>
              <p className="font-inter text-xs text-[#2d2d2d]/75 leading-relaxed font-serif font-light group-hover:text-black transition-colors duration-300">
                Lock your dialogue into specific historical styles, eras, and scholars. Watch the entire interface settle into reflecting candlelit studies, Victorian shadows, or rain-slicked modern avenues.
              </p>
            </div>

            <div className="mt-8 pl-3">
              <Link
                href="/chat/advanced"
                onClick={(e) => handleChamberClick(e, 'advanced', '/chat/advanced')}
                className="gateway-btn inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a] pb-1 transition-all"
              >
                Enter Chambers
                <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* 6. Archived Correspondence (Dynamic vertical timeline ledger) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.45, ease: [0.19, 1, 0.22, 1] }}
          className="w-full space-y-8"
        >
          <div className="pb-2 border-b border-[#1a1a1a]/10">
            <h3 className="font-playfair text-xl font-bold text-[#1a1a1a]">
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
            <div className="relative pl-6 space-y-4 py-2">
              {/* Continuous vertical timeline ruler line */}
              <div className="absolute left-[3.5px] top-0 bottom-0 w-[1px] bg-red-800/15" />

              {recentChats.map((c) => (
                <div key={c.id} className="timeline-entry">
                  <Link
                    href={`/chat/${c.type}?id=${c.id}`}
                    className="block group py-4 px-4 bg-white/30 border border-[#1a1a1a]/5 hover:bg-white/60 hover:border-[#1a1a1a]/12 rounded-sm transition-all shadow-[0_2px_12px_rgba(26,26,26,0.002)] hover:shadow-[0_4px_16px_rgba(26,26,26,0.015)]"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-3">
                          <span className="text-[7px] uppercase tracking-widest font-bold text-[#1a1a1a]/55 border border-[#1a1a1a]/10 px-1.5 py-0.5 rounded-sm bg-[#F8F4E9] select-none transition-colors group-hover:border-[#1a1a1a]/25 group-hover:text-black">
                            {c.type}
                          </span>
                          <h4 className="font-playfair text-base font-bold text-[#1a1a1a] group-hover:underline decoration-1 underline-offset-2 transition-colors group-hover:text-black">
                            {modeNames[c.mode] || c.mode}
                          </h4>
                        </div>
                        
                        {c.type === 'advanced' && c.filters && (
                          <p className="text-[10px] text-[#6b6b6b] mt-0.5 font-inter transition-colors group-hover:text-black/60">
                            Chamber: {c.filters.genre} • {c.filters.era}
                          </p>
                        )}
                        
                        <p className="text-xs text-[#2d2d2d]/70 mt-2 font-inter italic max-w-2xl truncate transition-colors group-hover:text-black">
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
                </div>
              ))}
              
              <div className="pt-4 pl-4">
                <Link
                  href="/chat/simple?sidebar=open"
                  className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/65 hover:text-[#1a1a1a] transition-all hover:underline decoration-1 underline-offset-4"
                >
                  View All Registry History →
                </Link>
              </div>
            </div>
          )}
        </motion.section>

        {/* 7. Recommended Reads (Curated Reading-Table portfolio) */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
          className="w-full space-y-8 pt-6 border-t border-[#1a1a1a]/10"
        >
          <div className="flex justify-between items-center pb-2 border-b border-[#1a1a1a]/10">
            <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
              📚 Library Discoveries
            </h3>
            <Link
              href="/recommendations"
              className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/70 hover:underline font-inter flex items-center gap-0.5"
            >
              Explore Table →
            </Link>
          </div>

          {recsLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-5 h-5 border border-[#1a1a1a] border-t-transparent rounded-none animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teasers.map((book, index) => {
                const linkPhrases = ["Open Volume", "View Edition", "Read Fragment", "Enter Text"];
                const linkLabel = linkPhrases[index % linkPhrases.length] || "Open Volume";
                return (
                  <div
                    key={`${book.title}-${index}`}
                    className="flex flex-col justify-between p-4 bg-white/20 border border-[#1a1a1a]/5 hover:bg-white/40 hover:border-[#1a1a1a]/10 rounded-sm shadow-[0_2px_12px_rgba(26,26,26,0.002)] transition-all book-item-lift h-full"
                  >
                    <div className="space-y-4">
                      {/* Book Thumbnail container */}
                      <div className="w-full flex justify-center">
                        <img
                          src={book.thumbnail}
                          alt={book.title}
                          className="w-24 h-36 shadow-[4px_6px_12px_rgba(26,26,26,0.14)] object-cover border border-[#1a1a1a]/10 rounded-sm"
                          onError={(e) => {
                            e.currentTarget.src = `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-M.jpg`;
                          }}
                        />
                      </div>
                      <div className="space-y-1 text-center">
                        <h4 className="font-playfair text-sm font-bold text-[#1a1a1a] leading-snug line-clamp-2">{book.title}</h4>
                        <p className="font-inter text-[10px] text-[#6b6b6b] italic">{book.author}</p>
                      </div>
                      <p className="font-inter text-[11px] text-[#2d2d2d]/75 leading-relaxed font-light line-clamp-4 text-center">
                        {book.poeticReason}
                      </p>
                    </div>

                    <div className="pt-4 flex justify-center border-t border-[#1a1a1a]/5 mt-4">
                      <a
                        href={book.infoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-[#1a1a1a]/85 hover:underline uppercase tracking-widest font-inter"
                      >
                        {linkLabel} ↗
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

      </div>

      {/* Cursor bloom element */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: cursorPos.x,
            top: cursorPos.y,
            transform: bloomActive ? 'translate(-50%, -50%) scale(28)' : 'translate(-50%, -50%) scale(1)',
            opacity: bloomActive ? 1 : 0,
            width: '1px',
            height: '1px',
            borderRadius: '50%',
            background: 'rgba(26, 26, 26, 0.06)',
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease',
          }}
        />
      )}
    </div>
    </>
  );
}
