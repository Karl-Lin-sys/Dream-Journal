import React, { useState, useRef, useEffect } from 'react';
import { DreamEntry, ChatMessage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface ChatInterfaceProps {
  dream: DreamEntry;
  onClose: () => void;
}

export default function ChatInterface({ dream, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dream.id) return;

    const q = query(
      collection(db, 'dreams', dream.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [dream.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      // 1. Save user message to Firestore
      await addDoc(collection(db, 'dreams', dream.id, 'messages'), {
        dreamId: dream.id,
        role: 'user',
        content: userMsg,
        timestamp: Date.now()
      });

      // 2. Call local API for Gemini response
      const response = await fetch('/api/dream/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: dream.transcript,
          userMessage: userMsg,
          messages: messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }))
        })
      });
      const data = await response.json();

      // 3. Save AI response to Firestore
      await addDoc(collection(db, 'dreams', dream.id, 'messages'), {
        dreamId: dream.id,
        role: 'model',
        content: data.text,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col z-50"
    >
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold tracking-tight">Symbolic Inquiry</h3>
          <p className="text-zinc-500 text-xs">Asking about: {dream.title}</p>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 text-indigo-400">
              <Bot className="w-8 h-8" />
            </div>
            <p className="text-zinc-500 text-sm max-w-[200px]">
              Ask follow-up questions about specific symbols, characters, or the landscape of your dream.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center border
              ${msg.role === 'user' 
                ? 'bg-zinc-800 border-zinc-700 text-indigo-400' 
                : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-300'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[80%]
              ${msg.role === 'user' 
                ? 'bg-zinc-900 text-zinc-300 rounded-tr-none' 
                : 'bg-indigo-900/10 text-zinc-300 border border-indigo-900/20 rounded-tl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center bg-indigo-950/30 border border-indigo-500/20 text-indigo-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-indigo-900/10 text-zinc-500 text-xs italic animate-pulse">
              Analysing the unconscious...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 border-t border-zinc-800">
        <div className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about a symbol..."
            className="w-full bg-zinc-900 border border-zinc-700/50 rounded-2xl py-4 pl-6 pr-14 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-600 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 top-2 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all shadow-lg"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
