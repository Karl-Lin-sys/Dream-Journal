import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioRecorderProps {
  onDreamProcessed: (data: any) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function AudioRecorder({ onDreamProcessed, isProcessing, setIsProcessing }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          await processDream(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone access to record your dream.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processDream = async (audioData: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/dream/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData, mimeType: 'audio/webm' })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onDreamProcessed(data);
    } catch (err) {
      console.error("Error processing dream:", err);
      alert("Failed to process dream recording. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 rounded-3xl border border-zinc-800 backdrop-blur-xl shadow-2xl">
      <AnimatePresence mode="wait">
        {!isRecording && !isProcessing && (
          <motion.button
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            onClick={startRecording}
            className="group relative flex items-center justify-center w-24 h-24 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            <div className="absolute inset-0 rounded-full bg-indigo-400 group-hover:animate-ping opacity-20 pointer-events-none" />
            <Mic className="w-10 h-10 text-white" />
          </motion.button>
        )}

        {isRecording && (
          <motion.button
            key="stop"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            onClick={stopRecording}
            className="flex items-center justify-center w-24 h-24 bg-red-600 hover:bg-red-500 rounded-full transition-all duration-300 animate-pulse"
          >
            <Square className="w-10 h-10 text-white fill-white" />
          </motion.button>
        )}

        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <Loader2 className="w-24 h-24 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">Analysing</span>
              </div>
            </div>
            <p className="text-zinc-400 font-medium animate-pulse">Transcribing & Interpreting...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 text-center">
        <h3 className="text-xl font-semibold text-white mb-1">
          {isRecording ? "Listening..." : isProcessing ? "Interpreting symbols" : "Record your dream"}
        </h3>
        <p className="text-zinc-500 text-sm max-w-[240px]">
          {isRecording 
            ? "Speak clearly as you wake. Describe everything you saw and felt." 
            : isProcessing 
              ? "Connecting with the collective unconscious..." 
              : "Tap to record while the memory is fresh."}
        </p>
      </div>
    </div>
  );
}
