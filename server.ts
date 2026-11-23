import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { LiveServerMessage } from '@google/genai';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Brak klucza GEMINI_API_KEY. Sprawdź konfigurację klucza w panelu Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3003;

  // Increase payload limit for base64 images (photo upload & 3D canvas snapshots)
  app.use(express.json({ limit: '50mb' }));

  // ---------------------------------------------------------------------------
  // 1. Multi-Turn Gemini Chatbot (/api/ai/chat)
  // Models: gemini-4-argon (complex), gemini-3.8-flash (general), gemini-3.1-flash-lite (fast)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const {
        model = 'gemini-3.8-flash',
        messages = [],
        message = '',
        rolePersona = 'xr_architect',
      } = req.body;

      const allowedModels = ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
      const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.8-flash';

      const systemInstructions: Record<string, string> = {
        xr_architect:
          'Jesteś Głównym Architektem Systemów XR/AR oraz Ekspertem Silnika Unity 6 (AR Foundation, ARKit LiDAR, ARCore Depth API). Pomagasz użytkownikowi projektować hologramowe modele budynków z detalami architektonicznymi, pisać skrypty C#, konfigurować rozpoznawanie powierzchni blatów i podłóg, oświetlenie środowiskowe HDR, okluzję, paralaksę 6DoF, cząsteczki za oknami oraz eksport OBJ/STL/PDF. Odpowiadaj konkretnie, technicznie i po polsku (chyba że użytkownik poprosi o inny język).',
        shader_engineer:
          'Jesteś Starszym Inżynierem Shaderów (Unity URP Shader Graph, HLSL, Three.js GLSL). Specjalizujesz się w materiałach holograficznych (Fresnel, Scanlines, Vertex Displacement, Dissolve Transitions, Depth Occlusion Stencils) dla wizualizacji architektonicznych AR.',
        prompt_master:
          'Jesteś Ekspertem Inżynierii Promptów dla systemów CAD/BIM, generatorów obrazów (Nano Banana 2.1, Midjourney) oraz animacji wideo (Omni Flash). Tworzysz precyzyjne, wielowarstwowe prompty techniczne i wizualne.',
      };

      const ai = getGenAIClient();

      // Convert previous messages into @google/genai history format
      const history = Array.isArray(messages)
        ? messages
            .filter((m: { text?: string }) => m && typeof m.text === 'string' && m.text.trim())
            .map((m: { role: string; text: string }) => ({
              role: m.role === 'model' ? 'model' : 'user',
              parts: [{ text: m.text }],
            }))
        : [];

      const chat = ai.chats.create({
        model: selectedModel,
        history,
        config: {
          systemInstruction:
            systemInstructions[rolePersona] || systemInstructions.xr_architect,
        },
      });

      const response = await chat.sendMessage({
        message: String(message || 'Cześć!'),
      });

      res.json({
        text: response.text || '',
        model: selectedModel,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Błąd komunikacji z modelem Gemini';
      console.error('[/api/ai/chat] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 1B. AI 3D Space & Autonomous Agent Builder (/api/ai/build-3d-space)
  // Generates custom 3D architectural parameters + AI Agent NavMesh steps from prompt
  // ---------------------------------------------------------------------------
  app.post('/api/ai/build-3d-space', async (req, res) => {
    const startTime = Date.now();
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Wpisz opis przestrzeni 3D w polu promptu.' });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Użytkownik tworzy holograficzną przestrzeń architektoniczną 3D AR oraz konfiguruje autonomicznych agentów przestrzennych. Prompt użytkownika: "${prompt}". Wygeneruj parametry przestrzeni 3D, zachowanie agentów oraz kroki wykonania po polsku.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sceneId: {
                type: Type.STRING,
                description: 'ID bazowej sceny: skyline_financial, eco_atrium lub aero_hub',
              },
              palette: {
                type: Type.STRING,
                description: 'Paleta: cyan_blueprint, amber_gold, emerald_matrix lub platinum_arch',
              },
              customTitle: {
                type: Type.STRING,
                description: 'Nazwa wygenerowanej przestrzeni 3D po polsku',
              },
              towerHeightMultiplier: {
                type: Type.NUMBER,
                description: 'Mnożnik wysokości budynków od 0.6 do 1.8',
              },
              explodedViewFactor: {
                type: Type.NUMBER,
                description: 'Rozstrzelenie warstw od 0.0 do 0.8',
              },
              lightTemperatureK: {
                type: Type.INTEGER,
                description: 'Temperatura oświetlenia środowiskowego w Kelwinach od 2800 do 6500',
              },
              agentNavMode: {
                type: Type.STRING,
                description: 'Tryb poruszania się agentów: lidar_orbit, facade_scan lub floor_patrol',
              },
              activeAgentsCount: {
                type: Type.INTEGER,
                description: 'Liczba aktywnych agentów w przestrzeni 3D od 2 do 6',
              },
              architecturalSummary: {
                type: Type.STRING,
                description: 'Zwięzły opis wygenerowanej przestrzeni 3D i zadań agentów (2-3 zdania)',
              },
              executionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 konkretne kroki inżynieryjne wykonanej przebudowy sceny 3D',
              },
            },
            required: [
              'sceneId',
              'palette',
              'customTitle',
              'towerHeightMultiplier',
              'explodedViewFactor',
              'lightTemperatureK',
              'agentNavMode',
              'activeAgentsCount',
              'architecturalSummary',
              'executionSteps',
            ],
          },
        },
      });

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      const parsed = JSON.parse((response.text || '{}').trim());

      res.json({
        ...parsed,
        elapsedSeconds: Number(elapsedSeconds),
        model: 'gemini-3.8-flash',
      });
    } catch (error: unknown) {
      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
      const errMsg = error instanceof Error ? error.message : 'Błąd generowania przestrzeni 3D';
      console.error('[/api/ai/build-3d-space] Error:', errMsg);
      res.status(500).json({ error: errMsg, elapsedSeconds: Number(elapsedSeconds) });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Google Search Grounding (/api/ai/search-grounding)
  // Model: gemini-3.8-flash with googleSearch tool
  // ---------------------------------------------------------------------------
  app.post('/api/ai/search-grounding', async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Podaj zapytanie do wyszukiwarki Google Search.' });
        return;
      }

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: query,
        config: {
          systemInstruction:
            'Jesteś analitykiem technologii AR/XR, architektury wysokościowej i urządzeń mobilnych Android/iOS. Korzystaj z aktualnych danych Google Search, podawaj dokładne parametry techniczne (wersje ARCore, ARKit, czujniki ToF/LiDAR, parametry budynków) i odpowiadaj czytelnie po polsku.',
          tools: [{ googleSearch: {} }],
        },
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((c: { web?: { uri?: string; title?: string } }) =>
          c.web ? { uri: c.web.uri || '', title: c.web.title || c.web.uri || 'Źródło WWW' } : null
        )
        .filter(Boolean);

      res.json({
        text: response.text || 'Brak odpowiedzi tekstowej.',
        sources,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Błąd Google Search Grounding';
      console.error('[/api/ai/search-grounding] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Create & Edit Images (/api/ai/image)
  // Model: gemini-nano-banana-2.1
  // ---------------------------------------------------------------------------
  app.post('/api/ai/image', async (req, res) => {
    try {
      const {
        prompt,
        base64Image,
        mimeType = 'image/png',
        aspectRatio = '16:9',
        imageSize = '1K',
        useSearchGrounding = false,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Wymagany jest opis tekstowy (prompt) dla obrazu.' });
        return;
      }

      const ai = getGenAIClient();
      const parts: Array<
        | { inlineData: { data: string; mimeType: string } }
        | { text: string }
      > = [];

      if (base64Image && typeof base64Image === 'string') {
        const cleanBase64 = base64Image.includes(',')
          ? base64Image.split(',')[1]
          : base64Image;
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/png',
          },
        });
      }

      parts.push({ text: prompt });

      const configObj: Record<string, unknown> = {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      };

      if (useSearchGrounding) {
        configObj.tools = [
          {
            googleSearch: {
              searchTypes: {
                webSearch: {},
                imageSearch: {},
              },
            },
          },
        ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config: configObj,
      });

      let generatedImageUrl: string | null = null;
      let generatedText = '';

      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const outMime = part.inlineData.mimeType || 'image/png';
          generatedImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          generatedText += part.text;
        }
      }

      if (!generatedImageUrl) {
        res.status(500).json({
          error:
            generatedText ||
            'Model gemini-nano-banana-2.1 nie zwrócił obrazu. Spróbuj doprecyzować prompt.',
        });
        return;
      }

      res.json({
        imageUrl: generatedImageUrl,
        text: generatedText,
        model: 'gemini-nano-banana-2.1',
      });
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Błąd generowania/edycji obrazu Nano Banana 2.1';
      console.error('[/api/ai/image] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. Generate Video from Text & Animate Photo into Video (/api/ai/video)
  // Model: gemini-omni-1.2-flash via Interactions API (ai.interactions.create)
  // Supported aspect ratios: '16:9' (landscape) or '9:16' (portrait)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/video', async (req, res) => {
    try {
      const {
        prompt,
        base64Image,
        mimeType = 'image/jpeg',
        aspectRatio = '16:9',
        duration = '5s',
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Podaj opis ruchu lub sceny wideo (prompt).' });
        return;
      }

      const validAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
      const validDuration = duration === '10s' ? '10s' : '5s';

      const ai = getGenAIClient();

      let interactionInput:
        | string
        | Array<
            | { type: 'image'; mime_type: string; data: string }
            | { type: 'text'; text: string }
          > = prompt;

      if (base64Image && typeof base64Image === 'string') {
        const cleanBase64 = base64Image.includes(',')
          ? base64Image.split(',')[1]
          : base64Image;
        interactionInput = [
          {
            type: 'image',
            mime_type: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
          {
            type: 'text',
            text: prompt,
          },
        ];
      }

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input: interactionInput,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: validAspectRatio,
            duration: validDuration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      let videoDataUrl: string | null = null;
      const videoPart = interaction.output_video;

      if (videoPart?.data) {
        const outMime = videoPart.mime_type || 'video/mp4';
        videoDataUrl = `data:${outMime};base64,${videoPart.data}`;
      } else if (videoPart?.uri) {
        videoDataUrl = videoPart.uri;
      } else if (Array.isArray(interaction.steps)) {
        for (const step of interaction.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            const vid = step.content.find((c: { type?: string }) => c.type === 'video') as
              | { type?: string; data?: string; mime_type?: string; uri?: string }
              | undefined;
            if (vid?.data) {
              videoDataUrl = `data:${vid.mime_type || 'video/mp4'};base64,${vid.data}`;
              break;
            } else if (vid?.uri) {
              videoDataUrl = vid.uri;
              break;
            }
          }
        }
      }

      if (!videoDataUrl) {
        res.status(500).json({
          error: 'Model gemini-omni-1.2-flash zakończył działanie, ale nie zwrócił strumienia wideo.',
        });
        return;
      }

      res.json({
        videoUrl: videoDataUrl,
        aspectRatio: validAspectRatio,
        duration: validDuration,
        model: 'gemini-omni-1.2-flash',
      });
    } catch (error: unknown) {
      const errMsg =
        error instanceof Error ? error.message : 'Błąd generowania wideo w gemini-omni-1.2-flash';
      console.error('[/api/ai/video] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 4B. Google Maps Grounding (/api/ai/maps-grounding)
  // Model: gemini-3.8-flash with googleMaps tool (no responseMimeType / responseSchema)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/maps-grounding', async (req, res) => {
    try {
      const { query, latitude, longitude } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Podaj zapytanie geograficzne / lokalizacyjne dla Google Maps.' });
        return;
      }

      const ai = getGenAIClient();
      const configObj: Record<string, unknown> = {
        tools: [{ googleMaps: {} }],
      };

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        configObj.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude,
              longitude,
            },
          },
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: query,
        config: configObj,
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const places: Array<{
        uri: string;
        title: string;
        reviewSnippets?: string[];
      }> = [];

      for (const c of chunks as Array<{
        maps?: {
          uri?: string;
          title?: string;
          placeAnswerSources?: { reviewSnippets?: Array<{ content?: string; text?: string }> };
        };
      }>) {
        if (c.maps?.uri) {
          const snippets = (c.maps.placeAnswerSources?.reviewSnippets || [])
            .map((s) => s.content || s.text || '')
            .filter(Boolean);
          places.push({
            uri: c.maps.uri,
            title: c.maps.title || 'Miejsce w Google Maps',
            reviewSnippets: snippets,
          });
        }
      }

      res.json({
        text: response.text || 'Brak odpowiedzi z uziemienia Google Maps.',
        places,
        model: 'gemini-3.8-flash',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Błąd Google Maps Grounding';
      console.error('[/api/ai/maps-grounding] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 4C. Audio Transcription (/api/ai/transcribe)
  // Model: gemini-3.5-transcribe
  // ---------------------------------------------------------------------------
  app.post('/api/ai/transcribe', async (req, res) => {
    try {
      const { base64Audio, mimeType = 'audio/webm', prompt = 'Dokonaj dokładnej transkrypcji tego nagrania audio po polsku.' } = req.body;
      if (!base64Audio || typeof base64Audio !== 'string') {
        res.status(400).json({ error: 'Brak danych audio do transkrypcji.' });
        return;
      }

      const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
      const ai = getGenAIClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
      });

      res.json({
        text: response.text || '',
        model: 'gemini-3.5-transcribe',
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Błąd transkrypcji audio w gemini-3.5-transcribe';
      console.error('[/api/ai/transcribe] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 4D. Music Generation (/api/ai/music)
  // Models: lyria-3-clip-preview (30s clip) or lyria-3-pro-preview (full track)
  // ---------------------------------------------------------------------------
  app.post('/api/ai/music', async (req, res) => {
    try {
      const {
        prompt,
        model = 'lyria-3-clip-preview',
        base64Image,
        imageMimeType = 'image/jpeg',
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Podaj opis ścieżki dźwiękowej (prompt muzyczny).' });
        return;
      }

      const selectedModel =
        model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

      const ai = getGenAIClient();

      const parts: Array<
        | { text: string }
        | { inlineData: { data: string; mimeType: string } }
      > = [{ text: prompt }];

      if (base64Image && typeof base64Image === 'string') {
        const cleanBase64 = base64Image.includes(',')
          ? base64Image.split(',')[1]
          : base64Image;
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: imageMimeType || 'image/jpeg',
          },
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents: { parts },
      });

      const audioChunks: Buffer[] = [];
      let lyrics = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of responseStream) {
        const chunkParts = chunk.candidates?.[0]?.content?.parts;
        if (!chunkParts) continue;
        for (const part of chunkParts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            lyrics += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        res.status(500).json({
          error: `Model ${selectedModel} nie zwrócił strumienia audio. Spróbuj ponownie z innym opisem.`,
        });
        return;
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

      res.json({
        audioDataUrl,
        lyrics: lyrics.trim(),
        model: selectedModel,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Błąd generowania muzyki w modelu Lyria 3';
      console.error('[/api/ai/music] Error:', errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Real-time Voice Conversations via Gemini Live API (WebSocket /live)
  // Model: gemini-3.8-live
  // ---------------------------------------------------------------------------
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const pathname = new URL(
        request.url || '/',
        `http://${request.headers.host || 'localhost'}`
      ).pathname;
      if (pathname === '/live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (clientWs) => {
    let isClosed = false;
    let liveSession: {
      sendRealtimeInput: (input: Record<string, unknown>) => void;
      close: () => void;
    } | null = null;

    const ai = (() => {
      try {
        return getGenAIClient();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Brak klucza API';
        clientWs.send(JSON.stringify({ error: msg }));
        clientWs.close();
        return null;
      }
    })();

    if (!ai) return;

    const sessionPromise = ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction:
          'Jesteś głosowym doradcą architektonicznym AR i ekspertem silnika Unity (ARKit/ARCore) w aplikacji HoloArch AR Studio. Rozmawiasz na żywo z architektem lub inżynierem oglądającym hologramy budynków 3D na stole konferencyjnym. Odpowiadaj zwięźle, naturalnie i merytorycznie po polsku.',
      },
      callbacks: {
        onopen: () => {
          if (!isClosed && clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ status: 'connected' }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (isClosed || clientWs.readyState !== clientWs.OPEN) return;

          const parts = message.serverContent?.modelTurn?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }

          const outTranscript = message.serverContent?.outputTranscription?.text;
          if (outTranscript) {
            clientWs.send(JSON.stringify({ outputTranscription: outTranscript }));
          }

          const inTranscript = message.serverContent?.inputTranscription?.text;
          if (inTranscript) {
            clientWs.send(JSON.stringify({ inputTranscription: inTranscript }));
          }

          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onerror: (err: unknown) => {
          if (!isClosed && clientWs.readyState === clientWs.OPEN) {
            const msg = err instanceof Error ? err.message : 'Błąd sesji Gemini Live';
            clientWs.send(JSON.stringify({ error: msg }));
          }
        },
        onclose: () => {
          if (!isClosed && clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ status: 'closed' }));
          }
        },
      },
    });

    sessionPromise
      .then((s) => {
        liveSession = s;
        if (isClosed) {
          s.close();
        }
      })
      .catch((err: unknown) => {
        if (!isClosed && clientWs.readyState === clientWs.OPEN) {
          const msg = err instanceof Error ? err.message : 'Nie udało się połączyć z Gemini 3.8 Live';
          clientWs.send(JSON.stringify({ error: msg }));
        }
      });

    clientWs.on('message', (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        sessionPromise
          .then((session) => {
            if (isClosed) return;
            if (parsed.audio) {
              session.sendRealtimeInput({
                audio: {
                  data: parsed.audio,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } else if (parsed.text) {
              session.sendRealtimeInput({
                text: String(parsed.text),
              });
            } else if (parsed.video) {
              session.sendRealtimeInput({
                video: {
                  data: parsed.video,
                  mimeType: 'image/jpeg',
                },
              });
            }
          })
          .catch(() => {
            // Handled in sessionPromise catch
          });
      } catch {
        // Ignore malformed JSON frames
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          // Ignore close error
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Vite Middleware (Development) or Static Dist Serving (Production)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HoloArch AR Studio server listening on http://localhost:${PORT}`);
  });
}

startServer();
