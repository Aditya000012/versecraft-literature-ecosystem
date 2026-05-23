'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const moods = [
  { id: 'melancholy', label: 'Melancholy', emoji: '🌧️', description: 'Heavy hearted and reflective' },
  { id: 'euphoric', label: 'Euphoric', emoji: '✨', description: 'Bright, alive, and full of wonder' },
  { id: 'restless', label: 'Restless', emoji: '🌊', description: 'Searching for something unnamed' },
  { id: 'nostalgic', label: 'Nostalgic', emoji: '🍂', description: 'Longing for what once was' },
  { id: 'curious', label: 'Curious', emoji: '🔭', description: 'Open, questioning, exploratory' },
  { id: 'dark', label: 'Dark', emoji: '🕯️', description: 'Drawn to shadows and depth' },
];

export default function MoodSelector() {
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();

  const handleMoodSelect = (mood: typeof moods[0]) => {
    setSelected(mood.id);
    setTimeout(() => {
      router.push(`/chat/simple?mood=${mood.id}`);
    }, 600);
  };

  return (
    <div className="w-full">
      <p className="text-[#c9a84c]/60 text-xs uppercase tracking-widest font-inter mb-3">✦ How are you feeling today?</p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {moods.map((mood) => (
          <motion.button
            key={mood.id}
            onClick={() => handleMoodSelect(mood)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
              selected === mood.id
                ? 'border-[#c9a84c] bg-[#c9a84c]/10'
                : 'border-white/10 bg-black/20 hover:border-[#c9a84c]/40 hover:bg-black/30'
            }`}
          >
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-[#f5f0e8] text-xs font-inter font-medium">{mood.label}</span>
            <span className="text-[#f5f0e8]/40 text-xs font-inter text-center leading-tight hidden md:block">{mood.description}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
