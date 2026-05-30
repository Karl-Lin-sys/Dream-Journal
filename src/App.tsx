import { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { DreamEntry } from './types';
import AudioRecorder from './components/AudioRecorder';
import DreamCard from './components/DreamCard';
import ChatInterface from './components/ChatInterface';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Ghost, Scroll, Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [activeChatDream, setActiveChatDream] = useState<DreamEntry | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setDreams([]);
      return;
    }

    const q = query(
      collection(db, 'dreams'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dreamData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DreamEntry[];
      setDreams(dreamData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDreamProcessed = async (data: any) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'dreams'), {
        userId: user.uid,
        timestamp: Date.now(),
        ...data
      });
      setShowRecorder(false);
    } catch (err) {
      console.error("Error saving dream:", err);
      alert("Error saving dream data to cloud storage.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-indigo-500 font-mono text-xs tracking-widest uppercase"
        >
          Entering Liminal Space...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-2xl p-10 rounded-[3rem] border border-zinc-800 shadow-2xl text-center"
        >
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)] rotate-12">
              <Ghost className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tighter">Dream Journal</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed font-medium">
            Capture the surreal fragments of your sleep and decrypt the language of your subconcious.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full py-4 px-6 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in to start
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Ghost className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dream Journal</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-white leading-none">{user.displayName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Astral Traveller</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="p-2 hover:bg-zinc-900 rounded-xl transition-colors text-zinc-500 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {!showRecorder && dreams.length === 0 && !isProcessing && (
          <div className="text-center py-24 flex flex-col items-center">
            <Scroll className="w-16 h-16 text-zinc-800 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">The parchment is empty</h2>
            <p className="text-zinc-500 mb-10 max-w-xs">Your dream history will appear here once you record your first journey.</p>
            <button
              onClick={() => setShowRecorder(true)}
              className="flex items-center gap-2 py-4 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-900/20"
            >
              <Plus className="w-5 h-5" /> Record First Dream
            </button>
          </div>
        )}

        {(showRecorder || isProcessing) && (
          <div className="mb-16 max-w-lg mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">New Recording</h2>
              {!isProcessing && (
                <button 
                  onClick={() => setShowRecorder(false)} 
                  className="text-zinc-500 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            <AudioRecorder
              onDreamProcessed={handleDreamProcessed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </div>
        )}

        {dreams.length > 0 && (
          <div className="space-y-12">
            {!showRecorder && !isProcessing && (
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-zinc-500 font-bold uppercase text-xs tracking-widest">Recent Journeys</h2>
                <button
                  onClick={() => setShowRecorder(true)}
                  className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-indigo-400 border border-zinc-800 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
            {dreams.map((dream) => (
              <DreamCard 
                key={dream.id} 
                dream={dream} 
                onOpenChat={setActiveChatDream}
              />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {activeChatDream && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChatDream(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <ChatInterface
              dream={activeChatDream}
              onClose={() => setActiveChatDream(null)}
            />
          </>
        )}
      </AnimatePresence>
      
      <footer className="py-12 border-t border-zinc-900 text-center opacity-30 select-none pointer-events-none">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em]">Subconscious decrypted via Gemini</p>
      </footer>
    </div>
  );
}
