'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
        isScrolled 
          ? 'backdrop-blur-xl bg-black/30 border-b border-white/10 py-3 shadow-lg' 
          : 'bg-transparent py-5 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          {/* Logo */}
          <Link
            href="/"
            className="font-playfair text-2xl font-bold text-gold hover:text-gold-light tracking-wide transition-colors"
          >
            Versecraft
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center space-x-8 font-inter font-medium text-sm text-[#f5f0e8]/80">
            
            {/* Library Dropdown Trigger */}
            <div 
              className="relative py-2 group"
              onMouseEnter={() => setActiveDropdown('library')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`hover:text-gold transition-colors flex items-center gap-1 ${
                  activeDropdown === 'library' ? 'text-gold' : ''
                }`}
              >
                Library
                <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'library' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Library Dropdown Content */}
              <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-72 glass-card rounded-xl p-4 shadow-2xl transition-all duration-300 ${
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
                      className="w-full px-3 py-1.5 pl-8 text-xs glass-input rounded-lg focus:outline-none"
                    />
                    <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#f5f0e8]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </form>
                <div className="border-t border-white/5 pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-gold font-bold mb-2 px-2">Browse Genres</p>
                  <div className="grid grid-cols-2 gap-1">
                    {genres.map((g) => (
                      <Link
                        key={g.id}
                        href={`/library?genre=${g.id}`}
                        onClick={() => setActiveDropdown(null)}
                        className="px-2 py-1 hover:bg-white/5 hover:text-gold rounded text-xs transition-colors"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Authors Link */}
            <Link href="/authors" className="hover:text-gold transition-colors">
              Authors
            </Link>

            {/* Chat Dropdown Trigger */}
            <div 
              className="relative py-2 group"
              onMouseEnter={() => setActiveDropdown('chat')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`hover:text-gold transition-colors flex items-center gap-1 ${
                  activeDropdown === 'chat' ? 'text-gold' : ''
                }`}
              >
                Companion Chat
                <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'chat' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Chat Dropdown Content */}
              <div className={`absolute left-0 mt-2 w-52 glass-card rounded-xl py-2 shadow-2xl transition-all duration-300 ${
                activeDropdown === 'chat' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <Link
                  href="/chat/simple"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 hover:bg-white/5 hover:text-gold text-xs transition-colors"
                >
                  <span className="font-semibold block">Simple Chat</span>
                  <span className="text-[10px] text-[#f5f0e8]/40 block mt-0.5">Open creative dialogue</span>
                </Link>
                <div className="border-t border-white/5 my-1" />
                <Link
                  href="/chat/advanced"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 hover:bg-white/5 hover:text-gold text-xs transition-colors"
                >
                  <span className="font-semibold block">Advanced Chat</span>
                  <span className="text-[10px] text-[#f5f0e8]/40 block mt-0.5">Genre & Era-locked filters</span>
                </Link>
              </div>
            </div>

            {/* Recommendations Link */}
            <Link href="/recommendations" className="hover:text-gold transition-colors">
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
                  className="flex items-center gap-2 hover:text-gold transition-all duration-300 font-inter font-medium text-sm"
                >
                  <div className="w-8 h-8 rounded-full border border-gold/40 flex items-center justify-center bg-white/5 text-gold font-playfair font-bold text-sm tracking-wider shadow">
                    {profileData?.displayName?.charAt(0).toUpperCase() || 'R'}
                  </div>
                  <span className="max-w-[120px] truncate hidden sm:inline text-[#f5f0e8]/90 group-hover:text-gold transition-colors">
                    {profileData?.displayName}
                  </span>
                  <svg className={`w-4 h-4 text-[#f5f0e8]/60 group-hover:text-gold transition-transform duration-200 ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown Content */}
                <div className={`absolute right-0 mt-2 w-56 glass-card rounded-xl py-2 shadow-2xl transition-all duration-300 ${
                  activeDropdown === 'profile' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}>
                  <div className="px-4 py-2 bg-white/5 mx-2 my-1 rounded-lg border border-white/5">
                    <span className="text-[9px] uppercase tracking-wider text-[#f5f0e8]/40 block font-bold">Time Explored</span>
                    <span className="text-xs font-semibold text-gold mt-0.5 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {profileData ? `${profileData.timeSpent} mins` : '0 mins'}
                    </span>
                  </div>

                  <Link
                    href="/profile?tab=anthology"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-xs text-[#f5f0e8]/80 hover:text-gold transition-colors"
                  >
                    📜 Personal Anthology
                  </Link>
                  <Link
                    href="/profile?tab=wishlist"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-xs text-[#f5f0e8]/80 hover:text-gold transition-colors"
                  >
                    ❤️ Wishlist
                  </Link>
                  <Link
                    href="/profile?tab=preferences"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 text-xs text-[#f5f0e8]/80 hover:text-gold transition-colors"
                  >
                    ⚙️ Preferences
                  </Link>

                  <div className="border-t border-white/5 my-2" />
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 hover:bg-red-950/20 text-xs text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-2"
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
                  className="px-4 py-1.5 rounded-lg border border-gold/40 text-gold hover:border-gold hover:bg-gold/5 transition-all text-xs font-semibold font-inter"
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="px-4 py-1.5 rounded-lg bg-gold hover:bg-gold-light text-[#0a0a1a] font-semibold transition-all text-xs font-inter shadow-md shadow-gold/10"
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
