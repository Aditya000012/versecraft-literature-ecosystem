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
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
      {/* Dashboard Back Link */}
      <div className="text-left">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Heading Block */}
      <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 border-b border-white/5 pb-8">
        <div className="text-center sm:text-left space-y-2">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-gold tracking-wide">
            My Reading Lists
          </h1>
          <p className="font-playfair italic text-cream/70 text-sm sm:text-base">
            Curate your literary journey
          </p>
        </div>

        {/* Create list button */}
        {!loading && (
          <button
            onClick={() => setShowInput(!showInput)}
            className="px-6 py-2.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-gold/15 font-inter flex items-center gap-1.5"
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
            className="p-5 glass-card border-[#c9a84c]/20 rounded-2xl w-full max-w-md mx-auto space-y-4 shadow-xl"
          >
            <div>
              <label className="block text-[9px] uppercase font-bold tracking-widest text-gold mb-1.5 font-inter">
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
                className="w-full px-4 py-2.5 rounded-xl outline-none glass-input text-xs text-cream placeholder-cream/25 focus:border-gold/45 shadow"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="flex-grow py-2 border border-white/10 hover:bg-white/5 rounded-lg text-xs font-semibold font-inter text-cream transition-all text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={creating || !newListName.trim()}
                className="flex-grow py-2 bg-gold hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed text-navy text-xs font-bold uppercase tracking-wider rounded-lg font-inter transition-all text-center shadow"
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
        <div className="glass-card border-white/5 p-12 text-center rounded-2xl max-w-md mx-auto space-y-6">
          <span className="text-3xl block">⚠️</span>
          <p className="font-playfair text-lg text-gold italic">An error occurred</p>
          <p className="text-xs text-cream/40 leading-relaxed font-inter">{errorMsg}</p>
        </div>
      ) : lists.length === 0 ? (
        /* EMPTY PAGE STATE */
        <div className="py-24 text-center max-w-md mx-auto space-y-8">
          <p className="font-playfair text-2xl text-gold italic leading-relaxed">
            Your reading lists await.<br />Create your first list to begin curating your literary journey.
          </p>
          <button
            onClick={() => setShowInput(true)}
            className="px-8 py-3 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-gold/15 font-inter"
          >
            Create List Now
          </button>
        </div>
      ) : (
        /* LISTS FEED */
        <div className="space-y-8">
          {lists.map((list) => {
            const isExpanded = expanded[list.id];
            const bookCount = list.books ? list.books.length : 0;

            return (
              <motion.div
                key={list.id}
                layout="position"
                className="glass-card border-white/5 rounded-2xl shadow-xl overflow-hidden"
              >
                {/* List Header trigger */}
                <div
                  onClick={() => toggleExpand(list.id)}
                  className="p-5 sm:p-6 bg-white/5 border-b border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 select-none">
                    {/* Expand/Collapse Chevron */}
                    <span className={`text-[10px] text-gold transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                      ▶
                    </span>
                    <h3 className="font-playfair text-lg sm:text-xl font-bold text-cream">
                      {list.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 rounded-md text-[9px] font-bold uppercase tracking-wider font-inter">
                      {bookCount} {bookCount === 1 ? 'Book' : 'Books'}
                    </span>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={(e) => handleDeleteList(e, list.id)}
                    className="px-3 py-1 bg-red-950/20 hover:bg-red-600 border border-red-500/20 hover:border-transparent text-red-400 hover:text-cream text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all font-inter"
                  >
                    🗑️ Delete List
                  </button>
                </div>

                {/* Expanded books container */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-5 sm:p-6 bg-purple-dark/5"
                    >
                      {bookCount === 0 ? (
                        <p className="font-playfair italic text-xs text-gold/60 py-8 text-center select-none">
                          No books in this list yet. Add books from the Library or Recommendations.
                        </p>
                      ) : (
                        /* Horizontal scrollable cards */
                        <div className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-gold/20 scrollbar-track-transparent">
                          {list.books.map((book) => {
                            const authorStr = Array.isArray(book.authors) 
                              ? book.authors.join(', ') 
                              : (book.authors || 'Unknown Author');

                            return (
                              <div
                                key={book.bookId}
                                className="w-36 flex-shrink-0 flex flex-col justify-between glass-card border-white/5 p-3 rounded-xl hover:border-gold/25 transition-all relative group shadow"
                              >
                                <div>
                                  {/* Cover */}
                                  <div className="aspect-[3/4] bg-black/40 rounded-lg overflow-hidden relative shadow mb-3">
                                    <img
                                      src={book.thumbnail}
                                      alt={book.title}
                                      className="w-full h-full object-cover"
                                    />
                                    {/* Offscreen remove hover action */}
                                    <button
                                      onClick={(e) => handleRemoveBook(e, list.id, book.bookId)}
                                      className="absolute top-2 right-2 p-1.5 bg-red-950/80 hover:bg-red-600 text-red-400 hover:text-cream rounded-full border border-red-500/30 transition-all shadow opacity-0 group-hover:opacity-100 duration-200"
                                      title="Remove from list"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Info */}
                                  <h4 className="font-playfair font-bold text-cream text-[11px] leading-snug line-clamp-2" title={book.title}>
                                    {book.title}
                                  </h4>
                                  <p className="font-inter text-[9px] text-cream/40 mt-1 line-clamp-1 truncate" title={authorStr}>
                                    {authorStr}
                                  </p>
                                </div>

                                {/* Buy link / Actions */}
                                <div className="mt-4 pt-2 border-t border-white/5 flex justify-between items-center">
                                  <a
                                    href={book.infoLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-bold text-gold hover:text-gold-light uppercase tracking-wider font-inter hover:underline"
                                  >
                                    Acquire ↗
                                  </a>
                                  
                                  {/* Visible direct remove for touch screens */}
                                  <button
                                    onClick={(e) => handleRemoveBook(e, list.id, book.bookId)}
                                    className="text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider font-inter sm:hidden"
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
  );
}
