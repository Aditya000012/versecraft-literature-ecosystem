'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
  orderBy,
  query
} from 'firebase/firestore';
import html2canvas from 'html2canvas';

interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp?: Date | string | number | null;
}

const genres = [
  { id: 'romance', name: 'Romance' },
  { id: 'gothic', name: 'Gothic' },
  { id: 'horror', name: 'Horror' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'realism', name: 'Realism' },
  { id: 'sufi', name: 'Sufi' },
  { id: 'classical', name: 'Classical' },
  { id: 'science-fiction', name: 'Science Fiction' },
  { id: 'dystopian', name: 'Dystopian' },
  { id: 'magical-realism', name: 'Magical Realism' },
  { id: 'historical-fiction', name: 'Historical Fiction' },
  { id: 'psychological-thriller', name: 'Psychological Thriller' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'satire', name: 'Satire' },
  { id: 'tragedy', name: 'Tragedy' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'epic', name: 'Epic' },
  { id: 'noir', name: 'Noir' },
  { id: 'existential', name: 'Existential' },
  { id: 'supernatural', name: 'Supernatural' },
  { id: 'war-literature', name: 'War Literature' },
  { id: 'political-fiction', name: 'Political Fiction' },
  { id: 'philosophical-fiction', name: 'Philosophical Fiction' },
  { id: 'literary-fiction', name: 'Literary Fiction' },
];

const eras = [
  { id: 'ancient', name: 'Ancient (before 500 AD)' },
  { id: 'medieval', name: 'Medieval (500-1400)' },
  { id: 'renaissance', name: 'Renaissance (1400-1600)' },
  { id: 'baroque', name: 'Baroque (1600-1700)' },
  { id: 'enlightenment', name: 'Enlightenment (1700-1800)' },
  { id: 'romantic', name: 'Romantic Period (1800-1850)' },
  { id: 'victorian', name: 'Victorian (1850-1900)' },
  { id: 'edwardian', name: 'Edwardian (1900-1914)' },
  { id: 'modernist', name: 'Modernist (1914-1945)' },
  { id: 'mid-century', name: 'Mid-Century (1945-1970)' },
  { id: 'postmodern', name: 'Postmodern (1970-1990)' },
  { id: 'contemporary', name: 'Contemporary (1990-2010)' },
  { id: 'present-day', name: 'Present Day (2010 onwards)' },
];

const languages = [
  { id: 'english', name: 'English' },
  { id: 'urdu', name: 'Urdu (اردو)' },
  { id: 'hindi', name: 'Hindi (हिन्दी)' },
  { id: 'french', name: 'French (Français)' },
  { id: 'spanish', name: 'Spanish (Español)' },
];

const companionModes = [
  { id: 'poetry', name: 'Poetry Mode', icon: '✒️', desc: 'Create beautiful verses' },
  { id: 'duel', name: 'Verse Duel', icon: '⚔️', desc: 'Poetic combat' },
  { id: 'story', name: 'Story Seed', icon: '🌱', desc: 'Nurture narratives' },
  { id: 'analysis', name: 'Literary Analysis', icon: '📚', desc: 'Deep scholarly critique' },
  { id: 'judgement', name: 'Judgement Mode', icon: '⚖️', desc: 'Rigorous critique' },
];

interface SidebarChatSession {
  id: string;
  type: 'simple' | 'advanced';
  mode: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  messages: { role: string; content: string; timestamp?: Date | string | number | null }[];
}

interface LocalChatSidebarProps {
  currentChatId: string | null;
  chatType: 'simple' | 'advanced';
}

interface AtmosphereConfig {
  themeName: string;
  bgStyle: React.CSSProperties;
  panelBg: string;
  panelText: string;
  chatText: string;
  bubbleModelStyle: React.CSSProperties;
  bubbleUserStyle: React.CSSProperties;
  inputBarStyle: React.CSSProperties;
  companionBubbleTextItalic: boolean;
  bgDecorations: React.ReactNode;
}

const getAtmosphereConfig = (genre: string, era: string): AtmosphereConfig => {
  const g = (genre || '').toLowerCase();
  const e = (era || '').toLowerCase();

  const isGothic = g.includes('gothic');
  const isSufi = g.includes('sufi');
  const isHorror = g.includes('horror');
  const isNoir = g.includes('noir');
  const isRomance = g.includes('romance');
  const isFantasy = g.includes('fantasy');
  const isSciFi = g.includes('science fiction') || g.includes('dystopian');
  const isMagicalRealism = g.includes('magical realism');
  const isHistory = g.includes('historical') || g.includes('realism') || g.includes('classical') || g.includes('epic') || g.includes('war') || e.includes('ancient') || e.includes('medieval');

  // Default: Classic Paper
  let themeName = 'classic-paper';
  let bgStyle: React.CSSProperties = {
    background: '#F8F4E9',
    color: '#1a1a1a',
  };
  let panelBg = '#F8F4E9';
  let panelText = '#1a1a1a';
  let chatText = '#1a1a1a';
  let bubbleModelStyle: React.CSSProperties = {
    background: '#ebdcb9',
    color: '#1a1a1a',
    border: '1px solid rgba(26, 26, 26, 0.15)',
    borderLeft: '4px solid rgba(26, 26, 26, 0.3)',
  };
  let bubbleUserStyle: React.CSSProperties = {
    background: '#1a1a1a',
    color: '#ffffff',
  };
  let inputBarStyle: React.CSSProperties = {
    background: '#F8F4E9',
    borderTop: '1px solid rgba(26, 26, 26, 0.15)',
  };
  let companionBubbleTextItalic = true;
  let bgDecorations: React.ReactNode = null;

  if (isGothic) {
    themeName = 'gothic-melancholy';
    bgStyle = {
      background: 'radial-gradient(circle at 80% 20%, #2a0b12 0%, #0d0408 60%, #050103 100%)',
      color: '#ebdcb9',
    };
    panelBg = 'rgba(13, 4, 8, 0.95)';
    panelText = '#ebdcb9';
    chatText = '#ebdcb9';
    bubbleModelStyle = {
      background: 'rgba(42, 11, 18, 0.45)',
      color: '#ebdcb9',
      border: '1px solid rgba(199, 168, 76, 0.25)',
      borderLeft: '4px solid #c7a84c',
      backdropFilter: 'blur(12px)',
    };
    bubbleUserStyle = {
      background: '#ebdcb9',
      color: '#0d0408',
      fontWeight: 500,
    };
    inputBarStyle = {
      background: '#0d0408',
      borderTop: '1px solid rgba(199, 168, 76, 0.2)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-15">
        {/* Gothic Cathedral Window outline */}
        <svg className="absolute right-10 top-1/4 w-[450px] h-[650px] text-[#c7a84c]" fill="none" viewBox="0 0 100 150" stroke="currentColor" strokeWidth="0.5">
          <path d="M50,10 C20,30 20,80 20,140 L80,140 C80,80 80,30 50,10 Z" />
          <path d="M50,10 L50,140" />
          <path d="M50,30 C35,45 35,80 35,140 M50,30 C65,45 65,80 65,140" />
          <circle cx="50" cy="50" r="15" />
          <path d="M50,35 A15,15 0 0,0 35,50 M50,35 A15,15 0 0,1 65,50" />
          <path d="M20,100 L80,100 M20,120 L80,120 M20,80 L80,80" />
        </svg>
        {/* Melancholic misty glow */}
        <div className="absolute left-1/4 top-1/3 w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>
    );
  } else if (isSufi) {
    themeName = 'sufi-cosmos';
    bgStyle = {
      background: 'radial-gradient(circle at 20% 80%, rgba(212, 175, 55, 0.12), rgba(15, 8, 30, 0.98)), #090412',
      color: '#f5f0e8',
    };
    panelBg = 'rgba(9, 4, 18, 0.95)';
    panelText = '#c7a84c';
    chatText = '#f5f0e8';
    bubbleModelStyle = {
      background: 'rgba(212, 175, 55, 0.08)',
      color: '#f5f0e8',
      border: '1px solid rgba(212, 175, 55, 0.3)',
      borderLeft: '4px solid #d4af37',
      backdropFilter: 'blur(10px)',
    };
    bubbleUserStyle = {
      background: '#d4af37',
      color: '#090412',
      fontWeight: 600,
    };
    inputBarStyle = {
      background: '#090412',
      borderTop: '1px solid rgba(212, 175, 55, 0.2)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
        {/* Concentric rotating orbits for cosmic Sufi vibe */}
        <motion.svg 
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="absolute left-10 bottom-10 w-[500px] h-[500px] text-[#d4af37]" 
          fill="none" 
          viewBox="0 0 200 200" 
          stroke="currentColor" 
          strokeWidth="0.3"
        >
          <circle cx="100" cy="100" r="80" strokeDasharray="2, 4" />
          <circle cx="100" cy="100" r="60" />
          <circle cx="100" cy="100" r="40" strokeDasharray="5, 5" />
          <circle cx="100" cy="100" r="20" />
          <line x1="20" y1="100" x2="180" y2="100" />
          <line x1="100" y1="20" x2="100" y2="180" />
          <polygon points="100,60 140,100 100,140 60,100" />
        </motion.svg>
        {/* Shimmering spiritual portals */}
        <div className="absolute right-1/4 top-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-[80px] animate-pulse" />
      </div>
    );
  } else if (isHorror) {
    themeName = 'horror-macabre';
    bgStyle = {
      background: 'linear-gradient(135deg, #09090b 0%, #1e0606 50%, #020202 100%)',
      color: '#ebdcb9',
    };
    panelBg = 'rgba(9, 9, 11, 0.95)';
    panelText = '#ff4444';
    chatText = '#ebdcb9';
    bubbleModelStyle = {
      background: 'rgba(30, 6, 6, 0.5)',
      color: '#ebdcb9',
      border: '1px solid rgba(255, 68, 68, 0.2)',
      borderLeft: '4px solid #ff4444',
      backdropFilter: 'blur(8px)',
    };
    bubbleUserStyle = {
      background: '#ff4444',
      color: '#09090b',
      fontWeight: 600,
    };
    inputBarStyle = {
      background: '#020202',
      borderTop: '1px solid rgba(255, 68, 68, 0.15)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
        {/* Creepy abstract splatter outlines */}
        <svg className="absolute left-1/3 top-1/4 w-[600px] h-[450px] text-[#ff4444]" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="0.4">
          <path d="M10,50 Q20,30 40,40 T70,30 T90,60 T60,80 T20,70 Z" />
          <path d="M45,45 Q50,20 60,35 T70,70 T40,65 Z" strokeDasharray="3, 3" />
          {/* Organic drip structures */}
          <line x1="20" y1="70" x2="20" y2="95" />
          <line x1="40" y1="65" x2="40" y2="85" />
          <line x1="60" y1="80" x2="60" y2="99" />
          <line x1="75" y1="68" x2="75" y2="88" />
        </svg>
        <div className="absolute right-10 top-10 w-[400px] h-[400px] rounded-full bg-red-950/20 blur-[100px]" />
      </div>
    );
  } else if (isNoir) {
    themeName = 'noir-detective';
    bgStyle = {
      background: 'linear-gradient(to bottom, #0f0f13, #15151b 50%, #09090b 100%)',
      color: '#f3f4f6',
    };
    panelBg = 'rgba(15, 15, 19, 0.95)';
    panelText = '#ffffff';
    chatText = '#f3f4f6';
    bubbleModelStyle = {
      background: 'rgba(255, 255, 255, 0.03)',
      color: '#f3f4f6',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderLeft: '4px solid #ffffff',
      backdropFilter: 'blur(10px)',
    };
    bubbleUserStyle = {
      background: '#ffffff',
      color: '#0f0f13',
      fontWeight: 500,
    };
    inputBarStyle = {
      background: '#09090b',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    };
    companionBubbleTextItalic = false;
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
        {/* Venetian Blinds shadow projection */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{
          background: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 255, 255, 0.03) 40px, rgba(255, 255, 255, 0.03) 80px)'
        }} />
        {/* Stark searchlight beam */}
        <svg className="absolute left-[-200px] bottom-[-200px] w-[800px] h-[800px] text-white/5" viewBox="0 0 100 100">
          <polygon points="0,100 100,0 80,0" fill="currentColor" />
        </svg>
      </div>
    );
  } else if (isRomance) {
    themeName = 'watercolor-romance';
    bgStyle = {
      background: 'radial-gradient(circle at 50% 50%, #fdf5f6 0%, #f7e2e4 60%, #eec4c9 100%)',
      color: '#1a1a1a',
    };
    panelBg = 'rgba(247, 226, 228, 0.95)';
    panelText = '#9d3246';
    chatText = '#1a1a1a';
    bubbleModelStyle = {
      background: 'rgba(255, 255, 255, 0.65)',
      color: '#1a1a1a',
      border: '1px solid rgba(157, 50, 70, 0.15)',
      borderLeft: '4px solid #9d3246',
      backdropFilter: 'blur(10px)',
    };
    bubbleUserStyle = {
      background: '#9d3246',
      color: '#ffffff',
      fontWeight: 500,
    };
    inputBarStyle = {
      background: '#f7e2e4',
      borderTop: '1px solid rgba(157, 50, 70, 0.15)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
        {/* Soft watercolor floral blobs */}
        <div className="absolute right-[-100px] top-1/4 w-[400px] h-[400px] rounded-full bg-pink-300/30 blur-[70px] animate-pulse" />
        <div className="absolute left-[-100px] bottom-1/4 w-[450px] h-[450px] rounded-full bg-rose-400/20 blur-[80px]" />
        {/* Fine heart/petal sketch lines */}
        <svg className="absolute right-12 bottom-12 w-[300px] h-[300px] text-[#9d3246]/20" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="0.5">
          <path d="M50,30 C50,30 35,10 20,25 C5,40 25,75 50,90 C75,75 95,40 80,25 C65,10 50,30 50,30 Z" />
          <path d="M50,40 C50,40 38,25 27,35 C16,45 30,70 50,82 C70,70 84,45 73,35 C62,25 50,40 50,40 Z" strokeDasharray="3, 3" />
        </svg>
      </div>
    );
  } else if (isFantasy) {
    themeName = 'emerald-fantasy';
    bgStyle = {
      background: 'radial-gradient(circle at 10% 10%, #0d281a 0%, #04090b 60%, #010204 100%)',
      color: '#dfebdd',
    };
    panelBg = 'rgba(13, 40, 26, 0.95)';
    panelText = '#82c97a';
    chatText = '#dfebdd';
    bubbleModelStyle = {
      background: 'rgba(13, 40, 26, 0.4)',
      color: '#dfebdd',
      border: '1px solid rgba(130, 201, 122, 0.25)',
      borderLeft: '4px solid #82c97a',
      backdropFilter: 'blur(12px)',
    };
    bubbleUserStyle = {
      background: '#82c97a',
      color: '#0d281a',
      fontWeight: 600,
    };
    inputBarStyle = {
      background: '#04090b',
      borderTop: '1px solid rgba(130, 201, 122, 0.2)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-15">
        {/* Constellations map outline */}
        <svg className="absolute left-10 top-1/4 w-[500px] h-[500px] text-[#82c97a]" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="0.3">
          <circle cx="20" cy="30" r="1.5" fill="currentColor" />
          <circle cx="50" cy="20" r="1" fill="currentColor" />
          <circle cx="80" cy="40" r="2" fill="currentColor" />
          <circle cx="35" cy="65" r="1.5" fill="currentColor" />
          <circle cx="65" cy="75" r="1" fill="currentColor" />
          <line x1="20" y1="30" x2="50" y2="20" />
          <line x1="50" y1="20" x2="80" y2="40" />
          <line x1="20" y1="30" x2="35" y2="65" />
          <line x1="35" y1="65" x2="65" y2="75" />
          <line x1="80" y1="40" x2="65" y2="75" />
          <circle cx="50" cy="50" r="15" strokeDasharray="2, 2" />
        </svg>
        <div className="absolute right-12 bottom-12 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[80px] animate-pulse" />
      </div>
    );
  } else if (isSciFi) {
    themeName = 'cyber-terminal';
    bgStyle = {
      background: '#030712',
      color: '#22d3ee',
    };
    panelBg = '#0b0f19';
    panelText = '#22d3ee';
    chatText = '#22d3ee';
    bubbleModelStyle = {
      background: 'rgba(11, 15, 25, 0.8)',
      color: '#e2f8fd',
      border: '1px solid rgba(34, 211, 238, 0.4)',
      borderLeft: '4px solid #22d3ee',
    };
    bubbleUserStyle = {
      background: '#22d3ee',
      color: '#030712',
      fontWeight: 700,
    };
    inputBarStyle = {
      background: '#030712',
      borderTop: '1px solid rgba(34, 211, 238, 0.3)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
        {/* Cyber perspective grid */}
        <svg className="absolute bottom-0 left-0 right-0 h-[300px] w-full text-[#22d3ee]/20" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" />
          <line x1="0" y1="65" x2="100" y2="65" stroke="currentColor" strokeWidth="0.2" />
          <line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" strokeWidth="0.3" />
          <line x1="0" y1="95" x2="100" y2="95" stroke="currentColor" strokeWidth="0.4" />
          <line x1="50" y1="30" x2="-50" y2="100" stroke="currentColor" strokeWidth="0.2" />
          <line x1="50" y1="30" x2="20" y2="100" stroke="currentColor" strokeWidth="0.2" />
          <line x1="50" y1="30" x2="50" y2="100" stroke="currentColor" strokeWidth="0.2" />
          <line x1="50" y1="30" x2="80" y2="100" stroke="currentColor" strokeWidth="0.2" />
          <line x1="50" y1="30" x2="150" y2="100" stroke="currentColor" strokeWidth="0.2" />
        </svg>
      </div>
    );
  } else if (isMagicalRealism) {
    themeName = 'surreal-dreamscape';
    bgStyle = {
      background: 'radial-gradient(circle at 75% 25%, #e6dcf5 0%, #d2ebe1 60%, #c4ebd9 100%)',
      color: '#2c2536',
    };
    panelBg = 'rgba(230, 220, 245, 0.95)';
    panelText = '#8561a7';
    chatText = '#2c2536';
    bubbleModelStyle = {
      background: 'rgba(255, 255, 255, 0.65)',
      color: '#2c2536',
      border: '1px solid rgba(133, 97, 167, 0.25)',
      borderLeft: '4px solid #8561a7',
      backdropFilter: 'blur(10px)',
    };
    bubbleUserStyle = {
      background: '#8561a7',
      color: '#ffffff',
      fontWeight: 500,
    };
    inputBarStyle = {
      background: '#d2ebe1',
      borderTop: '1px solid rgba(133, 97, 167, 0.2)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-25">
        <svg className="absolute right-[10%] top-[15%] w-[250px] h-[250px] text-[#8561a7]/30" fill="none" viewBox="0 0 100 100" stroke="currentColor" strokeWidth="0.5">
          <circle cx="50" cy="50" r="30" />
          <circle cx="50" cy="50" r="10" fill="currentColor" />
          <path d="M10,50 Q50,15 90,50 Q50,85 10,50 Z" />
        </svg>
        <div className="absolute left-[5%] bottom-[10%] w-[350px] h-[350px] rounded-full bg-purple-300/30 blur-[60px] animate-pulse" />
        <div className="absolute right-[5%] bottom-[20%] w-[300px] h-[300px] rounded-full bg-emerald-300/20 blur-[50px]" />
      </div>
    );
  } else if (isHistory) {
    themeName = 'aged-parchment';
    bgStyle = {
      background: 'radial-gradient(circle at 50% 50%, #f4edd8 0%, #e8dbc3 100%)',
      color: '#2e1e0f',
    };
    panelBg = 'rgba(232, 219, 195, 0.98)';
    panelText = '#80552d';
    chatText = '#2e1e0f';
    bubbleModelStyle = {
      background: 'rgba(255, 255, 255, 0.45)',
      color: '#2e1e0f',
      border: '1px solid rgba(128, 85, 45, 0.25)',
      borderLeft: '4px solid #80552d',
      backdropFilter: 'blur(6px)',
    };
    bubbleUserStyle = {
      background: '#80552d',
      color: '#ffffff',
      fontWeight: 500,
    };
    inputBarStyle = {
      background: '#e8dbc3',
      borderTop: '1px solid rgba(128, 85, 45, 0.25)',
    };
    bgDecorations = (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20">
        <svg className="absolute right-12 top-1/4 w-[380px] h-[380px] text-[#80552d]" fill="none" viewBox="0 0 120 120" stroke="currentColor" strokeWidth="0.4">
          <circle cx="60" cy="60" r="50" />
          <circle cx="60" cy="60" r="46" strokeDasharray="2, 2" />
          <circle cx="60" cy="60" r="25" />
          <circle cx="60" cy="60" r="5" fill="currentColor" />
          <line x1="60" y1="10" x2="60" y2="110" />
          <line x1="10" y1="60" x2="110" y2="60" />
          <polygon points="60,35 65,60 60,60" fill="currentColor" opacity="0.3" />
          <polygon points="60,85 55,60 60,60" fill="currentColor" opacity="0.3" />
          <polygon points="35,60 60,65 60,60" fill="currentColor" opacity="0.3" />
          <polygon points="85,60 60,55 60,60" fill="currentColor" opacity="0.3" />
        </svg>
      </div>
    );
  }

  return {
    themeName,
    bgStyle,
    panelBg,
    panelText,
    chatText,
    bubbleModelStyle,
    bubbleUserStyle,
    inputBarStyle,
    companionBubbleTextItalic,
    bgDecorations,
  };
};

function LocalChatSidebar({ currentChatId, chatType }: LocalChatSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidebarParam = searchParams.get('sidebar') === 'open';

  const [isHovered, setIsHovered] = useState(false);
  const [sessions, setSessions] = useState<SidebarChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sidebarParam) {
      setIsHovered(true);
    }
  }, [sidebarParam]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const chatsRef = collection(db, 'users', user.uid, 'chats');
          const q = query(chatsRef, orderBy('createdAt', 'desc'));
          const querySnap = await getDocs(q);
          const chatsList: SidebarChatSession[] = [];
          querySnap.forEach((docSnap) => {
            const data = docSnap.data();
            chatsList.push({
              id: docSnap.id,
              type: data.type || 'simple',
              mode: data.mode || 'poetry',
              createdAt: data.createdAt,
              messages: data.messages || [],
            });
          });
          setSessions(chatsList);
        } catch (err) {
          console.error('Error fetching sessions in sidebar:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setSessions([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'chats', sessionId);
      await deleteDoc(docRef);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const filteredSessions = sessions.filter(s => s.type === chatType);

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ width: isHovered ? 280 : 28 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 bottom-0 z-40 select-none overflow-hidden flex flex-col justify-between"
      style={{
        top: '80px',
        height: 'calc(100vh - 80px)',
        background: '#1a1a1a',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {!isHovered ? (
        <div 
          className="w-full h-full flex flex-col justify-center items-center cursor-pointer"
        >
          <span 
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: '#F8F4E9',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            HISTORY
          </span>
        </div>
      ) : (
        <div className="flex-grow flex flex-col min-w-[280px] p-5 overflow-hidden h-full">
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F8F4E9] font-playfair">
              Chat History
            </h3>
            <p className="font-inter text-[10px] text-[#F8F4E9]/60 mt-1 font-light">
              Your advanced sessions
            </p>
          </div>

          {/* Session List */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-2 no-scrollbar">
            {loading ? (
              <div className="py-8 flex justify-center items-center">
                <div className="w-4 h-4 border border-[#F8F4E9] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <p className="text-[11px] text-[#F8F4E9]/60 font-inter italic text-center py-6">
                No sessions recorded
              </p>
            ) : (
              filteredSessions.map((s) => {
                const isActive = s.id === currentChatId;
                const firstUserMsg = s.messages.find(m => m.role === 'user');
                const rawTitle = firstUserMsg?.content || `Session (${s.mode})`;
                const sessionTitle = rawTitle.length > 40 ? rawTitle.slice(0, 40) + '...' : rawTitle;
                
                let sessionDate: Date;
                if (s.createdAt) {
                  if ('seconds' in s.createdAt && typeof s.createdAt.seconds === 'number') {
                    sessionDate = new Date(s.createdAt.seconds * 1000);
                  } else if (typeof s.createdAt === 'string' || typeof s.createdAt === 'number' || s.createdAt instanceof Date) {
                    sessionDate = new Date(s.createdAt as string | number | Date);
                  } else {
                    sessionDate = new Date();
                  }
                } else {
                  sessionDate = new Date();
                }
                const formattedDate = sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                return (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/chat/${s.type}?session=${s.id}`)}
                    className={`group relative flex justify-between items-center p-3 rounded-lg border border-transparent transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-[rgba(255,255,255,0.08)] border-l-2 border-l-[#F8F4E9]' 
                        : 'hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                  >
                    <div className="flex-grow min-w-0 pr-6">
                      <h4 className="font-playfair text-xs text-[#F8F4E9] font-medium truncate">
                        {sessionTitle}
                      </h4>
                      <span className="font-inter text-[9px] text-[#F8F4E9]/60 block mt-1">
                        {formattedDate} • <span className="capitalize">{s.mode}</span>
                      </span>
                    </div>

                    {/* Delete row button */}
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      style={{ color: '#cc0000' }}
                      className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* New Chat Trigger */}
          <div className="pt-4 border-t border-[rgba(255,255,255,0.1)] flex-shrink-0">
            <button
              onClick={() => router.push(`/chat/${chatType}`)}
              className="w-full py-2.5 bg-[#F8F4E9] hover:bg-[#FAF6EC] rounded-lg text-[10px] uppercase font-bold tracking-wider font-inter text-[#1a1a1a] transition-all flex items-center justify-center gap-1.5"
            >
              <span>✦</span> New Chat
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AdvancedChatPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get('id');
  const sessionParam = searchParams.get('session') || '';

  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentMode, setCurrentMode] = useState('poetry');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Selection wizard state
  const [wizardActive, setWizardActive] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedEra, setSelectedEra] = useState('');
  const [authorStyle, setAuthorStyle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const atmConfig = getAtmosphereConfig(selectedGenre, selectedEra);

  // Protected route check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth?mode=login');
    }
  }, [user, loading, router]);

  // Load chat session if ID is provided
  useEffect(() => {
    if (!user) return;

    const loadSession = async () => {
      const targetChatId = sessionParam || urlChatId;
      if (targetChatId) {
        try {
          const docRef = doc(db, 'users', user.uid, 'chats', targetChatId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setChatId(targetChatId);
            setCurrentMode(data.mode || 'poetry');
            setMessages(data.messages || []);
            
            if (data.filters) {
              setSelectedGenre(data.filters.genre || '');
              setSelectedEra(data.filters.era || '');
              setAuthorStyle(data.filters.authorStyle || '');
              setSelectedLanguage(data.filters.language || 'english');
            }
            setWizardActive(false);
            return;
          }
        } catch (err) {
          console.error('Error loading advanced session:', err);
        }
      }
    };

    loadSession();
  }, [user, urlChatId, sessionParam]);

  // Autostart from URL parameters
  useEffect(() => {
    if (!user || urlChatId) return;

    const genreParam = searchParams.get('genre') || '';
    const eraParam = searchParams.get('era') || '';
    const autostartParam = searchParams.get('autostart') === 'true';

    if (genreParam && eraParam) {
      const matchedGenre = genres.find(g => g.name.toLowerCase() === genreParam.toLowerCase() || g.id.toLowerCase() === genreParam.toLowerCase())?.id || genreParam.toLowerCase();
      const matchedEra = eras.find(e => e.name.toLowerCase() === eraParam.toLowerCase() || e.id.toLowerCase() === eraParam.toLowerCase())?.id || eraParam.toLowerCase();

      setSelectedGenre(matchedGenre);
      setSelectedEra(matchedEra);

      if (autostartParam) {
        const autoLaunch = async () => {
          const newChatId = `chat_adv_${Math.random().toString(36).substring(2, 15)}`;
          setChatId(newChatId);

          const genreObj = genres.find(g => g.id === matchedGenre) || { name: matchedGenre };
          const eraObj = eras.find(e => e.id === matchedEra) || { name: matchedEra };

          const greetingText = `Welcome. I'm glad you've found your way here. I have prepared our workspace for our journey into ${genreObj.name} literature from the ${eraObj.name} era. We will converse in English. What are you reading, writing, or thinking about today?`;

          const initialMessages: Message[] = [
            {
              role: 'model',
              content: greetingText,
              timestamp: new Date(),
            },
          ];

          setMessages(initialMessages);
          setWizardActive(false);

          try {
            const chatDocRef = doc(db, 'users', user.uid, 'chats', newChatId);
            await setDoc(chatDocRef, {
              mode: 'poetry',
              type: 'advanced',
              filters: {
                genre: matchedGenre,
                era: matchedEra,
                authorStyle: '',
                language: 'english',
              },
              createdAt: serverTimestamp(),
              messages: initialMessages.map((msg) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(),
              })),
            });
          } catch (err) {
            console.error('Failed to initialize autostart advanced session:', err);
          }
        };

        autoLaunch();
      }
    }
  }, [user, urlChatId, searchParams]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLaunchChamber = async () => {
    if (!selectedGenre || !selectedEra || !user) return;

    const newChatId = `chat_adv_${Math.random().toString(36).substring(2, 15)}`;
    setChatId(newChatId);

    const genreObj = genres.find(g => g.id === selectedGenre) || { name: selectedGenre };
    const eraObj = eras.find(e => e.id === selectedEra) || { name: selectedEra };
    const langObj = languages.find(l => l.id === selectedLanguage) || { name: selectedLanguage };

    const greetingText = `Welcome. I'm glad you've found your way here. I have prepared our workspace for our journey into ${genreObj.name} literature from the ${eraObj.name} era${authorStyle ? `, inspired by the distinct voice of ${authorStyle}` : ''}. We will converse in ${langObj.name}. What are you reading, writing, or thinking about today?`;

    const initialMessages: Message[] = [
      {
        role: 'model',
        content: greetingText,
        timestamp: new Date(),
      },
    ];

    setMessages(initialMessages);
    setWizardActive(false);

    try {
      // Initialize Firestore document
      const chatDocRef = doc(db, 'users', user.uid, 'chats', newChatId);
      await setDoc(chatDocRef, {
        mode: currentMode,
        type: 'advanced',
        filters: {
          genre: selectedGenre,
          era: selectedEra,
          authorStyle,
          language: selectedLanguage,
        },
        createdAt: serverTimestamp(),
        messages: initialMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(),
        })),
      });
    } catch (err) {
      console.error('Failed to initialize advanced session:', err);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || aiLoading || !user) return;

    const userText = input.trim();
    const userMessage: Message = {
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setAiLoading(true);

    try {
      const clientHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          mode: currentMode,
          history: clientHistory,
          filters: {
            genre: selectedGenre,
            era: selectedEra,
            authorStyle,
            language: selectedLanguage,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Server responded with an error');
      }

      const data = await res.json();
      const aiMessage: Message = {
        role: 'model',
        content: data.response || 'The ink ran dry. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Save advanced session to Firestore
      const chatDocRef = doc(db, 'users', user.uid, 'chats', chatId);
      const savedMessageList = [
        ...messages,
        userMessage,
        aiMessage,
      ].map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
      }));

      await updateDoc(chatDocRef, {
        messages: savedMessageList,
      });
    } catch (error) {
      console.error('Error in Advanced Chat sending:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: 'The link with the muse cracked under absolute pressure. Scribe your message again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveToAnthology = async (msgContent: string, index: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const anthologyItem = {
        id: `anth_adv_${Math.random().toString(36).substring(2, 9)}`,
        mode: currentMode,
        genre: selectedGenre,
        era: selectedEra,
        prompt: messages[index - 1]?.content || 'Open dialogue',
        response: msgContent,
        savedAt: new Date(),
      };
      
      await updateDoc(userRef, {
        anthology: arrayUnion(anthologyItem),
      });

      setSaveSuccessId(`save_${index}`);
      setTimeout(() => setSaveSuccessId(null), 3000);
    } catch (err) {
      console.error('Error saving to anthology:', err);
    }
  };

  const handleShareCard = async (content: string) => {
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
        <div style="color: #c9a84c; font-size: 12px; letter-spacing: 3px; margin-bottom: 24px; text-transform: uppercase;">✦ Versecraft ${chunks.length > 1 ? `(${i + 1}/${chunks.length})` : ''}</div>
        <div style="font-size: 14px; line-height: 1.7; font-style: italic; color: #f5f0e8; margin-bottom: 32px;">${chunks[i]}</div>
        <div style="color: #c9a84c; font-size: 11px; letter-spacing: 2px; border-top: 1px solid rgba(201, 168, 76, 0.2); padding-top: 16px;">versecraft.app</div>
      `;
      document.body.appendChild(card);
      try {
        const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
        const link = document.createElement('a');
        link.download = chunks.length > 1 ? `versecraft-verse-${i + 1}.png` : 'versecraft-verse.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        document.body.removeChild(card);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning advanced frequencies...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ color: wizardActive ? '#1a1a1a' : atmConfig.chatText }}
      className={`relative z-10 w-full min-h-screen flex flex-col pt-20 transition-all duration-1000 ${wizardActive ? 'bg-[#F8F4E9]' : 'bg-transparent'}`}
    >
      {/* Dynamic atmospheric background decorations & painting */}
      {!wizardActive && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              ...atmConfig.bgStyle,
              zIndex: 0,
              transition: 'background 1.5s ease, color 1.5s ease',
            }}
          />
          {atmConfig.bgDecorations}
        </>
      )}

      {/* Ruled paper lines (always visible) */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`ruled-line-${i}`}
          style={{
            position: 'absolute',
            height: '1px',
            background: wizardActive ? 'rgba(26, 26, 26, 0.04)' : (atmConfig.themeName === 'classic-paper' || atmConfig.themeName === 'watercolor-romance' || atmConfig.themeName === 'surreal-dreamscape' || atmConfig.themeName === 'aged-parchment' ? 'rgba(26, 26, 26, 0.04)' : 'rgba(255, 255, 255, 0.04)'),
            left: 0,
            right: 0,
            top: `${80 + i * 48}px`,
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
      ))}

      {/* Watermark V (always visible) */}
      <div
        className="font-playfair"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '320px',
          fontWeight: 'bold',
          fontStyle: 'italic',
          color: wizardActive ? 'rgba(26, 26, 26, 0.025)' : (atmConfig.themeName === 'classic-paper' || atmConfig.themeName === 'watercolor-romance' || atmConfig.themeName === 'surreal-dreamscape' || atmConfig.themeName === 'aged-parchment' ? 'rgba(26, 26, 26, 0.025)' : 'rgba(255, 255, 255, 0.025)'),
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        V
      </div>

      <LocalChatSidebar currentChatId={chatId || null} chatType="advanced" />
      <AnimatePresence mode="wait">
        {wizardActive ? (
          /* PART A: The Selection Wizard */
          <motion.div
            key="wizard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.6 }}
            className="flex-grow max-w-5xl w-full mx-auto px-4 py-8 flex flex-col justify-center bg-[#F8F4E9] text-[#1a1a1a] relative z-10"
          >
            <div className="text-center mb-16 select-none">
              <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#1a1a1a]/80 block mb-2 font-inter">THE SECRET ARCHIVES</span>
              <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#1a1a1a]">Advanced Chambers</h1>
              <p className="font-inter text-sm text-[#6b6b6b] mt-3 max-w-xl mx-auto font-light leading-relaxed italic">
                Set your literary atmosphere before entering
              </p>
            </div>

            <div className="space-y-16 py-6 flex-grow">
              {/* Genre Selector */}
              <div>
                <label className="block text-xl font-bold text-[#1a1a1a] mb-6 font-playfair tracking-wide">✦ Literary Genre</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`p-3.5 rounded-full border text-center transition-all font-inter text-xs ${
                        selectedGenre === g.id
                          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-sm font-semibold'
                          : 'bg-transparent border-[#1a1a1a]/15 text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/5 hover:border-[#1a1a1a]/30'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Era Selector */}
              <div>
                <label className="block text-xl font-bold text-[#1a1a1a] mb-6 font-playfair tracking-wide">✦ Historical Era</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {eras.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEra(e.id)}
                      className={`p-3.5 rounded-full border text-center transition-all font-inter text-xs ${
                        selectedEra === e.id
                          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-sm font-semibold'
                          : 'bg-transparent border-[#1a1a1a]/15 text-[#1a1a1a]/70 hover:bg-[#1a1a1a]/5 hover:border-[#1a1a1a]/30'
                      }`}
                    >
                      {e.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Controls Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#1a1a1a]/10">
                {/* Author Persona Mimicry */}
                <div>
                  <label className="block text-lg font-bold text-[#1a1a1a] mb-2 font-playfair tracking-wide">✦ Author Style Mimicry (Optional)</label>
                  <p className="text-[10px] text-[#6b6b6b] mb-3 font-light">Input a writer&apos;s name to enforce their syntax and vocabulary structure.</p>
                  <input
                    type="text"
                    placeholder="e.g. Oscar Wilde, Edgar Allan Poe, Rumi..."
                    value={authorStyle}
                    onChange={(e) => setAuthorStyle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/30 bg-transparent text-[#1a1a1a] placeholder-[#1a1a1a]/40 outline-none text-sm focus:border-[#1a1a1a] transition-all"
                  />
                </div>

                {/* Output Language */}
                <div>
                  <label className="block text-lg font-bold text-[#1a1a1a] mb-2 font-playfair tracking-wide">✦ Output Language</label>
                  <p className="text-[10px] text-[#6b6b6b] mb-3 font-light">Force the literary model to think and respond inside a specific dialect or language framework.</p>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/30 bg-transparent text-[#1a1a1a] outline-none text-sm cursor-pointer focus:border-[#1a1a1a] transition-all"
                  >
                    {languages.map((l) => (
                      <option key={l.id} value={l.id} className="text-[#1a1a1a]">
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Trigger */}
              <div className="pt-8 text-center max-w-sm mx-auto">
                <button
                  onClick={handleLaunchChamber}
                  disabled={!selectedGenre || !selectedEra}
                  className="w-full py-4 bg-[#1a1a1a] disabled:bg-[#1a1a1a]/15 disabled:text-[#1a1a1a]/30 hover:bg-[#2d2d2d] text-white font-semibold uppercase tracking-[3px] rounded-xl font-inter text-xs transition-all select-none shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                  Begin Literary Journey
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* PART B & C: Theme-Locked Immersive Chat UI */
          <motion.div
            key="chamber-chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-grow flex flex-col"
          >
            {/* Top Bar matching theme styles */}
            <div 
              style={{
                background: atmConfig.panelBg,
                color: atmConfig.panelText,
                borderColor: atmConfig.themeName === 'classic-paper' ? 'rgba(26, 26, 26, 0.15)' : 'rgba(255, 255, 255, 0.1)',
              }}
              className="py-3 px-6 border-b fixed top-20 left-0 right-0 z-30 flex justify-between items-center max-w-7xl mx-auto rounded-b-xl select-none transition-all duration-1000"
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWizardActive(true)}
                  style={{ color: atmConfig.panelText }}
                  className="text-xs hover:underline transition-colors flex items-center gap-1 font-inter font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  Recalibrate Frequencies
                </button>
                <span style={{ color: atmConfig.panelText, opacity: 0.2 }}>|</span>
                <span style={{ color: atmConfig.panelText }} className="text-[10px] font-bold font-inter tracking-wider uppercase flex items-center gap-1.5">
                  {selectedGenre} • {selectedEra}
                </span>
                {authorStyle && (
                  <>
                    <span style={{ color: atmConfig.panelText, opacity: 0.1 }} className="hidden sm:inline">•</span>
                    <span style={{ color: atmConfig.panelText, opacity: 0.6 }} className="text-[10px] font-bold uppercase font-inter hidden sm:inline">
                      Style: {authorStyle}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setMessages([
                    {
                      role: 'model',
                      content: `The room has reset. Our parameters are preserved: ${selectedGenre.toUpperCase()} + ${selectedEra.toUpperCase()}${authorStyle ? ` in the style of ${authorStyle}` : ''}. Scribe your next invocation.`,
                      timestamp: new Date(),
                    },
                  ]);
                }}
                style={{
                  background: 'transparent',
                  borderColor: atmConfig.panelText,
                  color: atmConfig.panelText,
                }}
                className="px-3 py-1 border rounded-md text-[10px] uppercase font-bold tracking-wider font-inter hover:bg-white/5 transition-colors"
              >
                Reset Scroll
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-grow overflow-y-auto pb-48 pt-20 px-4 transition-all duration-1000 select-text bg-transparent relative z-10">
              <div className="max-w-4xl w-full mx-auto flex flex-col justify-start space-y-6 pt-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  
                  let bubbleStyle: React.CSSProperties = {};
                  let bubbleClass = '';
                  
                  if (isUser) {
                    bubbleStyle = {
                      ...atmConfig.bubbleUserStyle,
                    };
                    bubbleClass = 'rounded-br-none';
                  } else {
                    bubbleStyle = {
                      ...atmConfig.bubbleModelStyle,
                    };
                    bubbleClass = 'rounded-bl-none shadow-sm';
                  }
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        style={bubbleStyle}
                        className={`max-w-[85%] sm:max-w-xl p-5 rounded-2xl transition-all relative ${bubbleClass}`}
                      >
                        {msg.role === 'model' && (
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-black/10">
                            <span className="text-[9px] uppercase tracking-widest font-bold font-inter opacity-60">
                              COMPANION
                            </span>
                          </div>
                        )}

                        <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? `${atmConfig.companionBubbleTextItalic ? 'italic' : ''} font-playfair text-base font-normal` : ''}`} style={{ color: isUser ? atmConfig.bubbleUserStyle.color : atmConfig.bubbleModelStyle.color }}>
                          {msg.content}
                        </p>

                        {msg.role === 'model' && index > 0 && (
                          <div className="flex justify-end gap-3 mt-4 pt-2 text-[10px] font-bold font-inter border-t border-black/10 opacity-60">
                            <button
                              onClick={() => handleSaveToAnthology(msg.content, index)}
                              className="hover:text-gold flex items-center gap-1 transition-colors"
                            >
                              {saveSuccessId === `save_${index}` ? '✅ Saved!' : '📜 Save to Anthology'}
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleShareCard(msg.content)}
                              className="hover:text-gold flex items-center gap-1 transition-colors"
                            >
                              🎨 Share Card
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {aiLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div 
                      style={atmConfig.bubbleModelStyle}
                      className="p-5 rounded-2xl rounded-bl-none flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Bar - Keeps clean paper aesthetic always */}
            <div 
              style={atmConfig.inputBarStyle}
              className="fixed bottom-0 left-0 right-0 py-4 px-4 z-20 select-none transition-all duration-1000"
            >
              <div className="max-w-4xl mx-auto flex flex-col gap-3">
                {/* Mode Selector Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
                  {companionModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setCurrentMode(mode.id)}
                      style={{
                        border: currentMode === mode.id ? `1px solid ${atmConfig.panelText}` : '1px solid rgba(255, 255, 255, 0.15)',
                        background: currentMode === mode.id ? atmConfig.panelText : 'rgba(255,255,255,0.05)',
                        color: currentMode === mode.id ? (atmConfig.themeName === 'classic-paper' || atmConfig.themeName === 'watercolor-romance' || atmConfig.themeName === 'surreal-dreamscape' || atmConfig.themeName === 'aged-parchment' ? 'white' : '#1a1a1a') : atmConfig.panelText,
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-inter border transition-all flex-shrink-0"
                    >
                      <span>{mode.icon}</span>
                      {mode.name}
                    </button>
                  ))}
                </div>

                {/* Form Input */}
                <form onSubmit={handleSendMessage} className="flex gap-3 relative items-center">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyPress}
                    placeholder={`Scribe your response inside the locked room... Mode: ${companionModes.find((m) => m.id === currentMode)?.name}`}
                    rows={1}
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(26, 26, 26, 0.2)',
                      color: '#1a1a1a',
                    }}
                    className="flex-grow px-4 py-3.5 text-sm rounded-xl outline-none resize-none overflow-y-auto placeholder-[#9b9b9b] focus:!border-[rgba(26,26,26,0.5)] focus:border-opacity-50 transition-colors"
                    disabled={aiLoading}
                  />
                  <button
                    type="submit"
                    disabled={aiLoading || !input.trim()}
                    style={{
                      background: atmConfig.panelText,
                      color: atmConfig.themeName === 'classic-paper' || atmConfig.themeName === 'watercolor-romance' || atmConfig.themeName === 'surreal-dreamscape' || atmConfig.themeName === 'aged-parchment' ? 'white' : '#1a1a1a',
                    }}
                    className="px-5 py-3.5 font-bold rounded-xl text-xs uppercase tracking-wider font-inter transition-all flex-shrink-0 hover:opacity-90 animate-pulse"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdvancedChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning advanced frequencies...</span>
        </div>
      </div>
    }>
      <AdvancedChatPageContent />
    </Suspense>
  );
}
