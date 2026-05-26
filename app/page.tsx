'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const offerings = [
  {
    num: 'I',
    title: 'Simple Chat',
    desc: 'Your literary companion, always ready to talk.',
    href: '/chat/simple',
  },
  {
    num: 'II',
    title: 'Advanced Chat',
    desc: 'Set the genre, era, and vibe — then dive in.',
    href: '/chat/advanced',
  },
  {
    num: 'III',
    title: 'Translation Chamber',
    desc: 'Carry words across languages without losing their soul.',
    href: '/translation',
  },
  {
    num: 'IV',
    title: 'Write With Me',
    desc: 'You write a line. The muse writes the next.',
    href: '/write-with-me',
  },
  {
    num: 'V',
    title: 'The Library',
    desc: 'Browse thousands of books across every genre.',
    href: '/library',
  },
  {
    num: 'VI',
    title: 'Authors Hall',
    desc: 'Deep dive into the minds that shaped literature.',
    href: '/authors',
  },
  {
    num: 'VII',
    title: 'Literary Movements',
    desc: 'Explore the currents that defined eras.',
    href: '/movements',
  },
  {
    num: 'VIII',
    title: 'Recommendations',
    desc: 'AI curated books matched to your taste.',
    href: '/recommendations',
  },
  {
    num: 'IX',
    title: 'Community Anthology',
    desc: 'Share your work. Read theirs.',
    href: '/community',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 35 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
};

export default function LandingPage() {
  const [pathD, setPathD] = useState('');
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const generateWavyPath = () => {
      const height = document.documentElement.scrollHeight || 4500;
      const startY = 0;
      const endY = height - 260; // Offset drawing to start below the quill tip
      const step = 90; // Length of wave segments
      const amp = 14; // Horizontal waviness amplitude
      
      let d = `M 50 ${startY}`;
      let curY = startY + step;
      let count = 0;
      
      while (curY < endY) {
        const cx1 = 50 + (count % 2 === 0 ? -amp : amp);
        const cx2 = 50 + (count % 2 === 0 ? amp : -amp);
        d += ` C ${cx1} ${curY - step / 2}, ${cx2} ${curY - step / 2}, 50 ${curY}`;
        curY += step;
        count++;
      }
      
      d += ` L 50 ${endY}`;
      setPathD(d);
    };

    generateWavyPath();

    // Trigger on resize or dynamic layouts
    window.addEventListener('resize', generateWavyPath);
    
    // Regular checks to adapt to delayed client image loads or font render heights
    const interval = setInterval(generateWavyPath, 1500);

    return () => {
      window.removeEventListener('resize', generateWavyPath);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!pathRef.current) return;
      const path = pathRef.current;
      const length = path.getTotalLength();
      
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length - length * scrollPercent}`;
    };

    window.addEventListener('scroll', handleScroll);
    const t = setTimeout(handleScroll, 200);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(t);
    };
  }, [pathD]);

  return (
    <div
      className="min-h-screen relative w-full overflow-x-hidden selection:bg-[#1a1a1a]/10 selection:text-[#1a1a1a] pb-12"
      style={{
        backgroundColor: '#F8F4E9',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    >
      {/* Scroll-Driven Wavy Ink Path */}
      {pathD && (
        <svg
          className="w-[100px] absolute left-1/2 -translate-x-1/2 pointer-events-none z-0"
          style={{ top: '260px', height: 'calc(100% - 260px)' }}
        >
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
          />
        </svg>
      )}

      {/* Centered Quill Pen Header */}
      <div className="relative pt-24 pb-4 flex flex-col items-center justify-center z-10">
        <div className="relative w-40 h-40 translate-x-[32px] select-none pointer-events-none">
          <svg
            width="160"
            height="160"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="rotate-[-5deg] drop-shadow-[0_2px_4px_rgba(26,26,26,0.06)]"
          >
            {/* Nib / Quill Tip */}
            <path d="M 45, 155 L 55, 145 L 60, 150 L 40, 160 Z" fill="#1a1a1a" />
            <path d="M 40, 160 L 50, 150" stroke="#1a1a1a" strokeWidth="1.5" />
            
            {/* Quill Stem / Shaft */}
            <path d="M 45, 155 C 65, 135 125, 75 165, 35" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
            <path d="M 52, 148 C 72, 128 128, 72 162, 38" stroke="#f8f4e9" strokeWidth="1" strokeLinecap="round" />
            
            {/* Left side feather vane (curved hairs) */}
            <path d="M 68, 132 C 50, 125 45, 110 50, 95 C 52, 90 58, 85 68, 85" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 80, 120 C 60, 110 52, 92 60, 78 C 65, 70 75, 68 85, 72" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 95, 105 C 72, 95 65, 75 75, 60 C 82, 52 95, 52 105, 58" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 115, 85 C 90, 75 82, 55 92, 40 C 98, 32 110, 34 122, 42" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 135, 65 C 112, 55 105, 38 115, 25 C 122, 18 132, 20 142, 28" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 155, 45 C 140, 38 132, 25 142, 15" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />

            {/* Right side feather vane */}
            <path d="M 72, 128 C 85, 135 95, 132 102, 122 C 105, 118 102, 110 92, 108" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 85, 115 C 102, 122 112, 118 118, 108 C 122, 102 118, 95 108, 92" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 100, 100 C 120, 108 130, 102 135, 92 C 138, 85 132, 78 122, 75" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 120, 80 C 140, 88 150, 82 155, 72 C 158, 65 152, 58 140, 55" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 140, 60 C 160, 68 170, 62 175, 52 C 178, 45 172, 38 160, 35" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
            
            {/* Texture Details */}
            <path d="M 78, 122 C 72, 118 70, 110 74, 102" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.6" />
            <path d="M 92, 108 C 86, 104 84, 96 88, 88" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.6" />
            <path d="M 108, 92 C 102, 88 100, 80 104, 72" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.6" />
            <path d="M 125, 75 C 119, 71 117, 63 121, 55" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.6" />
            <path d="M 142, 58 C 136, 54 134, 46 138, 38" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.6" />

            {/* Droplets */}
            <circle cx="35" cy="168" r="2.5" fill="#1a1a1a" />
            <circle cx="58" cy="165" r="1.5" fill="#1a1a1a" />
          </svg>
        </div>
      </div>

      {/* Section 1 — Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        className="relative z-10 px-4 py-8 text-center max-w-5xl mx-auto flex flex-col items-center gap-6"
      >
        <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#1a1a1a]/40 font-inter">
          EST. IN THE AGE OF WORDS
        </p>

        <h1 className="font-playfair text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#1a1a1a] leading-[1.15] tracking-wide select-none">
          Every great story <br />
          <span className="font-normal italic text-[#1a1a1a]/85">begins with a single word.</span>
        </h1>

        <p className="font-inter text-sm sm:text-base text-[#2d2d2d]/85 max-w-xl mx-auto leading-relaxed">
          Versecraft is your literary companion — write, explore, analyse, and discover the world of literature.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto justify-center">
          <Link
            href="/auth"
            className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] font-bold text-xs tracking-wider uppercase font-inter rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Begin Your Journey
          </Link>
          <Link
            href="/library"
            className="px-8 py-3 bg-white border border-[#1a1a1a] hover:bg-[#1a1a1a]/5 text-[#1a1a1a] font-bold text-xs tracking-wider uppercase font-inter rounded-full transition-all duration-300 shadow-sm hover:-translate-y-0.5"
          >
            Explore the Library
          </Link>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto my-20 px-4 relative z-10">
        <hr className="border-[#1a1a1a]/10" />
      </div>

      {/* Section 2 — The Quill's Offerings */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-left">
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-[#1a1a1a] tracking-wide">
            What Versecraft Offers
          </h2>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
        >
          {offerings.map((item) => (
            <motion.div key={item.title} variants={itemVariants}>
              <Link
                href={item.href}
                className="group block p-6 bg-white border border-[#1a1a1a]/15 hover:border-[#1a1a1a] rounded-2xl shadow-sm hover:shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 relative overflow-hidden"
              >
                <span className="font-playfair italic text-3xl text-[#1a1a1a]/30 group-hover:text-[#1a1a1a] transition-colors duration-300 block mb-3 select-none">
                  {item.num}
                </span>
                <h3 className="font-inter font-bold text-sm text-[#1a1a1a] mb-1.5 uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="font-inter text-xs text-[#2d2d2d]/65 leading-relaxed">
                  {item.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto my-20 px-4 relative z-10">
        <hr className="border-[#1a1a1a]/10" />
      </div>

      {/* Section 3 — How It Works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center mb-16">
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-[#1a1a1a]">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-8">
          {/* Step 1 */}
          <div className="relative group p-6 rounded-2xl flex flex-col justify-start">
            <span className="absolute top-0 left-4 font-playfair font-extralight text-8xl text-[#1a1a1a]/10 leading-none select-none -z-10 group-hover:text-[#1a1a1a]/15 transition-colors">
              01
            </span>
            <div className="pt-10">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] mb-2 select-none">
                Choose Your Path
              </h3>
              <p className="font-inter text-xs text-[#2d2d2d]/75 leading-relaxed">
                Pick a mode that matches what you want to do. Whether you are looking for simple discussion, advanced writing chambers, or translation, there is a path ready.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group p-6 rounded-2xl flex flex-col justify-start">
            <span className="absolute top-0 left-4 font-playfair font-extralight text-8xl text-[#1a1a1a]/10 leading-none select-none -z-10 group-hover:text-[#1a1a1a]/15 transition-colors">
              02
            </span>
            <div className="pt-10">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] mb-2 select-none">
                Set Your Vibe
              </h3>
              <p className="font-inter text-xs text-[#2d2d2d]/75 leading-relaxed">
                Choose genre, era, mood, or let the companion decide. Tailor the intellectual depth and aesthetic parameter filters to lock in your workspace environment.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group p-6 rounded-2xl flex flex-col justify-start">
            <span className="absolute top-0 left-4 font-playfair font-extralight text-8xl text-[#1a1a1a]/10 leading-none select-none -z-10 group-hover:text-[#1a1a1a]/15 transition-colors">
              03
            </span>
            <div className="pt-10">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] mb-2 select-none">
                Let the Muse Speak
              </h3>
              <p className="font-inter text-xs text-[#2d2d2d]/75 leading-relaxed">
                Engage, create, explore, and save your journey. Keep beautiful PNG cards of your favorite exchanges and write prose in your Personal Anthology.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto my-20 px-4 relative z-10">
        <hr className="border-[#1a1a1a]/10" />
      </div>

      {/* Section 4 — Numbers Strip */}
      <section className="w-full bg-[#1a1a1a] py-12 md:py-16 my-20 text-center shadow-md relative z-10 border-y border-[#1a1a1a]/20">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-1 select-none">
            <p className="font-playfair text-2xl md:text-3xl font-bold text-[#F8F4E9]">
              9
            </p>
            <p className="font-inter text-[9px] uppercase tracking-widest font-semibold text-[#F8F4E9]/60">
              Literary Modes
            </p>
          </div>
          <div className="space-y-1 select-none">
            <p className="font-playfair text-2xl md:text-3xl font-bold text-[#F8F4E9]">
              16
            </p>
            <p className="font-inter text-[9px] uppercase tracking-widest font-semibold text-[#F8F4E9]/60">
              Movements
            </p>
          </div>
          <div className="space-y-1 select-none">
            <p className="font-playfair text-2xl md:text-3xl font-bold text-[#F8F4E9]">
              Infinite
            </p>
            <p className="font-inter text-[9px] uppercase tracking-widest font-semibold text-[#F8F4E9]/60">
              Authors
            </p>
          </div>
          <div className="space-y-1 select-none">
            <p className="font-playfair text-2xl md:text-3xl font-bold text-[#F8F4E9]">
              One
            </p>
            <p className="font-inter text-[9px] uppercase tracking-widest font-semibold text-[#F8F4E9]/60">
              Companion
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 — Final CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={sectionVariants}
        className="relative z-10 py-12 max-w-4xl mx-auto px-4 text-center space-y-6"
      >
        <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-bold text-[#1a1a1a] tracking-wide">
          Your literary journey awaits.
        </h2>
        <p className="font-inter text-xs sm:text-sm text-[#2d2d2d]/70 max-w-md mx-auto leading-relaxed">
          Join thousands of readers, writers, and dreamers on Versecraft.
        </p>
        <div className="pt-2">
          <Link
            href="/auth"
            className="inline-block px-10 py-3.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] font-bold text-xs tracking-wider uppercase font-inter rounded-full transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Begin Reading
          </Link>
        </div>
        <p className="font-inter text-[10px] text-[#2d2d2d]/45 select-none">
          Free to join. No credit card required.
        </p>
      </motion.section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto mt-20 pt-8 pb-12 border-t border-[#1a1a1a]/10 text-center relative z-10 px-4">
        <h4 className="font-playfair text-xl font-bold text-[#1a1a1a] tracking-wider mb-2 select-none">
          Versecraft
        </h4>
        <p className="font-inter text-xs text-[#2d2d2d]/65 italic">
          Where literature lives and breathes
        </p>
        <p className="font-inter text-[9px] text-[#2d2d2d]/30 mt-6 select-none">
          &copy; {new Date().getFullYear()} Versecraft. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
