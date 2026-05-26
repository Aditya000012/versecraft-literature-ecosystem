'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface StoryTurn {
  role: 'user' | 'ai';
  content: string;
}

interface SavedStory {
  id: string;
  genre: string;
  tone: string;
  story: StoryTurn[];
  savedAt: string;
}

const genresList = [
  'Literary Fiction',
  'Gothic',
  'Romance',
  'Mystery',
  'Fantasy',
  'Horror',
  'Magical Realism',
  'Historical Fiction',
];

const tonesList = [
  'Melancholic',
  'Suspenseful',
  'Lyrical',
  'Dark',
  'Whimsical',
  'Intimate',
  'Epic',
  'Wistful',
];

export default function WriteWithMePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Screens: 'setup' | 'writing' | 'ended'
  const [screen, setScreen] = useState<'setup' | 'writing' | 'ended'>('setup');
  const [genre, setGenre] = useState('Literary Fiction');
  const [tone, setTone] = useState('Suspenseful');
  const [aiFirst, setAiFirst] = useState(true);

  const [story, setStory] = useState<StoryTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Story history stored in localStorage
  const [history, setHistory] = useState<SavedStory[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);

  // Load localStorage history on mount
  useEffect(() => {
    const stored = localStorage.getItem('writeWithMe_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing localStorage history:', e);
      }
    }
  }, []);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Scroll to bottom of story area
  useEffect(() => {
    if (screen === 'writing' && storyEndRef.current) {
      storyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [story, aiLoading, screen]);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleBeginStory = async () => {
    setScreen('writing');
    setStory([]);
    setUserInput('');
    setErrorMsg('');

    if (aiFirst) {
      setAiLoading(true);
      try {
        const response = await fetch('/api/write-with-me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userContribution: '',
            story: [],
            genre,
            tone,
            isFirstTurn: true,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'The muse stumbled');
        }

        setStory([{ role: 'ai', content: data.contribution }]);
      } catch (err) {
        console.error(err);
        setErrorMsg((err as Error).message || 'The muse stumbled starting the story. Let us try again.');
        setScreen('setup');
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || aiLoading) return;

    const userText = userInput.trim();
    const updatedStory: StoryTurn[] = [...story, { role: 'user', content: userText }];
    setStory(updatedStory);
    setUserInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setAiLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/write-with-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userContribution: userText,
          story: story, // send the history before the user's latest addition
          genre,
          tone,
          isFirstTurn: story.length === 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'The muse stumbled');
      }

      setStory([...updatedStory, { role: 'ai', content: data.contribution }]);
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'The alchemical co-writer lost connection. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEndSession = () => {
    if (story.length === 0) {
      setScreen('setup');
      return;
    }
    setScreen('ended');

    // Archive completed story in history (max 3 items)
    const newStory: SavedStory = {
      id: `story_${Math.random().toString(36).substring(2, 9)}`,
      genre,
      tone,
      story: story,
      savedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setHistory((prev) => {
      const updated = [newStory, ...prev.filter((item) => item.id !== newStory.id)].slice(0, 3);
      localStorage.setItem('writeWithMe_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveToAnthology = async () => {
    if (!user || story.length === 0) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const fullText = story.map((turn) => turn.content).join('\n\n');

      const anthologyItem = {
        id: `anth_${Math.random().toString(36).substring(2, 9)}`,
        mode: 'collaboration',
        prompt: `Collaboration story in ${genre} mode (${tone} tone)`,
        response: fullText,
        savedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        anthology: arrayUnion(anthologyItem),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving to anthology:', err);
    }
  };

  const handleDownloadCard = async () => {
    if (story.length === 0) return;
    const fullText = story.map((turn) => turn.content).join('\n\n');
    const words = fullText.split(' ');
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > 1500) {
        chunks.push(current.trim());
        current = word;
      } else {
        current += ' ' + word;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    for (let i = 0; i < chunks.length; i++) {
      const card = document.createElement('div');
      card.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 800px;
        padding: 48px;
        background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%);
        border: 1px solid rgba(201, 168, 76, 0.3);
        border-radius: 16px;
        font-family: Georgia, serif;
        color: #f5f0e8;
      `;
      card.innerHTML = `
        <div style="color: #c9a84c; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft Collaboration ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 14px; line-height: 1.7; font-style: italic; color: #f5f0e8; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-story-${i + 1}.png` : 'versecraft-story.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const handleLoadHistory = (item: SavedStory) => {
    setGenre(item.genre);
    setTone(item.tone);
    setStory(item.story);
    setScreen('writing');
    setUserInput('');
    setErrorMsg('');
  };

  const getWordCount = () => {
    const fullText = story.map((turn) => turn.content).join(' ');
    if (!fullText.trim()) return 0;
    return fullText.trim().split(/\s+/).length;
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-gold border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-gold font-medium italic">Attuning writing frequencies...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4 text-left">
        <Link
          href="/dashboard"
          className="text-xs text-gold hover:text-gold-light transition-colors inline-flex items-center gap-1 font-inter font-medium"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Heading block */}
      <div className="text-center mb-10">
        <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-gold tracking-wide">
          Write With Me
        </h1>
        <p className="font-playfair italic text-cream/70 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
          You write a line. I write the next. Together we make something neither of us could alone.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* SCREEN 1: Setup Screen */}
        {screen === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto space-y-8"
          >
            <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <h3 className="font-playfair text-xl font-bold text-gold border-b border-white/5 pb-2">
                Conceive the Foundation
              </h3>

              {/* Selection selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Genre Focus
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream"
                  >
                    {genresList.map((g) => (
                      <option key={g} value={g} className="bg-navy text-cream">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Tone Harmony
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl outline-none glass-input text-xs font-semibold text-cream"
                  >
                    {tonesList.map((t) => (
                      <option key={t} value={t} className="bg-navy text-cream">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle switch for first line */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-cream font-inter block">Let AI open the story</span>
                  <span className="text-[10px] text-cream/40 font-inter">
                    AI will compose an atmospheric, tense starting sentence to set the tone
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiFirst(!aiFirst)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    aiFirst ? 'bg-gold' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-navy shadow ring-0 transition duration-200 ease-in-out ${
                      aiFirst ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Start Trigger */}
              <div>
                <button
                  onClick={handleBeginStory}
                  className="w-full py-3 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-gold/15 flex items-center justify-center font-inter"
                >
                  Begin the Story
                </button>
              </div>
            </div>

            {/* Stories local history collapsible section */}
            {history.length > 0 && (
              <div className="glass-card border-white/5 rounded-xl overflow-hidden shadow">
                <button
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between text-left"
                >
                  <span className="text-xs uppercase font-bold tracking-wider text-gold font-inter">
                    📚 Previous Collaborations ({history.length})
                  </span>
                  <span className="text-xs text-cream/40">
                    {isHistoryCollapsed ? '▼ Expand' : '▲ Collapse'}
                  </span>
                </button>

                {!isHistoryCollapsed && (
                  <div className="p-4 sm:p-6 border-t border-white/5 space-y-4 bg-black/20">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:border-gold/15 transition-all gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-inter bg-gold/10 px-2 py-0.5 rounded-full">
                              {item.genre}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-cream/40 font-inter">
                              {item.tone} • {item.savedAt}
                            </span>
                          </div>
                          <p className="font-playfair italic text-xs text-cream/60 leading-relaxed line-clamp-1">
                            &quot;{item.story[0]?.content}&quot;
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadHistory(item)}
                          className="px-4 py-1.5 bg-gold hover:bg-gold-light text-navy text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all shadow font-semibold"
                        >
                          Continue
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* SCREEN 2: Story-writing Interface */}
        {screen === 'writing' && (
          <motion.div
            key="writing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            {/* Story Flow view */}
            <div className="glass-card border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl min-h-[300px] flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5 text-[9px] font-bold uppercase tracking-wider text-gold">
                  <span>Genre: {genre} • Tone: {tone}</span>
                  <span>Interactive Flow</span>
                </div>

                <div className="space-y-6 select-text mb-8">
                  {story.map((turn, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`leading-relaxed text-sm sm:text-base ${
                        turn.role === 'user'
                          ? 'font-inter text-[#f5f0e8]/90 text-left'
                          : 'font-playfair italic text-gold text-left'
                      }`}
                    >
                      {turn.content}
                    </motion.div>
                  ))}

                  {/* Loader for AI compose */}
                  {aiLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="font-playfair italic text-gold/60 text-sm animate-pulse text-left"
                    >
                      The muse is writing...
                    </motion.div>
                  )}
                  <div ref={storyEndRef} />
                </div>
              </div>

              {/* Live counts */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4 text-[10px] font-bold uppercase tracking-wider text-gold font-inter">
                <span>Story Word Count: {getWordCount()}</span>
                <button
                  onClick={handleEndSession}
                  className="text-red-400 hover:text-red-300 transition-colors uppercase font-bold"
                >
                  I&apos;m done writing
                </button>
              </div>
            </div>

            {/* Input Form area */}
            <div className="glass-card border-white/5 rounded-2xl p-6 shadow-2xl">
              <form onSubmit={handleAddPart} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-gold mb-2 font-inter">
                    Your Turn
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={handleTextareaInput}
                    placeholder="Write the next line, sentence, or paragraph..."
                    style={{ minHeight: '60px' }}
                    className="w-full px-4 py-3 rounded-xl outline-none glass-input text-sm text-cream placeholder-cream/25 resize-none leading-relaxed transition-all focus:border-gold/50"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={aiLoading || !userInput.trim()}
                    className={`px-6 py-2.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 ${
                      aiLoading || !userInput.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Add My Part
                  </button>
                </div>
              </form>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-center text-xs text-red-300">
                {errorMsg}
              </div>
            )}
          </motion.div>
        )}

        {/* SCREEN 3: End Screen */}
        {screen === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            {/* Story Prose container */}
            <div className="glass-card border-white/5 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6">
              <h2 className="font-playfair text-2xl font-bold text-gold text-center border-b border-white/5 pb-4">
                Synthesized Manuscript
              </h2>

              <div className="space-y-6 select-text py-4 max-h-[420px] overflow-y-auto pr-2 no-scrollbar">
                {story.map((turn, index) => (
                  <p
                    key={index}
                    className={`leading-relaxed text-sm sm:text-base text-left ${
                      turn.role === 'user'
                        ? 'font-inter text-[#f5f0e8]/90'
                        : 'font-playfair italic text-gold font-light'
                    }`}
                  >
                    {turn.content}
                  </p>
                ))}
              </div>

              {/* Manuscript metrics */}
              <div className="flex justify-between items-center border-t border-white/5 pt-4 text-[10px] font-bold uppercase tracking-wider text-gold font-inter">
                <span>Total Words: {getWordCount()}</span>
                <span>Collaboration complete</span>
              </div>
            </div>

            {/* Ending action controls */}
            <div className="glass-card border-white/5 rounded-2xl p-6 shadow-2xl flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={handleSaveToAnthology}
                  className="px-5 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs uppercase font-bold tracking-wider font-inter text-gold transition-all hover:bg-white/10"
                >
                  {saveSuccess ? '✅ Saved!' : '📜 Save to Anthology'}
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="px-5 py-2.5 border border-white/10 rounded-xl text-xs uppercase font-bold tracking-wider font-inter text-cream transition-all hover:bg-white/5"
                >
                  🎨 Download as Card
                </button>
              </div>

              <button
                onClick={() => setScreen('setup')}
                className="px-5 py-2.5 bg-gold hover:bg-gold-light text-navy text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all shadow shadow-gold/15"
              >
                Start New Story
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
