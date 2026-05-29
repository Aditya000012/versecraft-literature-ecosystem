'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

interface Book {
  id: string;
  gutenbergId?: number;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    categories?: string[];
    infoLink?: string;
  };
}

interface WishlistItem {
  bookId: string;
  title: string;
  authors: string[];
  thumbnail?: string;
  infoLink?: string;
  addedAt: Date | string | { seconds: number; nanoseconds: number } | null;
}

const genres = [
  { id: 'fiction', name: 'Fiction', icon: '📖' },
  { id: 'poetry', name: 'Poetry', icon: '✒️' },
  { id: 'gothic', name: 'Gothic', icon: '🦇' },
  { id: 'romance', name: 'Romance', icon: '🌹' },
  { id: 'mystery', name: 'Mystery', icon: '🔍' },
  { id: 'fantasy', name: 'Fantasy', icon: '🐉' },
  { id: 'classics', name: 'Classics', icon: '🏛️' },
  { id: 'sufi', name: 'Sufi', icon: '✨' },
];

const normalizeTitle = (title: string) => 
  title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function LibraryPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search parameters from URL
  const queryParam = searchParams.get('q') || '';
  const genreParam = searchParams.get('genre') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeGenre, setActiveGenre] = useState(genreParam);
  const [books, setBooks] = useState<Book[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [activeListDropdown, setActiveListDropdown] = useState<string | null>(null);
  const [readingLists, setReadingLists] = useState<{ id: string; name: string }[]>([]);
  const [savedStatus, setSavedStatus] = useState<Record<string, string>>({});

  const handleDropdownToggle = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }
    if (activeListDropdown === bookId) {
      setActiveListDropdown(null);
    } else {
      setActiveListDropdown(bookId);
      try {
        const res = await fetch(`/api/reading-lists?uid=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setReadingLists(data);
        }
      } catch (err) {
        console.error('Error fetching reading lists:', err);
      }
    }
  };

  const handleSaveToReadingList = async (e: React.MouseEvent, listId: string, book: Book) => {
    e.stopPropagation();
    if (!user) return;

    const info = book.volumeInfo || {};
    const authors = info.authors || ['Unknown Author'];
    const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80';

    try {
      const res = await fetch('/api/reading-lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          listId,
          book: {
            bookId: book.id,
            title: info.title || 'Untitled Work',
            authors: authors,
            thumbnail: thumbnail,
            infoLink: info.infoLink || '',
          }
        })
      });

      if (res.ok) {
        setSavedStatus({ ...savedStatus, [book.id]: 'Saved!' });
        setTimeout(() => {
          setSavedStatus(prev => {
            const updated = { ...prev };
            delete updated[book.id];
            return updated;
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving book:', err);
    } finally {
      setActiveListDropdown(null);
    }
  };

  // Sync wishlist from Firestore in real-time
  useEffect(() => {
    if (!user) return;

    const fetchWishlist = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setWishlist(docSnap.data().wishlist || []);
        }
      } catch (err) {
        console.error('Error fetching wishlist:', err);
      }
    };

    fetchWishlist();
  }, [user]);

  const fetchBooks = React.useCallback(async (genreName: string, queryText: string) => {
    setLoadingBooks(true);
    try {
      let url = '/api/library';
      if (queryText.trim()) {
        url = `/api/library?q=${encodeURIComponent(queryText.trim())}`;
      } else {
        const genre = genreName || 'fiction';
        url = `/api/library?genre=${encodeURIComponent(genre)}`;
      }
      console.log('Library fetch URL:', url);
      const res = await fetch(url);
      const data = await res.json();
      console.log('Library data received:', data?.length, data?.[0]);
      
      const booksList = Array.isArray(data) ? data : [];
      // 1. Immediately render Google Books results to prevent blocking initial render
      setBooks(booksList);

      // 2. Perform Gutenberg matching asynchronously in background
      if (booksList.length > 0) {
        (async () => {
          try {
            const booksWithGutenberg = await Promise.all(
              booksList.map(async (book) => {
                const bookTitle = book.volumeInfo.title;

                // Step 5 — Hardcode Pride and Prejudice fallback
                if (bookTitle.toLowerCase().includes('pride and prejudice')) {
                  return {
                    ...book,
                    gutenbergId: 1342
                  };
                }

                // Extract main title by splitting on dividers to prevent empty Gutenberg API search results
                const searchTitle = bookTitle.split(/[:;\-\(]/)[0].trim() || bookTitle;

                try {
                  // Search query endpoint URL exactly as specified
                  const gutRes = await fetch(`/api/gutenberg?action=search&query=${encodeURIComponent(searchTitle)}`);
                  if (gutRes.ok) {
                    const results = await gutRes.json();
                    if (Array.isArray(results)) {
                      // Lenient title matching rules using clean searchTitle
                      const googleTitle = normalizeTitle(searchTitle);
                      const match = results.find((g: { title: string; id: number }) => {
                        const gutenbergTitle = normalizeTitle(g.title);
                        return gutenbergTitle.includes(googleTitle) || 
                               googleTitle.includes(gutenbergTitle) ||
                               gutenbergTitle.split(' ').slice(0, 3).join(' ') === googleTitle.split(' ').slice(0, 3).join(' ');
                      });

                      const matchedId = match ? match.id : null;

                      // Step 1 — Console logs
                      console.log('Searching Gutenberg for:', bookTitle);
                      console.log('Gutenberg results:', results);
                      console.log('Match found:', matchedId);

                      if (match) {
                        return {
                          ...book,
                          gutenbergId: match.id
                        };
                      }
                    }
                  }
                } catch (e) {
                  console.error('Error matching single Gutenberg book:', e);
                }
                return book;
              })
            );
            setBooks(booksWithGutenberg);
          } catch (bgError) {
            console.error('Background Gutenberg matching error:', bgError);
          }
        })();
      }
    } catch (err) {
      console.error('Error fetching books:', err);
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  // Fetch books when search queries or URL params change
  useEffect(() => {
    setSearchQuery(queryParam);
    setActiveGenre(genreParam || (queryParam ? '' : 'fiction'));
    fetchBooks(genreParam, queryParam);
  }, [queryParam, genreParam, fetchBooks]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    // Clear active genre sidebar selection when search is active
    setActiveGenre('');
    
    // Call fetch directly and immediately
    await fetchBooks('', query);

    const params = new URLSearchParams();
    if (query) {
      params.set('q', query);
    } else {
      params.set('genre', 'fiction');
    }
    router.push(`/library?${params.toString()}`);
  };

  const handleGenreClick = async (genreId: string) => {
    const newGenre = activeGenre === genreId ? 'fiction' : genreId;
    setActiveGenre(newGenre);
    setSearchQuery('');

    // Call fetch directly and immediately
    await fetchBooks(newGenre, '');

    const params = new URLSearchParams();
    if (newGenre) params.set('genre', newGenre);
    router.push(`/library?${params.toString()}`);
  };

  const isBookInWishlist = (bookId: string) => {
    return wishlist.some((item) => item.bookId === bookId);
  };

  const toggleWishlist = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation(); // Avoid opening detailed modal
    if (!user) {
      router.push('/auth?mode=login');
      return;
    }

    const inWishlist = isBookInWishlist(book.id);
    const userRef = doc(db, 'users', user.uid);

    const info = book.volumeInfo || {};
    const item: WishlistItem = {
      bookId: book.id,
      title: info.title || 'Untitled Work',
      authors: info.authors || ['Unknown Author'],
      thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '',
      infoLink: info.infoLink || `https://books.google.com/books?id=${book.id}`,
      addedAt: new Date(),
    };

    try {
      if (inWishlist) {
        // Remove item from Firestore
        // For arrayRemove, we need to match the item precisely or remove by filtering
        // Let's retrieve latest wishlist and filter
        const updatedList = wishlist.filter((w) => w.bookId !== book.id);
        await updateDoc(userRef, {
          wishlist: updatedList,
        });
        setWishlist(updatedList);
      } else {
        // Add item to Firestore
        await updateDoc(userRef, {
          wishlist: arrayUnion(item),
        });
        setWishlist((prev) => [...prev, item]);
      }
    } catch (err) {
      console.error('Error toggling wishlist:', err);
    }
  };

  // Helper to synthesize era from publication date or genre
  const synthesizeEra = (publishedDate?: string) => {
    if (!publishedDate) return 'Ancient Era';
    const year = parseInt(publishedDate.split('-')[0]);
    if (isNaN(year)) return 'Classic Era';
    if (year < 1500) return 'Ancient Era';
    if (year < 1650) return 'Renaissance';
    if (year < 1830) return 'Romantic Period';
    if (year < 1901) return 'Victorian Era';
    if (year < 1960) return 'Modernist Era';
    return 'Contemporary Era';
  };

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>
      {/* Search Header */}
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="font-playfair text-4xl font-bold text-cream">The Grand Library</h1>
          <p className="font-inter text-xs text-cream/40 mt-1 uppercase tracking-wider font-semibold">
            Search our curated digital stacks powered by Google Books
          </p>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-md relative">
          <input
            type="text"
            placeholder="Search volumes, authors, or literary movements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setActiveGenre('');
                  fetchBooks('', searchQuery.trim());
                  const params = new URLSearchParams();
                  params.set('q', searchQuery.trim());
                  router.push(`/library?${params.toString()}`);
                }
              }
            }}
            className="w-full px-4 py-3 pl-11 rounded-xl outline-none glass-input text-sm text-cream shadow-inner"
          />
          <button
            type="submit"
            onClick={() => {
              if (searchQuery.trim()) {
                setActiveGenre('');
                fetchBooks('', searchQuery.trim());
                const params = new URLSearchParams();
                params.set('q', searchQuery.trim());
                router.push(`/library?${params.toString()}`);
              }
            }}
            className="absolute left-3.5 top-3.5 text-cream/40 hover:text-gold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </form>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Category Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card border-white/5 rounded-xl p-5 shadow">
            <h3 className="font-playfair text-lg font-bold text-gold mb-4 border-b border-white/5 pb-2">Browse Genres</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGenreClick(g.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-inter border transition-all w-full lg:text-left ${
                    activeGenre === g.id
                      ? 'bg-gold border-transparent text-navy shadow shadow-gold/15'
                      : 'bg-white/5 border-white/5 text-cream/70 hover:text-gold hover:border-gold/30'
                  }`}
                >
                  <span className="text-sm">{g.icon}</span>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Books Grid Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {loadingBooks ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-32 gap-3"
              >
                <div className="w-10 h-10 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
                <span className="font-playfair text-[#1a1a1a] italic text-sm">Opening archive vaults...</span>
              </motion.div>
            ) : books.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card border-white/5 rounded-xl p-12 text-center"
              >
                <span className="text-3xl block mb-3">🕯️</span>
                <p className="font-playfair text-lg text-cream italic">No volumes found in this wing of the stacks.</p>
                <p className="text-xs text-cream/40 mt-1 font-inter">Try broadening your search keywords or choosing another genre.</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-6"
              >
                {books.map((book) => {
                  const info = book.volumeInfo || {};
                  const title = info.title || 'Untitled Work';
                  const authors = info.authors || ['Unknown Author'];
                  const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80';
                  const inWishlist = isBookInWishlist(book.id);

                  return (
                    <motion.div
                      key={book.id}
                      onClick={() => setSelectedBook(book)}
                      className="glass-card border-white/5 hover:border-gold/30 rounded-xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
                    >
                      {/* Cover Thumbnail wrapper */}
                      <div className="relative aspect-[3/4] bg-black/40 overflow-hidden flex items-center justify-center">
                        <img
                          src={thumbnail}
                          alt={title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {/* Gradient shade */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                        {/* Visible WIshlist Toggle (Glowing Heart) */}
                        <button
                          onClick={(e) => toggleWishlist(e, book)}
                          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
                            inWishlist
                              ? 'bg-red-500/20 border-red-500 text-red-400 shadow shadow-red-500/20'
                              : 'bg-black/60 border-white/10 text-cream/60 hover:text-gold hover:border-gold/50'
                          }`}
                          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                          <svg
                            className="w-4 h-4 fill-current"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>

                        {/* Save to List Bookmark Button */}
                        <button
                          onClick={(e) => handleDropdownToggle(e, book.id)}
                          className={`absolute top-3 right-12 p-2 rounded-full backdrop-blur-md border transition-all duration-300 z-10 ${
                            activeListDropdown === book.id
                              ? 'bg-gold/20 border-gold text-gold shadow shadow-gold/25'
                              : 'bg-black/60 border-white/10 text-cream/60 hover:text-gold hover:border-gold/50'
                          }`}
                          title="Save to List"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            />
                          </svg>
                        </button>

                        {/* Dropdown menu */}
                        {activeListDropdown === book.id && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-3 top-12 z-20 w-48 glass-card border border-white/10 rounded-xl py-2 shadow-2xl text-left"
                          >
                            <div className="px-3 py-1 border-b border-white/5 mb-1 text-[9px] uppercase tracking-wider text-gold font-bold">
                              Save to List
                            </div>
                            {readingLists.length === 0 ? (
                              <div className="px-3 py-2 text-[10px] text-cream/50 italic flex flex-col gap-1">
                                <span>Create a list first</span>
                                <span 
                                  onClick={() => router.push('/reading-lists')}
                                  className="text-gold hover:underline font-semibold font-inter cursor-pointer"
                                >
                                  Create List →
                                </span>
                              </div>
                            ) : (
                              <div className="max-h-36 overflow-y-auto">
                                {readingLists.map((list) => (
                                  <button
                                    key={list.id}
                                    onClick={(e) => handleSaveToReadingList(e, list.id, book)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-xs text-cream/80 hover:text-gold transition-colors font-inter truncate"
                                  >
                                    📁 {list.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Saved overlay alert */}
                        {savedStatus[book.id] && (
                          <div className="absolute inset-0 bg-navy/95 z-15 flex items-center justify-center">
                            <span className="font-playfair text-gold italic text-sm font-semibold animate-pulse">
                              ✨ {savedStatus[book.id]}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details Box */}
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex items-start gap-2 flex-wrap mb-1">
                            <h4 className="font-playfair font-bold text-cream text-sm leading-snug group-hover:text-gold transition-colors line-clamp-2 inline">
                              {title}
                            </h4>
                            {book.gutenbergId && (
                              <span className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-inter inline-block select-none shrink-0">
                                Read Free
                              </span>
                            )}
                          </div>
                          <p className="font-inter text-[11px] text-cream/50 mt-1 line-clamp-1">
                            by{' '}
                            {authors.map((authorName, index) => (
                              <React.Fragment key={authorName}>
                                {index > 0 && ', '}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/authors?name=${encodeURIComponent(authorName)}`);
                                  }}
                                  className="cursor-pointer hover:text-[#c9a84c] transition-colors duration-200 underline underline-offset-2"
                                >
                                  {authorName}
                                </span>
                              </React.Fragment>
                            ))}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-3 space-y-2">
                          {book.gutenbergId && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/read/${book.gutenbergId}`);
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-semibold font-inter transition-all duration-200 w-full"
                            >
                              📖 Read Now
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/chat/simple?book=${encodeURIComponent(book.volumeInfo.title)}&author=${encodeURIComponent(book.volumeInfo.authors?.[0] || 'Unknown')}`);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-inter hover:bg-[#c9a84c]/10 transition-all duration-200 w-full"
                          >
                            💬 Discuss with Companion
                          </button>
                        </div>

                        {/* Categories footer */}
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gold">
                          <span>{info.categories?.[0] || 'Literature'}</span>
                          <span className="text-[10px] opacity-40">→</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Book Detail Modal Overlay */}
      <AnimatePresence>
        {selectedBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBook(null)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full p-6 sm:p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-y-auto max-h-[85vh]"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 text-cream/40 hover:text-cream transition-colors text-lg"
              >
                ✕
              </button>

              {/* Flex container */}
              <div className="flex flex-col md:flex-row gap-6 mt-2">
                {/* Book cover left */}
                <div className="w-full md:w-1/3 aspect-[3/4] bg-black/40 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                  <img
                    src={selectedBook.volumeInfo.imageLinks?.thumbnail || selectedBook.volumeInfo.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80'}
                    alt={selectedBook.volumeInfo.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content right */}
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap mb-1">
                      <span className="text-[9px] uppercase tracking-widest text-gold font-bold font-inter block">
                        {selectedBook.volumeInfo.categories?.[0] || 'Curated Volume'}
                      </span>
                      {selectedBook.gutenbergId && (
                        <span className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-inter">
                          Read Free
                        </span>
                      )}
                    </div>
                    <h2 className="font-playfair text-2xl font-bold text-cream leading-tight">
                      {selectedBook.volumeInfo.title}
                    </h2>
                    <p className="font-inter text-xs font-semibold text-cream/60 mt-1">
                      by{' '}
                      {(selectedBook.volumeInfo.authors || ['Unknown Author']).map((authorName, index) => (
                        <React.Fragment key={authorName}>
                          {index > 0 && ', '}
                          <span
                            onClick={() => router.push(`/authors?name=${encodeURIComponent(authorName)}`)}
                            className="cursor-pointer hover:text-[#c9a84c] transition-colors duration-200 underline underline-offset-2"
                          >
                            {authorName}
                          </span>
                        </React.Fragment>
                      ))}
                    </p>

                    <div className="flex gap-2.5 mt-3">
                      <span className="bg-white/5 border border-white/5 rounded px-2.5 py-0.5 text-[10px] font-bold text-gold uppercase tracking-wider font-inter">
                        {synthesizeEra(selectedBook.volumeInfo.publishedDate)}
                      </span>
                      {selectedBook.volumeInfo.publishedDate && (
                        <span className="bg-white/5 border border-white/5 rounded px-2.5 py-0.5 text-[10px] font-bold text-cream/50 font-inter">
                          {selectedBook.volumeInfo.publishedDate.split('-')[0]}
                        </span>
                      )}
                    </div>

                    {/* Book description scrolling */}
                    <div className="mt-4 border-t border-white/5 pt-3 max-h-[160px] overflow-y-auto pr-2">
                      <p className="font-inter text-xs text-cream/80 leading-relaxed font-light whitespace-pre-line">
                        {selectedBook.volumeInfo.description || 'No description available for this volume in the central archives.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions buttons footer */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                    {/* Discuss button */}
                    <button
                      onClick={() => router.push(`/chat/simple?book=${encodeURIComponent(selectedBook.volumeInfo.title)}&author=${encodeURIComponent(selectedBook.volumeInfo.authors?.[0] || 'Unknown')}`)}
                      className="flex-1 py-3 rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-bold uppercase tracking-wider font-inter hover:bg-[#c9a84c]/10 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      💬 Discuss with Companion
                    </button>

                    {/* Read Now button (if gutenbergId exists) */}
                    {selectedBook.gutenbergId && (
                      <button
                        onClick={() => router.push(`/read/${selectedBook.gutenbergId}`)}
                        className="flex-1 py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter transition-all flex items-center justify-center gap-1.5"
                      >
                        📖 Read Now
                      </button>
                    )}

                    {/* Buy Link Button */}
                    <a
                      href={selectedBook.volumeInfo.infoLink || `https://books.google.com/books?id=${selectedBook.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-gold hover:bg-gold-light rounded-xl text-center text-xs font-bold uppercase tracking-wider font-inter text-navy transition-all shadow-md shadow-gold/15 flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      Acquire Volume
                    </a>

                    {/* Wishlist Toggle Button */}
                    <button
                      onClick={(e) => toggleWishlist(e, selectedBook)}
                      className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider font-inter transition-all flex items-center justify-center gap-1.5 ${
                        isBookInWishlist(selectedBook.id)
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-white/5 border-white/10 text-cream hover:bg-white/10 hover:border-gold/50 hover:text-gold'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      {isBookInWishlist(selectedBook.id) ? 'Saved' : 'Add to Wishlist'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Opening archive vaults...</span>
        </div>
      </div>
    }>
      <LibraryPageContent />
    </Suspense>
  );
}
