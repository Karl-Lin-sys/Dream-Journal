import React from 'react';
import { DreamEntry } from '../types';
import { motion } from 'motion/react';
import { Sparkles, Brain, Image as ImageIcon, MessageCircle } from 'lucide-react';

interface DreamCardProps {
  dream: DreamEntry;
  onOpenChat: (dream: DreamEntry) => void;
}

const DreamCard: React.FC<DreamCardProps> = ({ dream, onOpenChat }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl"
    >
      <div className="relative aspect-square md:aspect-video w-full overflow-hidden">
        {dream.imageUrl ? (
          <img 
            src={dream.imageUrl} 
            alt="Surrealist representation" 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-widest shadow-lg">
            {dream.emotionalTheme}
          </span>
        </div>
      </div>

      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight line-clamp-1">{dream.title}</h2>
            <p className="text-zinc-500 text-sm font-mono uppercase tracking-tighter">
              {new Date(dream.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => onOpenChat(dream)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-indigo-400 transition-colors shadow-inner"
            title="Ask follow-up questions"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="grid gap-8">
          <section>
            <div className="flex items-center gap-2 text-indigo-400 mb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold uppercase text-xs tracking-widest">Transcript</h3>
            </div>
            <p className="text-zinc-300 leading-relaxed italic border-l-2 border-zinc-800 pl-4">
              "{dream.transcript}"
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 text-indigo-400 mb-3">
              <Brain className="w-5 h-5" />
              <h3 className="font-bold uppercase text-xs tracking-widest">Jungian Interpretation</h3>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {dream.archetypes.map((arch, i) => (
                  <span key={i} className="px-2 py-1 bg-indigo-900/30 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md uppercase">
                    {arch}
                  </span>
                ))}
              </div>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {dream.interpretation}
              </p>
            </div>
          </section>

          <section>
            <h4 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-3">Identified Symbols</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dream.symbols.map((symbol, i) => (
                <div key={i} className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
                  <span className="block text-white font-bold mb-1 text-sm">{symbol.symbol}</span>
                  <span className="block text-zinc-500 text-xs leading-snug">{symbol.meaning}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};

export default DreamCard;
