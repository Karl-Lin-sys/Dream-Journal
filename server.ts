import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { dreamSecurity, validProcess, validChat } from "./server-security";

dotenv.config();

const app = express();
const PORT = 3000;

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId || !process.env.GEMINI_API_KEY) throw new Error('Configure FIREBASE_PROJECT_ID and a server GEMINI_API_KEY');
const adminAuth = getAdminAuth(initializeAdminApp({ projectId }));
const allowed = new Set((process.env.DREAM_ALLOWED_UIDS || '').split(',').map(s => s.trim()).filter(Boolean));
app.use('/api/dream', dreamSecurity(token => adminAuth.verifyIdToken(token), allowed));
app.use(express.json({ limit: '12mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 60000,
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/dream/process", async (req, res) => {
  try {
    if (!validProcess(req.body)) {
      return res.status(400).json({ error: "Missing audio data" });
    }
    const { audioData, mimeType } = req.body;

    // 1. Transcribe Audio
    const transResponse: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audioData
          }
        },
        { text: "Transcribe this dream recording faithfully. If there are emotional cues or sighs, ignore them but keep the narrative flow. Output only the transcription." }
      ]
    });

    const transcript = transResponse.text || "";
    if (!transcript) {
      return res.status(500).json({ error: "Failed to transcribe audio" });
    }

    // 2. Interpret Dream (Jungian)
    const interpretationResponse: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: `As a psychological analyst specializing in Jungian archetypes and symbolic dream interpretation, provide a structured analysis of the following dream:

Dream Transcript:
"${transcript}"

Provide the response in JSON format with the following structure:
{
  "title": "A short, evocative title for the dream",
  "summary": "A brief narrative summary",
  "archetypes": ["List of identified archetypes"],
  "symbols": [{"symbol": "Symbol Name", "meaning": "Symbolic meaning"}],
  "interpretation": "A structured psychological interpretation based on the collective unconscious and personal growth.",
  "emotionalTheme": "The core emotional theme (e.g., Anxiety, Transformation, Quest)"
}
` }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            archetypes: { type: Type.ARRAY, items: { type: Type.STRING } },
            symbols: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  symbol: { type: Type.STRING }, 
                  meaning: { type: Type.STRING } 
                } 
              } 
            },
            interpretation: { type: Type.STRING },
            emotionalTheme: { type: Type.STRING }
          },
          required: ["title", "summary", "archetypes", "symbols", "interpretation", "emotionalTheme"]
        }
      }
    });

    const interpretationData = JSON.parse(interpretationResponse.text || "{}");

    // 3. Generate Surrealist Image
    // Use gemini-2.5-flash-image for image generation
    const imageResponse: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `A surrealist masterpiece image representing the core emotional theme and symbols of the following dream. Style: Surrealism, deeply symbolic, atmospheric, dream-like quality. 
            
            Theme: ${interpretationData.emotionalTheme}
            Symbols: ${interpretationData.symbols.map((s: any) => s.symbol).join(", ")}
            Summary: ${interpretationData.summary}`
          }
        ]
      }
    });

    let imageUrl = "";
    if (imageResponse.candidates?.[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    res.json({
      transcript,
      ...interpretationData,
      imageUrl
    });

  } catch (error: any) {
    console.error("Dream processing failed");
    res.status(500).json({ error: "Processing failed. Try again later." });
  } finally {
    res.locals.releaseDreamSlot?.();
  }
});

app.post("/api/dream/chat", async (req, res) => {
  try {
    if (!validChat(req.body)) return res.status(400).json({ error: "Invalid chat input" });
    const { transcript, messages, userMessage } = req.body;
    
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: `You are a helpful analyst assistant. The user is asking follow-up questions about a dream they recorded. 
        Dream Transcript for context: "${transcript}"
        Always maintain the professional yet empathetic tone of a depth psychologist. Focus on symbols and archetypes.`
      },
      history: messages || []
    });

    const response = await chat.sendMessage({ message: userMessage });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat processing failed");
    res.status(500).json({ error: "Processing failed. Try again later." });
  } finally {
    res.locals.releaseDreamSlot?.();
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, process.env.HOST || "127.0.0.1", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
