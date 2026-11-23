import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Download,
  ExternalLink,
  FileAudio,
  Film,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  Music,
  Send,
  Sparkles,
  Square,
  Upload,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import { CapturedScreenshot } from '../types/arStudio';
import { DriveFileItem, saveImageToGoogleDrive } from '../utils/googleDriveAuth';

interface GeminiStudioHubProps {
  latestScreenshot?: CapturedScreenshot;
  defaultVisualPrompt: string;
  onNotify: (msg: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  timestamp: string;
}

interface SearchSource {
  uri: string;
  title: string;
}

// Helper to convert Float32Array mic buffer (16kHz) to base64 16-bit PCM little-endian
function float32ToPcm16Base64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert URL (such as /assets/aistudio/Dashboard_dex_eeffcbc7.jpg) to base64
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve({ data: result, mimeType: blob.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const GeminiStudioHub: React.FC<GeminiStudioHubProps> = ({
  latestScreenshot,
  defaultVisualPrompt,
  onNotify,
}) => {
  const [activeToolTab, setActiveToolTab] = useState<
    | 'chatbot'
    | 'image_studio'
    | 'video_omni'
    | 'live_voice'
    | 'search_grounding'
    | 'maps_grounding'
    | 'transcribe_audio'
    | 'music_lyria'
  >('chatbot');

  // ---------------------------------------------------------------------------
  // 1. Multi-Turn Chatbot State (gemini-4-argon, gemini-3.8-flash, gemini-3.1-flash-lite)
  // ---------------------------------------------------------------------------
  const [chatModel, setChatModel] = useState<
    'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'
  >('gemini-4-argon');
  const [rolePersona, setRolePersona] = useState<'xr_architect' | 'shader_engineer' | 'prompt_master'>(
    'xr_architect'
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Cześć! Jestem Twoim asystentem inżynieryjnym XR/AR w HoloArch Studio. Wybierz model (`gemini-4-argon` do złożonej architektury C# i matematyki 3D, `gemini-3.8-flash` do zadań ogólnych lub `gemini-3.1-flash-lite` do błyskawicznych odpowiedzi) i zapytaj o detekcję płaszczyzn ARKit/ARCore, shadery hologramów lub eksport OBJ/STL.',
      modelUsed: 'gemini-4-argon',
      timestamp: 'Gotowy',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    };

    const historyForApi = chatMessages.map((m) => ({ role: m.role, text: m.text }));
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: chatModel,
          rolePersona,
          messages: historyForApi,
          message: textToSend,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd odpowiedzi modelu Gemini');
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.text,
          modelUsed: data.model || chatModel,
          timestamp: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Nie udało się uzyskać odpowiedzi.';
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: `Wystąpił błąd: ${msg}`,
          modelUsed: chatModel,
          timestamp: 'Błąd',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Image Generation & Editing State (gemini-nano-banana-2.1)
  // ---------------------------------------------------------------------------
  const [imageMode, setImageMode] = useState<'create' | 'edit_reference' | 'edit_upload' | 'edit_3d'>(
    'create'
  );
  const [imagePrompt, setImagePrompt] = useState(defaultVisualPrompt);
  const [imageAspectRatio, setImageAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3' | '3:4'>(
    '16:9'
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [useImageSearchGrounding, setUseImageSearchGrounding] = useState(false);
  const [uploadedEditImage, setUploadedEditImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleUploadImageForEdit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedEditImage({
        dataUrl: String(reader.result || ''),
        mimeType: file.type || 'image/png',
        name: file.name,
      });
      setImageMode('edit_upload');
    };
    reader.readAsDataURL(file);
  };

  const handleRunNanoBananaImage = async () => {
    if (!imagePrompt.trim() || isImageLoading) return;
    setIsImageLoading(true);
    setImageError(null);

    try {
      let base64Image: string | undefined;
      let mimeType = 'image/png';

      if (imageMode === 'edit_reference') {
        const refData = await urlToBase64('/assets/aistudio/Dashboard_dex_eeffcbc7.jpg');
        base64Image = refData.data;
        mimeType = refData.mimeType;
      } else if (imageMode === 'edit_upload' && uploadedEditImage) {
        base64Image = uploadedEditImage.dataUrl;
        mimeType = uploadedEditImage.mimeType;
      } else if (imageMode === 'edit_3d' && latestScreenshot) {
        base64Image = latestScreenshot.dataUrl;
        mimeType = 'image/png';
      }

      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          base64Image,
          mimeType,
          aspectRatio: imageAspectRatio,
          imageSize,
          useSearchGrounding: useImageSearchGrounding,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd generowania obrazu');
      }

      setGeneratedImageUrl(data.imageUrl);
      setSavedDriveImageFile(null);
      onNotify('Wygenerowano obraz architektoniczny za pomocą gemini-nano-banana-2.1');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd generowania obrazu';
      setImageError(msg);
    } finally {
      setIsImageLoading(false);
    }
  };

  const [isSavingImageToDrive, setIsSavingImageToDrive] = useState(false);
  const [savedDriveImageFile, setSavedDriveImageFile] = useState<DriveFileItem | null>(null);

  const handleSaveNanoImageToDrive = async (source: 'generated' | 'uploaded' | 'reference') => {
    if (isSavingImageToDrive) return;
    setIsSavingImageToDrive(true);
    setImageError(null);
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (source === 'generated' && generatedImageUrl) {
        const uploaded = await saveImageToGoogleDrive({
          dataUrl: generatedImageUrl,
          fileName: `HoloArch_NanoBanana_${imageSize}_${stamp}.png`,
          mimeType: 'image/png',
          description: `HoloArch_AR_Studio AI Render (${imageAspectRatio}, ${imageSize}) — ${imagePrompt.slice(0, 120)}`,
        });
        setSavedDriveImageFile(uploaded);
        onNotify(`Zapisano wygenerowany obraz na Dysku Google: ${uploaded.name}`);
      } else if (source === 'uploaded' && uploadedEditImage) {
        const uploaded = await saveImageToGoogleDrive({
          dataUrl: uploadedEditImage.dataUrl,
          fileName: `HoloArch_Upload_${uploadedEditImage.name}`,
          mimeType: uploadedEditImage.mimeType,
          description: 'HoloArch_AR_Studio Uploaded Reference Image',
        });
        setSavedDriveImageFile(uploaded);
        onNotify(`Zapisano przesłane zdjęcie na Dysku Google: ${uploaded.name}`);
      } else {
        const uploaded = await saveImageToGoogleDrive({
          imageUrl: '/assets/aistudio/Dashboard_dex_eeffcbc7.jpg',
          fileName: `HoloArch_Boardroom_Reference_${stamp}.jpg`,
          mimeType: 'image/jpeg',
          description: 'HoloArch_AR_Studio Boardroom Reference Image',
        });
        setSavedDriveImageFile(uploaded);
        onNotify(`Zapisano obraz wzorcowy AR na Dysku Google: ${uploaded.name}`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się zapisać obrazu na Dysku Google.';
      setImageError(msg);
    } finally {
      setIsSavingImageToDrive(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Video Generation & Photo Animation State (gemini-omni-1.1-flash via Interactions API)
  // ---------------------------------------------------------------------------
  const [videoMode, setVideoMode] = useState<'text_to_video' | 'animate_photo'>('animate_photo');
  const [videoPhotoSource, setVideoPhotoSource] = useState<
    'uploaded' | 'reference_table' | 'latest_3d' | 'generated_nano'
  >('reference_table');
  const [uploadedVideoPhoto, setUploadedVideoPhoto] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const [videoPrompt, setVideoPrompt] = useState(
    'Smooth cinematic 6DoF camera orbit around the glowing cyan and golden holographic skyscraper complex on the conference table, dynamic sunset particles drifting behind the panoramic room windows, pulsing data network lines on the table surface.'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoDuration, setVideoDuration] = useState<'5s' | '10s'>('5s');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleUploadPhotoForVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedVideoPhoto({
        dataUrl: String(reader.result || ''),
        mimeType: file.type || 'image/jpeg',
        name: file.name,
      });
      setVideoMode('animate_photo');
      setVideoPhotoSource('uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleRunOmniFlashVideo = async () => {
    if (!videoPrompt.trim() || isVideoLoading) return;
    setIsVideoLoading(true);
    setVideoError(null);

    try {
      let base64Image: string | undefined;
      let mimeType = 'image/jpeg';

      if (videoMode === 'animate_photo') {
        if (videoPhotoSource === 'uploaded') {
          if (!uploadedVideoPhoto) {
            throw new Error('Prześlij najpierw zdjęcie z dysku lub wybierz wzorzec stołu AR.');
          }
          base64Image = uploadedVideoPhoto.dataUrl;
          mimeType = uploadedVideoPhoto.mimeType;
        } else if (videoPhotoSource === 'reference_table') {
          const refData = await urlToBase64('/assets/aistudio/Dashboard_dex_eeffcbc7.jpg');
          base64Image = refData.data;
          mimeType = refData.mimeType;
        } else if (videoPhotoSource === 'latest_3d') {
          if (!latestScreenshot) {
            throw new Error('Najpierw wykonaj zrzut ekranu w symulatorze 3D.');
          }
          base64Image = latestScreenshot.dataUrl;
          mimeType = 'image/png';
        } else if (videoPhotoSource === 'generated_nano') {
          if (!generatedImageUrl) {
            throw new Error('Najpierw wygeneruj obraz w zakładce Kreator Obrazów.');
          }
          base64Image = generatedImageUrl;
          mimeType = 'image/png';
        }
      }

      const response = await fetch('/api/ai/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          base64Image,
          mimeType,
          aspectRatio: videoAspectRatio,
          duration: videoDuration,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd generowania wideo w gemini-omni-1.2-flash');
      }

      setGeneratedVideoUrl(data.videoUrl);
      onNotify(`Wygenerowano wideo (${data.aspectRatio}) w modelu gemini-omni-1.2-flash`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd generowania wideo';
      setVideoError(msg);
    } finally {
      setIsVideoLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Real-Time Voice Conversation State (gemini-3.8-live via WebSocket)
  // ---------------------------------------------------------------------------
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveTranscripts, setLiveTranscripts] = useState<
    Array<{ id: string; speaker: 'Ty (Mikrofon)' | 'Gemini 3.8 Live'; text: string }>
  >([]);
  const [liveTextPrompt, setLiveTextPrompt] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const stopLiveSession = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    setIsLiveConnected(false);
    setIsLiveConnecting(false);
  };

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const playPcm24kChunk = (base64Pcm: string) => {
    const outCtx = outputAudioCtxRef.current;
    if (!outCtx) return;

    const binary = atob(base64Pcm);
    const byteLength = binary.length;
    const int16Length = Math.floor(byteLength / 2);
    if (int16Length === 0) return;

    const bytes = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const view = new DataView(bytes.buffer);
    const audioBuffer = outCtx.createBuffer(1, int16Length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16Length; i++) {
      channelData[i] = view.getInt16(i * 2, true) / 32768;
    }

    const source = outCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(outCtx.destination);

    const now = outCtx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.02;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
    activeSourcesRef.current.push(source);

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const startLiveSession = async () => {
    if (isLiveConnected || isLiveConnecting) return;
    setIsLiveConnecting(true);
    setLiveError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const floatData = e.inputBuffer.getChannelData(0);
            const base64Audio = float32ToPcm16Base64(floatData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.status === 'connected') {
            setIsLiveConnected(true);
            setIsLiveConnecting(false);
            onNotify('Połączono głosowo na żywo z modelem gemini-3.8-live');
          } else if (msg.audio) {
            playPcm24kChunk(msg.audio);
          } else if (msg.interrupted) {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // Ignore
              }
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          } else if (msg.inputTranscription) {
            setLiveTranscripts((prev) => [
              ...prev,
              {
                id: `in-${Date.now()}-${Math.random()}`,
                speaker: 'Ty (Mikrofon)',
                text: msg.inputTranscription,
              },
            ]);
          } else if (msg.outputTranscription) {
            setLiveTranscripts((prev) => [
              ...prev,
              {
                id: `out-${Date.now()}-${Math.random()}`,
                speaker: 'Gemini 3.8 Live',
                text: msg.outputTranscription,
              },
            ]);
          } else if (msg.error) {
            setLiveError(msg.error);
            stopLiveSession();
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setLiveError('Błąd połączenia WebSocket z serwerem Live API.');
        stopLiveSession();
      };

      ws.onclose = () => {
        stopLiveSession();
      };
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Brak dostępu do mikrofonu lub błąd inicjalizacji audio.';
      setLiveError(msg);
      stopLiveSession();
    }
  };

  const handleSendLiveTextTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTextPrompt.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({ text: liveTextPrompt.trim() }));
    setLiveTranscripts((prev) => [
      ...prev,
      {
        id: `txt-${Date.now()}`,
        speaker: 'Ty (Mikrofon)',
        text: liveTextPrompt.trim(),
      },
    ]);
    setLiveTextPrompt('');
  };

  // ---------------------------------------------------------------------------
  // 5. Google Search Grounding State (gemini-3.8-flash + googleSearch)
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState(
    'Najnowsze wsparcie ARCore Depth API oraz ToF dla tabletów i smartfonów Samsung Galaxy S24 / Tab S9 oraz Unity 6 AR Foundation'
  );
  const [searchResultText, setSearchResultText] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleRunSearchGrounding = async (customQuery?: string) => {
    const q = (customQuery ?? searchQuery).trim();
    if (!q || isSearchLoading) return;
    if (customQuery) setSearchQuery(customQuery);
    setIsSearchLoading(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd wyszukiwania Google Search Grounding');
      }
      setSearchResultText(data.text);
      setSearchSources(data.sources || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd Google Search Grounding';
      setSearchError(msg);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Google Maps Grounding State (gemini-3.8-flash + googleMaps)
  // ---------------------------------------------------------------------------
  const [mapsQuery, setMapsQuery] = useState(
    'Najważniejsze nowoczesne wieżowce, punkty widokowe i biurowce klasy A w pobliżu Ronda Daszyńskiego w Warszawie oraz 8th Avenue w Nowym Jorku'
  );
  const [mapsLatitude, setMapsLatitude] = useState<number>(52.2302);
  const [mapsLongitude, setMapsLongitude] = useState<number>(20.9844);
  const [mapsResultText, setMapsResultText] = useState<string | null>(null);
  const [mapsPlaces, setMapsPlaces] = useState<
    Array<{ uri: string; title: string; reviewSnippets?: string[] }>
  >([]);
  const [isMapsLoading, setIsMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const handleDetectBrowserLocation = () => {
    if (!navigator.geolocation) {
      onNotify('Twoja przeglądarka nie wspiera Geolocation API');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapsLatitude(Number(pos.coords.latitude.toFixed(5)));
        setMapsLongitude(Number(pos.coords.longitude.toFixed(5)));
        onNotify('Pobrano aktualne współrzędne GPS dla Google Maps Grounding');
      },
      () => {
        onNotify('Nie udało się pobrać GPS — użyto współrzędnych domyślnych (Warszawa)');
      }
    );
  };

  const handleRunMapsGrounding = async (customQuery?: string) => {
    const q = (customQuery ?? mapsQuery).trim();
    if (!q || isMapsLoading) return;
    if (customQuery) setMapsQuery(customQuery);
    setIsMapsLoading(true);
    setMapsError(null);

    try {
      const response = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          latitude: mapsLatitude,
          longitude: mapsLongitude,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd Google Maps Grounding');
      }
      setMapsResultText(data.text);
      setMapsPlaces(data.places || []);
      onNotify('Pobrano dane lokalizacyjne z Google Maps Grounding (gemini-3.8-flash)');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd Google Maps Grounding';
      setMapsError(msg);
    } finally {
      setIsMapsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. Audio Transcription State (gemini-3.5-transcribe)
  // ---------------------------------------------------------------------------
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordedAudioDataUrl, setRecordedAudioDataUrl] = useState<string | null>(null);
  const [recordedAudioMime, setRecordedAudioMime] = useState<string>('audio/webm');
  const [transcribePrompt, setTranscribePrompt] = useState(
    'Dokonaj precyzyjnej transkrypcji nagrania głosowego notatki architektonicznej po polsku i wypunktuj najważniejsze parametry budynku.'
  );
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecordingMic = async () => {
    if (isRecordingAudio) return;
    setTranscribeError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioDataUrl(String(reader.result || ''));
          setRecordedAudioMime(mime);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (err: unknown) {
      setTranscribeError(
        err instanceof Error ? err.message : 'Brak dostępu do mikrofonu w przeglądarce.'
      );
    }
  };

  const handleStopRecordingMic = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRecordedAudioDataUrl(String(reader.result || ''));
      setRecordedAudioMime(file.type || 'audio/mp3');
      onNotify(`Wgrano plik audio: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAudioTranscription = async () => {
    if (!recordedAudioDataUrl || isTranscribing) return;
    setIsTranscribing(true);
    setTranscribeError(null);

    try {
      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Audio: recordedAudioDataUrl,
          mimeType: recordedAudioMime,
          prompt: transcribePrompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd transkrypcji w gemini-3.5-transcribe');
      }
      setTranscriptionResult(data.text);
      onNotify('Zakończono transkrypcję audio w modelu gemini-3.5-transcribe');
    } catch (err: unknown) {
      setTranscribeError(err instanceof Error ? err.message : 'Błąd transkrypcji audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 8. Music Generation State (lyria-3-clip-preview & lyria-3-pro-preview)
  // ---------------------------------------------------------------------------
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>(
    'lyria-3-clip-preview'
  );
  const [musicPrompt, setMusicPrompt] = useState(
    'Ambient luxury architectural lounge soundtrack for a holographic 3D skyscraper presentation, warm analog synthesizers, subtle glass arpeggios, cinematic spatial depth.'
  );
  const [useReferenceImageForMusic, setUseReferenceImageForMusic] = useState(true);
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [generatedMusicLyrics, setGeneratedMusicLyrics] = useState<string>('');
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);

  const handleRunLyriaMusic = async () => {
    if (!musicPrompt.trim() || isMusicLoading) return;
    setIsMusicLoading(true);
    setMusicError(null);

    try {
      let base64Image: string | undefined;
      let imageMimeType = 'image/jpeg';

      if (useReferenceImageForMusic) {
        if (latestScreenshot) {
          base64Image = latestScreenshot.dataUrl;
          imageMimeType = 'image/png';
        } else {
          const refData = await urlToBase64('/assets/aistudio/Dashboard_dex_eeffcbc7.jpg');
          base64Image = refData.data;
          imageMimeType = refData.mimeType;
        }
      }

      const response = await fetch('/api/ai/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
          base64Image,
          imageMimeType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Błąd generowania muzyki w ${musicModel}`);
      }
      setGeneratedMusicUrl(data.audioDataUrl);
      setGeneratedMusicLyrics(data.lyrics || '');
      onNotify(`Wygenerowano ścieżkę dźwiękową w modelu ${data.model}`);
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : 'Błąd generowania muzyki');
    } finally {
      setIsMusicLoading(false);
    }
  };

  return (
    <section id="gemini-ai-hub" className="space-y-6 pt-4 border-t border-slate-800/80">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
            <span>Centrum Multimodalne Gemini AI</span>
            <span aria-hidden="true">·</span>
            <span>
              Chatbot · Nano Banana 2.1 · Omni 1.2 Video · Live 3.8 · Search & Maps · Transcribe 3.5 · Lyria 3
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display">
            Studio Sztucznej Inteligencji: Czat, Obrazy, Wideo, Głos, Transkrypcja, Muzyka Lyria 3 oraz Google Search & Maps
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            Rozwijaj makiety architektoniczne AR przy użyciu pełnego zestawu modeli: prowadź rozmowy
            głosowe na żywo (<span className="font-mono">gemini-3.8-live</span>), generuj i edytuj
            wizualizacje stołu holograficznego (<span className="font-mono">gemini-nano-banana-2.1</span>),
            animuj zdjęcia budynków w wideo 16:9 / 9:16 (<span className="font-mono">gemini-omni-1.2-flash</span>),
            transkrybuj notatki głosowe (<span className="font-mono">gemini-3.5-transcribe</span>),
            twórz muzykę tła (<span className="font-mono">lyria-3-clip-preview</span> / <span className="font-mono">lyria-3-pro-preview</span>)
            oraz weryfikuj dane z Google Search i Google Maps (<span className="font-mono">gemini-3.8-flash</span>).
          </p>
        </div>

        {/* Navigation Tabs for all 8 AI Tools */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
          <button
            onClick={() => setActiveToolTab('chatbot')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'chatbot'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Czatbot Gemini</span>
          </button>

          <button
            onClick={() => setActiveToolTab('image_studio')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'image_studio'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Obrazy (Nano Banana 2.1)</span>
          </button>

          <button
            onClick={() => setActiveToolTab('video_omni')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'video_omni'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Wideo (Omni 1.2)</span>
          </button>

          <button
            onClick={() => setActiveToolTab('live_voice')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'live_voice'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Głos Live 3.8</span>
          </button>

          <button
            onClick={() => setActiveToolTab('transcribe_audio')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'transcribe_audio'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileAudio className="w-3.5 h-3.5" />
            <span>Transkrypcja 3.5</span>
          </button>

          <button
            onClick={() => setActiveToolTab('music_lyria')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'music_lyria'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Muzyka (Lyria 3)</span>
          </button>

          <button
            onClick={() => setActiveToolTab('search_grounding')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'search_grounding'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Search</span>
          </button>

          <button
            onClick={() => setActiveToolTab('maps_grounding')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeToolTab === 'maps_grounding'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Google Maps AI</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: MULTI-TURN GEMINI CHATBOT
         ===================================================================== */}
      {activeToolTab === 'chatbot' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                Konfiguracja Asystenta Czatowego
              </h3>
              <p className="text-xs text-slate-400">
                Wybierz model dopasowany do złożoności zadania oraz specjalizację systemową.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Model Gemini (zależnie od złożoności):
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'gemini-4-argon',
                      name: 'gemini-4-argon (Złożone zadania)',
                      desc: 'Zaawansowana architektura C# Unity, matematyka 3D i shadery',
                    },
                    {
                      id: 'gemini-3.8-flash',
                      name: 'gemini-3.8-flash (Zadania ogólne)',
                      desc: 'Uniwersalny balans jakości i szybkości dla projektów AR',
                    },
                    {
                      id: 'gemini-3.1-flash-lite',
                      name: 'gemini-3.1-flash-lite (Ultraszybki)',
                      desc: 'Natychmiastowe odpowiedzi i krótkie korekty promptów',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        setChatModel(
                          m.id as 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'
                        )
                      }
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                        chatModel === m.id
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-semibold text-xs text-cyan-300">{m.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Rola systemowa (System Instruction):
                </label>
                <select
                  value={rolePersona}
                  onChange={(e) =>
                    setRolePersona(
                      e.target.value as 'xr_architect' | 'shader_engineer' | 'prompt_master'
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="xr_architect">
                    Główny Architekt XR/AR (Unity ARKit/ARCore & Czujniki Głębi)
                  </option>
                  <option value="shader_engineer">
                    Inżynier Shaderów Holograficznych (URP Shader Graph / GLSL)
                  </option>
                  <option value="prompt_master">
                    Ekspert Inżynierii Promptów CAD / BIM / AI
                  </option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-slate-400 block font-medium">Szybkie pytania testowe:</span>
                {[
                  'Napisz shader rozpuszczania (Dissolve) dla przejść między scenami budynków 3D w Unity URP.',
                  'Jak odróżnić blat stołu od podłogi w ARFoundation przy użyciu ARPlaneClassification?',
                  'Jak zoptymalizować eksport siatki .OBJ i .STL na tabletach z Androidem?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800/80 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#070A10] border border-slate-800 rounded-xl flex flex-col h-[520px] overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Wieloturowa Sesja Czatowa</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="font-mono text-cyan-400">{chatModel}</span>
              </div>
              <button
                onClick={() => setChatMessages([chatMessages[0]])}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Wyczyść historię
              </button>
            </div>

            <div
              ref={chatScrollRef}
              className="flex-1 p-4 space-y-4 overflow-y-auto text-xs sm:text-sm"
            >
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 font-mono">
                    <span>{msg.role === 'user' ? 'Ty' : 'Asystent Gemini'}</span>
                    {msg.modelUsed && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-cyan-400">{msg.modelUsed}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-cyan-500 text-slate-950 font-medium'
                        : 'bg-slate-900 border border-slate-800 text-slate-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Model {chatModel} analizuje zapytanie...</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Zadaj pytanie o Unity ARKit/ARCore, shadery hologramów, C# lub architekturę..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Wyślij</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CREATE & EDIT IMAGES (gemini-nano-banana-2.1)
         ===================================================================== */}
      {activeToolTab === 'image_studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                Generowanie i Edycja Obrazów
              </h3>
              <span className="text-xs font-mono text-cyan-400">gemini-nano-banana-2.1</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Tryb pracy (Nowy obraz lub Edycja istniejącego):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'create', label: 'Utwórz nowy z tekstu' },
                    { id: 'edit_reference', label: 'Edytuj wzorzec stołu AR' },
                    { id: 'edit_upload', label: 'Edytuj własne zdjęcie' },
                    { id: 'edit_3d', label: 'Edytuj zrzut sceny 3D' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() =>
                        setImageMode(
                          mode.id as 'create' | 'edit_reference' | 'edit_upload' | 'edit_3d'
                        )
                      }
                      className={`px-3 py-2 rounded-lg border text-left font-medium transition-colors ${
                        imageMode === mode.id
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload input when editing custom photo */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-200 truncate">
                    {uploadedEditImage
                      ? `Załadowano: ${uploadedEditImage.name}`
                      : 'Opcjonalnie wgraj zdjęcie z dysku do edycji'}
                  </p>
                  <p className="text-[11px] text-slate-400">PNG, JPG lub WebP</p>
                </div>
                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md cursor-pointer font-medium shrink-0 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Wybierz plik</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImageForEdit}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Prompt wizualny lub instrukcja edycji:
                </label>
                <textarea
                  rows={4}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Opisz hologram budynku, detale architektoniczne, oświetlenie lub co chcesz zmienić na obrazie..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Proporcje obrazu:</label>
                  <select
                    value={imageAspectRatio}
                    onChange={(e) =>
                      setImageAspectRatio(
                        e.target.value as '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
                      )
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="16:9">16:9 (Panorama AR)</option>
                    <option value="9:16">9:16 (Smartfon Pionowo)</option>
                    <option value="1:1">1:1 (Kwadrat)</option>
                    <option value="4:3">4:3 (Tablet)</option>
                    <option value="3:4">3:4 (Portret)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rozdzielczość:</label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as '1K' | '2K' | '4K')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="1K">1K (Szybki render)</option>
                    <option value="2K">2K (Wysoka ostrość detali)</option>
                    <option value="4K">4K (Ultra HD Architektura)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <span className="text-slate-300">
                  Wzbogać kontekst przez Google Image & Web Search
                </span>
                <input
                  type="checkbox"
                  checked={useImageSearchGrounding}
                  onChange={(e) => setUseImageSearchGrounding(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
              </label>

              {imageError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                  {imageError}
                </div>
              )}

              <button
                onClick={handleRunNanoBananaImage}
                disabled={isImageLoading || !imagePrompt.trim()}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isImageLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Renderowanie w gemini-nano-banana-2.1...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {imageMode === 'create'
                        ? 'Wygeneruj Obraz Hologramu AR'
                        : 'Zastosuj Edycję Obrazu AI'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[460px]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Podgląd Wygenerowanej Wizualizacji AI
                </h4>
                <p className="text-xs text-slate-400">
                  Model: <span className="font-mono text-cyan-400">gemini-nano-banana-2.1</span> ·{' '}
                  {imageAspectRatio} · {imageSize}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {generatedImageUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveNanoImageToDrive('generated')}
                      disabled={isSavingImageToDrive}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSavingImageToDrive ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <HardDrive className="w-3.5 h-3.5" />
                      )}
                      <span>Zapisz na Dysku Google</span>
                    </button>
                    <a
                      href={generatedImageUrl}
                      download={`HoloArch_NanoBanana_${Date.now()}.png`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Zapisz obraz PNG</span>
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveNanoImageToDrive(uploadedEditImage ? 'uploaded' : 'reference')
                    }
                    disabled={isSavingImageToDrive}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
                    title="Zapisz aktywne zdjęcie wejściowe lub wzorcowe na swoim Dysku Google"
                  >
                    {isSavingImageToDrive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {uploadedEditImage
                        ? 'Zapisz wgrane zdjęcie na Drive'
                        : 'Zapisz wzorzec AR na Drive'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {savedDriveImageFile && (
              <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Zapisano na Dysku Google:{' '}
                    <strong className="font-mono text-white">{savedDriveImageFile.name}</strong>
                  </span>
                </div>
                {savedDriveImageFile.webViewLink && (
                  <a
                    href={savedDriveImageFile.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold"
                  >
                    <span>Otwórz w Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <div className="flex-1 flex items-center justify-center py-4">
              {generatedImageUrl ? (
                <img
                  src={generatedImageUrl}
                  alt="Wygenerowana wizualizacja hologramu architektonicznego"
                  referrerPolicy="no-referrer"
                  className="max-h-[380px] w-auto rounded-lg border border-slate-800 object-contain shadow-2xl"
                />
              ) : (
                <div className="text-center max-w-md space-y-2 p-6">
                  <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">
                    Gotowy do generowania lub edycji obrazu
                  </p>
                  <p className="text-xs text-slate-500">
                    Wybierz po lewej stronie tryb utworzenia nowej wizualizacji lub edycji
                    wzorcowego zdjęcia stołu konferencyjnego AR i kliknij przycisk generowania.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: GENERATE VIDEO & ANIMATE PHOTO INTO VIDEO (gemini-omni-1.2-flash)
         ===================================================================== */}
      {activeToolTab === 'video_omni' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-400" />
                Wideo z Tekstu i Animacja Zdjęć
              </h3>
              <span className="text-xs font-mono text-amber-400">gemini-omni-1.2-flash</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setVideoMode('animate_photo')}
                  className={`px-3 py-2 rounded-lg border font-medium transition-colors ${
                    videoMode === 'animate_photo'
                      ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Animuj Zdjęcie do Wideo
                </button>
                <button
                  onClick={() => setVideoMode('text_to_video')}
                  className={`px-3 py-2 rounded-lg border font-medium transition-colors ${
                    videoMode === 'text_to_video'
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  Generuj Wideo z Tekstu
                </button>
              </div>

              {videoMode === 'animate_photo' && (
                <div className="space-y-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <label className="block text-slate-300 font-medium">
                    Wybierz zdjęcie startowe do ożywienia (Image-to-Video):
                  </label>
                  <select
                    value={videoPhotoSource}
                    onChange={(e) =>
                      setVideoPhotoSource(
                        e.target.value as
                          | 'uploaded'
                          | 'reference_table'
                          | 'latest_3d'
                          | 'generated_nano'
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="reference_table">
                      Załączone zdjęcie stołu konferencyjnego AR (Dashboard_dex)
                    </option>
                    <option value="uploaded">
                      Własne przesłane zdjęcie z urządzenia {uploadedVideoPhoto ? `(${uploadedVideoPhoto.name})` : ''}
                    </option>
                    <option value="latest_3d">
                      Ostatni zrzut ekranu z symulatora 3D WebGL
                    </option>
                    <option value="generated_nano">
                      Obraz wygenerowany w Nano Banana 2.1
                    </option>
                  </select>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 truncate">
                      {uploadedVideoPhoto
                        ? `Wgrano: ${uploadedVideoPhoto.name}`
                        : 'Lub prześlij własne zdjęcie budynku / makiety:'}
                    </span>
                    <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer font-medium shrink-0 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Wgraj zdjęcie</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadPhotoForVideo}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Opis ruchu kamery, paralaksy i efektów wideo (Prompt):
                </label>
                <textarea
                  rows={4}
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Opisz ruch kamery wokół hologramu budynku, cząsteczki świetlne za oknami..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Format wideo (Aspect Ratio):
                  </label>
                  <select
                    value={videoAspectRatio}
                    onChange={(e) => setVideoAspectRatio(e.target.value as '16:9' | '9:16')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="16:9">16:9 (Poziomy — Landscape)</option>
                    <option value="9:16">9:16 (Pionowy — Portrait Mobile)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Czas trwania:</label>
                  <select
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value as '5s' | '10s')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-200"
                  >
                    <option value="5s">5 sekund (Standard)</option>
                    <option value="10s">10 sekund (Rozszerzony)</option>
                  </select>
                </div>
              </div>

              {videoError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                  {videoError}
                </div>
              )}

              <button
                onClick={handleRunOmniFlashVideo}
                disabled={isVideoLoading || !videoPrompt.trim()}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isVideoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generowanie wideo w gemini-omni-1.2-flash (może potrwać ~30-90s)...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>
                      {videoMode === 'animate_photo'
                        ? 'Animuj Zdjęcie do Wideo (Interactions API)'
                        : 'Wygeneruj Wideo z Tekstu (Interactions API)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Odtwarzacz Wideo AR (Interactions API)
                </h4>
                <p className="text-xs text-slate-400">
                  Model: <span className="font-mono text-amber-400">gemini-omni-1.2-flash</span> ·{' '}
                  Proporcje {videoAspectRatio} · {videoDuration}
                </p>
              </div>
              {generatedVideoUrl && (
                <a
                  href={generatedVideoUrl}
                  download={`HoloArch_OmniVideo_${Date.now()}.mp4`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pobierz MP4</span>
                </a>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center py-4">
              {generatedVideoUrl ? (
                <video
                  src={generatedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[380px] w-auto rounded-lg border border-slate-800 shadow-2xl"
                />
              ) : (
                <div className="text-center max-w-md space-y-2 p-6">
                  <Film className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">
                    Wygeneruj animację przelotu kamery AR wokół makiety
                  </p>
                  <p className="text-xs text-slate-500">
                    Możesz ożywić przesłane zdjęcie stołu konferencyjnego AR, własną fotografię z
                    dysku lub wygenerować film od podstaw na podstawie opisu tekstowego.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: REAL-TIME VOICE CONVERSATIONS (gemini-3.8-live)
         ===================================================================== */}
      {activeToolTab === 'live_voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                Konwersacja Głosowa na Żywo (Live API)
              </h3>
              <span className="text-xs font-mono text-cyan-400">gemini-3.8-live</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Połącz się z modelem <span className="font-mono">gemini-3.8-live</span> przez
              strumień WebSocket PCM (wejście mikrofonowe 16 kHz, wyjście głosowe 24 kHz) i
              omawiaj na żywo detale architektoniczne, konfigurację ARKit/ARCore oraz oświetlenie
              środowiskowe.
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                  isLiveConnected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {isLiveConnected ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-white">
                  {isLiveConnected
                    ? 'Sesja głosowa aktywna — mów do mikrofonu'
                    : isLiveConnecting
                    ? 'Łączenie z serwerem Gemini 3.8 Live...'
                    : 'Sesja głosowa rozłączona'}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  Głos: Zephyr · Wejście 16kHz PCM · Wyjście 24kHz PCM
                </p>
              </div>

              {!isLiveConnected ? (
                <button
                  onClick={startLiveSession}
                  disabled={isLiveConnecting}
                  className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLiveConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inicjalizacja strumienia audio...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Rozpocznij Rozmowę Głosową na Żywo</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={stopLiveSession}
                  className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MicOff className="w-4 h-4" />
                  <span>Zakończ Połączenie Głosowe</span>
                </button>
              )}
            </div>

            {liveError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {liveError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl flex flex-col h-[420px] overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Transkrypcja na żywo i sterowanie sesją Live API
              </span>
              <span className="font-mono text-slate-400">
                Status: {isLiveConnected ? 'ONLINE (24kHz Audio)' : 'GOTOWY'}
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2.5 text-xs">
              {liveTranscripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-1">
                  <p className="text-slate-300 font-medium">Brak zarejestrowanych wypowiedzi</p>
                  <p>
                    Kliknij „Rozpocznij Rozmowę Głosową na Żywo” i zapytaj głosowo np. o czujniki
                    głębi LiDAR lub paralaksę 6DoF.
                  </p>
                </div>
              ) : (
                liveTranscripts.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80"
                  >
                    <span className="font-mono font-semibold text-cyan-400 mr-2">
                      {item.speaker}:
                    </span>
                    <span className="text-slate-200">{item.text}</span>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleSendLiveTextTurn}
              className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={liveTextPrompt}
                onChange={(e) => setLiveTextPrompt(e.target.value)}
                disabled={!isLiveConnected}
                placeholder={
                  isLiveConnected
                    ? 'Wyślij dodatkowy komunikat tekstowy do aktywnej sesji głosowej Live...'
                    : 'Uruchom sesję głosową, aby rozmawiać lub wysyłać komunikaty...'
                }
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isLiveConnected || !liveTextPrompt.trim()}
                className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
              >
                Wyślij do Live
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: GOOGLE SEARCH GROUNDING (gemini-3.8-flash + googleSearch)
         ===================================================================== */}
      {activeToolTab === 'search_grounding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                Weryfikacja Danych z Google Search
              </h3>
              <span className="text-xs font-mono text-cyan-400">gemini-3.8-flash</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pobieraj aktualne i zweryfikowane informacje z wyszukiwarki Google (Search Grounding)
              dotyczące wspieranych urządzeń ARCore, dokumentacji Unity 6 XR oraz parametrów
              architektonicznych budynków.
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Wpisz zapytanie do wyszukiwarki Google..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-cyan-500"
              />

              <button
                onClick={() => handleRunSearchGrounding()}
                disabled={isSearchLoading || !searchQuery.trim()}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSearchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Przeszukiwanie Google Search...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Wyszukaj z Google Search Grounding</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-slate-400 block font-medium">Przykładowe kwerendy:</span>
                {[
                  'Oficjalna lista tabletów Android wspierających Google ARCore Depth API w 2026 roku',
                  'Nowości w Unity 6 AR Foundation 6.0 dotyczące okluzji LiDAR i oświetlenia środowiskowego',
                  'Najwyższe wieżowce z konstrukcją diagrid na świecie — parametry architektoniczne',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRunSearchGrounding(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800/80 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {searchError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {searchError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white">
                  Raport z Google Search Grounding
                </h4>
                <span className="text-xs font-mono text-cyan-400">
                  {searchSources.length} źródeł WWW
                </span>
              </div>

              {searchResultText ? (
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto pr-2">
                  {searchResultText}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs space-y-1">
                  <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-300 font-medium">
                    Uruchom zapytanie z uziemieniem w Google Search
                  </p>
                  <p>
                    Wynik wraz z klikalnymi linkami źródłowymi pojawi się w tym oknie.
                  </p>
                </div>
              )}
            </div>

            {searchSources.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Zweryfikowane źródła Google Search:
                </span>
                <div className="flex flex-wrap gap-2">
                  {searchSources.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 transition-colors max-w-xs truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: GOOGLE MAPS GROUNDING (gemini-3.8-flash + googleMaps)
         ===================================================================== */}
      {activeToolTab === 'maps_grounding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                Uziemienie Geograficzne w Google Maps
              </h3>
              <span className="text-xs font-mono text-emerald-400">gemini-3.8-flash</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Pobieraj zweryfikowane dane o lokalizacjach architektonicznych, wieżowcach i otoczeniu
              urbanistycznym bezpośrednio z Google Maps Grounding wraz z linkami do mapy.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Szerokość geogr. (Lat):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={mapsLatitude}
                    onChange={(e) => setMapsLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Długość geogr. (Lng):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={mapsLongitude}
                    onChange={(e) => setMapsLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleDetectBrowserLocation}
                className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1.5 font-medium"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pobierz moją lokalizację GPS z przeglądarki</span>
              </button>

              <textarea
                rows={3}
                value={mapsQuery}
                onChange={(e) => setMapsQuery(e.target.value)}
                placeholder="Zapytaj o budynki, wysokościowce, urbanistykę lub punkty w wybranej lokalizacji..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500"
              />

              <button
                onClick={() => handleRunMapsGrounding()}
                disabled={isMapsLoading || !mapsQuery.trim()}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isMapsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Pobieranie miejsc z Google Maps...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>Zapytaj z Google Maps Grounding</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-slate-400 block font-medium">Szybkie kwerendy lokalizacyjne:</span>
                {[
                  'Nowoczesne wieżowce i architektura wokół Ronda Daszyńskiego w Warszawie',
                  'Najwyższe budynki i punkty widokowe na Manhattanie w pobliżu 8th Avenue w Nowym Jorku',
                  'Nowoczesne kompleksy biznesowe w Tashkent City w Uzbekistanie',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRunMapsGrounding(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800/80 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {mapsError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {mapsError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white">
                  Raport Lokalizacyjny z Google Maps Grounding
                </h4>
                <span className="text-xs font-mono text-emerald-400">
                  {mapsPlaces.length} powiązanych miejsc Maps
                </span>
              </div>

              {mapsResultText ? (
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[260px] overflow-y-auto pr-2">
                  {mapsResultText}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs space-y-1">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-300 font-medium">
                    Uruchom zapytanie z uziemieniem w Google Maps
                  </p>
                  <p>
                    Odpowiedź modelu oraz bezpośrednie odnośniki do obiektów na mapie Google pojawią się tutaj.
                  </p>
                </div>
              )}
            </div>

            {mapsPlaces.length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Zweryfikowane obiekty w Google Maps (groundingChunks.maps):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mapsPlaces.map((place, i) => (
                    <a
                      key={i}
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-emerald-300 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{place.title}</span>
                      </div>
                      {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          „{place.reviewSnippets[0]}”
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: AUDIO TRANSCRIPTION (gemini-3.5-transcribe)
         ===================================================================== */}
      {activeToolTab === 'transcribe_audio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-cyan-400" />
                Transkrypcja Nagrań Głosowych
              </h3>
              <span className="text-xs font-mono text-cyan-400">gemini-3.5-transcribe</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nagraj notatkę głosową przez mikrofon lub prześlij plik dźwiękowy (MP3, WAV, WebM), aby
              przekształcić mowę w tekst architektoniczny za pomocą modelu{' '}
              <span className="font-mono">gemini-3.5-transcribe</span>.
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center gap-3 text-center">
                {!isRecordingAudio ? (
                  <button
                    type="button"
                    onClick={handleStartRecordingMic}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Nagraj Notatkę z Mikrofonu</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecordingMic}
                    className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 animate-pulse"
                  >
                    <Square className="w-4 h-4" />
                    <span>Zatrzymaj Nagrywanie Mikrofonu</span>
                  </button>
                )}

                <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    Lub wybierz gotowy plik audio z dysku:
                  </span>
                  <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer font-medium flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Wgraj Audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleUploadAudioFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {recordedAudioDataUrl && (
                  <audio
                    src={recordedAudioDataUrl}
                    controls
                    className="w-full h-9 mt-1"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Instrukcja transkrypcji:
                </label>
                <textarea
                  rows={2}
                  value={transcribePrompt}
                  onChange={(e) => setTranscribePrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleRunAudioTranscription}
                disabled={!recordedAudioDataUrl || isTranscribing}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transkrypcja w gemini-3.5-transcribe...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transkrybuj Nagranie Audio na Tekst</span>
                  </>
                )}
              </button>
            </div>

            {transcribeError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {transcribeError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white">
                  Wynik Transkrypcji Audio (gemini-3.5-transcribe)
                </h4>
                {transcriptionResult && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(transcriptionResult);
                      onNotify('Skopiowano transkrypcję do schowka');
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-medium"
                  >
                    Kopiuj tekst
                  </button>
                )}
              </div>

              {transcriptionResult ? (
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap max-h-[310px] overflow-y-auto">
                  {transcriptionResult}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs space-y-1">
                  <FileAudio className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-300 font-medium">
                    Nagraj głos mikrofonem lub wgraj plik audio
                  </p>
                  <p>
                    Model gemini-3.5-transcribe zamieni nagranie na gotowy tekst i specyfikację.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: MUSIC GENERATION (lyria-3-clip-preview / lyria-3-pro-preview)
         ===================================================================== */}
      {activeToolTab === 'music_lyria' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                Generator Muzyki Przestrzennej AI
              </h3>
              <span className="text-xs font-mono text-amber-400">{musicModel}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Twórz autorską ścieżkę dźwiękową do prezentacji architektonicznych oraz lotów dronem
              3D przy użyciu modeli muzycznych Google Lyria 3.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Wybierz wariant modelu Lyria 3:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMusicModel('lyria-3-clip-preview')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      musicModel === 'lyria-3-clip-preview'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-mono font-semibold text-[11px]">lyria-3-clip-preview</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Klip 30 sekund (Szybki)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMusicModel('lyria-3-pro-preview')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      musicModel === 'lyria-3-pro-preview'
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-mono font-semibold text-[11px]">lyria-3-pro-preview</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Pełny utwór (Full Track)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Opis nastroju, instrumentów i tempa (Prompt):
                </label>
                <textarea
                  rows={3}
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <span className="text-slate-300">
                  Zainspiruj utwór bieżącym obrazem makiety AR (Image + Text)
                </span>
                <input
                  type="checkbox"
                  checked={useReferenceImageForMusic}
                  onChange={(e) => setUseReferenceImageForMusic(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 rounded"
                />
              </label>

              <button
                type="button"
                onClick={handleRunLyriaMusic}
                disabled={isMusicLoading || !musicPrompt.trim()}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isMusicLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Komponowanie w {musicModel}...</span>
                  </>
                ) : (
                  <>
                    <Music className="w-4 h-4" />
                    <span>Wygeneruj Ścieżkę Dźwiękową Lyria 3</span>
                  </>
                )}
              </button>
            </div>

            {musicError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                {musicError}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl p-5 flex flex-col justify-between min-h-[420px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Odtwarzacz Ścieżki Dźwiękowej AR (Lyria 3)
                </h4>
                <p className="text-xs text-slate-400 font-mono">{musicModel}</p>
              </div>
              {generatedMusicUrl && (
                <a
                  href={generatedMusicUrl}
                  download={`HoloArch_Lyria3_${Date.now()}.mp3`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pobierz MP3</span>
                </a>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-6 space-y-4">
              {generatedMusicUrl ? (
                <div className="w-full max-w-xl space-y-4">
                  <div className="p-5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                      <Music className="w-4 h-4" />
                      <span>Wygenerowany utwór gotowy do odtworzenia:</span>
                    </div>
                    <audio src={generatedMusicUrl} controls autoPlay className="w-full" />
                  </div>
                  {generatedMusicLyrics && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto">
                      <div className="font-semibold text-slate-200 mb-1">
                        Struktura muzyczna / Tekst (Lyria Metadata):
                      </div>
                      {generatedMusicLyrics}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center max-w-md space-y-2 p-6">
                  <Music className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-300">
                    Skomponuj muzykę dla przestrzeni 3D i przelotu dronem
                  </p>
                  <p className="text-xs text-slate-500">
                    Wybierz model 30-sekundowy (<span className="font-mono">lyria-3-clip-preview</span>)
                    lub pełny utwór (<span className="font-mono">lyria-3-pro-preview</span>) i kliknij
                    przycisk generowania.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
