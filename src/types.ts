export interface Symbol {
  symbol: string;
  meaning: string;
}

export interface DreamEntry {
  id: string;
  userId: string;
  timestamp: number;
  transcript: string;
  imageUrl: string;
  interpretation: string;
  title: string;
  summary: string;
  archetypes: string[];
  symbols: Symbol[];
  emotionalTheme: string;
}

export interface ChatMessage {
  id: string;
  dreamId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}
