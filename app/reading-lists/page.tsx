'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Book {
  bookId: string;
  title: string;
  authors: string | string[];
  thumbnail: string;
  infoLink: string;
}

interface ReadingList {
  id: string;
  name: string;
  books: Book[];
  createdAt: string;
}

export default function ReadingListsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [showInput, setShowInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  // Expand states for list sections
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, authLoading, router]);

  // Fetch user reading lists
  const fetchReadingLists = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reading-lists?uid=${user.uid}`);
      if (!res.ok) throw new Error('Failed to load your lists.');
      const data = await res.json();
      setLists(data);

      // Expand all lists by default on first load
      const initialExpand: Record<string, boolean> = {};
      data.forEach((list: ReadingList) => {
        initialExpand[list.id] = true;
      });
      setExpanded(initialExpand);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'Central indexes could not be reached.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReadingLists();
  }, [user, fetchReadingLists]);

  // Create reading list
  const handleCreateList = async () => {
    if (!newListName.trim() || !user || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/reading-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          name: newListName.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create new list.');

      setNewListName('');
      setShowInput(false);
      await fetchReadingLists();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'An error occurred.');
    } finally {
      setCreating(false);
    }
  };

  // Delete reading list
  const handleDeleteList = async (e: React.MouseEvent, listId: string) => {
    e.stopPropagation(); // Avoid triggering header expand toggle
    if (!user) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this list? This will remove all saved volumes in it.');
    if (!confirmDelete) return;

    // Optimistic UI update
    setLists(lists.filter((l) => l.id !== listId));

    try {
      const res = await fetch('/api/reading-lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteList',
          uid: user.uid,
          listId,
        }),
      });

      if (!res.ok) throw new Error('Failed to delete list.');
    } catch (err) {
      console.error('Error deleting list:', err);
      fetchReadingLists();
    }
  };

  // Remove book from reading list
  const handleRemoveBook = async (e: React.MouseEvent, listId: string, bookId: string) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic UI update
    setLists(
      lists.map((list) => {
        if (list.id === listId) {
          return {
            ...list,
            books: list.books.filter((b) => b.bookId !== bookId),
          };
        }
        return list;
      })
    );

    try {
      const res = await fetch('/api/reading-lists', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeBook',
          uid: user.uid,
          listId,
          bookId,
        }),
      });

      if (!res.ok) throw new Error('Failed to remove book.');
    } catch (err) {
      console.error('Error removing book:', err);
      fetchReadingLists();
    }
  };

  // Toggle list expansion
  const toggleExpand = (listId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [listId]: !prev[listId],
    }));
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">
            Gathering reading lists...
          </span>
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

      {/* Connected-word background overlay */}
      <div className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden opacity-[0.03] text-[#1a1a1a]">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Paths connecting words */}
          <path d="M 150 150 L 350 250 L 200 450 L 400 600 Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <path d="M 1050 120 L 950 320 L 1100 480 L 850 650" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <path d="M 500 50 L 700 150 L 600 350" fill="none" stroke="currentColor" strokeWidth="0.8" />

          {/* Drifting literary words text nodes */}
          <text x="150" y="140" className="font-playfair italic text-xs tracking-widest font-bold fill-current">solitude</text>
          <text x="350" y="240" className="font-playfair italic text-xs tracking-widest font-bold fill-current">memory</text>
          <text x="200" y="440" className="font-playfair italic text-xs tracking-widest font-bold fill-current">wonder</text>
          <text x="400" y="590" className="font-playfair italic text-xs tracking-widest font-bold fill-current">silence</text>

          <text x="1050" y="110" className="font-playfair italic text-xs tracking-widest font-bold fill-current">myth</text>
          <text x="950" y="310" className="font-playfair italic text-xs tracking-widest font-bold fill-current">longing</text>
          <text x="1100" y="470" className="font-playfair italic text-xs tracking-widest font-bold fill-current">devotion</text>
          <text x="850" y="640" className="font-playfair italic text-xs tracking-widest font-bold fill-current">grief</text>

          <text x="500" y="40" className="font-playfair italic text-xs tracking-widest font-bold fill-current">echo</text>
          <text x="700" y="140" className="font-playfair italic text-xs tracking-widest font-bold fill-current">midnight</text>
        </svg>
      </div>

      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 text-[#1a1a1a]">
        {/* Dashboard Back Link */}
        <div className="text-left">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:underline transition-all inline-flex items-center gap-1 font-inter font-medium"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Heading Block */}
        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 border-b border-[#1a1a1a]/10 pb-8">
          <div className="text-center sm:text-left space-y-2">
            <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide">
              My Reading Lists
            </h1>
            <p className="font-playfair italic text-[#1a1a1a]/60 text-sm sm:text-base">
              Curate your literary journey
            </p>
          </div>

          {/* Create list button */}
          {!loading && (
            <button
              onClick={() => setShowInput(!showInput)}
              className="px-6 py-2.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs font-inter flex items-center gap-1.5"
            >
              📁 New List
            </button>
          )}
        </div>

        {/* Inline list creation form */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="py-4 border-b border-[#1a1a1a]/10 w-full max-w-md mx-auto space-y-4 bg-transparent"
            >
              <div>
                <label className="block text-[9px] uppercase font-bold tracking-widest text-[#1a1a1a]/60 mb-1.5 font-inter">
                  List Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Summer Poetry, Gothic Inspirations..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateList();
                  }}
                  className="w-full px-2 py-2.5 rounded-none outline-none border-b border-[#1a1a1a]/20 bg-transparent text-xs font-semibold text-[#1a1a1a] placeholder-[#1a1a1a]/30 focus:border-[#1a1a1a] transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInput(false)}
                  className="flex-grow py-2 border border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/5 rounded-lg text-xs font-semibold font-inter text-[#1a1a1a] transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateList}
                  disabled={creating || !newListName.trim()}
                  className="flex-grow py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg font-inter transition-all text-center shadow"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Lists Section */}
        {loading ? (
          <div className="py-24 text-center">
            <span className="font-playfair text-[#1a1a1a] italic text-sm animate-pulse block">
              Gathering your lists...
            </span>
          </div>
        ) : errorMsg ? (
          <div className="border border-[#1a1a1a]/10 bg-[#FAF7F0] p-12 text-center rounded-2xl max-w-md mx-auto space-y-6 text-[#1a1a1a]">
            <span className="text-3xl block">⚠️</span>
            <p className="font-playfair text-lg text-[#1a1a1a] italic">An error occurred</p>
            <p className="text-xs text-[#1a1a1a]/60 leading-relaxed font-inter">{errorMsg}</p>
          </div>
        ) : lists.length === 0 ? (
          /* EMPTY PAGE STATE */
          <div className="py-24 text-center max-w-md mx-auto space-y-8 bg-transparent">
            <p className="font-playfair text-2xl text-[#1a1a1a] italic leading-relaxed">
              Your reading lists await.<br />Create your first list to begin curating your literary journey.
            </p>
            <button
              onClick={() => setShowInput(true)}
              className="px-8 py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs font-inter"
            >
              Create List Now
            </button>
          </div>
        ) : (
          /* LISTS FEED */
          <div className="space-y-12">
            {lists.map((list) => {
              const isExpanded = expanded[list.id];
              const bookCount = list.books ? list.books.length : 0;

              return (
                <motion.div
                  key={list.id}
                  layout="position"
                  className="border-b border-[#1a1a1a]/10 pb-8 bg-transparent"
                >
                  {/* List Header trigger */}
                  <div
                    onClick={() => toggleExpand(list.id)}
                    className="flex justify-between items-center cursor-pointer py-4 bg-transparent select-none"
                  >
                    <div className="flex items-center gap-3">
                      {/* Expand/Collapse Chevron */}
                      <span className={`text-[9px] text-[#1a1a1a]/50 transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                        ▶
                      </span>
                      <h3 className="font-playfair text-lg sm:text-xl font-bold text-[#1a1a1a]">
                        {list.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-[#1a1a1a]/5 text-[#1a1a1a]/60 border border-[#1a1a1a]/15 rounded-md text-[9px] font-bold uppercase tracking-wider font-inter">
                        {bookCount} {bookCount === 1 ? 'Book' : 'Books'}
                      </span>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={(e) => handleDeleteList(e, list.id)}
                      className="text-red-600 hover:text-red-500 font-bold uppercase tracking-wider text-[10px] font-inter transition-colors"
                    >
                      Delete List
                    </button>
                  </div>

                  {/* Expanded books container */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-transparent mt-4"
                      >
                        {bookCount === 0 ? (
                          <p className="font-playfair italic text-xs text-[#1a1a1a]/50 py-8 text-center select-none">
                            No books in this list yet. Add books from the Library or Recommendations.
                          </p>
                        ) : (
                          /* Horizontal scrollable cards */
                          <div className="flex gap-5 overflow-x-auto pb-4 pt-1 no-scrollbar">
                            {list.books.map((book) => {
                              const authorStr = Array.isArray(book.authors) 
                                ? book.authors.join(', ') 
                                : (book.authors || 'Unknown Author');

                              return (
                                <div
                                  key={book.bookId}
                                  className="w-36 flex-shrink-0 flex flex-col justify-between transition-all relative group bg-transparent"
                                >
                                  <div>
                                    {/* Cover */}
                                    <div className="aspect-[3/4] bg-[#1a1a1a]/5 rounded-lg overflow-hidden relative mb-3">
                                      <img
                                        src={book.thumbnail}
                                        alt={book.title}
                                        className="w-full h-full object-cover"
                                      />
                                      {/* Offscreen remove hover action */}
                                      <button
                                        onClick={(e) => handleRemoveBook(e, list.id, book.bookId)}
                                        className="absolute top-2 right-2 p-1 bg-white/95 border border-[#1a1a1a]/10 text-red-600 hover:text-red-500 rounded-full transition-all shadow-xs opacity-0 group-hover:opacity-100 duration-200 text-xs font-bold w-6 h-6 flex items-center justify-center"
                                        title="Remove from list"
                                      >
                                        ✕
                                      </button>
                                    </div>

                                    {/* Info */}
                                    <h4 className="font-playfair font-bold text-[#1a1a1a] text-[11px] leading-snug line-clamp-2" title={book.title}>
                                      {book.title}
                                    </h4>
                                    <p className="font-inter text-[9px] text-[#1a1a1a]/50 mt-1 line-clamp-1 truncate" title={authorStr}>
                                      {authorStr}
                                    </p>
                                  </div>

                                  {/* Buy link / Actions */}
                                  <div className="mt-4 pt-2 border-t border-[#1a1a1a]/5 flex justify-between items-center">
                                    <a
                                      href={book.infoLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-bold text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:underline uppercase tracking-wider font-inter"
                                    >
                                      Acquire ↗
                                    </a>
                                    
                                    {/* Visible direct remove for touch screens */}
                                    <button
                                      onClick={(e) => handleRemoveBook(e, list.id, book.bookId)}
                                      className="text-[9px] font-bold text-red-600 hover:text-red-500 uppercase tracking-wider font-inter sm:hidden"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
