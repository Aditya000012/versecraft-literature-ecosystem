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
  source: 'google' | 'gutenberg' | 'merged';
  publicDomain?: boolean;
  epubUrl?: string;
  _liveGutenbergId?: number;
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

const LOCAL_GUTENBERG_MAP: Record<string, number> = {
  'pride and prejudice': 1342,
  'frankenstein': 84,
  'frankenstein or the modern prometheus': 84,
  'dracula': 345,
  'the great gatsby': 64317,
  'moby dick': 2701,
  'moby dick or the whale': 2701,
  'a tale of two cities': 98,
  'alices adventures in wonderland': 11,
  'alice in wonderland': 11,
  'the picture of dorian gray': 174,
  'the adventures of sherlock holmes': 1661,
  'sherlock holmes': 1661,
  'jane eyre': 1260,
  'jane eyre an autobiography': 1260,
  'the scarlet letter': 33,
  'great expectations': 1400,
  'metamorphosis': 5200,
  'the metamorphosis': 5200,
  'the yellow wallpaper': 1952,
  'wuthering heights': 768,
  'the importance of being earnest': 844,
  'a dolls house': 2542,
  'the odyssey': 1727,
  'the iliad': 6130,
  'heart of darkness': 526,
  'the strange case of dr jekyll and mr hyde': 43,
  'dr jekyll and mr hyde': 43,
  'the time machine': 35,
  'the invisible man': 5230,
  'the war of the worlds': 36,
  'adventures of huckleberry finn': 74,
  'huckleberry finn': 74,
  'the adventures of tom sawyer': 74,
  'tom sawyer': 74,
  'grimms fairy tales': 2591,
  'the count of monte cristo': 1184,
  'les miserables': 135,
  'crime and punishment': 2554,
  'the brothers karamazov': 28054,
  'walden': 205,
  'leaves of grass': 1322,
  'siddhartha': 2500,
  'emma': 158,
  'sense and sensibility': 161,
  'persuasion': 105,
  'mansfield park': 141,
  'northanger abbey': 121,
  'little women': 514,
  'peter pan': 16,
  'treasure island': 120,
  'the secret garden': 113,
  'the wind in the willows': 289,
  'pygmalion': 3825,
  'candide': 19912,
  'ulysses': 4300,
  'dubliners': 2814,
  'a portrait of the artist as a young man': 4217,
  'don quixote': 996,
  'the divine comedy': 8800,
  'paradise lost': 20,
  'beowulf': 16328,
  'the canterbury tales': 2383,
  'macbeth': 1533,
  'hamlet': 1524,
  'romeo and juliet': 1513,
  'othello': 1531,
  'king lear': 1529,
  'julius caesar': 1522,
  'a midsummer nights dream': 1514,
  'the tempest': 1540,
  'the merchant of venice': 1515,
  'the prophet': 58585,
  'the rubaiyat of omar khayyam': 246,
  'gitanjali': 44733,
  'the awakening': 160,
  'the awakening and selected short stories': 160,
  'common sense': 147,
  'the prince': 1232,
  'the republic': 1497,
  'leviathan': 3207,
  'the social contract': 46392,
  'beyond good and evil': 4363,
  'thus spake zarathustra': 1998,
  'the art of war': 132,
  'the book of tea': 19232,
  'the double': 18716,
  'notes from the underground': 600,
  'white nights': 36034,
  'the idiot': 2638,
  'the possessed': 8117,
  'dead souls': 13957,
  'tarzan of the apes': 78,
  'the return of tarzan': 81,
  'the beast in the jungle': 1093,
  'the turn of the screw': 209,
  'the portrait of a lady': 284,
  'daisy miller': 208,
  'the red badge of courage': 73,
  'uncle toms cabin': 203,
  'robinson crusoe': 521,
  'gullivers travels': 829,
  'david copperfield': 766,
  'oliver twist': 730,
  'bleak house': 1023,
  'a christmas carol': 46,
  'the chimes': 653,
  'the cricket on the hearth': 2078,
  'hard times': 786,
  'our mutual friend': 883,
  'little dorrit': 963,
  'the old curiosity shop': 700,
  'nicholas nickleby': 967,
  'the pickwick papers': 580,
  'dombey and son': 821,
  'tess of the durbervilles': 110,
  'jude the obscure': 113,
  'far from the madding crowd': 107,
  'the return of the native': 122,
  'the mayor of casterbridge': 144,
  'a pair of blue eyes': 114,
  'the woodlanders': 468,
  'dracula guest': 10077,
  'the jewel of seven stars': 3742,
  'the lair of the white worm': 765,
  'the lady of the shroud': 3095,
  'frankenstein complete text': 84,
};

interface GutenbergAuthor {
  name?: string;
  birth_year?: number;
  death_year?: number;
}

interface GutenbergBook {
  id: number;
  title?: string;
  authors?: GutenbergAuthor[];
  copyright?: boolean;
  formats?: Record<string, string>;
  summaries?: string[];
  bookshelves?: string[];
}

interface GoogleBook {
  id: string;
  _liveGutenbergId?: number;
  volumeInfo?: {
    title?: string;
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

function normalizeBookData(raw: GutenbergBook | GoogleBook, source: 'google' | 'gutenberg'): Book {
  if (source === 'gutenberg') {
    const gBook = raw as GutenbergBook;
    const authors = (gBook.authors || []).map((a) => {
      if (a.name && a.name.includes(',')) {
        const parts = a.name.split(',');
        return `${parts[1].trim()} ${parts[0].trim()}`;
      }
      return a.name || 'Unknown Author';
    });

    const thumbnail = gBook.formats?.['image/jpeg'] || 
                      `https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80`;
    
    const formats = gBook.formats || {};
    const epubUrl = formats['application/epub+zip'] || 
                    formats['application/x-mobipocket-ebook'] || 
                    formats['text/plain'] || '';

    return {
      id: `gutenberg-${gBook.id}`,
      gutenbergId: gBook.id,
      source: 'gutenberg',
      publicDomain: !gBook.copyright,
      epubUrl: epubUrl,
      volumeInfo: {
        title: gBook.title || 'Untitled Work',
        authors: authors.length > 0 ? authors : ['Unknown Author'],
        publisher: 'Project Gutenberg',
        publishedDate: 'Public Domain',
        description: gBook.summaries?.[0] || `A classic masterpiece by ${authors.join(', ')}. Available for free, high-fidelity reading inside the Versecraft Grand Library.`,
        imageLinks: {
          thumbnail: thumbnail,
          smallThumbnail: thumbnail,
        },
        categories: gBook.bookshelves?.map((b: string) => b.replace('Category: ', '')) || ['Classics'],
        infoLink: `https://www.gutenberg.org/ebooks/${gBook.id}`
      }
    };
  } else {
    const googleBook = raw as GoogleBook;
    const info = googleBook.volumeInfo || {};
    return {
      id: googleBook.id,
      source: 'google',
      publicDomain: false,
      _liveGutenbergId: googleBook._liveGutenbergId,
      volumeInfo: {
        title: info.title || 'Untitled Work',
        authors: info.authors || ['Unknown Author'],
        publisher: info.publisher || 'Unknown Publisher',
        publishedDate: info.publishedDate || '',
        description: info.description || 'No description available for this volume in the central archives.',
        imageLinks: {
          thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
          smallThumbnail: info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80',
        },
        categories: info.categories || ['Literature'],
        infoLink: info.infoLink || `https://books.google.com/books?id=${googleBook.id}`
      }
    };
  }
}

const areTitlesMatching = (titleA: string, titleB: string): boolean => {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);
  
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Strip common filler words to check core overlap
  const stopwords = new Set(['the', 'a', 'an', 'and', 'of', 'or', 'in', 'on', 'by', 'to', 'for', 'with', 'from', 'at']);
  const wordsA = normA.split(' ').filter(w => !stopwords.has(w) && w.length > 0);
  const wordsB = normB.split(' ').filter(w => !stopwords.has(w) && w.length > 0);
  
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  
  // If first two core words are identical
  const coreA2 = wordsA.slice(0, 2).join(' ');
  const coreB2 = wordsB.slice(0, 2).join(' ');
  if (coreA2 === coreB2) return true;
  
  // If first core word is identical and long enough (>= 4 chars)
  if (wordsA[0] === wordsB[0] && wordsA[0].length >= 4) return true;
  
  return false;
};

function mergeBookResults(googleBooks: Book[], gutenbergBooks: Book[]): Book[] {
  const mergedList: Book[] = [];
  const matchedGutenbergIds = new Set<number>();
  
  googleBooks.forEach(gBook => {
    const normGoogleTitle = normalizeTitle(gBook.volumeInfo.title);
    
    const match = gutenbergBooks.find(gutBook => {
      if (!gutBook.gutenbergId || matchedGutenbergIds.has(gutBook.gutenbergId)) return false;
      
      const titleMatch = areTitlesMatching(gutBook.volumeInfo.title, gBook.volumeInfo.title);
                         
      if (!titleMatch) return false;
      
      const gAuthors = gBook.volumeInfo.authors || [];
      const gutAuthors = gutBook.volumeInfo.authors || [];
      if (gAuthors.length > 0 && gutAuthors.length > 0) {
        const primaryAuthor = gAuthors[0].toLowerCase();
        if (primaryAuthor.includes('various') || primaryAuthor.includes('anonymous')) {
          return true;
        }
        const authorWords = primaryAuthor.replace(/[^a-z\s]/g, '').split(' ').filter(w => w.length >= 2);
        if (authorWords.length === 0) return true;
        return gutAuthors.some(ga => {
          const gaLower = ga.toLowerCase();
          return authorWords.some(word => gaLower.includes(word));
        });
      }
      return true;
    });

    if (match && match.gutenbergId) {
      matchedGutenbergIds.add(match.gutenbergId);
      mergedList.push({
        ...gBook,
        source: 'merged',
        gutenbergId: match.gutenbergId,
        publicDomain: match.publicDomain,
        epubUrl: match.epubUrl,
        volumeInfo: {
          ...gBook.volumeInfo,
          description: gBook.volumeInfo.description && gBook.volumeInfo.description !== 'No description available for this volume in the central archives.' 
            ? gBook.volumeInfo.description 
            : match.volumeInfo.description,
          categories: gBook.volumeInfo.categories && gBook.volumeInfo.categories[0] !== 'Literature' 
            ? gBook.volumeInfo.categories 
            : match.volumeInfo.categories
        }
      });
    } else {
      // Check for live Gutenberg match injected above
      const originalGoogleBook = gBook;
      const liveId = originalGoogleBook._liveGutenbergId;
      if (liveId) {
        mergedList.push({
          ...gBook,
          source: 'merged',
          gutenbergId: liveId,
          publicDomain: true,
          epubUrl: `https://www.gutenberg.org/ebooks/${liveId}.epub3.images`
        });
      } else {
        if (LOCAL_GUTENBERG_MAP[normGoogleTitle] !== undefined) {
          const gId = LOCAL_GUTENBERG_MAP[normGoogleTitle];
          mergedList.push({
            ...gBook,
            source: 'merged',
            gutenbergId: gId,
            publicDomain: true,
            epubUrl: `https://www.gutenberg.org/ebooks/${gId}.epub3.images`
          });
        } else {
          let matchedId: number | null = null;
          for (const [key, id] of Object.entries(LOCAL_GUTENBERG_MAP)) {
            if (key.length > 3 && normGoogleTitle.length > 3) {
              if (normGoogleTitle.includes(key) || key.includes(normGoogleTitle)) {
                matchedId = id;
                break;
              }
            }
          }
          if (matchedId !== null) {
            mergedList.push({
              ...gBook,
              source: 'merged',
              gutenbergId: matchedId,
              publicDomain: true,
              epubUrl: `https://www.gutenberg.org/ebooks/${matchedId}.epub3.images`
            });
          } else {
            mergedList.push(gBook);
          }
        }
      }
    }
  });

  gutenbergBooks.forEach(gutBook => {
    if (gutBook.gutenbergId && !matchedGutenbergIds.has(gutBook.gutenbergId)) {
      mergedList.push(gutBook);
    }
  });

  return mergedList;
}

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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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

  const fetchBooks = React.useCallback(async (genreName: string, queryText: string, pageNumber: number = 1) => {
    setLoadingBooks(true);
    try {
      let googleUrl = '/api/library';

      if (queryText.trim()) {
        const encQ = encodeURIComponent(queryText.trim());
        googleUrl = `/api/library?q=${encQ}`;
      } else if (genreName) {
        const encG = encodeURIComponent(genreName);
        googleUrl = `/api/library?genre=${encG}`;
      }
      
      console.log('Fetching parallel content sources:', { googleUrl });
      
      const [googleRes, gutenbergResponse] = await Promise.all([
        fetch(googleUrl).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(
          `https://gutendex.com/books/?languages=en&search=${encodeURIComponent(queryText || genreName || 'classic literature')}&page=${pageNumber}`
        ).then(r => r.ok ? r.json() : { results: [], next: false }).catch(() => ({ results: [], next: false }))
      ]);
      const gutenbergRes = gutenbergResponse;

      const rawGoogleBooks = Array.isArray(googleRes) ? googleRes : [];
      const rawGutenbergBooks = gutenbergRes && Array.isArray(gutenbergRes.results) ? gutenbergRes.results : [];
      setHasMore(gutenbergRes?.next || false);

      // For Google Books results not found in LOCAL_GUTENBERG_MAP, check Gutenberg API live
      const normalizedTitles = rawGoogleBooks.map((b: GoogleBook) => 
        normalizeTitle(b.volumeInfo?.title || '')
      );

      const liveGutenbergMatches = await Promise.all(
        rawGoogleBooks.map(async (b: GoogleBook, index: number) => {
          const normTitle = normalizedTitles[index];
          // Skip if already in local map
          if (LOCAL_GUTENBERG_MAP[normTitle] !== undefined) return null;
          
          // Check partial matches in local map
          for (const [key] of Object.entries(LOCAL_GUTENBERG_MAP)) {
            if (key.length > 3 && normTitle.length > 3) {
              if (normTitle.includes(key) || key.includes(normTitle)) return null;
            }
          }
          
          // Not in local map — search Gutenberg API live
          try {
            const author = b.volumeInfo?.authors?.[0]?.split(',')[0] || '';
            const title = b.volumeInfo?.title || '';
            const searchQuery = author ? `${title} ${author}` : title;
            const res = await fetch(
              `https://gutendex.com/books/?search=${encodeURIComponent(searchQuery)}&languages=en`
            );
            if (!res.ok) return null;
            const data = await res.json();
            if (!data.results || data.results.length === 0) return null;
            
            const match = data.results.find((g: GutenbergBook) => {
              if (!g.title) return false;
              const gutTitle = normalizeTitle(g.title);
              const firstThreeGoogle = normTitle.split(' ').slice(0, 3).join(' ');
              const firstThreeGut = gutTitle.split(' ').slice(0, 3).join(' ');
              return gutTitle.includes(normTitle) || 
                     normTitle.includes(gutTitle) || 
                     firstThreeGoogle === firstThreeGut;
            });
            
            return match ? { bookIndex: index, gutenbergId: match.id } : null;
          } catch {
            return null;
          }
        })
      );

      // Inject live Gutenberg matches into Google Books results before merging
      liveGutenbergMatches.forEach(match => {
        if (match && rawGoogleBooks[match.bookIndex]) {
          rawGoogleBooks[match.bookIndex]._liveGutenbergId = match.gutenbergId;
        }
      });

      const normalizedGoogle = rawGoogleBooks.map((b: GoogleBook) => normalizeBookData(b, 'google'));
      const normalizedGutenberg = rawGutenbergBooks.map((b: GutenbergBook) => normalizeBookData(b, 'gutenberg'));
      
      const mergedBooks = mergeBookResults(normalizedGoogle, normalizedGutenberg);
      setBooks(mergedBooks);
    } catch (err) {
      console.error('Error fetching/merging books:', err);
      setBooks([]);
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  // Fetch books when search queries or URL params change
  useEffect(() => {
    setSearchQuery(queryParam);
    setActiveGenre(genreParam || (queryParam ? '' : 'fiction'));
    setCurrentPage(1);
    fetchBooks(genreParam, queryParam, 1);
  }, [queryParam, genreParam, fetchBooks]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    
    // Clear active genre sidebar selection when search is active
    setActiveGenre('');
    setCurrentPage(1);
    
    // Call fetch directly and immediately
    await fetchBooks('', query, 1);

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
    setCurrentPage(1);

    // Call fetch directly and immediately
    await fetchBooks(newGenre, '', 1);

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
    <>
      {/* Cream background base */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#F8F4E9',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Reading Sanctuary Background Ambience */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      >
        <svg
          className="w-full h-full text-[#1a1a1a]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <line x1="80" y1="200" x2="200" y2="150" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="80" y1="200" x2="140" y2="300" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="140" y1="300" x2="60" y2="480" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="1080" y1="180" x2="980" y2="280" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="980" y1="280" x2="1120" y2="350" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />
          <line x1="1120" y1="350" x2="1000" y2="520" stroke="currentColor" strokeWidth="0.8" opacity="0.03" />

          <text x="80" y="200" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">story</text>
          <text x="200" y="150" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">memory</text>
          <text x="140" y="300" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">silence</text>
          <text x="60" y="480" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">poetry</text>
          <text x="120" y="700" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">dream</text>

          <text x="1080" y="180" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">solitude</text>
          <text x="980" y="280" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">wonder</text>
          <text x="1120" y="350" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">myth</text>
          <text x="1000" y="520" fontFamily="Georgia, serif" fontSize="13" fontStyle="italic" fill="currentColor" opacity="0.05" textAnchor="middle">λόγος</text>
        </svg>
      </motion.div>

      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Back Link */}
        <div className="mb-6 max-w-6xl mx-auto text-left">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-all inline-flex items-center gap-1 font-inter font-semibold"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Search Header */}
        <div className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-[#1a1a1a]/10">
          <div>
            <h1 className="font-playfair text-4xl font-bold text-[#1a1a1a]">The Library</h1>
            <p className="font-inter text-[9px] text-[#6b6b6b]/60 uppercase tracking-widest font-semibold mt-1">
              Curated digital stacks • Powered by Google Books & Gutenberg
            </p>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleSearchSubmit} className="w-full max-w-md relative">
            <input
              type="text"
              placeholder="Search stories, authors, movements, forgotten worlds..."
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
              className="w-full px-4 py-3 pl-11 rounded-xl outline-none bg-white/70 border border-[#1a1a1a]/15 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/30 shadow-sm focus:border-[#1a1a1a] transition-all"
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
              className="absolute left-3.5 top-3.5 text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
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
            <div className="border border-[#1a1a1a]/10 rounded-xl p-5 shadow-sm bg-white/40 backdrop-blur-md">
              <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] mb-4 border-b border-[#1a1a1a]/10 pb-2">Literary Shelves</h3>
              <div className="flex flex-wrap lg:flex-col gap-2">
                {genres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleGenreClick(g.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest font-inter transition-all w-full lg:text-left ${
                      activeGenre === g.id
                        ? 'bg-white border border-[#1a1a1a] border-l-[6px] border-l-[#1a1a1a] text-[#1a1a1a] shadow-sm'
                        : 'bg-transparent border border-transparent text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
                    }`}
                  >
                    <span className="text-sm select-none">{g.icon}</span>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Books Grid Area */}
          <div className="lg:col-span-3">
            {/* Contextual Shelf Heading */}
            <div className="mb-6">
              <h2 className="font-playfair text-xl font-bold text-[#1a1a1a] tracking-wide">
                {searchQuery.trim() 
                  ? `Results for "${searchQuery}"` 
                  : `${genres.find(g => g.id === activeGenre)?.name || 'Library'} Shelf`
                }
              </h2>
              <div className="h-[1px] w-full bg-[#1a1a1a]/10 mt-2" />
            </div>

            <AnimatePresence mode="wait">
              {loadingBooks ? (
                /* Loading State */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-32 space-y-6"
                >
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full border border-[#1a1a1a]"
                    />
                    <span className="text-xs text-[#1a1a1a]/60 select-none font-serif">✦</span>
                  </div>
                  <div className="space-y-1 text-center">
                    <h3 className="font-playfair text-base italic text-[#1a1a1a] animate-pulse">
                      Opening archive vaults…
                    </h3>
                    <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
                      Retrieving volume records
                    </p>
                  </div>
                </motion.div>
              ) : books.length === 0 ? (
                /* Empty State */
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="border border-[#1a1a1a]/10 rounded-xl p-12 text-center bg-white/40 backdrop-blur-md"
                >
                  <span className="text-2xl block mb-3 opacity-60">🕯️</span>
                  <p className="font-playfair text-lg text-[#1a1a1a] italic">No stories found in this corridor.</p>
                  <p className="text-xs text-[#1a1a1a]/60 mt-1 font-inter">Try another shelf or search a different name.</p>
                </motion.div>
              ) : (
                /* Books Grid */
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 md:grid-cols-3 gap-6"
                >
                  {books.map((book) => {
                    const info = book.volumeInfo || {};
                    const title = info.title || 'Untitled Work';
                    const authors = info.authors || ['Unknown Author'];
                    
                    // Log every book object rendered in the library grid as required by the user
                    console.log('Book in grid:', {
                      title: title,
                      source: book.source,
                      gutenbergId: book.gutenbergId,
                      isFree: !!book.gutenbergId,
                      authors: authors
                    });

                    const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=80';
                    const inWishlist = isBookInWishlist(book.id);

                    return (
                      <motion.div
                        key={book.id}
                        onClick={() => setSelectedBook(book)}
                        className="bg-white/70 backdrop-blur-sm border border-[#1a1a1a]/10 hover:border-[#1a1a1a]/25 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
                      >
                        {/* Cover Thumbnail wrapper */}
                        <div className="relative aspect-[3/4] bg-[#F8F4E9]/50 overflow-hidden flex items-center justify-center border-b border-[#1a1a1a]/5">
                          <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-all duration-300" />

                          {/* Wishlist Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleWishlist(e, book)}
                            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
                              inWishlist
                                ? 'bg-[#1a1a1a] border-[#1a1a1a] text-[#F8F4E9] shadow-sm'
                                : 'bg-white/80 border-[#1a1a1a]/10 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:border-[#1a1a1a]/40 shadow-sm'
                            }`}
                            title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                          >
                            <svg
                              className="w-4 h-4 fill-none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          </button>

                          {/* Save to List Bookmark Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDropdownToggle(e, book.id)}
                            className={`absolute top-3 right-12 p-2 rounded-full backdrop-blur-md border transition-all duration-300 z-10 ${
                              activeListDropdown === book.id
                                ? 'bg-[#1a1a1a] border-[#1a1a1a] text-[#F8F4E9] shadow-sm'
                                : 'bg-white/80 border-[#1a1a1a]/10 text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:border-[#1a1a1a]/40 shadow-sm'
                            }`}
                            title="Save to List"
                          >
                            <svg
                              className="w-4 h-4 fill-none"
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
                              className="absolute right-3 top-12 z-20 w-48 bg-white border border-[#1a1a1a]/15 rounded-xl py-2 shadow-xl text-left"
                            >
                              <div className="px-3 py-1 border-b border-[#1a1a1a]/10 mb-1 text-[9px] uppercase tracking-widest text-[#1a1a1a]/50 font-bold font-inter">
                                Save to List
                              </div>
                              {readingLists.length === 0 ? (
                                <div className="px-3 py-2 text-[10px] text-[#1a1a1a]/50 italic flex flex-col gap-1">
                                  <span>Create a list first</span>
                                  <span 
                                    onClick={() => router.push('/reading-lists')}
                                    className="text-[#1a1a1a] hover:underline font-semibold font-inter cursor-pointer"
                                  >
                                    Create List →
                                  </span>
                                </div>
                              ) : (
                                <div className="max-h-36 overflow-y-auto">
                                  {readingLists.map((list) => (
                                    <button
                                      key={list.id}
                                      type="button"
                                      onClick={(e) => handleSaveToReadingList(e, list.id, book)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-[#1a1a1a]/5 text-xs text-[#1a1a1a]/80 hover:text-[#1a1a1a] transition-colors font-inter truncate"
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
                            <div className="absolute inset-0 bg-white/95 z-15 flex items-center justify-center">
                              <span className="font-playfair text-[#1a1a1a] italic text-sm font-semibold animate-pulse">
                                ✨ {savedStatus[book.id]}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details Box */}
                        <div className="p-4 flex-grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-start gap-2 flex-wrap mb-1 justify-between">
                              <h4 className="font-playfair font-bold text-[#1a1a1a] text-sm leading-snug line-clamp-2 inline">
                                {title}
                              </h4>
                              {book.gutenbergId && (
                                <span className="bg-[#F8F4E9]/90 border border-[#1a1a1a]/15 text-[#1a1a1a] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest font-inter inline-block select-none shrink-0 shadow-sm">
                                  Read Free
                                </span>
                              )}
                            </div>
                            <p className="font-inter text-[11px] text-[#1a1a1a]/60 mt-1 line-clamp-1">
                              by{' '}
                              {authors.map((authorName, index) => (
                                <React.Fragment key={authorName}>
                                  {index > 0 && ', '}
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/authors?name=${encodeURIComponent(authorName)}`);
                                    }}
                                    className="cursor-pointer hover:text-[#1a1a1a] transition-colors duration-200 underline underline-offset-2 font-medium"
                                  >
                                    {authorName}
                                  </span>
                                </React.Fragment>
                              ))}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 space-y-2">
                            {book.gutenbergId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/read/${book.gutenbergId}`);
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-xs font-semibold font-inter transition-all duration-200 w-full active:scale-[0.98]"
                              >
                                📖 Read Now
                              </button>
                            )}
                            <a
                              href={`https://play.google.com/store/search?q=${encodeURIComponent(book.volumeInfo.title + ' ' + (book.volumeInfo.authors?.[0] || ''))}&c=books`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a]/80 text-xs font-semibold font-inter transition-all duration-200 w-full text-center"
                            >
                              Buy Ebook
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/chat/simple?book=${encodeURIComponent(book.volumeInfo.title)}&author=${encodeURIComponent(book.volumeInfo.authors?.[0] || 'Unknown')}`);
                              }}
                              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a]/85 text-xs font-semibold font-inter transition-all duration-200 w-full active:scale-[0.98]"
                            >
                              💬 Discuss with Companion
                            </button>
                          </div>

                          {/* Categories footer */}
                          <div className="mt-3 pt-2 border-t border-[#1a1a1a]/10 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-[#1a1a1a]/60">
                            <span>{info.categories?.[0] || 'Literature'}</span>
                            <span className="text-[10px] opacity-40">→</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
              
              {/* Pagination Controls */}
              {(hasMore || currentPage > 1) && (
                <div className="flex justify-center items-center gap-4 mt-12 pt-6 border-t border-[#1a1a1a]/10 w-full">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={async () => {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      await fetchBooks(activeGenre, searchQuery, newPage);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider font-inter transition-all duration-200 border border-[#1a1a1a]/15 ${
                      currentPage === 1
                        ? 'text-[#1a1a1a]/25 border-[#1a1a1a]/5 cursor-not-allowed'
                        : 'text-[#1a1a1a]/85 bg-white/60 hover:bg-[#1a1a1a]/5'
                    }`}
                  >
                    ← Previous Page
                  </button>
                  <span className="text-xs font-bold font-inter text-[#1a1a1a]/60">
                    Page <span className="text-[#1a1a1a]">{currentPage}</span>
                  </span>
                  <button
                    type="button"
                    disabled={!hasMore}
                    onClick={async () => {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      await fetchBooks(activeGenre, searchQuery, newPage);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider font-inter transition-all duration-200 border border-[#1a1a1a]/15 ${
                      !hasMore
                        ? 'text-[#1a1a1a]/25 border-[#1a1a1a]/5 cursor-not-allowed'
                        : 'text-[#1a1a1a]/85 bg-white/60 hover:bg-[#1a1a1a]/5'
                    }`}
                  >
                    Next Page →
                  </button>
                </div>
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
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#F8F4E9] max-w-2xl w-full p-6 sm:p-8 rounded-2xl border border-[#1a1a1a]/15 shadow-2xl relative overflow-y-auto max-h-[85vh] text-[#1a1a1a]"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  className="absolute top-4 right-4 text-[#1a1a1a] hover:opacity-75 transition-colors text-lg font-bold"
                >
                  ✕
                </button>

                {/* Flex container */}
                <div className="flex flex-col md:flex-row gap-6 mt-2">
                  {/* Book cover left */}
                  <div className="w-32 h-44 mx-auto md:mx-0 md:w-1/3 md:h-auto md:aspect-[3/4] bg-white border border-[#1a1a1a]/15 rounded-xl overflow-hidden shadow-md flex-shrink-0">
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
                        <span className="text-[9px] uppercase tracking-widest text-[#1a1a1a]/60 font-bold font-inter block">
                          {selectedBook.volumeInfo.categories?.[0] || 'Curated Volume'}
                        </span>
                        {selectedBook.gutenbergId && (
                          <span className="bg-white/80 border border-[#1a1a1a]/15 text-[#1a1a1a] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest font-inter shadow-sm">
                            Read Free
                          </span>
                        )}
                      </div>
                      <h2 className="font-playfair text-2xl font-bold text-[#1a1a1a] leading-tight">
                        {selectedBook.volumeInfo.title}
                      </h2>
                      <p className="font-inter text-xs font-semibold text-[#1a1a1a]/60 mt-1">
                        by{' '}
                        {(selectedBook.volumeInfo.authors || ['Unknown Author']).map((authorName, index) => (
                          <React.Fragment key={authorName}>
                            {index > 0 && ', '}
                            <span
                              onClick={() => {
                                setSelectedBook(null);
                                router.push(`/authors?name=${encodeURIComponent(authorName)}`);
                              }}
                              className="cursor-pointer hover:text-[#1a1a1a] transition-colors duration-200 underline underline-offset-2"
                            >
                              {authorName}
                            </span>
                          </React.Fragment>
                        ))}
                      </p>

                      <div className="flex gap-2.5 mt-3 flex-wrap">
                        <span className="bg-white/85 border border-[#1a1a1a]/10 rounded px-2.5 py-0.5 text-[9px] font-bold text-[#1a1a1a] uppercase tracking-widest font-inter shadow-sm">
                          {synthesizeEra(selectedBook.volumeInfo.publishedDate)}
                        </span>
                        <span className="bg-white/85 border border-[#1a1a1a]/10 rounded px-2.5 py-0.5 text-[9px] font-bold text-[#1a1a1a] uppercase tracking-widest font-inter shadow-sm">
                          {selectedBook.volumeInfo.categories?.[0] || 'Literature'}
                        </span>
                        {selectedBook.volumeInfo.publishedDate && (
                          <span className="bg-white/85 border border-[#1a1a1a]/10 rounded px-2.5 py-0.5 text-[9px] font-bold text-[#1a1a1a]/60 font-inter shadow-sm">
                            {selectedBook.volumeInfo.publishedDate.split('-')[0]}
                          </span>
                        )}
                      </div>

                      {/* Book description scrolling */}
                      <div className="mt-4 border-t border-[#1a1a1a]/10 pt-3 max-h-[160px] overflow-y-auto pr-2">
                        <p className="font-inter text-xs text-[#555555] leading-relaxed whitespace-pre-line">
                          {selectedBook.volumeInfo.description || 'No description available for this volume in the central archives.'}
                        </p>
                      </div>
                    </div>

                    {/* Actions buttons footer */}
                    <div className="mt-6 pt-4 border-t border-[#1a1a1a]/10 flex flex-col sm:flex-row gap-2.5 justify-end w-full">
                      {/* Discuss button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBook(null);
                          router.push(`/chat/simple?book=${encodeURIComponent(selectedBook.volumeInfo.title)}&author=${encodeURIComponent(selectedBook.volumeInfo.authors?.[0] || 'Unknown')}`);
                        }}
                        className="w-full sm:flex-1 py-3 rounded-xl border border-[#1a1a1a]/15 bg-white/60 hover:bg-[#1a1a1a]/5 text-[#1a1a1a] text-xs font-bold uppercase tracking-widest font-inter transition-all duration-200 flex items-center justify-center gap-1.5"
                      >
                        💬 Discuss with Companion
                      </button>

                      {/* Read Now button (if gutenbergId exists) */}
                      {selectedBook.gutenbergId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBook(null);
                            router.push(`/read/${selectedBook.gutenbergId}`);
                          }}
                          className="w-full sm:flex-1 py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] rounded-xl text-center text-xs font-bold uppercase tracking-widest font-inter transition-all flex items-center justify-center gap-1.5"
                        >
                          📖 Read Now
                        </button>
                      )}

                      {/* Buy Link Button */}
                      <a
                        href={selectedBook.volumeInfo.infoLink || `https://books.google.com/books?id=${selectedBook.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-3 bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 rounded-xl text-center text-xs font-bold uppercase tracking-widest font-inter text-[#1a1a1a]/85 transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Acquire Volume
                      </a>

                      {/* Buy Ebook Button */}
                      <a
                        href={`https://play.google.com/store/search?q=${encodeURIComponent(selectedBook.volumeInfo.title + ' ' + (selectedBook.volumeInfo.authors?.[0] || ''))}&c=books`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:flex-1 py-3 bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a]/85 rounded-xl text-center text-xs font-bold uppercase tracking-widest font-inter transition-all flex items-center justify-center gap-1.5"
                      >
                        Buy Ebook
                      </a>

                      {/* Wishlist Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(e, selectedBook)}
                        className={`w-full sm:flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest font-inter transition-all flex items-center justify-center gap-1.5 ${
                          isBookInWishlist(selectedBook.id)
                            ? 'bg-[#1a1a1a] border-[#1a1a1a] text-[#F8F4E9]'
                            : 'bg-white/60 border-[#1a1a1a]/15 text-[#1a1a1a] hover:bg-[#1a1a1a]/5 hover:text-[#1a1a1a]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    </>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#1a1a1a] opacity-25" />
            <div className="w-8 h-8 rounded-full border-t-2 border-[#1a1a1a] animate-spin" />
          </div>
          <span className="font-playfair text-base text-[#1a1a1a] font-medium italic">Opening archive vaults…</span>
        </div>
      </div>
    }>
      <LibraryPageContent />
    </Suspense>
  );
}
