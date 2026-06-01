'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

interface RecentTranslation {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translation: string;
  translatorsNote: string;
  preserveStyle: boolean;
}

const sourceLanguages = [
  'Auto Detect',
  'English',
  'French',
  'Spanish',
  'German',
  'Italian',
  'Russian',
  'Arabic',
  'Urdu',
  'Hindi',
  'Japanese',
  'Chinese',
  'Portuguese',
];

const targetLanguages = [
  'English',
  'French',
  'Spanish',
  'German',
  'Italian',
  'Russian',
  'Arabic',
  'Urdu',
  'Hindi',
  'Japanese',
  'Chinese',
  'Portuguese',
];

export default function TranslationChamberPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [sourceText, setSourceText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('Auto Detect');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [preserveStyle, setPreserveStyle] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [translationResult, setTranslationResult] = useState<{
    translation: string;
    translatorsNote: string;
  } | null>(null);

  // States for interactive features
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<RecentTranslation[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  const handleSourceTextInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) return;

    setTranslating(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/translation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage,
          targetLanguage,
          preserveStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setTranslationResult({
        translation: data.translation,
        translatorsNote: data.translatorsNote,
      });

      // Update source language dropdown to detected language if Auto Detect is active and matches options exactly
      if (data.detectedLanguage && sourceLanguage === 'Auto Detect') {
        const cleanedDetected = data.detectedLanguage.trim();
        const exactMatch = sourceLanguages.find(
          (lang) => lang === cleanedDetected
        );
        if (exactMatch && exactMatch !== 'Auto Detect') {
          setSourceLanguage(exactMatch);
        }
      }

      // Add to session history
      const newHistoryItem: RecentTranslation = {
        sourceLanguage,
        targetLanguage,
        sourceText,
        translation: data.translation,
        translatorsNote: data.translatorsNote,
        preserveStyle,
      };

      setRecentTranslations((prev) => {
        const updated = [newHistoryItem, ...prev];
        return updated.slice(0, 5);
      });
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'The alchemical translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (!translationResult) return;
    navigator.clipboard.writeText(translationResult.translation);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSaveToAnthology = async () => {
    if (!user || !translationResult) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const anthologyItem = {
        id: `anth_${Math.random().toString(36).substring(2, 9)}`,
        mode: 'translation',
        prompt: sourceText,
        response: translationResult.translation,
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

  const handleDownloadShareCard = async (content: string) => {
    const words = content.split(' ');
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
        <div style="color: #c9a84c; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft Translation ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 14px; line-height: 1.7; font-style: italic; color: #f5f0e8; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-translation-${i + 1}.png` : 'versecraft-translation.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const handleLoadHistory = (item: RecentTranslation) => {
    setSourceText(item.sourceText);
    setSourceLanguage(item.sourceLanguage);
    setTargetLanguage(item.targetLanguage);
    setPreserveStyle(item.preserveStyle);
    setTranslationResult({
      translation: item.translation,
      translatorsNote: item.translatorsNote,
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`;
      }
    }, 50);
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Crossing borders...</span>
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
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dashboard Back Link */}
        <div className="mb-4 text-left">
          <Link
            href="/dashboard"
            className="text-xs text-[#1a1a1a] hover:opacity-75 transition-all inline-flex items-center gap-1 font-inter font-semibold transition-colors duration-1000"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Main Headers */}
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a] tracking-wide transition-colors duration-1000">
            The Translation Chamber
          </h1>
          <p className="font-playfair italic text-[#6b6b6b] text-sm mt-3 transition-colors duration-1000">
            Where words cross borders without losing their soul
          </p>
        </div>

        {/* Main Grid Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">
          
          {/* Left Column: Input Panel */}
          <div className="bg-white/40 backdrop-blur-md border border-[#1a1a1a]/10 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-[#1a1a1a] transition-all duration-500">
            <form onSubmit={handleTranslate} className="space-y-6">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/85 mb-2 font-inter">
                  Original Text
                </label>
                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={handleSourceTextInput}
                  placeholder="Paste a poem, a passage, or a letter to carry across languages..."
                  style={{ minHeight: '200px' }}
                  className="w-full px-4 py-3 rounded-xl outline-none bg-white border border-[#1a1a1a]/15 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/30 resize-none leading-relaxed transition-all focus:border-[#1a1a1a]"
                />
              </div>

              {/* Language dropdowns side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/80 mb-1.5 font-inter">
                    Source Language
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none bg-white border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-semibold focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    {sourceLanguages.map((lang) => (
                      <option key={lang} value={lang} className="text-[#1a1a1a] bg-white">
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold tracking-wider text-[#1a1a1a]/80 mb-1.5 font-inter">
                    Target Language
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none bg-white border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-semibold focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    {targetLanguages.map((lang) => (
                      <option key={lang} value={lang} className="text-[#1a1a1a] bg-white">
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preserve Style Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1a1a1a] font-inter block">Preserve Literary Style</span>
                  <span className="text-[10px] text-[#6b6b6b] font-inter">
                    Preserve style, rhythm, and tone over simple translation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreserveStyle(!preserveStyle)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    preserveStyle ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#F8F4E9] shadow ring-0 transition duration-200 ease-in-out ${
                      preserveStyle ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={translating || !sourceText.trim()}
                  className={`w-full py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-black/5 flex items-center justify-center gap-2 ${
                    translating || !sourceText.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {translating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#F8F4E9] border-t-transparent animate-spin" />
                      Translating...
                    </>
                  ) : (
                    'Translate'
                  )}
                </button>
              </div>
            </form>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Right Column: Output / Welcome Panel */}
          <div className="bg-white/40 backdrop-blur-md border border-[#1a1a1a]/10 rounded-2xl p-6 sm:p-8 shadow-sm min-h-[460px] flex flex-col justify-between text-[#1a1a1a] transition-all duration-500">
            <AnimatePresence mode="wait">
              {!translationResult ? (
                /* Welcome / Empty State */
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center text-center my-auto py-12 space-y-6"
                >
                  <span className="text-3xl text-[#1a1a1a] animate-pulse">✨</span>
                  <div className="space-y-4 max-w-md">
                    <h3 className="font-playfair text-lg text-[#1a1a1a] font-bold">Welcome to the Translation Chamber</h3>
                    <p className="font-playfair italic text-sm text-[#1a1a1a]/80 leading-relaxed">
                      &quot;Welcome to the Translation Chamber. Paste any text on the left — a poem, a passage, a letter — and I will carry it across languages while telling you what survives the crossing and what is inevitably transformed. Every translation is an interpretation. Let us begin.&quot;
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* Output State */
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6 flex-grow flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    {/* Translation segment */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/85 mb-2 font-inter">
                        Translation
                      </label>
                      <div className="p-5 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 rounded-xl shadow-inner text-[#1a1a1a]">
                        <p className="font-playfair italic text-sm leading-relaxed text-[#1a1a1a]/90 whitespace-pre-wrap">
                          {translationResult.translation}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[#1a1a1a]/10 my-2" />

                    {/* Translator notes segment */}
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/85 mb-2 font-inter">
                        Translator&apos;s Note
                      </label>
                      <div className="p-4 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 rounded-xl text-[#1a1a1a]">
                        <p className="font-inter text-xs text-[#6b6b6b] leading-relaxed whitespace-pre-wrap">
                          {translationResult.translatorsNote}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Options toolbar */}
                  <div className="mt-6 pt-4 border-t border-[#1a1a1a]/10 flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyTranslation}
                        className="px-4 py-2 bg-white/60 hover:bg-white/90 border border-[#1a1a1a]/15 text-[#1a1a1a] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {copyFeedback ? '✨ Copied!' : '📋 Copy Translation'}
                      </button>
                      <button
                        onClick={handleSaveToAnthology}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] border-none rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter transition-all flex items-center gap-1.5 shadow-sm shadow-black/5"
                      >
                        {saveSuccess ? '✅ Saved!' : '📜 Save to Anthology'}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDownloadShareCard(translationResult.translation)}
                      className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all flex items-center gap-1 shadow-md shadow-black/5"
                    >
                      🎨 Download Card
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

        {/* Session History Segment */}
        {recentTranslations.length > 0 && (
          <div className="mt-12 bg-white/40 backdrop-blur-md border border-[#1a1a1a]/10 rounded-2xl p-6 sm:p-8 shadow-sm text-[#1a1a1a] transition-all duration-500">
            <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2.5 mb-6">
              Recent Translations
            </h3>
            <div className="space-y-4">
              {recentTranslations.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/50 border border-[#1a1a1a]/10 rounded-xl hover:border-[#1a1a1a]/30 transition-all gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] font-inter bg-[#1a1a1a]/10 px-2 py-0.5 rounded-full">
                        {item.sourceLanguage} → {item.targetLanguage}
                      </span>
                      {item.preserveStyle && (
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#6b6b6b]/60 font-inter">
                          Style Preserved
                        </span>
                      )}
                    </div>
                    <p className="font-playfair italic text-xs text-[#1a1a1a]/70 leading-relaxed line-clamp-1">
                      &quot;{item.sourceText.length > 60 ? `${item.sourceText.slice(0, 60)}...` : item.sourceText}&quot;
                    </p>
                  </div>
                  <button
                    onClick={() => handleLoadHistory(item)}
                    className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all shadow hover:opacity-90"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
