'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

const genres = [
  { id: 'fiction', name: 'Fiction' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'gothic', name: 'Gothic' },
  { id: 'romance', name: 'Romance' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'classics', name: 'Classics' },
  { id: 'sufi', name: 'Sufi' },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'library' | 'chat' | 'profile' | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [profileData, setProfileData] = useState<{ timeSpent: number; displayName: string } | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for solid background transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to profile data in real-time to display updated 'timeSpent' and 'displayName'
  useEffect(() => {
    if (!user) {
      setProfileData(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          timeSpent: data.timeSpent || 0,
          displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Reader',
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Active Time Spent Tracker
  useEffect(() => {
    if (!user) return;

    // Track active usage time (checks visibility state to prevent idle tracking)
    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            timeSpent: increment(1) // increment by 1 minute
          });
        } catch (error) {
          console.error('Error updating time spent:', error);
        }
      }
    }, 60000); // run every 1 minute

    return () => clearInterval(interval);
  }, [user]);

  const handleLibrarySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (librarySearch.trim()) {
      router.push(`/library?q=${encodeURIComponent(librarySearch.trim())}`);
      setLibrarySearch('');
      setActiveDropdown(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      setActiveDropdown(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav
      ref={dropdownRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isLandingPage
          ? isScrolled
            ? 'backdrop-blur-md bg-[#F8F4E9]/95 border-b border-[#1a1a1a]/15 py-3 shadow-sm'
            : 'bg-transparent py-5 border-b border-transparent'
          : isScrolled
            ? 'backdrop-blur-xl bg-black/30 border-b border-white/10 py-3 shadow-lg'
            : 'bg-transparent py-5 border-b border-transparent'
      }`}
      style={isLandingPage && isScrolled ? { backgroundColor: 'rgba(248, 244, 233, 0.95)' } : undefined}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          {/* Logo */}
          <Link
            href="/"
            className={`font-playfair text-2xl font-bold tracking-wide transition-colors ${
              isLandingPage 
                ? 'text-[#1a1a1a] hover:text-[#1a1a1a]/80' 
                : 'text-gold hover:text-gold-light'
            }`}
          >
            Versecraft
          </Link>

          {/* Center Links */}
          <div className={`hidden md:flex items-center space-x-8 font-inter font-medium text-sm ${
            isLandingPage ? 'text-[#1a1a1a]/85' : 'text-[#f5f0e8]/80'
          }`}>
            
            {/* Library Dropdown Trigger */}
            <div 
              className="relative py-2 group"
              onMouseEnter={() => setActiveDropdown('library')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`transition-colors flex items-center gap-1 ${
                  isLandingPage
                    ? activeDropdown === 'library' ? 'text-[#1a1a1a] font-bold' : 'hover:text-[#1a1a1a]'
                    : activeDropdown === 'library' ? 'text-gold' : 'hover:text-gold'
                }`}
              >
                Library
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    activeDropdown === 'library' ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Library Dropdown Content */}
              <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl p-4 transition-all duration-300 ${
                isLandingPage
                  ? 'bg-[#F8F4E9] border border-[#1a1a1a] shadow-lg text-[#1a1a1a]'
                  : 'glass-card shadow-2xl text-[#f5f0e8]/80'
              } ${
                activeDropdown === 'library' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <form onSubmit={handleLibrarySearchSubmit} className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search books or authors..."
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      className={`w-full px-3 py-1.5 pl-8 text-xs rounded-lg focus:outline-none ${
                        isLandingPage
                          ? 'bg-white border border-[#1a1a1a]/25 text-[#1a1a1a] placeholder-[#1a1a1a]/30 focus:border-[#1a1a1a]/55'
                          : 'glass-input'
                      }`}
                    />
                    <svg 
                      className={`absolute left-2.5 top-2.5 w-3.5 h-3.5 ${
                        isLandingPage ? 'text-[#1a1a1a]/40' : 'text-[#f5f0e8]/40'
                      }`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </form>
                <div className={`border-t pt-2 ${isLandingPage ? 'border-black/5' : 'border-white/5'}`}>
                  <p className={`text-[10px] uppercase tracking-wider font-bold mb-2 px-2 ${
                    isLandingPage ? 'text-[#1a1a1a]/50' : 'text-gold'
                  }`}>Browse Genres</p>
                  <div className="grid grid-cols-2 gap-1">
                    {genres.map((g) => (
                      <Link
                        key={g.id}
                        href={`/library?genre=${g.id}`}
                        onClick={() => setActiveDropdown(null)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          isLandingPage
                            ? 'hover:bg-black/10 text-[#1a1a1a]'
                            : 'hover:bg-white/5 hover:text-gold text-[#f5f0e8]/70'
                        }`}
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Authors Link */}
            <Link 
              href="/authors" 
              className={`transition-colors ${
                isLandingPage ? 'hover:text-[#1a1a1a] font-medium' : 'hover:text-gold'
              }`}
            >
              Authors
            </Link>

            {/* Movements Link */}
            <Link 
              href="/movements" 
              className={`transition-colors ${
                isLandingPage ? 'hover:text-[#1a1a1a] font-medium' : 'hover:text-gold'
              }`}
            >
              Movements
            </Link>

            {/* Community Link */}
            <Link 
              href="/community" 
              className={`transition-colors ${
                isLandingPage ? 'hover:text-[#1a1a1a] font-medium' : 'hover:text-gold'
              }`}
            >
              Community
            </Link>

            {/* Chat Dropdown Trigger */}
            <div 
              className="relative py-2 group"
              onMouseEnter={() => setActiveDropdown('chat')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`transition-colors flex items-center gap-1 ${
                  isLandingPage
                    ? activeDropdown === 'chat' ? 'text-[#1a1a1a] font-bold' : 'hover:text-[#1a1a1a]'
                    : activeDropdown === 'chat' ? 'text-gold' : 'hover:text-gold'
                }`}
              >
                Companion Chat
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${
                    activeDropdown === 'chat' ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Chat Dropdown Content */}
              <div className={`absolute left-0 mt-2 w-52 rounded-xl py-2 transition-all duration-300 ${
                isLandingPage
                  ? 'bg-[#F8F4E9] border border-[#1a1a1a] shadow-lg text-[#1a1a1a]'
                  : 'glass-card shadow-2xl text-[#f5f0e8]/80'
              } ${
                activeDropdown === 'chat' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <Link
                  href="/chat/simple"
                  onClick={() => setActiveDropdown(null)}
                  className={`block px-4 py-2 text-xs transition-colors ${
                    isLandingPage
                      ? 'hover:bg-black/10 text-[#1a1a1a]'
                      : 'hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  <span className="font-semibold block">Simple Chat</span>
                  <span className={`text-[10px] block mt-0.5 ${
                    isLandingPage ? 'text-[#1a1a1a]/55' : 'text-[#f5f0e8]/40'
                  }`}>Open creative dialogue</span>
                </Link>
                <div className={`border-t my-1 ${isLandingPage ? 'border-black/5' : 'border-white/5'}`} />
                <Link
                  href="/chat/advanced"
                  onClick={() => setActiveDropdown(null)}
                  className={`block px-4 py-2 text-xs transition-colors ${
                    isLandingPage
                      ? 'hover:bg-black/10 text-[#1a1a1a]'
                      : 'hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  <span className="font-semibold block">Advanced Chat</span>
                  <span className={`text-[10px] block mt-0.5 ${
                    isLandingPage ? 'text-[#1a1a1a]/55' : 'text-[#f5f0e8]/40'
                  }`}>Genre & Era-locked filters</span>
                </Link>
                <div className={`border-t my-1 ${isLandingPage ? 'border-black/5' : 'border-white/5'}`} />
                <Link
                  href="/translation"
                  onClick={() => setActiveDropdown(null)}
                  className={`block px-4 py-2 text-xs transition-colors ${
                    isLandingPage
                      ? 'hover:bg-black/10 text-[#1a1a1a]'
                      : 'hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  <span className="font-semibold block">Translation Chamber</span>
                  <span className={`text-[10px] block mt-0.5 ${
                    isLandingPage ? 'text-[#1a1a1a]/55' : 'text-[#f5f0e8]/40'
                  }`}>Carry literature across borders</span>
                </Link>
                <div className={`border-t my-1 ${isLandingPage ? 'border-black/5' : 'border-white/5'}`} />
                <Link
                  href="/write-with-me"
                  onClick={() => setActiveDropdown(null)}
                  className={`block px-4 py-2 text-xs transition-colors ${
                    isLandingPage
                      ? 'hover:bg-black/10 text-[#1a1a1a]'
                      : 'hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  <span className="font-semibold block">Write With Me</span>
                  <span className={`text-[10px] block mt-0.5 ${
                    isLandingPage ? 'text-[#1a1a1a]/55' : 'text-[#f5f0e8]/40'
                  }`}>Co-compose flowing prose</span>
                </Link>
              </div>
            </div>

            {/* Recommendations Link */}
            <Link 
              href="/recommendations" 
              className={`transition-colors ${
                isLandingPage ? 'hover:text-[#1a1a1a] font-medium' : 'hover:text-gold'
              }`}
            >
              Recommendations
            </Link>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              /* User logged in */
              <div 
                className="relative py-2 group"
                onMouseEnter={() => setActiveDropdown('profile')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button
                  className={`flex items-center gap-2 transition-all duration-300 font-inter font-medium text-sm ${
                    isLandingPage ? 'hover:text-[#1a1a1a]' : 'hover:text-gold'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-playfair font-bold text-sm tracking-wider shadow ${
                    isLandingPage
                      ? 'border border-[#1a1a1a]/40 bg-white text-[#1a1a1a]'
                      : 'border border-gold/40 bg-white/5 text-gold'
                  }`}>
                    {profileData?.displayName?.charAt(0).toUpperCase() || 'R'}
                  </div>
                  <span className={`max-w-[120px] truncate hidden sm:inline transition-colors ${
                    isLandingPage
                      ? 'text-[#1a1a1a] hover:text-[#1a1a1a]'
                      : 'text-[#f5f0e8]/90 group-hover:text-gold'
                  }`}>
                    {profileData?.displayName}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isLandingPage
                        ? 'text-[#1a1a1a]/60 hover:text-[#1a1a1a]'
                        : 'text-[#f5f0e8]/60 group-hover:text-gold'
                    } ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown Content */}
                <div className={`absolute right-0 mt-2 w-56 rounded-xl py-2 transition-all duration-300 ${
                  isLandingPage
                    ? 'bg-[#F8F4E9] border border-[#1a1a1a] shadow-lg text-[#1a1a1a]'
                    : 'glass-card shadow-2xl text-[#f5f0e8]/80'
                } ${
                  activeDropdown === 'profile' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}>
                  <div className={`px-4 py-2 mx-2 my-1 rounded-lg border ${
                    isLandingPage
                      ? 'bg-white border-[#1a1a1a]/10'
                      : 'bg-white/5 border-white/5'
                  }`}>
                    <span className={`text-[9px] uppercase tracking-wider block font-bold ${
                      isLandingPage ? 'text-[#1a1a1a]/45' : 'text-[#f5f0e8]/40'
                    }`}>Time Explored</span>
                    <span className={`text-xs font-semibold mt-0.5 flex items-center gap-1.5 ${
                      isLandingPage ? 'text-[#1a1a1a]' : 'text-gold'
                    }`}>
                      <svg className={`w-3.5 h-3.5 ${isLandingPage ? 'text-[#1a1a1a]' : 'text-gold'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {profileData ? `${profileData.timeSpent} mins` : '0 mins'}
                    </span>
                  </div>

                  <Link
                    href="/profile?tab=anthology"
                    onClick={() => setActiveDropdown(null)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                      isLandingPage
                        ? 'hover:bg-black/10 text-[#1a1a1a]'
                        : 'hover:bg-white/5 text-[#f5f0e8]/80 hover:text-gold'
                    }`}
                  >
                    📜 Personal Anthology
                  </Link>
                  <Link
                    href="/profile?tab=wishlist"
                    onClick={() => setActiveDropdown(null)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                      isLandingPage
                        ? 'hover:bg-black/10 text-[#1a1a1a]'
                        : 'hover:bg-white/5 text-[#f5f0e8]/80 hover:text-gold'
                    }`}
                  >
                    ❤️ Wishlist
                  </Link>
                  <Link
                    href="/reading-lists"
                    onClick={() => setActiveDropdown(null)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                      isLandingPage
                        ? 'hover:bg-black/10 text-[#1a1a1a]'
                        : 'hover:bg-white/5 text-[#f5f0e8]/80 hover:text-gold'
                    }`}
                  >
                    📚 Reading Lists
                  </Link>
                  <Link
                    href="/profile?tab=preferences"
                    onClick={() => setActiveDropdown(null)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs transition-colors ${
                      isLandingPage
                        ? 'hover:bg-black/10 text-[#1a1a1a]'
                        : 'hover:bg-white/5 text-[#f5f0e8]/80 hover:text-gold'
                    }`}
                  >
                    ⚙️ Preferences
                  </Link>

                  {user?.uid === 'AGUsKuZPq7YFBydMnnOnUcFhvdx1' && (
                    <Link
                      href="/admin"
                      onClick={() => setActiveDropdown(null)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors ${
                        isLandingPage
                          ? 'hover:bg-black/10 text-[#1a1a1a]'
                          : 'hover:bg-white/5 text-[#f5f0e8]/80 hover:text-gold'
                      }`}
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}

                  <div className={`border-t my-2 ${isLandingPage ? 'border-black/5' : 'border-white/5'}`} />
                  
                  <button
                    onClick={handleSignOut}
                    className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                      isLandingPage
                        ? 'hover:bg-red-50 text-red-600'
                        : 'hover:bg-red-950/20 text-red-400 hover:text-red-300'
                    }`}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>
            ) : (
              /* User logged out */
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  href="/auth?mode=login"
                  className={`px-4 py-1.5 rounded-lg border transition-all text-xs font-semibold font-inter ${
                    isLandingPage
                      ? 'border-[#1a1a1a]/40 text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5'
                      : 'border border-gold/40 text-gold hover:border-gold hover:bg-gold/5'
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className={`px-4 py-1.5 rounded-lg transition-all text-xs font-semibold font-inter ${
                    isLandingPage
                      ? 'bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] shadow-md shadow-black/10'
                      : 'bg-gold hover:bg-gold-light text-[#0a0a1a] shadow-md shadow-gold/10'
                  }`}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
