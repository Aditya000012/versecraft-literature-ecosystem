'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  orderBy, 
  query 
} from 'firebase/firestore';
import Link from 'next/link';

// Dynamic premium fonts stylesheet injection
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';

interface Ebook {
  name: string;
  size: number;
  base64: string;
  addedAt: string;
  cover: string | null;
}

interface ReadingSession {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  lastScrollPosition: number;
  totalHeight?: number;
  completed?: boolean;
  lastReadAt: unknown;
}

interface ListBook {
  bookId: string;
  title: string;
  authors: string | string[];
  thumbnail: string;
  infoLink?: string;
  gutenbergId?: string | number;
}

interface ReadingList {
  id: string;
  name: string;
  books: ListBook[];
  createdAt: string;
}

const getProgressPercentage = (session: ReadingSession) => {
  if (session.completed) return 100;
  if (session.totalHeight && session.totalHeight > 0) {
    return Math.min(100, Math.round((session.lastScrollPosition / session.totalHeight) * 100));
  }
  return null;
};

const formatFirestoreDate = (field: unknown) => {
  if (!field) return 'Unknown date';
  
  if (
    field && 
    typeof field === 'object' && 
    'toDate' in field && 
    typeof (field as { toDate: unknown }).toDate === 'function'
  ) {
    return (field as { toDate: () => Date }).toDate().toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  if (typeof field === 'string' || typeof field === 'number') {
    return new Date(field).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  if (field && typeof field === 'object' && 'seconds' in field) {
    return new Date((field as { seconds: number }).seconds * 1000).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  return new Date(field as string).toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getBookCover = (bookId: string | number): string => {
  // Use Gutenberg's own cover image URL — this always returns the correct cover
  return `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.cover.medium.jpg`;
};

const BookCover = ({ bookId, title, className }: { bookId: string; title: string; className?: string }) => {
  const coverUrl = getBookCover(bookId);

  return (
    <div className="relative w-full h-full bg-[#EAE4D6] flex items-center justify-center">
      <img
        src={coverUrl}
        alt={title}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement!.classList.add('cover-placeholder');
        }}
        className={`object-cover ${className}`}
      />
    </div>
  );
};

export default function ReaderHub() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Firestore reading sessions & reading lists
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Local epubs & upload
  const [localEbooks, setLocalEbooks] = useState<Ebook[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded state for reading list cards
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});

  // Auth monitoring & protection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Load Firestore data
  useEffect(() => {
    if (!user) return;

    const fetchFirestoreData = async () => {
      setLoadingSessions(true);
      setLoadingLists(true);
      try {
        // Fetch sessions ordered by lastReadAt descending
        const sessionsRef = collection(db, 'users', user.uid, 'readingSessions');
        const q = query(sessionsRef, orderBy('lastReadAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const sessions: ReadingSession[] = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          bookTitle: docSnap.data().bookTitle || 'Untitled Book',
          bookAuthor: docSnap.data().bookAuthor || 'Unknown Author',
          lastScrollPosition: docSnap.data().lastScrollPosition || 0,
          totalHeight: docSnap.data().totalHeight,
          completed: docSnap.data().completed,
          lastReadAt: docSnap.data().lastReadAt
        }));
        setReadingSessions(sessions);

        // Fetch user readingLists array
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const fetchedLists = userDocSnap.data().readingLists as ReadingList[] | undefined;
          setReadingLists(fetchedLists || []);
        }
      } catch (err) {
        console.error('Error fetching Firestore data:', err);
      } finally {
        setLoadingSessions(false);
        setLoadingLists(false);
      }
    };

    fetchFirestoreData();
  }, [user]);

  // Load local epubs
  const loadLocalEbooks = () => {
    const ebooks: Ebook[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('versecraft_ebook_')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            ebooks.push(JSON.parse(item));
          }
        } catch (err) {
          console.error('Error parsing local ebook:', err);
        }
      }
    }
    // Sort by addedAt descending
    ebooks.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    setLocalEbooks(ebooks);
  };

  useEffect(() => {
    loadLocalEbooks();
  }, []);

  // Handle EPUB file conversion & upload
  const handleUploadFile = (file: File) => {
    if (!file.name.endsWith('.epub')) {
      alert('Only .epub files are accepted in this local reader container.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        
        // Process in small chunks to avoid call stack limits on huge files
        const chunkSize = 0xffff;
        for (let i = 0; i < len; i += chunkSize) {
          const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        
        const base64 = btoa(binary);
        const ebookData: Ebook = {
          name: file.name,
          size: file.size,
          base64: base64,
          addedAt: new Date().toISOString(),
          cover: null
        };

        localStorage.setItem(`versecraft_ebook_${file.name}`, JSON.stringify(ebookData));
        loadLocalEbooks();
      } catch (err) {
        console.error('FileReader operation error:', err);
        alert('Failed to parse the EPUB file cleanly. Ensure it is not corrupted.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleReadEbook = (ebook: Ebook) => {
    sessionStorage.setItem('current_epub', ebook.base64);
    sessionStorage.setItem('current_epub_name', ebook.name);
    router.push('/read/epub-local');
  };

  const handleRemoveEbook = (filename: string) => {
    localStorage.removeItem(`versecraft_ebook_${filename}`);
    loadLocalEbooks();
  };

  const toggleListExpanded = (listId: string) => {
    setExpandedLists(prev => ({
      ...prev,
      [listId]: !prev[listId]
    }));
  };

  // Identify Currently Reading (most recent incomplete book)
  const currentlyReading = readingSessions.find(session => {
    const pct = getProgressPercentage(session);
    return pct === null || pct < 95;
  });

  // Skips the active book shown in Section 1
  const previouslyRead = readingSessions.filter(session => session.id !== currentlyReading?.id);

  if (authLoading || loadingSessions || loadingLists) {
    return (
      <div className="w-full min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-50">
        <link href={FONT_LINK} rel="stylesheet" />
        <div className="text-center space-y-6">
          <div className="relative w-16 h-16 flex items-center justify-center mx-auto">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border border-[#1a1a1a]"
            />
            <span className="text-xs text-[#1a1a1a]/60 select-none font-serif">✦</span>
          </div>
          <div className="space-y-1 text-center animate-pulse">
            <h3 className="font-playfair text-base italic text-[#1a1a1a] font-medium">
              Entering the reading room…
            </h3>
            <p className="text-[9px] text-[#6b6b6b]/80 font-inter tracking-wider uppercase">
              Preparing your shelves
            </p>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="min-h-screen relative z-10 py-28 px-4 sm:px-6 lg:px-8 selection:bg-[#1a1a1a] selection:text-[#F8F4E9]">
        <link href={FONT_LINK} rel="stylesheet" />
        
        {/* Dynamic Cover Placeholder Stylesheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          .cover-placeholder {
            background-color: #F0EBE0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .cover-placeholder::after {
            content: '📖' !important;
            font-size: 2rem !important;
          }
          .w-8.cover-placeholder::after {
            font-size: 0.8rem !important;
          }
        `}} />

        <div className="max-w-7xl mx-auto space-y-24">
          {/* Page Header */}
          <div className="text-center space-y-6 select-none max-w-2xl mx-auto">
            <h1 className="font-playfair text-5xl font-bold tracking-tight text-[#1a1a1a]">
              The Reading Room
            </h1>
            <p className="font-playfair text-base italic text-[#6b6b6b]">
              A quiet place for unfinished stories, forgotten pages, and books that wait for your return.
            </p>
            <div className="h-[1px] w-28 bg-[#1a1a1a]/15 mx-auto" />
          </div>

          {/* SECTION 1 — Currently Reading */}
          <section className="space-y-6 max-w-5xl mx-auto">
            <div className="border-b border-[#1a1a1a]/15 pb-2.5">
              <h2 className="font-playfair text-xl font-bold tracking-widest uppercase text-[#1a1a1a]">
                Currently Reading
              </h2>
            </div>

            {currentlyReading ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FAF7F0] border border-[#1a1a1a]/15 rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row hover:shadow-lg hover:border-[#1a1a1a]/30 transition-all duration-300"
              >
                {/* Cover wrapper */}
                <div className="w-full md:w-64 h-80 md:h-80 flex-shrink-0 relative shadow-md">
                  <BookCover 
                    bookId={currentlyReading.id} 
                    title={currentlyReading.bookTitle} 
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Details wrapper */}
                <div className="p-8 md:p-10 flex flex-col justify-between flex-grow space-y-4">
                  <div>
                    <h3 className="font-playfair text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-wide leading-tight">
                      {currentlyReading.bookTitle}
                    </h3>
                    <p className="font-inter text-sm font-medium text-[#6b6b6b] mt-2">
                      by {currentlyReading.bookAuthor}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/70">
                      <span>Reading Progress</span>
                      <span>
                        {getProgressPercentage(currentlyReading) !== null 
                          ? `${getProgressPercentage(currentlyReading)}%` 
                          : 'In Progress'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1a1a1a]/10 rounded-full overflow-hidden border border-[#1a1a1a]/5">
                      <div 
                        className="h-full bg-[#1a1a1a] rounded-full transition-all duration-500" 
                        style={{ 
                          width: getProgressPercentage(currentlyReading) !== null 
                            ? `${getProgressPercentage(currentlyReading)}%` 
                            : '15%' 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-[#1a1a1a]/10">
                    <div className="text-xs text-[#6b6b6b] font-inter italic">
                      Last opened: {formatFirestoreDate(currentlyReading.lastReadAt)}
                    </div>
                    <Link
                      href={`/read/${currentlyReading.id}`}
                      className="inline-flex items-center justify-center px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors select-none active:scale-95 shadow-sm"
                    >
                      Return to the Book →
                    </Link>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/60 border border-[#1a1a1a]/15 rounded-xl p-12 text-center shadow-sm space-y-6 max-w-2xl mx-auto"
              >
                <div className="text-4xl opacity-75">📖</div>
                <div className="space-y-2">
                  <h3 className="font-playfair text-2xl font-bold text-[#1a1a1a]">
                    Your story begins here
                  </h3>
                  <p className="font-inter text-sm text-[#6b6b6b]">
                    Open any free book from the Library to start reading
                  </p>
                </div>
                <Link
                  href="/library"
                  className="inline-block px-8 py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 shadow-sm"
                >
                  Explore the Library
                </Link>
              </motion.div>
            )}
          </section>

          {/* SECTION 2 — Your Shelves */}
          <section className="space-y-6">
            <div className="border-b border-[#1a1a1a]/15 pb-2.5">
              <h2 className="font-playfair text-xl font-bold tracking-widest uppercase text-[#1a1a1a]">
                Your Shelves
              </h2>
            </div>

            {previouslyRead.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {previouslyRead.map((session) => {
                  const pct = getProgressPercentage(session);
                  return (
                    <Link 
                      key={session.id} 
                      href={`/read/${session.id}`}
                      className="group bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-[#1a1a1a]/25 hover:shadow-md transition-all duration-300"
                    >
                      <div className="p-4 flex-grow flex flex-col space-y-4">
                        {/* Cover wrapper */}
                        <div className="w-full h-48 bg-[#EAE4D6] rounded border border-[#1a1a1a]/10 overflow-hidden relative shadow-md">
                          <BookCover 
                            bookId={session.id} 
                            title={session.bookTitle} 
                            className="w-full h-full object-cover" 
                          />
                        </div>

                        {/* Info wrapper */}
                        <div className="space-y-1.5">
                          <h3 className="font-playfair font-bold text-sm text-[#1a1a1a] line-clamp-2 leading-snug group-hover:underline">
                            {session.bookTitle}
                          </h3>
                          <p className="font-inter text-xs text-[#6b6b6b] truncate">
                            by {session.bookAuthor}
                          </p>
                        </div>
                      </div>

                      {/* Progress indicator bottom bar */}
                      <div className="border-t border-[#1a1a1a]/10 p-4 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/60">
                          <span>Progress</span>
                          <span>{pct !== null ? `${pct}%` : 'In Progress'}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1a1a1a]/10 rounded-full overflow-hidden border border-[#1a1a1a]/5">
                          <div 
                            className="h-full bg-[#1a1a1a] rounded-full" 
                            style={{ width: pct !== null ? `${pct}%` : '100%' }} 
                          />
                        </div>
                        <div className="text-[9px] text-[#6b6b6b] pt-1 text-right italic">
                          Last read: {formatFirestoreDate(session.lastReadAt)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              readingSessions.length === 1 && currentlyReading ? (
                <div className="text-center py-10 bg-white/40 border border-[#1a1a1a]/10 rounded-xl">
                  <p className="font-inter text-sm italic text-[#6b6b6b]">
                    You have only read one book so far. Keep exploring!
                  </p>
                </div>
              ) : null
            )}
          </section>

          {/* SECTION 3 — Collections */}
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-[#1a1a1a]/15 pb-2.5">
              <h2 className="font-playfair text-xl font-bold tracking-widest uppercase text-[#1a1a1a]">
                Collections
              </h2>
              <Link
                href="/reading-lists"
                className="px-4 py-1.5 border border-[#1a1a1a] bg-white/60 hover:bg-[#1a1a1a] hover:text-[#F8F4E9] text-[#1a1a1a] transition-all duration-300 text-xs font-bold uppercase tracking-widest rounded-lg font-inter active:scale-95"
              >
                + New List
              </Link>
            </div>

            {readingLists.length > 0 ? (
              <div className="space-y-4">
                {readingLists.map((list: ReadingList) => (
                  <div 
                    key={list.id} 
                    className="bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:border-[#1a1a1a]/20"
                  >
                    {/* Collapsed view header */}
                    <div 
                      onClick={() => toggleListExpanded(list.id)}
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-[#1a1a1a]/5 transition-colors"
                    >
                      <div className="flex items-center space-x-6">
                        <div>
                          <h3 className="font-playfair text-lg font-bold text-[#1a1a1a] tracking-tight">
                            {list.name}
                          </h3>
                          <p className="font-inter text-xs text-[#6b6b6b] mt-0.5">
                            {list.books?.length || 0} {list.books?.length === 1 ? 'book' : 'books'}
                          </p>
                        </div>

                        {/* Overlapping small cover stack */}
                        {list.books && list.books.length > 0 && (
                          <div className="flex -space-x-3.5 items-center pl-2 select-none">
                            {list.books.slice(0, 3).map((book: ListBook, idx: number) => {
                              const gId = book.gutenbergId || (parseInt(book.bookId) ? book.bookId : null);
                              const coverUrl = gId ? getBookCover(gId) : book.thumbnail;
                              
                              return (
                                <div 
                                  key={idx} 
                                  className="w-8 h-12 relative border border-[#1a1a1a]/10 rounded shadow-sm overflow-hidden bg-[#EAE4D6]"
                                  style={{ zIndex: 10 - idx }}
                                >
                                  <img 
                                    src={coverUrl} 
                                    alt={book.title} 
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.classList.add('cover-placeholder');
                                    }}
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button type="button" className="text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-transform duration-300">
                        <svg 
                          className={`w-5 h-5 transition-transform duration-300 ${expandedLists[list.id] ? 'rotate-180' : ''}`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded view content */}
                    <AnimatePresence>
                      {expandedLists[list.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-t border-[#1a1a1a]/10 bg-white/20"
                        >
                          <div className="p-6">
                            {list.books && list.books.length > 0 ? (
                              <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-black/10 select-text">
                                {list.books.map((book: ListBook, idx: number) => {
                                  const gutenbergId = book.gutenbergId || (parseInt(book.bookId) ? book.bookId : null);
                                  const coverUrl = gutenbergId ? getBookCover(gutenbergId) : book.thumbnail;

                                  return (
                                    <div 
                                      key={idx} 
                                      className="w-36 flex-shrink-0 bg-white border border-[#1a1a1a]/10 rounded-lg p-3 shadow-xs space-y-2 flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="w-full h-40 bg-[#EAE4D6] rounded border border-[#1a1a1a]/10 overflow-hidden mb-2 relative select-none">
                                          <img 
                                            src={coverUrl} 
                                            alt={book.title} 
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              e.currentTarget.parentElement!.classList.add('cover-placeholder');
                                            }}
                                            className="w-full h-full object-cover" 
                                          />
                                          {gutenbergId && (
                                            <span className="absolute top-1.5 right-1.5 bg-[#F8F4E9] border border-[#1a1a1a]/15 text-[#1a1a1a] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider z-10 shadow-sm">
                                              Read Free
                                            </span>
                                          )}
                                        </div>
                                        <h4 className="font-playfair font-bold text-xs text-[#1a1a1a] line-clamp-2 leading-snug">
                                          {book.title}
                                        </h4>
                                        <p className="font-inter text-[10px] text-[#6b6b6b] mt-0.5 truncate">
                                          {Array.isArray(book.authors) ? book.authors.join(', ') : book.authors || 'Unknown Author'}
                                        </p>
                                      </div>

                                      {gutenbergId && (
                                        <Link
                                          href={`/read/${gutenbergId}`}
                                          className="block w-full py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-[9px] font-bold rounded uppercase tracking-widest text-center transition-colors select-none active:scale-95"
                                        >
                                          Read
                                        </Link>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm italic text-[#6b6b6b] font-inter">
                                No volumes in this reading list. Open the Library to add books!
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#1a1a1a]/10 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto">
                <p className="font-inter text-sm text-[#6b6b6b]">
                  No reading lists yet. Create your first list to organise your reading journey.
                </p>
                <Link
                  href="/reading-lists"
                  className="inline-block px-6 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors shadow-sm"
                >
                  Create Reading List
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 4 — Personal Volumes */}
          <section className="space-y-6">
            <div className="border-b border-[#1a1a1a]/15 pb-1">
              <h2 className="font-playfair text-xl font-bold tracking-widest uppercase text-[#1a1a1a]">
                Personal Volumes
              </h2>
            </div>
            <p className="text-[10px] text-[#6b6b6b]/60 italic font-inter -mt-4 block">
              Upload EPUB books to add them to your private shelves. Uploaded ebooks are stored on this device only and are not synced across devices.
            </p>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border border-dashed rounded-xl p-12 sm:p-16 text-center cursor-pointer transition-all duration-300 bg-[#FAF7F0]/40 ${
                isDragging 
                  ? 'border-[#1a1a1a] bg-[#FAF7F0]/90 scale-[0.99] shadow-sm' 
                  : 'border-[#1a1a1a]/15 hover:border-[#1a1a1a]/30 hover:bg-[#FAF7F0]/70'
              }`}
            >
              <input 
                type="file" 
                accept=".epub"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-3 select-none">
                <div className="text-4xl text-[#1a1a1a]/45">📤</div>
                <p className="font-playfair text-base font-bold text-[#1a1a1a]/80">
                  Bring Your Own Volumes
                </p>
                <p className="font-inter text-xs text-[#6b6b6b]">
                  Drop an EPUB file here or click to add it to your personal shelves.
                </p>
                <p className="font-inter text-[9px] text-[#6b6b6b]/60 uppercase tracking-widest">
                  Accepts standard .epub files (Max 5MB browser storage capacity)
                </p>
              </div>
            </div>

            {/* Uploaded Ebooks Grid */}
            {localEbooks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                {localEbooks.map((ebook, idx) => {
                  const cleanedName = ebook.name.replace(/\.epub$/i, '').replace(/[-_]/g, ' ');
                  const firstLetter = cleanedName.trim().charAt(0).toUpperCase() || 'E';
                  const formattedSize = (ebook.size / (1024 * 1024)).toFixed(2) + ' MB';
                  const formattedDate = new Date(ebook.addedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div 
                      key={idx}
                      className="bg-[#FAF7F0] border border-[#1a1a1a]/10 rounded-xl shadow-xs overflow-hidden flex flex-col justify-between hover:-translate-y-1 hover:border-[#1a1a1a]/20 transition-all duration-300 hover:shadow-md"
                    >
                      <div className="p-4 flex-grow flex flex-col space-y-4">
                        {/* Parchment Placeholder Cover */}
                        <div className="w-full h-44 bg-[#EAE4D6] border border-[#1a1a1a]/10 rounded flex items-center justify-center select-none shadow-sm">
                          <span className="font-playfair font-bold text-4xl text-[#1a1a1a]/50">
                            {firstLetter}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 
                            className="font-playfair font-bold text-sm text-[#1a1a1a] line-clamp-2 leading-snug" 
                            title={cleanedName}
                          >
                            {cleanedName}
                          </h3>
                          <p className="font-inter text-[10px] text-[#6b6b6b] font-medium uppercase tracking-wider">
                            {formattedSize}
                          </p>
                          <p className="font-inter text-[9px] text-[#6b6b6b]">
                            Uploaded: {formattedDate}
                          </p>
                        </div>
                      </div>

                      {/* Bottom controls */}
                      <div className="grid grid-cols-2 border-t border-[#1a1a1a]/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleReadEbook(ebook)}
                          className="py-3 bg-[#1a1a1a] text-white hover:bg-[#2d2d2d] transition-colors text-xs font-bold uppercase tracking-widest text-center border-r border-[#1a1a1a]/10 font-inter select-none active:scale-95"
                        >
                          Read
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveEbook(ebook.name)}
                          className="py-3 bg-[#FAF7F0] hover:bg-red-50 hover:text-red-600 text-[#1a1a1a]/60 transition-colors text-xs font-bold uppercase tracking-widest text-center font-inter select-none active:scale-95"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center bg-[#F1ECE1]/20 border border-dashed border-[#1a1a1a]/10 rounded-xl select-none">
                <p className="font-inter text-sm italic text-[#6b6b6b]">
                  No personal volumes yet. A private shelf waits for your first book.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
