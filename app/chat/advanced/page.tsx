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

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const genreProfiles: Record<string, {
  hue: number;
  saturation: number;
  lightness: number;
  darkMood: boolean;
  motif: (strokeColor: string) => React.ReactNode;
}> = {
  romance: {
    hue: 345,
    saturation: 85,
    lightness: 96,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute right-12 bottom-12 w-[350px] h-[350px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <path d="M50,30 C50,30 35,10 20,25 C5,40 25,75 50,90 C75,75 95,40 80,25 C65,10 50,30 50,30 Z" />
        <path d="M50,40 C50,40 38,25 27,35 C16,45 30,70 50,82 C70,70 84,45 73,35 C62,25 50,40 50,40 Z" strokeDasharray="2, 2" />
        <path d="M10,80 Q30,75 40,55 T30,20" strokeWidth="0.3" />
        <path d="M90,80 Q70,75 60,55 T70,20" strokeWidth="0.3" />
        <circle cx="30" cy="20" r="1.5" fill="currentColor" opacity="0.4" />
        <circle cx="70" cy="20" r="1.5" fill="currentColor" opacity="0.4" />
      </svg>
    )
  },
  gothic: {
    hue: 350,
    saturation: 60,
    lightness: 10,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-10 top-1/4 w-[450px] h-[650px] pointer-events-none" fill="none" viewBox="0 0 100 150" stroke={stroke} strokeWidth="0.5">
        <path d="M50,10 C20,30 20,80 20,140 L80,140 C80,80 80,30 50,10 Z" />
        <path d="M50,10 L50,140" strokeDasharray="1, 1" />
        <path d="M50,30 C35,45 35,80 35,140 M50,30 C65,45 65,80 65,140" />
        <circle cx="50" cy="50" r="15" />
        <path d="M50,35 A15,15 0 0,0 35,50 M50,35 A15,15 0 0,1 65,50" />
        <path d="M20,100 L80,100 M20,120 L80,120 M20,80 L80,80" />
        <path d="M20,140 L80,140" strokeWidth="1" />
      </svg>
    )
  },
  horror: {
    hue: 0,
    saturation: 80,
    lightness: 5,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-1/4 top-1/4 w-[600px] h-[500px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <path d="M15,50 Q22,25 45,35 T75,25 T92,55 T65,82 T22,72 Z" />
        <path d="M48,48 Q55,15 68,32 T75,68 T42,62 Z" strokeDasharray="2, 2" />
        <path d="M25,72 L25,95 M42,62 L42,88 M65,82 L65,99 M82,58 L82,85" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="25" cy="98" r="1" fill="currentColor" />
        <circle cx="42" cy="91" r="0.8" fill="currentColor" />
        <circle cx="65" cy="101" r="1.2" fill="currentColor" />
      </svg>
    )
  },
  mystery: {
    hue: 240,
    saturation: 50,
    lightness: 12,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 top-1/3 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <circle cx="50" cy="50" r="35" />
        <circle cx="50" cy="50" r="25" strokeDasharray="3, 3" />
        <circle cx="50" cy="50" r="15" />
        <line x1="50" y1="10" x2="50" y2="90" />
        <line x1="10" y1="60" x2="90" y2="60" />
        <path d="M25,25 L75,75 M25,75 L75,25" />
        <path d="M50,50 L85,85" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  fantasy: {
    hue: 150,
    saturation: 70,
    lightness: 8,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-12 top-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.4">
        <circle cx="25" cy="30" r="2" fill="currentColor" />
        <circle cx="55" cy="20" r="1.5" fill="currentColor" />
        <circle cx="85" cy="45" r="2.5" fill="currentColor" />
        <circle cx="35" cy="70" r="2" fill="currentColor" />
        <circle cx="70" cy="78" r="1.5" fill="currentColor" />
        <line x1="25" y1="30" x2="55" y2="20" />
        <line x1="55" y1="20" x2="85" y2="45" />
        <line x1="25" y1="30" x2="35" y2="70" />
        <line x1="35" y1="70" x2="70" y2="78" />
        <line x1="85" y1="45" x2="70" y2="78" />
        <circle cx="50" cy="50" r="20" strokeDasharray="3, 3" />
        <path d="M50,15 A35,35 0 0,0 85,50 A35,35 0 0,1 50,15 Z" fill="currentColor" opacity="0.1" />
      </svg>
    )
  },
  realism: {
    hue: 28,
    saturation: 30,
    lightness: 45,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute right-12 top-1/4 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <rect x="20" y="20" width="60" height="60" rx="2" />
        <line x1="20" y1="50" x2="80" y2="50" />
        <line x1="50" y1="20" x2="50" y2="80" />
        <line x1="25" y1="25" x2="45" y2="25" strokeDasharray="1, 1" />
        <line x1="25" y1="30" x2="45" y2="30" strokeDasharray="1, 1" />
        <line x1="25" y1="35" x2="45" y2="35" strokeDasharray="1, 1" />
        <line x1="25" y1="40" x2="45" y2="40" strokeDasharray="1, 1" />
        <line x1="5" y1="85" x2="95" y2="85" strokeWidth="1" />
        <line x1="10" y1="90" x2="90" y2="90" strokeDasharray="4, 2" />
      </svg>
    )
  },
  sufi: {
    hue: 260,
    saturation: 80,
    lightness: 8,
    darkMood: true,
    motif: (stroke) => (
      <div className="absolute left-10 bottom-10 w-[500px] h-[500px] pointer-events-none">
        <motion.svg 
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          className="w-full h-full" 
          fill="none" 
          viewBox="0 0 200 200" 
          stroke={stroke} 
          strokeWidth="0.4"
        >
          <circle cx="100" cy="100" r="85" strokeDasharray="3, 5" />
          <circle cx="100" cy="100" r="65" />
          <circle cx="100" cy="100" r="45" strokeDasharray="6, 6" />
          <circle cx="100" cy="100" r="25" />
          <line x1="15" y1="100" x2="185" y2="100" />
          <line x1="100" y1="15" x2="100" y2="185" />
          <polygon points="100,55 145,100 100,145 55,100" />
          <polygon points="100,70 130,100 100,130 70,100" strokeDasharray="1, 1" />
        </motion.svg>
      </div>
    )
  },
  classical: {
    hue: 40,
    saturation: 15,
    lightness: 90,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute right-12 top-1/4 w-[380px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 120" stroke={stroke} strokeWidth="0.5">
        <path d="M15,60 C15,40 25,25 45,25 C45,25 40,40 30,55 C25,62 15,60 15,60 Z" fill="currentColor" opacity="0.1" />
        <path d="M85,60 C85,40 75,25 55,25 C55,25 60,40 70,55 C75,62 85,60 85,60 Z" fill="currentColor" opacity="0.1" />
        <rect x="35" y="35" width="30" height="70" rx="1" />
        <line x1="41" y1="35" x2="41" y2="105" />
        <line x1="47" y1="35" x2="47" y2="105" />
        <line x1="53" y1="35" x2="53" y2="105" />
        <line x1="59" y1="35" x2="59" y2="105" />
        <path d="M30,35 Q50,30 70,35 C70,35 72,27 50,27 C28,27 30,35 30,35 Z" fill="currentColor" opacity="0.2" />
        <path d="M30,105 Q50,110 70,105 L70,112 L30,112 Z" />
      </svg>
    )
  },
  'science-fiction': {
    hue: 190,
    saturation: 90,
    lightness: 6,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 bottom-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 120 120" stroke={stroke} strokeWidth="0.4">
        <circle cx="20" cy="20" r="2" fill="currentColor" />
        <circle cx="50" cy="50" r="2" fill="currentColor" />
        <circle cx="90" cy="25" r="2" fill="currentColor" />
        <circle cx="35" cy="85" r="2" fill="currentColor" />
        <circle cx="85" cy="95" r="2" fill="currentColor" />
        <path d="M20,20 L40,20 L50,30 L50,50" />
        <path d="M90,25 L90,45 L70,65 L50,65" strokeDasharray="3, 3" />
        <path d="M35,85 L35,65 L50,50 L85,50 C85,50 85,85 85,95" />
        <line x1="10" y1="110" x2="110" y2="110" strokeDasharray="10, 5" />
        <line x1="10" y1="115" x2="110" y2="115" strokeDasharray="2, 8" />
      </svg>
    )
  },
  dystopian: {
    hue: 45,
    saturation: 80,
    lightness: 6,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-10 bottom-12 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <rect x="25" y="10" width="50" height="80" />
        <line x1="25" y1="30" x2="75" y2="30" />
        <line x1="25" y1="50" x2="75" y2="50" />
        <line x1="25" y1="70" x2="75" y2="70" />
        <line x1="25" y1="10" x2="75" y2="90" />
        <line x1="75" y1="10" x2="25" y2="90" strokeDasharray="4, 4" />
        <rect x="40" y="25" width="20" height="40" strokeWidth="1" />
      </svg>
    )
  },
  'magical-realism': {
    hue: 280,
    saturation: 40,
    lightness: 85,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute left-1/4 top-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <path d="M15,40 Q25,30 35,40 Q45,30 55,40 T75,40" strokeDasharray="4, 2" />
        <path d="M25,60 Q35,50 45,60 Q55,50 65,60 T85,60" strokeDasharray="4, 2" />
        <circle cx="50" cy="45" r="5" />
        <line x1="50" y1="50" x2="50" y2="75" strokeWidth="1" />
        <line x1="50" y1="65" x2="58" y2="65" strokeWidth="1" />
        <line x1="50" y1="72" x2="58" y2="72" strokeWidth="1" />
        <path d="M45,45 C30,35 20,45 15,55 C25,55 35,50 45,45 Z" fill="currentColor" opacity="0.1" />
        <path d="M55,45 C70,35 80,45 85,55 C75,55 65,50 55,45 Z" fill="currentColor" opacity="0.1" />
      </svg>
    )
  },
  'historical-fiction': {
    hue: 35,
    saturation: 45,
    lightness: 30,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-12 top-1/4 w-[380px] h-[380px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.4">
        <circle cx="50" cy="50" r="45" />
        <circle cx="50" cy="50" r="41" strokeDasharray="2, 2" />
        <circle cx="50" cy="50" r="12" />
        <circle cx="50" cy="50" r="3" fill="currentColor" />
        <line x1="50" y1="5" x2="50" y2="95" />
        <line x1="5" y1="50" x2="95" y2="50" />
        <polygon points="50,20 54,46 50,50" fill="currentColor" opacity="0.3" />
        <polygon points="50,20 46,46 50,50" />
        <polygon points="50,80 46,54 50,50" fill="currentColor" opacity="0.3" />
        <polygon points="50,80 54,54 50,50" />
        <polygon points="20,50 46,46 50,50" fill="currentColor" opacity="0.3" />
        <polygon points="20,50 46,54 50,50" />
        <polygon points="80,50 54,54 50,50" fill="currentColor" opacity="0.3" />
        <polygon points="80,50 54,46 50,50" />
      </svg>
    )
  },
  'psychological-thriller': {
    hue: 210,
    saturation: 10,
    lightness: 15,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 top-1/4 w-[500px] h-[500px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <circle cx="50" cy="50" r="2" fill="currentColor" />
        <line x1="50" y1="50" x2="10" y2="15" />
        <line x1="50" y1="50" x2="85" y2="10" />
        <line x1="50" y1="50" x2="95" y2="60" />
        <line x1="50" y1="50" x2="70" y2="90" />
        <line x1="50" y1="50" x2="25" y2="95" />
        <line x1="50" y1="50" x2="5" y2="65" />
        <polygon points="20,25 35,45 15,40" fill="currentColor" opacity="0.05" />
        <polygon points="75,25 80,45 60,35" fill="currentColor" opacity="0.05" />
        <polygon points="80,65 90,80 70,80" fill="currentColor" opacity="0.05" />
        <polygon points="30,75 50,85 25,85" fill="currentColor" opacity="0.05" />
      </svg>
    )
  },
  adventure: {
    hue: 175,
    saturation: 65,
    lightness: 25,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-12 bottom-12 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <polygon points="10,85 45,35 60,85" />
        <polygon points="40,85 70,45 95,85" />
        <line x1="45" y1="35" x2="35" y2="50" />
        <line x1="70" y1="45" x2="60" y2="60" />
        <circle cx="50" cy="20" r="10" strokeDasharray="2, 2" />
        <line x1="50" y1="5" x2="50" y2="15" />
        <line x1="35" y1="20" x2="45" y2="20" />
        <line x1="55" y1="20" x2="65" y2="20" />
      </svg>
    )
  },
  satire: {
    hue: 60,
    saturation: 70,
    lightness: 45,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute right-10 top-1/4 w-[380px] h-[380px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <path d="M20,25 C30,10 40,35 50,25 C60,35 70,10 80,25" />
        <path d="M20,25 A5,5 0 1,1 15,30" />
        <path d="M80,25 A5,5 0 1,0 85,30" />
        <path d="M30,55 Q50,75 70,55" strokeWidth="1" />
        <path d="M25,50 Q30,55 35,50" />
        <path d="M75,50 Q70,55 65,50" />
        <circle cx="40" cy="45" r="2.5" fill="currentColor" />
        <circle cx="60" cy="45" r="2.5" fill="currentColor" />
      </svg>
    )
  },
  tragedy: {
    hue: 210,
    saturation: 25,
    lightness: 20,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-12 bottom-12 w-[350px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 120" stroke={stroke} strokeWidth="0.5">
        <rect x="35" y="20" width="30" height="80" rx="4" />
        <path d="M35,30 C35,55 48,60 48,60 C48,60 35,65 35,90" />
        <path d="M65,30 C65,55 52,60 52,60 C52,60 65,65 65,90" />
        <circle cx="50" cy="65" r="0.8" fill="currentColor" />
        <circle cx="50" cy="72" r="0.8" fill="currentColor" />
        <circle cx="50" cy="80" r="1.2" fill="currentColor" />
        <path d="M38,85 L62,85" strokeWidth="1" />
        <path d="M42,32 L58,32" strokeWidth="1" />
      </svg>
    )
  },
  comedy: {
    hue: 24,
    saturation: 85,
    lightness: 60,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute left-12 top-1/4 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.4">
        <circle cx="50" cy="50" r="30" strokeDasharray="4, 4" />
        <line x1="50" y1="10" x2="50" y2="0" strokeWidth="1" />
        <line x1="50" y1="90" x2="50" y2="100" strokeWidth="1" />
        <line x1="10" y1="50" x2="0" y2="50" strokeWidth="1" />
        <line x1="90" y1="50" x2="100" y2="50" strokeWidth="1" />
        <line x1="20" y1="20" x2="10" y2="10" strokeWidth="0.8" />
        <line x1="80" y1="80" x2="90" y2="90" strokeWidth="0.8" />
        <line x1="20" y1="80" x2="10" y2="90" strokeWidth="0.8" />
        <line x1="80" y1="20" x2="90" y2="10" strokeWidth="0.8" />
        <path d="M35,45 Q50,20 65,45" />
        <path d="M30,55 Q50,85 70,55 Z" fill="currentColor" opacity="0.1" />
      </svg>
    )
  },
  epic: {
    hue: 40,
    saturation: 50,
    lightness: 15,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-10 top-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 120 120" stroke={stroke} strokeWidth="0.4">
        <path d="M60,10 C90,10 100,30 100,60 C100,95 60,115 60,115 C60,115 20,95 20,60 C20,30 30,10 60,10 Z" />
        <path d="M60,20 C82,20 90,35 90,60 C90,88 60,103 60,103 C60,103 30,88 30,60 C30,35 38,20 60,20 Z" strokeDasharray="3, 3" />
        <polygon points="60,35 65,48 78,48 68,58 72,71 60,63 48,71 52,58 42,48 55,48" fill="currentColor" opacity="0.2" />
      </svg>
    )
  },
  noir: {
    hue: 0,
    saturation: 0,
    lightness: 8,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 top-0 w-[550px] h-screen pointer-events-none" fill="none" viewBox="0 0 100 200" stroke={stroke} strokeWidth="0.4">
        <line x1="0" y1="30" x2="100" y2="100" strokeDasharray="15, 10" />
        <line x1="0" y1="50" x2="100" y2="120" strokeDasharray="15, 10" />
        <line x1="0" y1="70" x2="100" y2="140" strokeDasharray="15, 10" />
        <line x1="0" y1="90" x2="100" y2="160" strokeDasharray="15, 10" />
        <polygon points="80,10 20,190 95,190" fill="currentColor" opacity="0.04" />
        <circle cx="80" cy="10" r="3" fill="currentColor" />
      </svg>
    )
  },
  existential: {
    hue: 220,
    saturation: 40,
    lightness: 4,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-1/4 top-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <rect x="40" y="30" width="20" height="50" />
        <circle cx="50" cy="45" r="1.5" fill="currentColor" />
        <path d="M50,55 A5,5 0 0,0 50,45 A10,10 0 0,1 50,65 A15,15 0 0,0 50,35 A20,20 0 0,1 50,75 A25,25 0 0,0 50,25" />
      </svg>
    )
  },
  supernatural: {
    hue: 275,
    saturation: 70,
    lightness: 10,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-12 top-1/4 w-[450px] h-[450px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.4">
        <circle cx="50" cy="50" r="40" />
        <circle cx="50" cy="50" r="36" strokeDasharray="2, 6" />
        <polygon points="50,10 85,70 15,70" />
        <polygon points="50,90 85,30 15,30" />
        <circle cx="50" cy="50" r="10" />
      </svg>
    )
  },
  'war-literature': {
    hue: 90,
    saturation: 20,
    lightness: 15,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute right-12 bottom-12 w-[400px] h-[350px] pointer-events-none" fill="none" viewBox="0 0 120 80" stroke={stroke} strokeWidth="0.5">
        <path d="M10,20 Q60,50 110,20 M10,60 Q60,30 110,60" />
        <path d="M30,26 L34,36 M35,27 L29,35" strokeWidth="1" />
        <path d="M60,35 L64,45 M65,36 L59,44" strokeWidth="1" />
        <path d="M90,26 L94,36 M95,27 L89,35" strokeWidth="1" />
        <path d="M30,54 L34,44 M35,53 L29,45" strokeWidth="1" />
        <path d="M60,45 L64,35 M65,44 L59,36" strokeWidth="1" />
        <path d="M90,54 L94,44 M95,53 L89,45" strokeWidth="1" />
      </svg>
    )
  },
  'political-fiction': {
    hue: 220,
    saturation: 45,
    lightness: 35,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 top-1/4 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <path d="M25,50 C25,25 75,25 75,50 Z" />
        <rect x="20" y="50" width="60" height="8" />
        <rect x="15" y="58" width="70" height="4" />
        <line x1="30" y1="50" x2="30" y2="58" />
        <line x1="40" y1="50" x2="40" y2="58" />
        <line x1="50" y1="50" x2="50" y2="58" />
        <line x1="60" y1="50" x2="60" y2="58" />
        <line x1="70" y1="50" x2="70" y2="58" />
        <line x1="50" y1="65" x2="50" y2="95" strokeWidth="1" />
        <line x1="30" y1="73" x2="70" y2="73" strokeWidth="1" />
        <line x1="30" y1="73" x2="25" y2="85" />
        <line x1="30" y1="73" x2="35" y2="85" />
        <line x1="70" y1="73" x2="65" y2="85" />
        <line x1="70" y1="73" x2="75" y2="85" />
        <path d="M20,85 Q30,85 30,88 Q30,85 40,85" />
        <path d="M60,85 Q70,85 70,88 Q70,85 80,85" />
      </svg>
    )
  },
  'philosophical-fiction': {
    hue: 195,
    saturation: 30,
    lightness: 40,
    darkMood: true,
    motif: (stroke) => (
      <svg className="absolute left-10 bottom-12 w-[350px] h-[350px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.5">
        <circle cx="50" cy="50" r="10" />
        <circle cx="50" cy="50" r="25" strokeDasharray="6, 3" />
        <circle cx="50" cy="50" r="40" strokeDasharray="2, 2" />
        <path d="M30,85 Q50,75 70,85 M20,90 Q50,78 80,90" />
      </svg>
    )
  },
  'literary-fiction': {
    hue: 30,
    saturation: 10,
    lightness: 88,
    darkMood: false,
    motif: (stroke) => (
      <svg className="absolute right-12 top-1/4 w-[400px] h-[400px] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.4">
        <rect x="15" y="15" width="70" height="70" strokeDasharray="4, 4" />
        <line x1="15" y1="35" x2="85" y2="35" strokeDasharray="1, 4" />
        <line x1="15" y1="55" x2="85" y2="55" strokeDasharray="1, 4" />
        <path d="M80,20 C70,30 50,55 40,70 L35,78 L43,76 C55,68 75,45 80,20 Z" fill="currentColor" opacity="0.1" />
        <line x1="40" y1="70" x2="43" y2="76" strokeWidth="0.8" />
      </svg>
    )
  }
};

const eraProfiles: Record<string, {
  hueShift: number;
  lightnessLimit: number;
  fontFamily: string;
  italicText: boolean;
  structure: (strokeColor: string) => React.ReactNode;
}> = {
  ancient: {
    hueShift: 10,
    lightnessLimit: 20,
    fontFamily: `'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="45" strokeDasharray="1, 1" />
        <path d="M50,2 L50,98 M2,50 L98,50" />
        <rect x="5" y="5" width="90" height="90" rx="3" />
        <rect x="8" y="8" width="84" height="84" rx="2" />
      </svg>
    )
  },
  medieval: {
    hueShift: 20,
    lightnessLimit: 12,
    fontFamily: `'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.25">
        <rect x="4" y="4" width="92" height="92" />
        <rect x="8" y="8" width="84" height="84" strokeDasharray="2, 2" />
        <path d="M4,20 L20,4 M96,20 L80,4 M4,80 L20,96 M96,80 L80,96" />
        <circle cx="50" cy="50" r="30" />
        <polygon points="50,20 80,50 50,80 20,50" />
      </svg>
    )
  },
  renaissance: {
    hueShift: 30,
    lightnessLimit: 85,
    fontFamily: `'Playfair Display', Georgia, 'Times New Roman', serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.07] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <circle cx="50" cy="50" r="40" />
        <rect x="18" y="18" width="64" height="64" />
        <line x1="50" y1="10" x2="50" y2="90" />
        <line x1="10" y1="50" x2="90" y2="50" />
        <path d="M10,10 L90,90 M10,90 L90,10" strokeDasharray="1, 1" />
        <path d="M50,50 A5,5 0 0,1 55,50 A10,10 0 0,1 45,50 A20,20 0 0,1 65,50 A40,40 0 0,1 25,50" />
      </svg>
    )
  },
  baroque: {
    hueShift: -15,
    lightnessLimit: 14,
    fontFamily: `'Playfair Display', Georgia, italic, serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.05] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <path d="M0,0 C30,20 40,10 50,50 C60,90 70,80 100,100" />
        <path d="M100,0 C70,20 60,10 50,50 C40,90 30,80 0,100" />
        <path d="M50,0 C50,30 30,40 50,50 C70,60 50,70 50,100" strokeDasharray="2, 2" />
        <circle cx="50" cy="50" r="12" />
      </svg>
    )
  },
  enlightenment: {
    hueShift: -30,
    lightnessLimit: 90,
    fontFamily: `Georgia, Garamond, Baskerville, serif`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.07] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.15">
        <circle cx="50" cy="50" r="48" />
        <circle cx="50" cy="50" r="46" />
        <circle cx="50" cy="50" r="32" strokeDasharray="2, 1" />
        <circle cx="50" cy="50" r="18" />
        <line x1="50" y1="2" x2="50" y2="98" />
        <line x1="2" y1="50" x2="98" y2="50" />
        <path d="M50,2 L50,6 M50,98 L50,94 M2,50 L6,50 M98,50 L94,50 M16,16 L20,20 M84,84 L80,80" />
        <polygon points="50,45 55,50 50,55 45,50" />
      </svg>
    )
  },
  romantic: {
    hueShift: 5,
    lightnessLimit: 92,
    fontFamily: `'Playfair Display', Georgia, Cambria, serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <path d="M0,40 Q25,25 50,40 T100,40 M0,55 Q25,40 50,55 T100,55 M0,70 Q25,55 50,70 T100,70" />
        <path d="M10,15 C30,10 40,25 60,15 T100,15" strokeDasharray="4, 4" />
        <path d="M0,25 C20,20 35,35 55,25 T90,25" strokeDasharray="4, 4" />
      </svg>
    )
  },
  victorian: {
    hueShift: 15,
    lightnessLimit: 88,
    fontFamily: `Georgia, Garamond, Baskerville, 'Times New Roman', serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <circle cx="30" cy="35" r="20" />
        <circle cx="30" cy="35" r="16" strokeDasharray="2, 2" />
        <circle cx="30" cy="35" r="4" fill="currentColor" opacity="0.3" />
        <path d="M30,12 L30,15 M30,55 L30,58 M10,35 L13,35 M50,35 L53,35 M16,21 L18,23 M44,49 L46,47 M16,49 L18,47 M44,21 L46,23" />
        <circle cx="70" cy="65" r="25" />
        <circle cx="70" cy="65" r="21" strokeDasharray="3, 3" />
        <circle cx="70" cy="65" r="6" fill="currentColor" opacity="0.3" />
        <path d="M70,37 L70,40 M70,90 L70,93 M45,65 L48,65 M95,65 L98,65" />
      </svg>
    )
  },
  edwardian: {
    hueShift: 25,
    lightnessLimit: 90,
    fontFamily: `'Playfair Display', Georgia, serif`,
    italicText: true,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <path d="M5,95 Q30,60 15,30 Q5,10 50,5 Q95,10 85,30 Q70,60 95,95" />
        <path d="M30,95 Q50,70 50,40 Q50,20 50,5" strokeDasharray="2, 2" />
        <circle cx="50" cy="40" r="10" />
        <circle cx="15" cy="30" r="3" />
        <circle cx="85" cy="30" r="3" />
      </svg>
    )
  },
  modernist: {
    hueShift: -10,
    lightnessLimit: 12,
    fontFamily: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.05] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.3">
        <line x1="0" y1="0" x2="100" y2="100" strokeWidth="0.5" />
        <line x1="0" y1="30" x2="70" y2="100" />
        <line x1="30" y1="0" x2="100" y2="70" />
        <line x1="100" y1="0" x2="0" y2="100" strokeWidth="0.5" />
        <rect x="10" y="40" width="30" height="40" strokeDasharray="2, 2" />
        <rect x="60" y="20" width="30" height="40" strokeDasharray="2, 2" />
        <circle cx="50" cy="50" r="15" />
      </svg>
    )
  },
  'mid-century': {
    hueShift: 35,
    lightnessLimit: 93,
    fontFamily: `'Inter', system-ui, sans-serif`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.25">
        <circle cx="50" cy="50" r="28" />
        <path d="M15,50 A35,35 0 0,0 85,50" />
        <path d="M50,15 A35,35 0 0,0 50,85" strokeDasharray="4, 4" />
        <circle cx="50" cy="50" r="4" fill="currentColor" />
        <circle cx="15" cy="50" r="3" fill="currentColor" />
        <circle cx="85" cy="50" r="3" fill="currentColor" />
        <circle cx="50" cy="15" r="3" fill="currentColor" />
        <circle cx="50" cy="85" r="3" fill="currentColor" />
      </svg>
    )
  },
  postmodern: {
    hueShift: 0,
    lightnessLimit: 6,
    fontFamily: `monospace, 'Courier New', Courier`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <line x1="0" y1="60" x2="100" y2="60" strokeWidth="0.5" />
        <line x1="50" y1="60" x2="-20" y2="110" />
        <line x1="50" y1="60" x2="10" y2="110" />
        <line x1="50" y1="60" x2="35" y2="110" />
        <line x1="50" y1="60" x2="50" y2="110" />
        <line x1="50" y1="60" x2="65" y2="110" />
        <line x1="50" y1="60" x2="90" y2="110" />
        <line x1="50" y1="60" x2="120" y2="110" />
        <line x1="0" y1="65" x2="100" y2="65" />
        <line x1="0" y1="72" x2="100" y2="72" />
        <line x1="0" y1="81" x2="100" y2="81" />
        <line x1="0" y1="92" x2="100" y2="92" />
      </svg>
    )
  },
  contemporary: {
    hueShift: -5,
    lightnessLimit: 94,
    fontFamily: `'Inter', system-ui, sans-serif`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
        <circle cx="80" cy="20" r="1.5" fill="currentColor" />
        <circle cx="20" cy="80" r="1.5" fill="currentColor" />
        <circle cx="80" cy="80" r="1.5" fill="currentColor" />
        <circle cx="50" cy="50" r="2.5" fill="currentColor" />
        <line x1="20" y1="20" x2="50" y2="50" />
        <line x1="80" y1="20" x2="50" y2="50" />
        <line x1="20" y1="80" x2="50" y2="50" />
        <line x1="80" y1="80" x2="50" y2="50" />
        <line x1="20" y1="20" x2="80" y2="20" strokeDasharray="3, 3" />
        <line x1="20" y1="80" x2="80" y2="80" strokeDasharray="3, 3" />
        <line x1="20" y1="20" x2="20" y2="80" strokeDasharray="3, 3" />
        <line x1="80" y1="20" x2="80" y2="80" strokeDasharray="3, 3" />
      </svg>
    )
  },
  'present-day': {
    hueShift: 0,
    lightnessLimit: 96,
    fontFamily: `'Inter', system-ui, sans-serif`,
    italicText: false,
    structure: (stroke) => (
      <svg className="absolute inset-0 w-full h-full text-current opacity-[0.06] pointer-events-none" fill="none" viewBox="0 0 100 100" stroke={stroke} strokeWidth="0.2">
        <path d="M0,50 C30,30 70,70 100,50" />
        <path d="M0,50 C30,70 70,30 100,50" strokeDasharray="2, 2" />
        <path d="M0,50 C30,40 70,60 100,50" strokeWidth="0.5" />
        <circle cx="30" cy="40" r="1" fill="currentColor" />
        <circle cx="70" cy="60" r="1" fill="currentColor" />
        <circle cx="30" cy="60" r="1" fill="currentColor" />
        <circle cx="70" cy="40" r="1" fill="currentColor" />
        <line x1="30" y1="40" x2="70" y2="60" strokeDasharray="1, 1" />
        <line x1="30" y1="60" x2="70" y2="40" strokeDasharray="1, 1" />
      </svg>
    )
  }
};

const getGenrePatternRaw = (genre: string): string | null => {
  const g = (genre || '').toLowerCase().trim();

  let matchedGenre = '';
  if (g.includes('gothic')) matchedGenre = 'gothic';
  else if (g.includes('horror')) matchedGenre = 'horror';
  else if (g.includes('romance')) matchedGenre = 'romance';
  else if (g.includes('mystery')) matchedGenre = 'mystery';
  else if (g.includes('fantasy')) matchedGenre = 'fantasy';
  else if (g.includes('sufi')) matchedGenre = 'sufi';
  else if (g.includes('science') || g.includes('sci-fi')) matchedGenre = 'science-fiction';
  else if (g.includes('dystopian')) matchedGenre = 'dystopian';
  else if (g.includes('magical') || g.includes('magic')) matchedGenre = 'magical-realism';
  else if (g.includes('historical')) matchedGenre = 'historical-fiction';
  else if (g.includes('noir')) matchedGenre = 'noir';
  else if (g.includes('existential') || g.includes('philosophical')) matchedGenre = 'existential-philosophical';
  else if (g.includes('war')) matchedGenre = 'war-literature';
  else if (g.includes('classical') || g.includes('ancient')) matchedGenre = 'classical-ancient';
  else if (g.includes('modernist') || g.includes('modernism')) matchedGenre = 'modernist';
  else if (g.includes('adventure')) matchedGenre = 'adventure';
  else if (g.includes('satire') || g.includes('comedy')) matchedGenre = 'satire-comedy';
  else if (g.includes('tragedy')) matchedGenre = 'tragedy';
  else if (g.includes('epic')) matchedGenre = 'epic';
  else if (g.includes('supernatural')) matchedGenre = 'supernatural';
  else if (g.includes('political')) matchedGenre = 'political-fiction';
  else if (g.includes('psychological') || g.includes('thriller')) matchedGenre = 'psychological-thriller';
  else if (g.includes('literary')) matchedGenre = 'literary-fiction';

  if (!matchedGenre) return null;

  // Opacity rule
  let opacity = 0.12;
  if (matchedGenre === 'gothic') {
    opacity = 0.15; // Gothic hardcoded to 0.15 temporarily for visibility testing
  }

  switch (matchedGenre) {
    case 'gothic': {
      let gothic = `<svg viewBox="0 0 800 800" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <!-- Outermost ring -->
  <circle cx="400" cy="400" r="380" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <circle cx="400" cy="400" r="365" stroke="#1a1a1a" stroke-dasharray="4,4" fill="none"/>
  <!-- Inner rings -->
  <circle cx="400" cy="400" r="280" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <circle cx="400" cy="400" r="200" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <circle cx="400" cy="400" r="120" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <circle cx="400" cy="400" r="50" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>`;
      
      for (let i = 0; i < 16; i++) {
        const angle = (i * 360) / 16;
        const rad = (angle * Math.PI) / 180;
        const x2_380 = 400 + 380 * Math.cos(rad);
        const y2_380 = 400 + 380 * Math.sin(rad);
        gothic += `<line x1="400" y1="400" x2="${x2_380}" y2="${y2_380}" stroke="#1a1a1a" stroke-width="1"/>`;
      }
      
      for (let i = 0; i < 16; i++) {
        const angle1 = (i * 360) / 16;
        const angle2 = ((i + 1) * 360) / 16;
        const midAngle = (angle1 + angle2) / 2;
        
        const a1 = (angle1 * Math.PI) / 180;
        const a2 = (angle2 * Math.PI) / 180;
        const am = (midAngle * Math.PI) / 180;
        
        const xB1 = 400 + 200 * Math.cos(a1);
        const yB1 = 400 + 200 * Math.sin(a1);
        const xB2 = 400 + 200 * Math.cos(a2);
        const yB2 = 400 + 200 * Math.sin(a2);
        const xTip = 400 + 280 * Math.cos(am);
        const yTip = 400 + 280 * Math.sin(am);
        gothic += `<path d="M ${xB1} ${yB1} A 150 150 0 0 1 ${xTip} ${yTip} A 150 150 0 0 1 ${xB2} ${yB2}" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>`;
        
        const xB1_2 = 400 + 280 * Math.cos(a1);
        const yB1_2 = 400 + 280 * Math.sin(a1);
        const xB2_2 = 400 + 280 * Math.cos(a2);
        const yB2_2 = 400 + 280 * Math.sin(a2);
        const xTip2 = 400 + 380 * Math.cos(am);
        const yTip2 = 400 + 380 * Math.sin(am);
        gothic += `<path d="M ${xB1_2} ${yB1_2} A 200 200 0 0 1 ${xTip2} ${yTip2} A 200 200 0 0 1 ${xB2_2} ${yB2_2}" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>`;
        
        const xB1_3 = 400 + 120 * Math.cos(a1);
        const yB1_3 = 400 + 120 * Math.sin(a1);
        const xB2_3 = 400 + 120 * Math.cos(a2);
        const yB2_3 = 400 + 120 * Math.sin(a2);
        const xTip3 = 400 + 200 * Math.cos(am);
        const yTip3 = 400 + 200 * Math.sin(am);
        gothic += `<path d="M ${xB1_3} ${yB1_3} A 100 100 0 0 1 ${xTip3} ${yTip3} A 100 100 0 0 1 ${xB2_3} ${yB2_3}" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>`;
      }
      gothic += `</svg>`;
      return gothic;
    }
    case 'horror': {
      const dots = [ [200,300,45],[230,270,10],[180,350,8],[260,330,12],[210,370,5],[150,750,60],[110,690,15],[220,790,20],[80,800,10],[190,710,12],[500,250,8],[550,850,15],[900,600,25],[850,650,7],[930,550,5] ];
      let dotsHtml = '';
      for (const d of dots) {
        dotsHtml += `<circle cx="${d[0]}" cy="${d[1]}" r="${d[2]}" fill="#1a1a1a"/>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
        ${dotsHtml}
        <path d="M 800,100 Q 820,95 830,110 T 880,100 Q 850,130 830,135 Q 835,160 845,180 Q 820,160 815,145 T 770,170 Q 775,150 785,135 Q 770,120 750,105 Q 780,110 800,100 Z" fill="#1a1a1a"/>
      </svg>`;
    }
    case 'romance': {
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 750,750 C 745,740 755,735 760,745 C 765,755 750,760 740,750 C 735,740 750,725 765,735 C 775,745 765,770 745,770 C 725,770 720,740 740,720 C 760,700 790,720 785,750 C 780,780 740,795 720,780" />
    <path d="M 720,780 C 690,760 695,710 730,695 C 765,680 810,700 815,740 C 820,780 775,815 730,815 C 685,815 660,760 680,710 C 700,660 760,650 810,670 C 860,690 865,760 825,810" />
    <path d="M 825,810 C 840,830 870,820 880,780 C 890,740 860,700 830,685 M 680,710 C 650,700 620,720 630,760 C 640,800 680,830 730,835" />
    <path d="M 730,835 Q 700,890 680,950 Q 675,960 670,980" stroke-width="2"/>
    <path d="M 690,880 C 640,870 600,890 570,920 C 610,930 650,915 680,895 Z" />
    <path d="M 690,880 Q 630,900 570,920 M 640,880 Q 620,895 610,910 M 660,890 Q 640,905 630,915" />
    <path d="M 685,910 C 730,920 770,910 800,880 C 760,870 720,885 690,925 Z" />
    <path d="M 685,910 Q 740,895 800,880 M 730,905 Q 750,890 765,885 M 710,915 Q 730,905 745,898" />
    <path d="M 693,900 L 705,898 L 690,908 Z" fill="#1a1a1a"/>
    <path d="M 682,935 L 670,938 L 680,942 Z" fill="#1a1a1a"/>
  </g>
</svg>`;
    }
    case 'mystery': {
      const template = `<g stroke="#1a1a1a" fill="none" stroke-width="1.5"><circle cx="0" cy="0" r="15" /><circle cx="0" cy="0" r="6" /><line x1="0" y1="15" x2="0" y2="70" stroke-width="2" /><line x1="-6" y1="25" x2="6" y2="25" /><line x1="-4" y1="30" x2="4" y2="30" /><path d="M 0,55 L 12,55 L 12,62 L 0,62 L 0,66 L 15,66 L 15,73 L 0,73" stroke-width="1.5" /></g>`;
      const list = [ [150, 200, 45, 1.5], [820, 250, -60, 1.2], [250, 750, 125, 1.6], [780, 820, -15, 1.4], [500, 120, 200, 1], [880, 580, 95, 1.3] ];
      let keysHtml = '';
      for (const k of list) {
        keysHtml += `<g transform="translate(${k[0]}, ${k[1]}) rotate(${k[2]}) scale(${k[3]})">${template}</g>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
        ${keysHtml}
      </svg>`;
    }
    case 'fantasy': {
      const pts1 = [[150,150,3],[220,120,4],[280,180,3],[200,240,5],[250,50,3],[350,80,4]];
      let pts1Html = '';
      for (const p of pts1) pts1Html += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#1a1a1a"/>`;
      
      const pts2 = [[750,100,3.5],[820,120,3],[880,80,5],[920,150,3],[850,200,4]];
      let pts2Html = '';
      for (const p of pts2) pts2Html += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#1a1a1a"/>`;
      
      const pts3 = [[700,700,4],[780,680,4.5],[850,750,3],[880,850,5],[780,880,3.5],[700,800,4]];
      let pts3Html = '';
      for (const p of pts3) pts3Html += `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2]}" fill="#1a1a1a"/>`;

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <circle cx="500" cy="500" r="450" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4,8" fill="none"/>
  <circle cx="500" cy="500" r="300" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4,8" fill="none"/>
  <circle cx="500" cy="500" r="150" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4,8" fill="none"/>
  <line x1="500" y1="50" x2="500" y2="950" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4,8"/>
  <line x1="50" y1="500" x2="950" y2="500" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="4,8"/>
  
  <polyline points="150,150 220,120 280,180 200,240 150,150" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="2,2" fill="none"/>
  <polyline points="220,120 250,50 350,80 280,180" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="2,2" fill="none"/>
  ${pts1Html}

  <polyline points="750,100 820,120 880,80 920,150 850,200 750,100" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="2,2" fill="none"/>
  ${pts2Html}

  <polyline points="700,700 780,680 850,750 880,850 780,880 700,800 700,700" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="2,2" fill="none"/>
  <line x1="780" y1="680" x2="700" y2="800" stroke="#1a1a1a" stroke-width="1.2" stroke-dasharray="2,2"/>
  ${pts3Html}
</svg>`;
    }
    case 'sufi': {
      return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <defs>
    <pattern id="sufi-tessellation" width="100" height="100" patternUnits="userSpaceOnUse">
      <g transform="translate(50, 50)">
        <rect x="-25" y="-25" width="50" height="50" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <rect x="-25" y="-25" width="50" height="50" transform="rotate(45)" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <circle cx="0" cy="0" r="15" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,2"/>
      </g>
      <g transform="translate(0, 0)">
        <rect x="-12.5" y="-12.5" width="25" height="25" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <rect x="-12.5" y="-12.5" width="25" height="25" transform="rotate(45)" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
      </g>
      <g transform="translate(100, 0)">
        <rect x="-12.5" y="-12.5" width="25" height="25" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <rect x="-12.5" y="-12.5" width="25" height="25" transform="rotate(45)" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
      </g>
      <g transform="translate(0, 100)">
        <rect x="-12.5" y="-12.5" width="25" height="25" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <rect x="-12.5" y="-12.5" width="25" height="25" transform="rotate(45)" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
      </g>
      <g transform="translate(100, 100)">
        <rect x="-12.5" y="-12.5" width="25" height="25" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
        <rect x="-12.5" y="-12.5" width="25" height="25" transform="rotate(45)" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
      </g>
      <line x1="0" y1="50" x2="25" y2="50" stroke="#1a1a1a" stroke-width="0.6"/>
      <line x1="75" y1="50" x2="100" y2="50" stroke="#1a1a1a" stroke-width="0.6"/>
      <line x1="50" y1="0" x2="50" y2="25" stroke="#1a1a1a" stroke-width="0.6"/>
      <line x1="50" y1="75" x2="50" y2="100" stroke="#1a1a1a" stroke-width="0.6"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#sufi-tessellation)"/>
</svg>`;
    }
    case 'science-fiction': {
      let sfGrid = '';
      for (const x of [100, 300, 500, 700, 900]) {
        for (const y of [100, 300, 500, 700, 900]) {
          sfGrid += `<line x1="${x - 5}" y1="${y}" x2="${x + 5}" y2="${y}" stroke="#1a1a1a" stroke-width="0.8"/>
                    <line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}" stroke="#1a1a1a" stroke-width="0.8"/>`;
        }
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <line x1="100" y1="100" x2="900" y2="100" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="100" y1="300" x2="900" y2="300" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="100" y1="500" x2="900" y2="500" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="100" y1="700" x2="900" y2="700" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="100" y1="900" x2="900" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  
  <line x1="100" y1="100" x2="100" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="300" y1="100" x2="300" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="500" y1="100" x2="500" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="700" y1="100" x2="700" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>
  <line x1="900" y1="100" x2="900" y2="900" stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="2,10"/>

  ${sfGrid}

  <g transform="rotate(-12, 550, 480)">
    <ellipse cx="550" cy="480" rx="180" ry="90" stroke="#1a1a1a" stroke-width="1" fill="none"/>
    <ellipse cx="550" cy="480" rx="300" ry="150" stroke="#1a1a1a" stroke-width="1" fill="none"/>
    <ellipse cx="550" cy="480" rx="440" ry="220" stroke="#1a1a1a" stroke-width="0.8" stroke-dasharray="3,3" fill="none"/>
    <ellipse cx="550" cy="480" rx="580" ry="290" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>

    <circle cx="370" cy="480" r="5" fill="#1a1a1a"/>
    <g transform="translate(712, 374) rotate(20)">
      <circle cx="0" cy="0" r="8" fill="#1a1a1a"/>
      <ellipse cx="0" cy="0" rx="14" ry="4" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
    </g>
    <circle cx="230" cy="340" r="4" fill="#1a1a1a"/>
    <circle cx="870" cy="620" r="3" fill="#1a1a1a"/>
    <circle cx="550" cy="190" r="10" fill="#1a1a1a"/>
  </g>
  
  <circle cx="550" cy="480" r="18" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>
  <circle cx="550" cy="480" r="24" fill="none" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,2"/>
</svg>`;
    }
    case 'dystopian': {
      const drawGear = (cx: number, cy: number, r: number, teethCount: number) => {
        let gear = `<circle cx="${cx}" cy="${cy}" r="${r - 10}" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>`;
        gear += `<circle cx="${cx}" cy="${cy}" r="${r - 20}" stroke="#1a1a1a" stroke-dasharray="2,2" fill="none"/>`;
        for (let i = 0; i < teethCount; i++) {
          const angle = (i * 360) / teethCount;
          const rad = (angle * Math.PI) / 180;
          const x1 = cx + (r - 10) * Math.cos(rad);
          const y1 = cy + (r - 10) * Math.sin(rad);
          const x2 = cx + r * Math.cos(rad);
          const y2 = cy + r * Math.sin(rad);
          gear += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="3"/>`;
        }
        return gear;
      };

      let dystopian = `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <path d="M 150,500 Q 500,220 850,500 Q 500,780 150,500 Z" stroke="#1a1a1a" stroke-width="2.5" fill="none" />
  <circle cx="500" cy="500" r="140" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <circle cx="500" cy="500" r="100" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <circle cx="500" cy="500" r="60" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <circle cx="500" cy="500" r="30" fill="#1a1a1a"/>`;

      for (let i = 0; i < 24; i++) {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 500 + 30 * Math.cos(rad);
        const y1 = 500 + 30 * Math.sin(rad);
        const x2 = 500 + 420 * Math.cos(rad);
        const y2 = 500 + 420 * Math.sin(rad);
        dystopian += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-dasharray="3,6" stroke-width="0.8"/>`;
      }

      dystopian += `<g opacity="0.8">`;
      dystopian += drawGear(50, 50, 80, 12);
      dystopian += drawGear(950, 50, 70, 10);
      dystopian += drawGear(50, 950, 90, 14);
      dystopian += drawGear(950, 950, 85, 12);
      dystopian += `</g></svg>`;
      return dystopian;
    }
    case 'magical-realism': {
      let clockTicks = '';
      for (let i = 0; i < 12; i++) {
        const rad = (i * 30 * Math.PI) / 180;
        clockTicks += `<line x1="${75 * Math.cos(rad)}" y1="${75 * Math.sin(rad)}" x2="${85 * Math.cos(rad)}" y2="${85 * Math.sin(rad)}" stroke="#1a1a1a" stroke-width="1"/>`;
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g transform="translate(500, 500)">
    <ellipse cx="0" cy="0" rx="8" ry="80" fill="#1a1a1a"/>
    <circle cx="0" cy="-90" r="10" fill="#1a1a1a"/>
    <path d="M -4,-95 Q -25,-140 -35,-150 M 4,-95 Q 25,-140 35,-150" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M 0,-40 C -80,-150 -320,-180 -340,-50 C -350,50 -200,100 -50,50 C -120,150 -250,220 -200,280 C -150,340 -50,200 0,60" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M 0,-40 C 80,-150 320,-180 340,-50 C 350,50 200,100 50,50 C 120,150 250,220 200,280 C 150,340 50,200 0,60" stroke="#1a1a1a" stroke-width="2" fill="none"/>

    <g transform="translate(-160, -50)">
      <circle cx="0" cy="0" r="90" stroke="#1a1a1a" stroke-width="1" fill="none"/>
      <circle cx="0" cy="0" r="82" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,4" fill="none"/>
      ${clockTicks}
      <line x1="0" y1="0" x2="-40" y2="-20" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="10" y2="-55" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="3" fill="#1a1a1a"/>
    </g>

    <g transform="translate(160, -50)">
      <circle cx="0" cy="0" r="90" stroke="#1a1a1a" stroke-width="1" fill="none"/>
      <circle cx="0" cy="0" r="82" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,4" fill="none"/>
      ${clockTicks}
      <line x1="0" y1="0" x2="40" y2="20" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
      <line x1="0" y1="0" x2="-10" y2="-50" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="3" fill="#1a1a1a"/>
    </g>
  </g>

  <g transform="translate(200, 200) rotate(15) scale(0.6)">
    <path d="M -20,-30 L 20,-30 L 2,-2 L 20,26 L -20,26 L -2,2 Z" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
    <line x1="-22" y1="-30" x2="22" y2="-30" stroke="#1a1a1a" stroke-width="2.5"/>
    <line x1="-22" y1="26" x2="22" y2="26" stroke="#1a1a1a" stroke-width="2.5"/>
    <path d="M -8,22 Q 0,26 8,22" fill="#1a1a1a"/>
  </g>
  <g transform="translate(800, 750) rotate(-25) scale(0.7)">
    <path d="M -20,-30 L 20,-30 L 2,-2 L 20,26 L -20,26 L -2,2 Z" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
    <line x1="-22" y1="-30" x2="22" y2="-30" stroke="#1a1a1a" stroke-width="2.5"/>
    <line x1="-22" y1="26" x2="22" y2="26" stroke="#1a1a1a" stroke-width="2.5"/>
    <path d="M -8,22 Q 0,26 8,22" fill="#1a1a1a"/>
  </g>
  
  <path d="M 350,150 Q 320,180 340,210 Q 370,210 370,170 Z" fill="none" stroke="#1a1a1a" stroke-width="1"/>
  <path d="M 680,220 Q 710,240 690,270 Q 660,260 670,230 Z" fill="none" stroke="#1a1a1a" stroke-width="1"/>
</svg>`;
    }
    case 'historical-fiction': {
      let compassPointsHtml = '';
      for (let i = 0; i < 8; i++) {
        const angle = i * 45;
        compassPointsHtml += `
          <polygon points="0,0 0,-60 8,-20" stroke="#1a1a1a" stroke-width="0.8" fill="#1a1a1a" transform="rotate(${angle})"/>
          <polygon points="0,0 0,-60 -8,-20" stroke="#1a1a1a" stroke-width="0.8" fill="none" transform="rotate(${angle})"/>
        `;
      }
      for (let i = 0; i < 8; i++) {
        const angle = i * 45 + 22.5;
        compassPointsHtml += `
          <polygon points="0,0 0,-40 5,-15" stroke="#1a1a1a" stroke-width="0.5" fill="#1a1a1a" transform="rotate(${angle})"/>
          <polygon points="0,0 0,-40 -5,-15" stroke="#1a1a1a" stroke-width="0.5" fill="none" transform="rotate(${angle})"/>
        `;
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <path d="M 150,0 Q 450,500 150,1000 M 500,0 Q 800,500 500,1000 M 800,0 Q 1100,500 800,1000" stroke="#1a1a1a" stroke-width="0.4" fill="none" />
  <path d="M 0,250 Q 500,400 1000,250 M 0,600 Q 500,750 1000,600 M 0,850 Q 500,980 1000,850" stroke="#1a1a1a" stroke-width="0.4" fill="none" />

  <rect x="15" y="15" width="970" height="970" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <rect x="25" y="25" width="950" height="950" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,3" fill="none"/>
  
  <path d="M 15,60 C 40,60 60,40 60,15 M 985,60 C 960,60 940,40 940,15 M 15,940 C 40,940 60,960 60,985 M 985,940 C 960,940 940,960 940,985" stroke="#1a1a1a" stroke-width="1" fill="none"/>

  <g stroke="#1a1a1a" stroke-width="0.8" fill="none">
    <path d="M 450,300 L 480,250 L 510,300 Z M 480,250 L 475,275 M 480,250 L 488,280"/>
    <path d="M 490,320 L 525,260 L 560,320 Z M 525,260 L 518,290 M 525,260 L 535,295"/>
    <path d="M 540,290 L 570,240 L 600,290 Z M 570,240 L 565,265 M 570,240 L 578,270"/>
  </g>

  <g transform="translate(200, 800)">
    <circle cx="0" cy="0" r="70" stroke="#1a1a1a" stroke-width="1" fill="none"/>
    <circle cx="0" cy="0" r="64" stroke="#1a1a1a" stroke-dasharray="2,2" fill="none"/>
    ${compassPointsHtml}
    <circle cx="0" cy="0" r="6" fill="#1a1a1a"/>
  </g>
</svg>`;
    }
    case 'noir': {
      let shadows = '';
      for (const y of [-200, -120, -40, 40, 120, 200, 280, 360, 440, 520, 600, 680, 760, 840, 920, 1000]) {
        shadows += `<rect x="-300" y="${y}" width="1600" height="36" fill="#1a1a1a"/>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g transform="rotate(25, 500, 500)">
    ${shadows}
  </g>
  <g fill="#1a1a1a" stroke="none">
    <rect x="0" y="850" width="60" height="150" />
    <rect x="60" y="820" width="80" height="180" />
    <rect x="140" y="880" width="50" height="120" />
    <rect x="190" y="800" width="90" height="200" />
    <rect x="280" y="860" width="40" height="140" />
    <rect x="320" y="830" width="70" height="170" />
    <rect x="390" y="890" width="60" height="110" />
    <rect x="450" y="790" width="100" height="210" />
    <rect x="550" y="840" width="50" height="160" />
    <rect x="600" y="810" width="80" height="190" />
    <rect x="680" y="870" width="60" height="130" />
    <rect x="740" y="780" width="110" height="220" />
    <rect x="850" y="840" width="50" height="160" />
    <rect x="900" y="820" width="100" height="180" />
  </g>
</svg>`;
    }
    case 'existential-philosophical': {
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linecap="round">
    <circle cx="500" cy="500" r="40" stroke-width="1.2"/>
    
    <path d="M 500,420 A 80 80 0 1 1 420,500 A 80 80 0 0 1 500,580 L 500,540"/>
    <path d="M 500,380 A 120 120 0 1 1 380,500 A 120 120 0 0 1 500,620 L 500,580"/>
    <path d="M 500,340 A 160 160 0 1 1 340,500 A 160 160 0 0 1 500,660 L 500,620"/>
    <path d="M 500,300 A 200 200 0 1 1 300,500 A 200 200 0 0 1 500,700 L 500,660"/>
    <path d="M 500,260 A 240 240 0 1 1 260,500 A 240 240 0 0 1 500,740 L 500,700"/>
    <path d="M 500,220 A 280 280 0 1 1 220,500 A 280 280 0 0 1 500,780 L 500,740"/>
    <path d="M 500,180 A 320 320 0 1 1 180,500 A 320 320 0 0 1 500,820 L 500,780"/>
    <path d="M 500,140 A 360 360 0 1 1 140,500 A 360 360 0 0 1 500,860 L 500,820"/>
    
    <line x1="500" y1="140" x2="500" y2="420" />
    <line x1="500" y1="580" x2="500" y2="860" />
    <line x1="140" y1="500" x2="420" y2="500" />
    <line x1="580" y1="500" x2="860" y2="500" />
  </g>
</svg>`;
    }
    case 'war-literature': {
      let gridLines = '';
      for (const c of [200, 400, 600, 800]) {
        gridLines += `<line x1="${c}" y1="0" x2="${c}" y2="1000"/><line x1="0" y1="${c}" x2="1000" y2="${c}"/>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" stroke-width="0.3" stroke-dasharray="8,8">
    ${gridLines}
  </g>
  
  <g stroke="#1a1a1a" fill="none" stroke-width="1">
    <path d="M 500,300 C 650,200 800,250 850,350 C 900,450 800,550 700,500 C 600,450 450,400 500,300 Z" />
    <path d="M 550,320 C 660,240 760,280 800,350 C 840,420 760,500 680,460 C 600,420 520,380 550,320 Z" />
    <path d="M 600,340 C 680,280 730,300 750,350 C 770,400 720,450 660,420 Q 600,390 600,340 Z" />
    
    <path d="M 150,550 C 250,500 350,550 400,650 C 450,750 350,850 250,800 C 150,750 100,650 150,550 Z" />
    <path d="M 200,580 C 270,540 330,580 360,650 C 390,720 320,780 250,750 Q 150,720 200,580 Z" />
    <path d="M 240,610 C 290,580 320,610 330,650 C 340,690 290,730 250,700 Q 200,640 240,610 Z" />

    <path d="M 100,100 Q 300,150 400,50 T 800,150" />
    <path d="M 80,130 Q 290,180 380,80 T 780,180" />
    
    <g stroke="none" fill="#1a1a1a" font-family="monospace" font-size="10" font-weight="bold">
      <text x="655" y="375">+</text>
      <text x="665" y="380">485</text>
      <text x="275" y="655">+</text>
      <text x="285" y="660">321</text>
    </g>
  </g>
</svg>`;
    }
    case 'classical-ancient': {
      let wreathLeft = '';
      let wreathRight = '';
      for (const rot of [0, 15, 30, 45, 60, 75, 90, 105, 120, 135]) {
        wreathLeft += `<path d="M 0,0 C -15,-5 -20,-20 -5,-25 C 10,-20 5,-5 0,0 Z" fill="#1a1a1a" opacity="0.2" transform="translate(-75, 10) rotate(${rot - 60}) scale(0.7)"/>`;
        wreathRight += `<path d="M 0,0 C 15,-5 20,-20 5,-25 C -10,-20 -5,-5 0,0 Z" fill="#1a1a1a" opacity="0.2" transform="translate(75, 10) rotate(${-rot + 60}) scale(0.7)"/>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <rect x="0" y="70" width="1000" height="30" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <rect x="0" y="100" width="1000" height="10" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>

  <g stroke="#1a1a1a" stroke-width="1.5" fill="none">
    <path d="M 0,110 L 140,110 L 130,130 L 10,130 Z"/>
    <path d="M 10,130 Q 30,150 50,150 L 90,150 Q 110,150 130,130"/>
    <line x1="20" y1="150" x2="20" y2="1000" /><line x1="40" y1="150" x2="40" y2="1000" />
    <line x1="60" y1="150" x2="60" y2="1000" /><line x1="80" y1="150" x2="80" y2="1000" />
    <line x1="100" y1="150" x2="100" y2="1000" /><line x1="120" y1="150" x2="120" y2="1000" />
  </g>

  <g stroke="#1a1a1a" stroke-width="1.5" fill="none">
    <path d="M 1000,110 L 860,110 L 870,130 L 990,130 Z"/>
    <path d="M 990,130 Q 970,150 950,150 L 910,150 Q 890,150 870,130"/>
    <line x1="980" y1="150" x2="980" y2="1000" /><line x1="960" y1="150" x2="960" y2="1000" />
    <line x1="940" y1="150" x2="940" y2="1000" /><line x1="920" y1="150" x2="920" y2="1000" />
    <line x1="900" y1="150" x2="900" y2="1000" /><line x1="880" y1="150" x2="880" y2="1000" />
  </g>

  <g transform="translate(500, 300)" stroke="#1a1a1a" fill="none" stroke-width="1.2">
    <path d="M 0,60 C -60,60 -90,0 -80,-50 C -75,-70 -60,-90 -40,-100" />
    <path d="M 0,60 C 60,60 90,0 80,-50 C 75,-70 60,-90 40,-100" />
    ${wreathLeft}
    ${wreathRight}
    <path d="M -10,65 Q 0,55 10,65 Q 15,90 25,110 M -10,65 Q -15,90 -25,110" />
  </g>
</svg>`;
    }
    case 'modernist': {
      const keysHtml = [
        { cx: 300, cy: 700, char: 'A' },
        { cx: 370, cy: 750, char: 'E' },
        { cx: 750, cy: 220, char: 'X' },
        { cx: 830, cy: 170, char: 'O' }
      ].map(key => `
        <g transform="translate(${key.cx}, ${key.cy})">
          <circle cx="0" cy="0" r="18" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
          <circle cx="0" cy="0" r="15" stroke="#1a1a1a" stroke-width="0.5" fill="none"/>
          <text x="0" y="5" font-family="Courier New, monospace" font-size="14" font-weight="bold" fill="#1a1a1a" text-anchor="middle">${key.char}</text>
        </g>
      `).join('');

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" fill="none" stroke-width="0.8">
    <polygon points="150,150 350,100 450,280 200,320" />
    <polygon points="350,100 600,80 650,250 450,280" />
    <polygon points="200,320 450,280 400,550 150,480" />
    <polygon points="450,280 650,250 700,480 400,550" />
    
    <polygon points="600,600 850,550 900,780 650,820" />
    <polygon points="450,750 650,820 580,950 380,900" />

    <line x1="150" y1="150" x2="650" y2="250" />
    <line x1="350" y1="100" x2="200" y2="320" />
    <line x1="200" y1="320" x2="700" y2="480" />
    <line x1="450" y1="280" x2="150" y2="480" />
    <line x1="600" y1="600" x2="900" y2="780" />
    <line x1="850" y1="550" x2="650" y2="820" />
  </g>
  ${keysHtml}
</svg>`;
    }
    case 'adventure': {
      let degreeTicks = '';
      for (let i = 0; i < 72; i++) {
        const rad = (i * 5 * Math.PI) / 180;
        const length = i % 2 === 0 ? 15 : 8;
        const x1 = 500 + (365 - length) * Math.cos(rad);
        const y1 = 500 + (365 - length) * Math.sin(rad);
        const x2 = 500 + 365 * Math.cos(rad);
        const y2 = 500 + 365 * Math.sin(rad);
        degreeTicks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1a1a" stroke-width="0.8"/>`;
      }

      let compassPoints = '';
      for (let i = 0; i < 8; i++) {
        const angle = i * 45;
        compassPoints += `
          <polygon points="0,0 0,-330 20,-70" stroke="#1a1a1a" stroke-width="0.8" fill="#1a1a1a" transform="rotate(${angle})"/>
          <polygon points="0,0 0,-330 -20,-70" stroke="#1a1a1a" stroke-width="0.8" fill="none" transform="rotate(${angle})"/>
        `;
      }
      for (let i = 0; i < 8; i++) {
        const angle = i * 45 + 22.5;
        compassPoints += `
          <polygon points="0,0 0,-220 12,-50" stroke="#1a1a1a" stroke-width="0.6" fill="#1a1a1a" transform="rotate(${angle})"/>
          <polygon points="0,0 0,-220 -12,-50" stroke="#1a1a1a" stroke-width="0.6" fill="none" transform="rotate(${angle})"/>
        `;
      }
      for (let i = 0; i < 16; i++) {
        const angle = i * 22.5 + 11.25;
        compassPoints += `
          <polygon points="0,0 0,-140 7,-30" stroke="#1a1a1a" stroke-width="0.4" fill="#1a1a1a" transform="rotate(${angle})"/>
          <polygon points="0,0 0,-140 -7,-30" stroke="#1a1a1a" stroke-width="0.4" fill="none" transform="rotate(${angle})"/>
        `;
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <circle cx="500" cy="500" r="380" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <circle cx="500" cy="500" r="365" stroke="#1a1a1a" stroke-width="1" fill="none"/>
  <circle cx="500" cy="500" r="350" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,3" fill="none"/>
  ${degreeTicks}
  <g transform="translate(500, 500)">
    ${compassPoints}
    <circle cx="0" cy="0" r="15" fill="#1a1a1a"/>
    <circle cx="0" cy="0" r="6" fill="#fff" stroke="#1a1a1a" stroke-width="1.5"/>
  </g>
  <g fill="#1a1a1a" font-family="Georgia, serif" font-size="28" font-weight="bold" text-anchor="middle">
    <text x="500" y="115">N</text>
    <text x="500" y="915">S</text>
    <text x="895" y="510">E</text>
    <text x="105" y="510">W</text>
  </g>
</svg>`;
    }
    case 'satire-comedy': {
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g transform="translate(380, 500)">
    <path d="M -80,-120 Q -95,-100 -90,-20 Q -85,110 0,110 Q 85,110 90,-20 Q 95,-100 80,-120 Q 0,-90 -80,-120 Z" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M -45,-30 Q -30,-45 -15,-30" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
    <path d="M 15,-30 Q 30,-45 45,-30" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
    <path d="M 0,-10 L -5,20 L 5,20 Z M -5,20 Q 0,25 5,20" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
    <path d="M -50,30 Q 0,75 50,30 C 40,65 -40,65 -50,30 Z" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.1"/>
  </g>

  <g transform="translate(620, 500)">
    <path d="M -80,-120 Q -95,-100 -90,-20 Q -85,110 0,110 Q 85,110 90,-20 Q 95,-100 80,-120 Q 0,-90 -80,-120 Z" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M -45,-35 Q -30,-20 -15,-35" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
    <path d="M 15,-35 Q 30,-20 45,-35" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
    <path d="M -40,-15 Q -43,10 -35,5 Q -30,-5 -40,-15" fill="#1a1a1a"/>
    <path d="M 0,-10 L -5,20 L 5,20 Z" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
    <path d="M -45,55 Q 0,20 45,55 C 30,40 -30,40 -45,55" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.1"/>
  </g>

  <polygon points="200,250 215,225 200,200 185,225" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <polygon points="800,250 815,225 800,200 785,225" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <polygon points="500,200 503,208 512,210 505,216 508,225 500,220 492,225 495,216 488,210 497,208" stroke="#1a1a1a" stroke-width="1" fill="none"/>
</svg>`;
    }
    case 'tragedy': {
      let sandGrains = '';
      for (let i = 0; i < 15; i++) {
        sandGrains += `<circle cx="${-10 + Math.random() * 60}" cy="${-10 + Math.random() * 80}" r="2" fill="#1a1a1a" stroke="none" />`;
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" stroke-width="1" fill="none">
    <path d="M 0,0 C 100,20 200,100 250,250" stroke-width="2"/>
    <path d="M 50,12 C 55,50 60,100 40,150" />
    <path d="M 100,32 C 110,80 120,150 90,220" />
    <path d="M 150,62 C 170,120 180,200 150,280" />
  </g>
  <g stroke="#1a1a1a" stroke-width="1" fill="none">
    <path d="M 1000,0 C 900,20 800,100 750,250" stroke-width="2"/>
    <path d="M 950,12 C 945,50 940,100 960,150" />
    <path d="M 900,32 C 890,80 880,150 910,220" />
    <path d="M 850,62 C 830,120 820,200 850,280" />
  </g>

  <g transform="translate(500, 500)" stroke="#1a1a1a" fill="none" stroke-width="1.8">
    <rect x="-110" y="-220" width="220" height="20" rx="4"/>
    <rect x="-110" y="200" width="220" height="20" rx="4"/>
    
    <line x1="-90" y1="-200" x2="-90" y2="200" stroke-width="2.5" />
    <line x1="90" y1="-200" x2="90" y2="200" stroke-width="2.5" />
    
    <path d="M -70,-200 C -70,-80 -15,-20 -15,0 C -15,20 -70,80 -70,200 L 70,200 C 70,80 15,20 15,0 C 15,-20 70,-80 70,-200 Z" />
    
    <path d="M -30,-40 L 5,0 L -10,30 L 25,60 M 5,0 L 40,-25 L 30,-50" stroke="#1a1a1a" stroke-width="2"/>

    <path d="M -60,-190 C -60,-150 -40,-130 0,-130 C 40,-130 60,-150 60,-190 Z" fill="#1a1a1a" fill-opacity="0.15"/>
    <path d="M -65,190 C -55,100 -20,120 0,120 C 20,120 55,100 65,190 Z" fill="#1a1a1a" fill-opacity="0.15"/>
    ${sandGrains}
  </g>
</svg>`;
    }
    case 'epic': {
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g stroke="#1a1a1a" fill="none" stroke-width="1.5">
    <path d="M 250,180 C 350,140 650,140 750,180 M 250,180 C 230,190 230,210 250,210 C 350,170 650,170 750,210 C 770,210 770,190 750,180" />
    <path d="M 200,680 Q 500,780 800,680 L 820,730 Q 500,830 180,730 Z" fill="#1a1a1a" fill-opacity="0.1"/>
  </g>

  <g transform="translate(500, 440)" stroke="#1a1a1a" fill="none" stroke-width="2.5">
    <path d="M -180,-200 L 180,-200 C 180,-200 190,0 0,220 C -190,0 -180,-200 -180,-200 Z" />
    <path d="M -160,-185 L 160,-185 C 160,-185 170,-10 0,195 C -170,-10 -160,-185 -160,-185 Z" stroke-width="1" stroke-dasharray="3,3"/>
    
    <line x1="0" y1="-200" x2="0" y2="195" stroke-width="1.8" />
    <line x1="-173" y1="-20" x2="173" y2="-20" stroke-width="1.8" />

    <g transform="translate(-80, -110)" stroke-width="1.5">
      <path d="M -40,25 L -50,-15 L -20,5 L 0,-25 L 20,5 L 50,-15 L 40,25 Z M -45,25 Q 0,32 45,25" />
      <circle cx="-50" cy="-15" r="3" fill="#1a1a1a"/><circle cx="0" cy="-25" r="4" fill="#1a1a1a"/><circle cx="50" cy="-15" r="3" fill="#1a1a1a"/>
    </g>

    <g transform="translate(80, -110)" stroke-width="1.5">
      <path d="M -45,-10 C -30,-25 30,-25 45,-10 C 35,5 20,10 0,-5 C -20,10 -35,5 -45,-10 Z" fill="#1a1a1a" fill-opacity="0.2"/>
    </g>

    <g transform="translate(-75, 75) rotate(45)" stroke-width="1.5">
      <line x1="0" y1="-45" x2="0" y2="45" /><line x1="-12" y1="30" x2="12" y2="30" /><circle cx="0" cy="48" r="4" fill="#1a1a1a"/>
      <g transform="rotate(90)"><line x1="0" y1="-45" x2="0" y2="45" /><line x1="-12" y1="30" x2="12" y2="30" /></g>
    </g>

    <g transform="translate(80, 80) scale(0.9)" stroke-width="1.5">
      <path d="M -20,30 Q -15,10 -30,0 C -35,-15 -20,-30 0,-30 C 20,-30 35,-15 30,10" />
    </g>
  </g>
</svg>`;
    }
    case 'supernatural': {
      let starsHtml = '';
      const starPts = [ { x: 150, y: 150 }, { x: 280, y: 350 }, { x: 800, y: 200 }, { x: 750, y: 400 }, { x: 200, y: 800 }, { x: 850, y: 850 } ];
      for (const s of starPts) {
        starsHtml += `<g transform="translate(${s.x}, ${s.y})">
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#1a1a1a" stroke-width="0.8"/>
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#1a1a1a" stroke-width="0.8"/>
          <circle cx="0" cy="0" r="3" fill="#1a1a1a"/>
        </g>`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <circle cx="500" cy="250" r="140" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="500" cy="250" r="130" stroke="#1a1a1a" stroke-dasharray="2,5" fill="none"/>
  <circle cx="430" cy="200" r="15" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
  <circle cx="560" cy="310" r="22" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
  
  <g transform="translate(500, 650)">
    <ellipse cx="0" cy="0" rx="12" ry="70" fill="#1a1a1a"/>
    <circle cx="0" cy="-80" r="14" fill="#1a1a1a"/>
    <path d="M -5,-90 Q -40,-130 -80,-140" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M 5,-90 Q 40,-130 80,-140" stroke="#1a1a1a" stroke-width="2" fill="none"/>
    <path d="M 0,-40 C -80,-150 -280,-180 -320,-80 C -340,0 -200,40 -20,10" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.15"/>
    <path d="M 0,-40 C 80,-150 280,-180 320,-80 C 340,0 200,40 20,10" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.15"/>
    <path d="M -15,10 C -80,40 -220,150 -180,210 C -140,270 -50,150 0,30" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.1"/>
    <path d="M 15,10 C 80,40 220,150 180,210 C 140,270 50,150 0,30" stroke="#1a1a1a" stroke-width="2" fill="#1a1a1a" fill-opacity="0.1"/>
    <circle cx="-160" cy="-60" r="22" stroke="#1a1a1a" stroke-width="1.5" fill="none"/><circle cx="-160" cy="-60" r="10" fill="#1a1a1a"/>
    <circle cx="160" cy="-60" r="22" stroke="#1a1a1a" stroke-width="1.5" fill="none"/><circle cx="160" cy="-60" r="10" fill="#1a1a1a"/>
  </g>
  ${starsHtml}
</svg>`;
    }
    case 'political-fiction': {
      const drawChainLink = (broken: boolean) => {
        if (!broken) {
          return `<rect x="-18" y="-45" width="36" height="90" rx="18" stroke="#1a1a1a" stroke-width="6" fill="none"/>
                  <rect x="-10" y="-35" width="20" height="70" rx="10" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>`;
        } else {
          return `
            <path d="M -18,15 L -18,-27 C -18,-45 -4,-45 0,-45" stroke="#1a1a1a" stroke-width="6" fill="none" stroke-linecap="round"/>
            <path d="M -10,15 L -10,-27 C -10,-35 -2,-35 0,-35" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
            <path d="M 18,-15 L 18,27 C 18,45 4,45 0,45" stroke="#1a1a1a" stroke-width="6" fill="none" stroke-linecap="round"/>
            <path d="M 10,-15 L 10,27 C 10,35 2,35 0,35" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
            <g stroke="#1a1a1a" stroke-width="0.8">
              <line x1="-5" y1="-50" x2="-25" y2="-65" /><line x1="5" y1="-50" x2="25" y2="-65" />
              <line x1="-5" y1="50" x2="-25" y2="65" /><line x1="5" y1="50" x2="25" y2="65" />
            </g>
          `;
        }
      };

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g transform="translate(180, 250) rotate(35) scale(1.4)">${drawChainLink(false)}</g>
  <g transform="translate(290, 330) rotate(55) scale(1.4)">${drawChainLink(false)}</g>
  <g transform="translate(420, 400) rotate(20) scale(1.4)">${drawChainLink(true)}</g>
  <g transform="translate(700, 250) rotate(-40) scale(1.3)">${drawChainLink(false)}</g>
  <g transform="translate(810, 310) rotate(-15) scale(1.3)">${drawChainLink(true)}</g>
  <g transform="translate(450, 750) rotate(85) scale(1.5)">${drawChainLink(false)}</g>
  <g transform="translate(580, 760) rotate(110) scale(1.5)">${drawChainLink(true)}</g>
</svg>`;
    }
    case 'psychological-thriller': {
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <circle cx="500" cy="500" r="420" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <circle cx="500" cy="500" r="405" stroke="#1a1a1a" stroke-width="0.8" stroke-dasharray="4,4" fill="none"/>

  <g stroke="#1a1a1a" fill="none" stroke-width="1.2" stroke-linejoin="bevel">
    <path d="M 475,455 Q 480,450 485,455 T 485,465 T 475,465 Z" stroke-width="2"/>
    <circle cx="480" cy="460" r="15" stroke-width="1"/>
    <path d="M 470,450 L 350,300 L 210,210 L 50,150 M 350,300 L 260,180 L 150,80 M 210,210 L 110,310 C 50,340 0,380 0,380" />
    <path d="M 490,450 L 620,320 L 780,220 L 950,120 M 620,320 L 720,180 L 850,60" />
    <path d="M 490,470 L 650,580 L 800,720 L 920,880 M 650,580 L 780,620 C 850,650 900,680 900,680" />
    <path d="M 470,470 L 320,620 L 220,780 L 100,920 M 320,620 L 200,690 C 140,700 80,720 80,720" />
    <path d="M 480,445 L 485,280 L 450,120 M 480,475 L 475,690 L 520,850" />
    <path d="M 350,300 L 485,280 L 620,320 L 650,580 L 475,690 L 320,620 Z" />
  </g>
</svg>`;
    }
    case 'literary-fiction': {
      let bookLeftText = '';
      let bookRightText = '';
      for (let i = 0; i < 10; i++) {
        const y = -100 + i * 24;
        bookLeftText += `<line x1="-250" y1="${y}" x2="-50" y2="${y}" stroke-width="1" stroke-dasharray="${i % 3 === 0 ? '40,10,60,10,30' : '80,10,40,10,20'}" />`;
        bookRightText += `<line x1="50" y1="${y}" x2="250" y2="${y}" stroke-width="1" stroke-dasharray="${i % 2 === 0 ? '60,10,80,10,20' : '40,10,50,10,60'}" />`;
      }

      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
  <g transform="translate(500, 550)" stroke="#1a1a1a" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M -300,-150 C -150,-170 -50,-170 0,-130 L 0,220 C -50,180 -150,180 -300,200 Z" fill="#1a1a1a" fill-opacity="0.05"/>
    <path d="M 300,-150 C 150,-170 50,-170 0,-130 L 0,220 C 50,180 150,180 300,200 Z" fill="#1a1a1a" fill-opacity="0.05"/>

    <path d="M 0,-130 C -50,-170 -150,-170 -300,-150 L -300,200 C -150,180 -50,180 0,140 Z" />
    <path d="M 0,-130 C 50,-170 150,-170 300,-150 L 300,200 C 150,180 50,180 0,140 Z" />
    <line x1="0" y1="-130" x2="0" y2="140" stroke-width="2" />
    <path d="M -300,-150 C -310,-150 -320,-140 -300,-130" />
    <path d="M 300,-150 C 310,-150 320,-140 300,-130" />

    ${bookLeftText}
    ${bookRightText}

    <g transform="translate(-100, -220) rotate(-15)">
      <path d="M -40,30 L 220,-60" stroke-width="2.5" />
      <path d="M 20,8 C 40,-15 150,-65 220,-60 C 200,-35 80,-5 20,8 Z" fill="#1a1a1a" fill-opacity="0.15"/>
    </g>
  </g>
</svg>`;
  }
}
  return null;
};

const getGenrePattern = (genre: string, era: string): string | null => {
  if (era === 'dummy_unused_linter') return null;
  const raw = getGenrePatternRaw(genre);
  if (!raw) return null;

  const g = (genre || '').toLowerCase().trim();
  let matchedGenre = '';
  if (g.includes('gothic')) matchedGenre = 'gothic';
  else if (g.includes('horror')) matchedGenre = 'horror';
  else if (g.includes('romance')) matchedGenre = 'romance';
  else if (g.includes('mystery')) matchedGenre = 'mystery';
  else if (g.includes('fantasy')) matchedGenre = 'fantasy';
  else if (g.includes('sufi')) matchedGenre = 'sufi';
  else if (g.includes('science') || g.includes('sci-fi')) matchedGenre = 'science-fiction';
  else if (g.includes('dystopian')) matchedGenre = 'dystopian';
  else if (g.includes('magical') || g.includes('magic')) matchedGenre = 'magical-realism';
  else if (g.includes('historical')) matchedGenre = 'historical-fiction';
  else if (g.includes('noir')) matchedGenre = 'noir';
  else if (g.includes('existential') || g.includes('philosophical')) matchedGenre = 'existential-philosophical';
  else if (g.includes('war')) matchedGenre = 'war-literature';
  else if (g.includes('classical') || g.includes('ancient')) matchedGenre = 'classical-ancient';
  else if (g.includes('modernist') || g.includes('modernism')) matchedGenre = 'modernist';
  else if (g.includes('adventure')) matchedGenre = 'adventure';
  else if (g.includes('satire') || g.includes('comedy')) matchedGenre = 'satire-comedy';
  else if (g.includes('tragedy')) matchedGenre = 'tragedy';
  else if (g.includes('epic')) matchedGenre = 'epic';
  else if (g.includes('supernatural')) matchedGenre = 'supernatural';
  else if (g.includes('political')) matchedGenre = 'political-fiction';
  else if (g.includes('psychological') || g.includes('thriller')) matchedGenre = 'psychological-thriller';
  else if (g.includes('literary')) matchedGenre = 'literary-fiction';

  let opacity = 0.12;
  if (matchedGenre === 'gothic') {
    opacity = 0.15;
  }

  const openTagEndIndex = raw.indexOf('>');
  if (openTagEndIndex === -1) return raw;

  let openTag = raw.substring(0, openTagEndIndex);
  const rest = raw.substring(openTagEndIndex);

  const newStyle = `style="position:absolute;top:0;left:0;opacity:${opacity};pointer-events:none;"`;

  const styleMatch = openTag.match(/style="[^"]*"/);
  if (styleMatch) {
    openTag = openTag.replace(styleMatch[0], newStyle);
  } else {
    openTag += ` ${newStyle}`;
  }

  const widthMatch = openTag.match(/width="[^"]*"/);
  if (widthMatch) {
    openTag = openTag.replace(widthMatch[0], 'width="100%"');
  } else {
    openTag += ' width="100%"';
  }

  const heightMatch = openTag.match(/height="[^"]*"/);
  if (heightMatch) {
    openTag = openTag.replace(heightMatch[0], 'height="100%"');
  } else {
    openTag += ' height="100%"';
  }

  return openTag + rest;
};

const getAtmosphereConfig = (genre: string, era: string): AtmosphereConfig => {
  const gId = (genre || '').toLowerCase().trim();
  const eId = (era || '').toLowerCase().trim();

  let gConfig = genreProfiles[gId];
  if (!gConfig) {
    const matchedKey = Object.keys(genreProfiles).find(k => gId.includes(k) || k.includes(gId));
    if (matchedKey) {
      gConfig = genreProfiles[matchedKey];
    } else {
      const hash = hashString(gId);
      const isDark = hash % 2 === 0;
      const motifKeys = Object.keys(genreProfiles);
      const motifFallback = genreProfiles[motifKeys[hash % motifKeys.length]].motif;
      gConfig = {
        hue: hash % 360,
        saturation: 50 + (hash % 40),
        lightness: isDark ? 8 + (hash % 8) : 88 + (hash % 8),
        darkMood: isDark,
        motif: motifFallback
      };
    }
  }

  let eConfig = eraProfiles[eId];
  if (!eConfig) {
    const matchedKey = Object.keys(eraProfiles).find(k => eId.includes(k) || k.includes(eId));
    if (matchedKey) {
      eConfig = eraProfiles[matchedKey];
    } else {
      const hash = hashString(eId);
      const structKeys = Object.keys(eraProfiles);
      const structFallback = eraProfiles[structKeys[hash % structKeys.length]].structure;
      const fontFamilies = [
        `'Playfair Display', Georgia, serif`,
        `Georgia, serif`,
        `'Inter', system-ui, sans-serif`,
        `monospace, 'Courier New', Courier`
      ];
      gConfig.darkMood = gConfig.darkMood || (hash % 3 === 0);
      eConfig = {
        hueShift: (hash % 60) - 30,
        lightnessLimit: gConfig.darkMood ? 5 + (hash % 10) : 85 + (hash % 12),
        fontFamily: fontFamilies[hash % fontFamilies.length],
        italicText: hash % 2 === 0,
        structure: structFallback
      };
    }
  }

  const isDarkTheme = gConfig.darkMood || eConfig.lightnessLimit < 40;
  const baseHue = gConfig.hue;
  const baseSat = Math.max(10, Math.min(100, gConfig.saturation));

  let finalBg: string;
  let panelBg: string;
  let panelText: string;
  let chatText: string;
  let bubbleModelStyle: React.CSSProperties;
  let bubbleUserStyle: React.CSSProperties;
  let inputBarStyle: React.CSSProperties;

  if (isDarkTheme) {
    const mainLightness = Math.min(gConfig.lightness, eConfig.lightnessLimit, 12);
    finalBg = `radial-gradient(circle at 75% 25%, hsl(${baseHue}, ${baseSat}%, ${mainLightness + 8}%) 0%, hsl(${baseHue}, ${Math.max(10, baseSat - 15)}%, ${mainLightness}%) 60%, hsl(${baseHue}, ${Math.max(5, baseSat - 25)}%, ${Math.max(1, mainLightness - 4)}%) 100%)`;
    panelBg = `hsla(${baseHue}, ${Math.max(10, baseSat - 15)}%, ${mainLightness - 2}%, 0.95)`;
    panelText = `hsl(${baseHue}, 50%, 75%)`;
    
    if (gId.includes('sufi') || gId.includes('gothic') || gId.includes('epic') || gId.includes('fantasy')) {
      panelText = '#d4af37';
    }
    chatText = `hsl(${baseHue}, 15%, 92%)`;

    bubbleModelStyle = {
      background: `hsla(${baseHue}, ${baseSat}%, 15%, 0.45)`,
      color: `hsl(${baseHue}, 15%, 92%)`,
      border: `1px solid hsla(${baseHue}, ${baseSat}%, 60%, 0.22)`,
      borderLeft: `4px solid ${panelText}`,
      backdropFilter: 'blur(16px)',
      fontFamily: eConfig.fontFamily
    };

    bubbleUserStyle = {
      background: panelText,
      color: `hsl(${baseHue}, ${baseSat}%, 4%)`,
      fontWeight: 600,
    };

    inputBarStyle = {
      background: `hsla(${baseHue}, ${Math.max(5, baseSat - 20)}%, 3%, 0.98)`,
      borderTop: `1px solid hsla(${baseHue}, ${baseSat}%, 60%, 0.15)`,
    };
  } else {
    const mainLightness = Math.max(gConfig.lightness, 85);
    finalBg = `radial-gradient(circle at 25% 75%, hsl(${baseHue}, ${Math.min(40, baseSat)}%, ${mainLightness}%) 0%, hsl(${(baseHue + 20) % 360}, ${Math.min(30, baseSat - 10)}%, ${mainLightness - 4}%) 60%, hsl(${(baseHue + 40) % 360}, ${Math.min(20, baseSat - 15)}%, ${mainLightness - 8}%) 100%)`;
    panelBg = `hsla(${baseHue}, 20%, ${mainLightness - 2}%, 0.95)`;
    panelText = `hsl(${baseHue}, 60%, 25%)`;
    chatText = `hsl(${baseHue}, 40%, 12%)`;

    bubbleModelStyle = {
      background: `hsla(${baseHue}, 30%, 95%, 0.7)`,
      color: `hsl(${baseHue}, 40%, 12%)`,
      border: `1px solid hsla(${baseHue}, 30%, 75%, 0.35)`,
      borderLeft: `4px solid ${panelText}`,
      backdropFilter: 'blur(12px)',
      fontFamily: eConfig.fontFamily
    };

    bubbleUserStyle = {
      background: panelText,
      color: '#ffffff',
      fontWeight: 500,
    };

    inputBarStyle = {
      background: `hsla(${baseHue}, 20%, 93%, 0.98)`,
      borderTop: `1px solid hsla(${baseHue}, 30%, 75%, 0.25)`,
    };
  }

  const bgDecorations = (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <div 
        style={{
          position: 'absolute',
          right: '15%',
          top: '20%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: `hsla(${baseHue}, ${baseSat}%, ${isDarkTheme ? '12%' : '82%'}, 0.25)`,
          filter: 'blur(120px)',
        }}
        className="animate-pulse"
      />
      <div 
        style={{
          position: 'absolute',
          left: '10%',
          bottom: '15%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: `hsla(${(baseHue + 120) % 360}, ${baseSat}%, ${isDarkTheme ? '10%' : '88%'}, 0.2)`,
          filter: 'blur(100px)',
        }}
      />
    </div>
  );

  return {
    themeName: `${gId}-${eId}`,
    bgStyle: {
      background: finalBg,
      color: chatText,
    },
    panelBg,
    panelText,
    chatText,
    bubbleModelStyle,
    bubbleUserStyle,
    inputBarStyle,
    companionBubbleTextItalic: eConfig.italicText,
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

  const filters = { genre: selectedGenre, era: selectedEra };
  console.log('Current genre pattern:', filters?.genre, getGenrePattern(filters?.genre, filters?.era) ? 'HAS PATTERN' : 'NO PATTERN');

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
          <style dangerouslySetInnerHTML={{ __html: `
            /* Override global Navbar when in Chat room */
            nav {
              background-color: ${atmConfig.panelBg} !important;
              border-color: ${atmConfig.themeName.includes('classic-paper') ? 'rgba(26, 26, 26, 0.15)' : 'rgba(255, 255, 255, 0.1)'} !important;
              box-shadow: none !important;
              transition: background-color 1.5s ease, border-color 1.5s ease !important;
            }
            nav a, nav button, nav span, nav div {
              color: ${atmConfig.panelText} !important;
            }
            nav input {
              background-color: ${atmConfig.themeName.includes('classic-paper') ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'} !important;
              color: ${atmConfig.panelText} !important;
              border-color: ${atmConfig.themeName.includes('classic-paper') ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'} !important;
            }
            nav svg {
              stroke: ${atmConfig.panelText} !important;
              color: ${atmConfig.panelText} !important;
            }
          `}} />
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
          {!wizardActive && getGenrePattern(selectedGenre, selectedEra) && (
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
              dangerouslySetInnerHTML={{ __html: getGenrePattern(selectedGenre, selectedEra) || '' }}
            />
          )}
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

                        <p className={`font-inter text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'model' ? `${atmConfig.companionBubbleTextItalic ? 'italic' : ''} font-playfair text-base font-normal` : ''}`} style={{ color: isUser ? atmConfig.bubbleUserStyle.color : atmConfig.bubbleModelStyle.color, fontFamily: isUser ? undefined : atmConfig.bubbleModelStyle.fontFamily }}>
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
