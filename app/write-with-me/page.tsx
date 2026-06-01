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
  'Realism',
  'Sufi',
  'Classical',
  'Science Fiction',
  'Dystopian',
  'Psychological Thriller',
  'Adventure',
  'Satire',
  'Tragedy',
  'Comedy',
  'Epic',
  'Noir',
  'Existential',
  'Supernatural',
  'War Literature',
  'Political Fiction',
  'Philosophical Fiction',
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

const getGenrePatternRaw = (genre: string): string | null => {
  const g = (genre || '').toLowerCase().trim();

  let matchedGenre = '';
  if (g.includes('gothic')) matchedGenre = 'gothic';
  else if (g.includes('horror')) matchedGenre = 'horror';
  else if (g.includes('romance')) matchedGenre = 'romance';
  else if (g.includes('mystery')) matchedGenre = 'mystery';
  else if (g.includes('fantasy')) matchedGenre = 'fantasy';
  else if (g.includes('realism')) matchedGenre = 'realism';
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

  // Opacity rule - 0.14 uniformly across all genres
  const opacity = 0.14;

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
    case 'realism': {
      let linesHtml = '';
      for (let i = 0; i < 20; i++) {
        const y = 50 + i * 48;
        linesHtml += `<line x1="0" y1="${y}" x2="1000" y2="${y}" stroke="#1a1a1a" stroke-width="0.8" />`;
      }
      return `<svg viewBox="0 0 1000 1000" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="opacity: ${opacity}; pointer-events: none;">
        ${linesHtml}
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
        const x1 = 680 + (365 - length) * Math.cos(rad);
        const y1 = 600 + (365 - length) * Math.sin(rad);
        const x2 = 680 + 365 * Math.cos(rad);
        const y2 = 600 + 365 * Math.sin(rad);
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
  <circle cx="680" cy="600" r="380" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <circle cx="680" cy="600" r="365" stroke="#1a1a1a" stroke-width="1" fill="none"/>
  <circle cx="680" cy="600" r="350" stroke="#1a1a1a" stroke-width="0.5" stroke-dasharray="2,3" fill="none"/>
  ${degreeTicks}
  <g transform="translate(680, 600)">
    ${compassPoints}
    <circle cx="0" cy="0" r="15" fill="#1a1a1a"/>
    <circle cx="0" cy="0" r="6" fill="#fff" stroke="#1a1a1a" stroke-width="1.5"/>
  </g>
  <g fill="#1a1a1a" font-family="Georgia, serif" font-size="28" font-weight="bold" text-anchor="middle">
    <text x="680" y="215">N</text>
    <text x="680" y="985">S</text>
    <text x="1065" y="610">E</text>
    <text x="285" y="610">W</text>
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
}> = {
  romance: { hue: 345, saturation: 85, lightness: 96, darkMood: false },
  gothic: { hue: 350, saturation: 60, lightness: 10, darkMood: true },
  horror: { hue: 0, saturation: 80, lightness: 5, darkMood: true },
  mystery: { hue: 240, saturation: 50, lightness: 12, darkMood: true },
  fantasy: { hue: 150, saturation: 70, lightness: 8, darkMood: true },
  realism: { hue: 28, saturation: 30, lightness: 45, darkMood: false },
  sufi: { hue: 260, saturation: 80, lightness: 8, darkMood: true },
  classical: { hue: 40, saturation: 15, lightness: 90, darkMood: false },
  'science-fiction': { hue: 190, saturation: 90, lightness: 6, darkMood: true },
  dystopian: { hue: 45, saturation: 80, lightness: 6, darkMood: true },
  'magical-realism': { hue: 280, saturation: 40, lightness: 85, darkMood: false },
  'historical-fiction': { hue: 35, saturation: 45, lightness: 30, darkMood: true },
  'psychological-thriller': { hue: 210, saturation: 10, lightness: 15, darkMood: true },
  adventure: { hue: 175, saturation: 65, lightness: 25, darkMood: true },
  satire: { hue: 60, saturation: 70, lightness: 45, darkMood: false },
  tragedy: { hue: 210, saturation: 25, lightness: 20, darkMood: true },
  comedy: { hue: 24, saturation: 85, lightness: 60, darkMood: false },
  epic: { hue: 40, saturation: 50, lightness: 15, darkMood: true },
  noir: { hue: 0, saturation: 0, lightness: 8, darkMood: true },
  existential: { hue: 220, saturation: 40, lightness: 4, darkMood: true },
  supernatural: { hue: 275, saturation: 70, lightness: 10, darkMood: true },
  'war-literature': { hue: 90, saturation: 20, lightness: 15, darkMood: true },
  'political-fiction': { hue: 220, saturation: 45, lightness: 35, darkMood: true },
  'philosophical-fiction': { hue: 195, saturation: 30, lightness: 40, darkMood: true },
  'literary-fiction': { hue: 30, saturation: 10, lightness: 88, darkMood: false }
};

interface AtmosphereConfig {
  themeName: string;
  isDark: boolean;
  bgStyle: React.CSSProperties;
  panelBg: string;
  panelText: string;
  chatText: string;
  bubbleModelStyle: React.CSSProperties;
  bubbleUserStyle: React.CSSProperties;
  inputBarStyle: React.CSSProperties;
  bgDecorations: React.ReactNode;
}

const getAtmosphereConfig = (genre: string): AtmosphereConfig => {
  const gId = (genre || '').toLowerCase().trim().replace(/\s+/g, '-');
  
  let gConfig = genreProfiles[gId];
  if (!gConfig) {
    const matchedKey = Object.keys(genreProfiles).find(k => gId.includes(k) || k.includes(gId));
    if (matchedKey) {
      gConfig = genreProfiles[matchedKey];
    } else {
      const hash = hashString(gId);
      const isDark = hash % 2 === 0;
      gConfig = {
        hue: hash % 360,
        saturation: 50 + (hash % 40),
        lightness: isDark ? 8 + (hash % 8) : 88 + (hash % 8),
        darkMood: isDark
      };
    }
  }

  const isDarkTheme = gConfig.darkMood;
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
    const mainLightness = Math.min(gConfig.lightness, 12);
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
      fontFamily: `'Playfair Display', Georgia, serif`
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
      fontFamily: `'Playfair Display', Georgia, serif`
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

  // Create ambient circle decorations
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
    themeName: gId,
    isDark: isDarkTheme,
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
    bgDecorations,
  };
};


const getGenrePattern = (genre: string): string | null => {
  const raw = getGenrePatternRaw(genre);
  if (!raw) return null;

  // Opacity rule - 0.14 uniformly across all genres
  const opacity = 0.14;

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

export default function WriteWithMePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Screens: 'setup' | 'writing' | 'ended'
  const [screen, setScreen] = useState<'setup' | 'writing' | 'ended'>('setup');
  const [genre, setGenre] = useState('Literary Fiction');
  const [tone, setTone] = useState('Suspenseful');
  const [aiFirst, setAiFirst] = useState(true);

  const atmConfig = getAtmosphereConfig(genre);

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
      <div className="min-h-screen bg-[#F8F4E9] flex items-center justify-center relative z-10">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-[#1a1a1a] border-r-2 animate-spin" />
          <span className="font-playfair text-lg text-[#1a1a1a] font-medium italic">Attuning writing frequencies...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Cream background for setup screen, or transparent for active writing screen to let the dynamic theme show through */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#F8F4E9',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {/* Dynamic atmospheric background gradient for writing/ended screens */}
      {screen !== 'setup' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: atmConfig.bgStyle.background,
            zIndex: 0,
            transition: 'background 1.5s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Dynamic ambient circle decorations */}
      {screen !== 'setup' && atmConfig.bgDecorations}
      
      {/* Dynamic navbar theme overrides */}
      {screen !== 'setup' && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Override global Navbar when in active writing room */
          nav {
            background-color: ${atmConfig.panelBg} !important;
            border-color: ${atmConfig.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(26, 26, 26, 0.15)'} !important;
            box-shadow: none !important;
            transition: background-color 1.5s ease, border-color 1.5s ease !important;
          }
          nav a, nav button, nav span, nav div {
            color: ${atmConfig.panelText} !important;
          }
          nav input {
            background-color: ${atmConfig.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} !important;
            color: ${atmConfig.panelText} !important;
            border-color: ${atmConfig.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'} !important;
          }
          nav svg {
            stroke: ${atmConfig.panelText} !important;
            color: ${atmConfig.panelText} !important;
          }
        `}} />
      )}

      {/* Background Pattern - Do not touch, leave as it is */}
      {getGenrePattern(genre) && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
          dangerouslySetInnerHTML={{ __html: getGenrePattern(genre) || '' }}
        />
      )}
      <div className="relative z-10 w-full min-h-screen pt-28 pb-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Dashboard Back Link */}
      <div className="mb-4 text-left">
        <Link
          href="/dashboard"
          style={{ color: screen !== 'setup' ? atmConfig.panelText : '#1a1a1a' }}
          className="text-xs hover:opacity-75 transition-all inline-flex items-center gap-1 font-inter font-semibold transition-colors duration-1000"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Heading block */}
      <div className="text-center mb-10 select-none">
        <h1 
          style={{ color: screen !== 'setup' ? atmConfig.panelText : '#1a1a1a' }}
          className="font-playfair text-4xl sm:text-5xl font-bold tracking-wide transition-colors duration-1000"
        >
          Write With Me
        </h1>
        <p 
          style={{ color: screen !== 'setup' ? (atmConfig.isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,26,26,0.6)') : '#6b6b6b' }}
          className="font-playfair italic text-sm mt-3 max-w-xl mx-auto leading-relaxed transition-colors duration-1000"
        >
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
            <div className="bg-white/40 backdrop-blur-md border border-[#1a1a1a]/10 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-[#1a1a1a]">
              <h3 className="font-playfair text-xl font-bold text-[#1a1a1a] border-b border-[#1a1a1a]/10 pb-2">
                Conceive the Foundation
              </h3>

              {/* Selection selects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/85 mb-2 font-inter">
                    Genre Focus
                  </label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none bg-white border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-semibold focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    {genresList.map((g) => (
                      <option key={g} value={g} className="text-[#1a1a1a] bg-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/85 mb-2 font-inter">
                    Tone Harmony
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl outline-none bg-white border border-[#1a1a1a]/15 text-[#1a1a1a] text-xs font-semibold focus:border-[#1a1a1a] transition-all cursor-pointer"
                  >
                    {tonesList.map((t) => (
                      <option key={t} value={t} className="text-[#1a1a1a] bg-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggle switch for first line */}
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1a1a1a] font-inter block">Let AI open the story</span>
                  <span className="text-[10px] text-[#6b6b6b] font-inter">
                    AI will compose an atmospheric, tense starting sentence to set the tone
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiFirst(!aiFirst)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    aiFirst ? 'bg-[#1a1a1a]' : 'bg-[#1a1a1a]/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[#F8F4E9] shadow ring-0 transition duration-200 ease-in-out ${
                      aiFirst ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Start Trigger */}
              <div>
                <button
                  onClick={handleBeginStory}
                  className="w-full py-3 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-black/5 flex items-center justify-center font-inter"
                >
                  Begin the Story
                </button>
              </div>
            </div>

            {/* Stories local history collapsible section */}
            {history.length > 0 && (
              <div className="bg-white/40 backdrop-blur-md border border-[#1a1a1a]/10 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="w-full px-6 py-4 bg-[#1a1a1a]/5 hover:bg-[#1a1a1a]/10 transition-colors flex items-center justify-between text-left"
                >
                  <span className="text-xs uppercase font-bold tracking-wider text-[#1a1a1a] font-inter">
                    📚 Previous Collaborations ({history.length})
                  </span>
                  <span className="text-xs text-[#1a1a1a]/60">
                    {isHistoryCollapsed ? '▼ Expand' : '▲ Collapse'}
                  </span>
                </button>

                {!isHistoryCollapsed && (
                  <div className="p-4 sm:p-6 border-t border-[#1a1a1a]/10 space-y-4 bg-[#1a1a1a]/5">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/50 border border-[#1a1a1a]/10 rounded-xl hover:border-[#1a1a1a]/30 transition-all gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a] font-inter bg-[#1a1a1a]/10 px-2 py-0.5 rounded-full">
                              {item.genre}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-[#6b6b6b] font-inter">
                              {item.tone} • {item.savedAt}
                            </span>
                          </div>
                          <p className="font-playfair italic text-xs text-[#1a1a1a]/70 leading-relaxed line-clamp-1">
                            &quot;{item.story[0]?.content}&quot;
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadHistory(item)}
                          className="px-4 py-1.5 bg-[#1a1a1a] hover:bg-[#2d2d2d] text-[#F8F4E9] text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all shadow"
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
            <div 
              style={{
                background: atmConfig.panelBg,
                borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                color: atmConfig.chatText,
              }}
              className="backdrop-blur-md border rounded-2xl p-6 sm:p-8 shadow-xl min-h-[300px] flex flex-col justify-between transition-all duration-500"
            >
              <div>
                <div 
                  style={{
                    borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                    color: atmConfig.panelText,
                    opacity: 0.8
                  }}
                  className="flex justify-between items-center mb-6 pb-2 border-b text-[9px] font-bold uppercase tracking-wider"
                >
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
                      style={{
                        color: turn.role === 'user' ? atmConfig.chatText : atmConfig.panelText
                      }}
                      className={`leading-relaxed text-sm sm:text-base text-left ${
                        turn.role === 'user'
                          ? 'font-inter'
                          : 'font-playfair italic font-medium'
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
                      style={{ color: atmConfig.panelText, opacity: 0.6 }}
                      className="font-playfair italic text-sm animate-pulse text-left"
                    >
                      The muse is writing...
                    </motion.div>
                  )}
                  <div ref={storyEndRef} />
                </div>
              </div>

              {/* Live counts */}
              <div 
                style={{
                  borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                  color: atmConfig.panelText,
                }}
                className="flex justify-between items-center border-t pt-4 text-[10px] font-bold uppercase tracking-wider font-inter"
              >
                <span>Story Word Count: {getWordCount()}</span>
                <button
                  onClick={handleEndSession}
                  style={{
                    background: atmConfig.panelText,
                    color: atmConfig.isDark ? '#1a1a1a' : '#ffffff',
                  }}
                  className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg font-inter transition-all shadow hover:opacity-90"
                >
                  I&apos;m done writing
                </button>
              </div>
            </div>

            {/* Input Form area */}
            <div 
              style={{
                background: atmConfig.panelBg,
                borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                color: atmConfig.chatText,
              }}
              className="backdrop-blur-md border rounded-2xl p-6 shadow-xl transition-all duration-500"
            >
              <form onSubmit={handleAddPart} className="space-y-4">
                <div>
                  <label 
                    style={{ color: atmConfig.panelText }}
                    className="block text-[10px] uppercase font-bold tracking-widest mb-2 font-inter"
                  >
                    Your Turn
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={userInput}
                    onChange={handleTextareaInput}
                    placeholder="Write the next line, sentence, or paragraph..."
                    style={{ 
                      minHeight: '60px',
                      background: atmConfig.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.6)',
                      borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(26,26,26,0.2)',
                      color: atmConfig.chatText,
                    }}
                    className="w-full px-4 py-3 rounded-xl outline-none text-sm placeholder-current/30 resize-none leading-relaxed transition-all focus:border-current"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={aiLoading || !userInput.trim()}
                    style={{
                      background: aiLoading || !userInput.trim() ? 'rgba(128,128,128,0.2)' : atmConfig.panelText,
                      color: aiLoading || !userInput.trim() ? 'rgba(128,128,128,0.5)' : (atmConfig.isDark ? '#1a1a1a' : '#ffffff'),
                    }}
                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow flex items-center gap-2 hover:opacity-90"
                  >
                    Add My Part
                  </button>
                </div>
              </form>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
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
            <div 
              style={{
                background: atmConfig.panelBg,
                borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                color: atmConfig.chatText,
              }}
              className="backdrop-blur-md border rounded-2xl p-8 sm:p-10 shadow-xl space-y-6 transition-all duration-500"
            >
              <h2 
                style={{
                  color: atmConfig.panelText,
                  borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                }}
                className="font-playfair text-2xl font-bold text-center border-b pb-4"
              >
                Synthesized Manuscript
              </h2>

              <div className="space-y-6 select-text py-4 max-h-[420px] overflow-y-auto pr-2 no-scrollbar">
                {story.map((turn, index) => (
                  <p
                    key={index}
                    style={{
                      color: turn.role === 'user' ? atmConfig.chatText : atmConfig.panelText
                    }}
                    className={`leading-relaxed text-sm sm:text-base text-left ${
                      turn.role === 'user'
                        ? 'font-inter'
                        : 'font-playfair italic font-light'
                    }`}
                  >
                    {turn.content}
                  </p>
                ))}
              </div>

              {/* Manuscript metrics */}
              <div 
                style={{
                  borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                  color: atmConfig.panelText,
                }}
                className="flex justify-between items-center border-t pt-4 text-[10px] font-bold uppercase tracking-wider font-inter"
              >
                <span>Total Words: {getWordCount()}</span>
                <span>Collaboration complete</span>
              </div>
            </div>

            {/* Ending action controls */}
            <div 
              style={{
                background: atmConfig.panelBg,
                borderColor: atmConfig.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(26,26,26,0.15)',
                color: atmConfig.chatText,
              }}
              className="backdrop-blur-md border rounded-2xl p-6 shadow-xl flex flex-wrap gap-4 items-center justify-between transition-all duration-500"
            >
              <div className="flex gap-3">
                <button
                  onClick={handleSaveToAnthology}
                  style={{
                    background: atmConfig.panelText,
                    color: atmConfig.isDark ? '#1a1a1a' : '#ffffff',
                  }}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all shadow shadow-black/5 hover:opacity-90"
                >
                  {saveSuccess ? '✅ Saved!' : '📜 Save to Anthology'}
                </button>
                <button
                  onClick={handleDownloadCard}
                  style={{
                    background: atmConfig.panelText,
                    color: atmConfig.isDark ? '#1a1a1a' : '#ffffff',
                  }}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all shadow shadow-black/5 hover:opacity-90"
                >
                  🎨 Download as Card
                </button>
              </div>

              <button
                onClick={() => setScreen('setup')}
                style={{
                  background: atmConfig.panelText,
                  color: atmConfig.isDark ? '#1a1a1a' : '#ffffff',
                }}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl font-inter transition-all shadow shadow-black/5 hover:opacity-90"
              >
                Start New Story
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
