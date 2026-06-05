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
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'library' | 'chat' | 'profile' | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [profileData, setProfileData] = useState<{ timeSpent: number; displayName: string } | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 backdrop-blur-md border-b shadow-sm ${
        isScrolled
          ? 'border-[#1a1a1a]/10 py-3'
          : 'border-[#1a1a1a]/5 py-5'
      }`}
      style={{ backgroundColor: isScrolled ? 'rgba(248, 244, 233, 0.98)' : 'rgba(248, 244, 233, 0.95)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          {/* Logo */}
          <Link
            href="/"
            className="font-playfair text-2xl font-bold tracking-wide transition-colors text-[#1a1a1a] hover:text-[#1a1a1a]/80"
          >
            Versecraft
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center space-x-8 font-inter font-medium text-sm text-[#1a1a1a]/85">
            
            {/* Library Dropdown Trigger */}
            <div 
              className="relative py-2 group"
              onMouseEnter={() => setActiveDropdown('library')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className={`transition-colors flex items-center gap-1 ${
                  activeDropdown === 'library' ? 'text-[#1a1a1a] font-bold' : 'hover:text-[#1a1a1a]'
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
              <div className={`absolute left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl p-4 transition-all duration-300 bg-[#F8F4E9] border border-[#1a1a1a]/15 shadow-lg text-[#1a1a1a] ${
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
                      className="w-full px-3 py-1.5 pl-8 text-xs rounded-lg focus:outline-none bg-white border border-[#1a1a1a]/25 text-[#1a1a1a] placeholder-[#1a1a1a]/30 focus:border-[#1a1a1a]/55"
                    />
                    <svg 
                      className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#1a1a1a]/40" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </form>
                <div className="border-t pt-2 border-black/5">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-2 px-2 text-[#1a1a1a]/50">Browse Genres</p>
                  <div className="grid grid-cols-2 gap-1">
                    {genres.map((g) => (
                      <Link
                        key={g.id}
                        href={`/library?genre=${g.id}`}
                        onClick={() => setActiveDropdown(null)}
                        className="px-2 py-1 rounded text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                      >
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reader Link */}
            <Link 
              href="/reader" 
              className="transition-colors hover:text-[#1a1a1a] font-medium"
            >
              Reader
            </Link>

            {/* Authors Link */}
            <Link 
              href="/authors" 
              className="transition-colors hover:text-[#1a1a1a] font-medium"
            >
              Authors
            </Link>

            {/* Movements Link */}
            <Link 
              href="/movements" 
              className="transition-colors hover:text-[#1a1a1a] font-medium"
            >
              Movements
            </Link>

            {/* Community Link */}
            <Link 
              href="/community" 
              className="transition-colors hover:text-[#1a1a1a] font-medium"
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
                  activeDropdown === 'chat' ? 'text-[#1a1a1a] font-bold' : 'hover:text-[#1a1a1a]'
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
              <div className={`absolute left-0 mt-2 w-52 rounded-xl py-2 transition-all duration-300 bg-[#F8F4E9] border border-[#1a1a1a]/15 shadow-lg text-[#1a1a1a] ${
                activeDropdown === 'chat' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 -translate-y-2 pointer-events-none'
              }`}>
                <Link
                  href="/chat/simple"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                >
                  <span className="font-semibold block">Simple Chat</span>
                  <span className="text-[10px] block mt-0.5 text-[#1a1a1a]/55">Open creative dialogue</span>
                </Link>
                <div className="border-t my-1 border-black/5" />
                <Link
                  href="/chat/advanced"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                >
                  <span className="font-semibold block">Advanced Chat</span>
                  <span className="text-[10px] block mt-0.5 text-[#1a1a1a]/55">Genre & Era-locked filters</span>
                </Link>
                <div className="border-t my-1 border-black/5" />
                <Link
                  href="/translation"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                >
                  <span className="font-semibold block">Translation Chamber</span>
                  <span className="text-[10px] block mt-0.5 text-[#1a1a1a]/55">Carry literature across borders</span>
                </Link>
                <div className="border-t my-1 border-black/5" />
                <Link
                  href="/write-with-me"
                  onClick={() => setActiveDropdown(null)}
                  className="block px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                >
                  <span className="font-semibold block">Write With Me</span>
                  <span className="text-[10px] block mt-0.5 text-[#1a1a1a]/55">Co-compose flowing prose</span>
                </Link>
              </div>
            </div>

            {/* Recommendations Link */}
            <Link 
              href="/recommendations" 
              className="transition-colors hover:text-[#1a1a1a] font-medium"
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
                  className="flex items-center gap-2 transition-all duration-300 font-inter font-medium text-sm hover:text-[#1a1a1a]"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-playfair font-bold text-sm tracking-wider shadow border border-[#1a1a1a]/40 bg-white text-[#1a1a1a]">
                    {profileData?.displayName?.charAt(0).toUpperCase() || 'R'}
                  </div>
                  <span className="max-w-[120px] truncate hidden sm:inline transition-colors text-[#1a1a1a] hover:text-[#1a1a1a]">
                    {profileData?.displayName}
                  </span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 text-[#1a1a1a]/60 hover:text-[#1a1a1a] ${
                      activeDropdown === 'profile' ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown Content */}
                <div className={`absolute right-0 mt-2 w-56 rounded-xl py-2 transition-all duration-300 bg-[#F8F4E9] border border-[#1a1a1a]/15 shadow-lg text-[#1a1a1a] ${
                  activeDropdown === 'profile' 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}>
                  <div className="px-4 py-2 mx-2 my-1 rounded-lg border bg-white border-[#1a1a1a]/10">
                    <span className="text-[9px] uppercase tracking-wider block font-bold text-[#1a1a1a]/45">Time Explored</span>
                    <span className="text-xs font-semibold mt-0.5 flex items-center gap-1.5 text-[#1a1a1a]">
                      <svg className="w-3.5 h-3.5 text-[#1a1a1a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {profileData ? `${profileData.timeSpent} mins` : '0 mins'}
                    </span>
                  </div>

                  <Link
                    href="/profile?tab=my-profile"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                  >
                    👤 My Profile
                  </Link>
                  <Link
                    href="/profile?tab=anthology"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                  >
                    📜 Personal Anthology
                  </Link>
                  <Link
                    href="/profile?tab=wishlist"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                  >
                    ❤️ Wishlist
                  </Link>
                  <Link
                    href="/reading-lists"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                  >
                    📚 Reading Lists
                  </Link>
                  <Link
                    href="/profile?tab=preferences"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2 px-4 py-2 text-xs transition-colors hover:bg-black/10 text-[#1a1a1a]"
                  >
                    ⚙️ Preferences
                  </Link>

                  {user?.uid === 'AGUsKuZPq7YFBydMnnOnUcFhvdx1' && (
                    <Link
                      href="/admin"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors hover:bg-black/10 text-[#1a1a1a]"
                    >
                      🛡️ Admin Panel
                    </Link>
                  )}

                  <div className="border-t my-2 border-black/5" />
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-xs font-medium transition-colors flex items-center gap-2 hover:bg-red-50 text-red-600"
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
                  className="px-4 py-1.5 rounded-lg border transition-all text-xs font-semibold font-inter border-[#1a1a1a]/40 text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#1a1a1a]/5"
                >
                  Login
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="px-4 py-1.5 rounded-lg transition-all text-xs font-semibold font-inter bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] shadow-md shadow-black/10"
                >
                  Sign Up
                </Link>
              </div>
            )}
            
            {/* Hamburger Menu Toggle (Mobile Only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#1a1a1a] hover:bg-black/5 transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer (Mobile Only) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#1a1a1a]/10 bg-[#F8F4E9] px-4 pt-4 pb-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Library Search Form */}
          <form onSubmit={handleLibrarySearchSubmit} className="relative w-full">
            <input
              type="text"
              placeholder="Search books or authors..."
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              className="w-full px-3 py-2 pl-9 text-xs rounded-lg focus:outline-none bg-white border border-[#1a1a1a]/25 text-[#1a1a1a] placeholder-[#1a1a1a]/30 focus:border-[#1a1a1a]/55"
            />
            <svg 
              className="absolute left-3 top-3 w-4 h-4 text-[#1a1a1a]/40" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </form>

          {/* Primary Routes */}
          <div className="flex flex-col space-y-3 font-inter font-semibold text-sm text-[#1a1a1a]/85">
            <div className="border-b border-black/5 pb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/50">Navigation</span>
            </div>
            <Link href="/library" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Library</Link>
            <Link href="/reader" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Reader</Link>
            <Link href="/authors" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Authors</Link>
            <Link href="/movements" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Movements</Link>
            <Link href="/community" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Community</Link>
            <Link href="/recommendations" className="px-2 py-1 hover:bg-black/5 rounded transition-all">Recommendations</Link>
          </div>

          {/* Companion Chat Chambers (Nested Options) */}
          <div className="flex flex-col space-y-2 font-inter text-xs text-[#1a1a1a]/85">
            <div className="border-b border-black/5 pb-1 mt-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/50">Companion Chat</span>
            </div>
            <Link href="/chat/simple" className="px-2 py-1.5 hover:bg-black/5 rounded transition-all flex flex-col">
              <span className="font-semibold text-xs">Simple Chat</span>
              <span className="text-[9px] text-[#1a1a1a]/55">Open creative dialogue</span>
            </Link>
            <Link href="/chat/advanced" className="px-2 py-1.5 hover:bg-black/5 rounded transition-all flex flex-col">
              <span className="font-semibold text-xs">Advanced Chat</span>
              <span className="text-[9px] text-[#1a1a1a]/55">Genre & Era-locked filters</span>
            </Link>
            <Link href="/translation" className="px-2 py-1.5 hover:bg-black/5 rounded transition-all flex flex-col">
              <span className="font-semibold text-xs">Translation Chamber</span>
              <span className="text-[9px] text-[#1a1a1a]/55">Carry literature across borders</span>
            </Link>
            <Link href="/write-with-me" className="px-2 py-1.5 hover:bg-black/5 rounded transition-all flex flex-col">
              <span className="font-semibold text-xs">Write With Me</span>
              <span className="text-[9px] text-[#1a1a1a]/55">Co-compose flowing prose</span>
            </Link>
          </div>

          {/* Account and Profile options (if user logged in) */}
          {user && (
            <div className="flex flex-col space-y-2 border-t border-[#1a1a1a]/10 pt-4 font-inter text-xs text-[#1a1a1a]/85">
              <div className="border-b border-black/5 pb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#1a1a1a]/50">Your Study Room</span>
              </div>
              <Link href="/profile?tab=my-profile" className="px-2 py-1 hover:bg-black/5 rounded transition-all">👤 My Profile</Link>
              <Link href="/profile?tab=anthology" className="px-2 py-1 hover:bg-black/5 rounded transition-all">📜 Personal Anthology</Link>
              <Link href="/profile?tab=wishlist" className="px-2 py-1 hover:bg-black/5 rounded transition-all">❤️ Wishlist</Link>
              <Link href="/reading-lists" className="px-2 py-1 hover:bg-black/5 rounded transition-all">📚 Reading Lists</Link>
              <Link href="/profile?tab=preferences" className="px-2 py-1 hover:bg-black/5 rounded transition-all">⚙️ Preferences</Link>
              
              {user?.uid === 'AGUsKuZPq7YFBydMnnOnUcFhvdx1' && (
                <Link href="/admin" className="px-2 py-1 hover:bg-black/5 rounded transition-all font-semibold">🛡️ Admin Panel</Link>
              )}
              
              <button
                onClick={handleSignOut}
                className="w-full text-left px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded transition-all mt-2"
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
