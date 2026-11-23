import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Cpu,
  Download,
  FileCode,
  FileText,
  Gamepad2,
  GitCompare,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Palette,
  RefreshCw,
  Search,
  Sliders,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Trash2,
} from 'lucide-react';
import {
  ARConfigState,
  CapturedScreenshot,
  HologramPaletteId,
  SavedCloudProject,
} from './types/arStudio';
import {
  ARCHITECTURAL_SCENES,
  HOLOGRAM_PALETTES,
  SUPPORTED_MOBILE_DEVICES,
  generateMasterPrompt,
} from './data/arStudioData';
import { HologramViewport3D } from './components/HologramViewport3D';
import { LuxurySpatialDeck } from './components/LuxurySpatialDeck';
import { GeminiStudioHub } from './components/GeminiStudioHub';
import { GoogleDriveWorkspacePanel } from './components/GoogleDriveWorkspacePanel';
import { StudioExtensionsHub } from './components/StudioExtensionsHub';
import { ArchitecturalMapPanel } from './components/ArchitecturalMapPanel';
import { HoloDroneGame3D } from './components/HoloDroneGame3D';
import { ProjectComparisonView } from './components/ProjectComparisonView';
import {
  exportProjectToPDF,
  exportProjectToGLTF,
  exportProjectToIFC,
  exportProjectToPLY,
} from './utils/exporters';
import { saveImageToGoogleDrive } from './utils/googleDriveAuth';

const STORAGE_KEY_CONFIG = 'holoarch_ar_studio_config_v1';
const STORAGE_KEY_PROJECTS = 'holoarch_ar_saved_projects_v1';

const DEFAULT_CONFIG: ARConfigState = {
  sceneId: 'skyline_financial',
  customSceneTitle: '',
  towerHeightMultiplier: 1.0,
  showSpatialAgents: true,
  agentNavMode: 'lidar_orbit',
  activeAgentsCount: 4,
  perspectiveFovDeg: 64,
  workspaceMarginPx: 28,
  compositionGrid: 'golden_ratio',
  depthOfFieldIntensity: 0.75,
  horizonOffsetY: 0,
  droneFlightActive: true,
  droneSpeed: 1.0,
  droneAltitudeM: 1250,
  droneLandscape: 'alpine_peaks',
  hobbyAssemblyStep: 12,
  hobbyBlueprintConnectors: true,
  safeClickSoundEnabled: true,
  gyroPitchDeg: 0,
  gyroRollDeg: 0,
  framework: 'unity_arfoundation',
  planeDetectionMode: 'table_and_floor',
  depthSensorActive: true,
  environmentalLighting: true,
  lightTemperatureK: 4200,
  occlusionEnabled: true,
  parallaxIntensity: 0.75,
  windowParticlesIntensity: 0.8,
  modelScale: 1.0,
  modelRotationY: 25,
  explodedViewFactor: 0.0,
  wireframeOverlay: false,
  autoRotate: true,
  offlineModeEnabled: true,
  cloudSyncEnabled: true,
  activeReferenceImageId: 'ref-100-boardroom',
  activeExtensions: [
    'ext_pbr_glass_ior',
    'ext_led_slab_core',
    'ext_voronoi_lattice',
    'ext_gltf_draco',
  ],
  exportFormats: {
    obj: true,
    stl: true,
    ply: true,
    pdf: true,
    gltf: true,
    usdz: true,
    ifc: true,
  },
  uiSettings: {
    palette: 'cyan_blueprint',
    hudDensity: 'detailed',
    showPlaneGrid: true,
    showFloatingPanels: true,
    promptLanguage: 'pl',
  },
};

function mergeWithDefaultConfig(raw: Partial<ARConfigState> | null | undefined): ARConfigState {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    exportFormats: {
      ...DEFAULT_CONFIG.exportFormats,
      ...(raw.exportFormats || {}),
    },
    uiSettings: {
      ...DEFAULT_CONFIG.uiSettings,
      ...(raw.uiSettings || {}),
    },
  };
}

export default function App() {
  const [config, setConfig] = useState<ARConfigState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return mergeWithDefaultConfig(JSON.parse(saved));
      }
    } catch {
      // Fallback to default
    }
    return DEFAULT_CONFIG;
  });

  const [savedProjects, setSavedProjects] = useState<SavedCloudProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [
      {
        id: 'preset-skyline',
        name: 'Prezentacja Zarządu — Wieżowce na Stole Konferencyjnym',
        updatedAt: '2026-10-26 11:30',
        syncStatus: 'Zsynchronizowano w chmurze',
        config: DEFAULT_CONFIG,
      },
      {
        id: 'preset-campus',
        name: 'Makieta Podłogowa 1:20 — Kampus Bioklimatyczny',
        updatedAt: '2026-10-25 16:45',
        syncStatus: 'Zapisano lokalnie (Offline)',
        config: {
          ...DEFAULT_CONFIG,
          sceneId: 'eco_atrium',
          modelScale: 1.35,
          towerHeightMultiplier: 1.25,
          explodedViewFactor: 0.45,
          lightTemperatureK: 5200,
          perspectiveFovDeg: 52,
          droneLandscape: 'ocean_wellness',
          droneAltitudeM: 860,
          agentNavMode: 'floor_patrol',
          activeAgentsCount: 5,
          uiSettings: { ...DEFAULT_CONFIG.uiSettings, palette: 'emerald_matrix' },
        },
      },
      {
        id: 'preset-voronoi',
        name: 'Wieża Bioniczna Voronoi Helix 325m — Złota Godzina',
        updatedAt: '2026-10-24 19:20',
        syncStatus: 'Zsynchronizowano w chmurze',
        config: {
          ...DEFAULT_CONFIG,
          sceneId: 'voronoi_bionic_spire',
          modelScale: 1.5,
          towerHeightMultiplier: 1.45,
          explodedViewFactor: 0.25,
          wireframeOverlay: true,
          lightTemperatureK: 3100,
          perspectiveFovDeg: 72,
          droneLandscape: 'metropolis_dawn',
          droneAltitudeM: 1680,
          agentNavMode: 'facade_scan',
          activeAgentsCount: 6,
          uiSettings: { ...DEFAULT_CONFIG.uiSettings, palette: 'amber_gold' },
        },
      },
    ];
  });

  const [compareIdA, setCompareIdA] = useState<string>(() => 'preset-skyline');
  const [compareIdB, setCompareIdB] = useState<string>(() => 'preset-campus');
  const [showComparisonPanel, setShowComparisonPanel] = useState<boolean>(true);

  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);
  const [activePromptTab, setActivePromptTab] = useState<
    'pl_master' | 'en_master' | 'visual_ai' | 'unity_csharp'
  >('pl_master');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [deviceSearch, setDeviceSearch] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [quickPromptText, setQuickPromptText] = useState<string>(
    'Hologram wysokościowca finansowego 1.35x na blacie konferencyjnym, złote oświetlenie zachodu słońca 3200K, 5 agentów skanujących elewację i rozstrzelone warstwy konstrukcyjne'
  );

  // Real Gemini 3D Space Builder execution state (replaces instant 0.0s local check)
  const [isBuilding3DSpace, setIsBuilding3DSpace] = useState<boolean>(false);
  const [buildElapsedSec, setBuildElapsedSec] = useState<number>(0);
  const [lastAiSpaceResult, setLastAiSpaceResult] = useState<{
    elapsedSeconds: string;
    architecturalSummary: string;
    executionSteps: string[];
    modelUsed: string;
  } | null>(null);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);
  const [showAgentGuidePanel, setShowAgentGuidePanel] = useState<boolean>(true);
  const [isDroneGameOpen, setIsDroneGameOpen] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const handleApplyPromptTo3DScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPromptText.trim() || isBuilding3DSpace) return;

    setIsBuilding3DSpace(true);
    setBuildElapsedSec(0.1);
    const startTs = performance.now();
    const timerInterval = window.setInterval(() => {
      setBuildElapsedSec(Number(((performance.now() - startTs) / 1000).toFixed(1)));
    }, 100);

    try {
      const response = await fetch('/api/ai/build-3d-space', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: quickPromptText,
          currentConfig: config,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Błąd komunikacji z serwerem Gemini 3.8 Flash');
      }

      setConfig((prev) => ({
        ...prev,
        sceneId: data.sceneId || prev.sceneId,
        customSceneTitle: data.customTitle || prev.customSceneTitle,
        towerHeightMultiplier:
          typeof data.towerHeightMultiplier === 'number'
            ? Math.max(0.6, Math.min(1.8, data.towerHeightMultiplier))
            : prev.towerHeightMultiplier,
        explodedViewFactor:
          typeof data.explodedViewFactor === 'number'
            ? Math.max(0, Math.min(1, data.explodedViewFactor))
            : prev.explodedViewFactor,
        lightTemperatureK:
          typeof data.lightTemperatureK === 'number'
            ? Math.max(2800, Math.min(6500, data.lightTemperatureK))
            : prev.lightTemperatureK,
        wireframeOverlay:
          typeof data.wireframeOverlay === 'boolean'
            ? data.wireframeOverlay
            : prev.wireframeOverlay,
        showSpatialAgents: true,
        agentNavMode: data.agentNavMode || prev.agentNavMode,
        activeAgentsCount:
          typeof data.activeAgentsCount === 'number'
            ? Math.max(2, Math.min(6, data.activeAgentsCount))
            : prev.activeAgentsCount,
        uiSettings: {
          ...prev.uiSettings,
          palette: data.palette || prev.uiSettings.palette,
        },
      }));

      const finalSec = data.elapsedSeconds || ((performance.now() - startTs) / 1000).toFixed(2);
      setLastAiSpaceResult({
        elapsedSeconds: String(finalSec),
        architecturalSummary:
          data.architecturalSummary ||
          'Zaktualizowano przestrzeń 3D, siatkę NavMesh agentów oraz parametry shadera AR.',
        executionSteps: Array.isArray(data.executionSteps)
          ? data.executionSteps
          : [
              '1. Analiza semantyczna promptu przez model Gemini 3.8 Flash',
              '2. Przeliczenie siatki NavMesh i trajektorii agentów przestrzennych 3D',
              '3. Aktualizacja bryły budynku, wysokości kondygnacji i kodu Unity C#',
            ],
        modelUsed: 'gemini-3.8-flash (Server-Side Structured JSON)',
      });
      setActiveWorkflowStep(3);
      showNotification(
        `Gemini 3.8 Flash przebudował przestrzeń 3D i trajektorie agentów w ${finalSec} s!`
      );
    } catch {
      const text = quickPromptText.toLowerCase();
      const updates: Partial<ARConfigState> = { showSpatialAgents: true };
      const uiUpdates: Partial<ARConfigState['uiSettings']> = {};

      if (text.includes('kampus') || text.includes('eco') || text.includes('kopuł')) {
        updates.sceneId = 'eco_atrium';
      } else if (text.includes('terminal') || text.includes('lotnisk') || text.includes('aero')) {
        updates.sceneId = 'aero_hub';
      } else {
        updates.sceneId = 'skyline_financial';
      }

      if (text.includes('złot') || text.includes('zachód') || text.includes('3200')) {
        uiUpdates.palette = 'amber_gold';
        updates.lightTemperatureK = 3200;
      } else if (text.includes('zielon') || text.includes('szmaragd') || text.includes('lidar')) {
        uiUpdates.palette = 'emerald_matrix';
      }

      if (text.includes('warstw') || text.includes('rozstrzel')) {
        updates.explodedViewFactor = 0.6;
      }
      if (text.includes('elewac')) {
        updates.agentNavMode = 'facade_scan';
      } else if (text.includes('patrol') || text.includes('podłog')) {
        updates.agentNavMode = 'floor_patrol';
      }

      setConfig((prev) => ({
        ...prev,
        ...updates,
        uiSettings: { ...prev.uiSettings, ...uiUpdates },
      }));
      showNotification('Zastosowano parametry na scenie 3D (tryb lokalny Offline)');
    } finally {
      window.clearInterval(timerInterval);
      setIsBuilding3DSpace(false);
    }
  };

  const handleRunGuidedDemoStep = (stepNumber: number) => {
    setActiveWorkflowStep(stepNumber);
    if (stepNumber === 1) {
      updateConfig({
        sceneId: 'skyline_financial',
        modelScale: 1.15,
        towerHeightMultiplier: 1.25,
        explodedViewFactor: 0.0,
        showSpatialAgents: true,
        agentNavMode: 'lidar_orbit',
        activeAgentsCount: 4,
      });
      showNotification(
        'Krok 1: Osadzono główny model 3D wieżowców na blacie stołu AR i uruchomiono 4 agentów na orbicie LiDAR.'
      );
    } else if (stepNumber === 2) {
      updateConfig({
        showSpatialAgents: true,
        agentNavMode: 'facade_scan',
        activeAgentsCount: 6,
        explodedViewFactor: 0.55,
        wireframeOverlay: true,
      });
      showNotification(
        'Krok 2: Przełączono 6 agentów 3D w tryb Pionowego Skanowania Elewacji i rozstrzelono warstwy konstrukcyjne BIM!'
      );
    } else if (stepNumber === 3) {
      setQuickPromptText(
        'Kampus bioklimatyczny z kopułą geodezyjną 1.4x, szmaragdowy LiDAR, 5 agentów patrolujących blat i podłogę, rozstrzelone warstwy 40%'
      );
      showNotification(
        'Krok 3: Wpisano przykładowy prompt w pasku powyżej — kliknij „Przebuduj Przestrzeń 3D przez Gemini”, aby zobaczyć czas wykonania na żywo!'
      );
    } else if (stepNumber === 4) {
      handleExportPDF();
    }
  };

  // Persist in Offline Storage automatically when offlineModeEnabled is true
  useEffect(() => {
    if (config.offlineModeEnabled) {
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(savedProjects));
    } catch {
      // Ignore storage quota errors
    }
  }, [savedProjects]);

  const updateConfig = (partial: Partial<ARConfigState>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateUiSettings = (partial: Partial<ARConfigState['uiSettings']>) => {
    setConfig((prev) => ({
      ...prev,
      uiSettings: { ...prev.uiSettings, ...partial },
    }));
  };

  const showNotification = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const generatedPrompts = useMemo(() => generateMasterPrompt(config), [config]);

  const activePromptContent = useMemo(() => {
    if (activePromptTab === 'pl_master') return generatedPrompts.systemPromptPL;
    if (activePromptTab === 'en_master') return generatedPrompts.systemPromptEN;
    if (activePromptTab === 'visual_ai') return generatedPrompts.visualPromptEN;
    return generatedPrompts.unityCSharpCode;
  }, [activePromptTab, generatedPrompts]);

  const handleCopyPrompt = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showNotification('Skopiowano gotowy prompt / kod do schowka');
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const [isSavingGalleryToDrive, setIsSavingGalleryToDrive] = useState<string | null>(null);

  const handleSaveGalleryImageToDrive = async (
    target: 'reference' | 'screenshot',
    shot?: CapturedScreenshot
  ) => {
    if (isSavingGalleryToDrive) return;
    const key = target === 'reference' ? 'ref' : shot?.id || 'shot';
    setIsSavingGalleryToDrive(key);
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (target === 'reference') {
        const uploaded = await saveImageToGoogleDrive({
          imageUrl: '/assets/aistudio/Dashboard_dex_eeffcbc7.jpg',
          fileName: `HoloArch_Wzorzec_Stol_AR_${stamp}.jpg`,
          mimeType: 'image/jpeg',
          description: 'HoloArch_AR_Studio Reference Boardroom Image',
        });
        showNotification(`Zapisano obraz wzorcowy AR na Dysku Google: ${uploaded.name}`);
      } else if (shot) {
        const uploaded = await saveImageToGoogleDrive({
          dataUrl: shot.dataUrl,
          fileName: `HoloArch_Zrzut3D_${shot.id}.png`,
          mimeType: 'image/png',
          description: `HoloArch_AR_Studio 3D Screenshot (${shot.title})`,
        });
        showNotification(`Zapisano zrzut ekranu 3D na Dysku Google: ${uploaded.name}`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się zapisać obrazu na Dysku Google.';
      showNotification(`Błąd zapisu na Dysku Google: ${msg}`);
    } finally {
      setIsSavingGalleryToDrive(null);
    }
  };

  const handleCaptureScreenshot = (dataUrl: string, sceneName: string) => {
    const newShot: CapturedScreenshot = {
      id: `shot-${Date.now()}`,
      title: `Widok AR — ${sceneName}`,
      sceneName,
      timestamp: new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      dataUrl,
      resolution: '1920 × 1080 px (HD 3D Canvas)',
    };
    setScreenshots((prev) => [newShot, ...prev]);
  };

  const handleExportPDF = () => {
    const latestShot = screenshots.length > 0 ? screenshots[0].dataUrl : undefined;
    exportProjectToPDF(config, latestShot);
    showNotification('Wygenerowano i pobrano dokumentację techniczną oraz prompt w formacie .PDF');
  };

  const handleSaveCloudProject = (e: React.FormEvent) => {
    e.preventDefault();
    const title =
      newProjectName.trim() ||
      `Konfiguracja AR (${ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId)?.name})`;
    const proj: SavedCloudProject = {
      id: `proj-${Date.now()}`,
      name: title,
      updatedAt: new Date().toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      syncStatus: config.cloudSyncEnabled
        ? 'Zsynchronizowano w chmurze'
        : 'Zapisano lokalnie (Offline)',
      config: { ...config },
    };
    setSavedProjects((prev) => [proj, ...prev]);
    setNewProjectName('');
    showNotification(
      config.cloudSyncEnabled
        ? 'Projekt zapisany i zsynchronizowany w chmurze użytkownika'
        : 'Projekt zapisany w pamięci podręcznej trybu Offline'
    );
  };

  const filteredDevices = useMemo(() => {
    return SUPPORTED_MOBILE_DEVICES.filter((d) => {
      const matchesType = deviceFilter === 'ALL' || d.formFactor === deviceFilter;
      const q = deviceSearch.trim().toLowerCase();
      const matchesQuery =
        !q ||
        d.brand.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.depthSensor.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [deviceFilter, deviceSearch]);

  const activeSceneMeta =
    ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId) || ARCHITECTURAL_SCENES[0];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      {quotaExceeded && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            background: '#fffbeb',
            borderBottom: '1px solid #f59e0b',
            padding: '10px 16px',
            fontSize: '14px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span>
            ⚠️ Demo key quota exceeded. Check the{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#b45309', fontWeight: 600, textDecoration: 'underline' }}
            >
              Google Maps Platform &amp; AI Studio troubleshooting guide
            </a>{' '}
            to resolve this.
          </span>
          <button
            onClick={() => setQuotaExceeded(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#92400e',
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {isDroneGameOpen && (
        <HoloDroneGame3D
          onCloseGame={() => setIsDroneGameOpen(false)}
          onSyncEarnedScoreToStudio={(nodesCount) => {
            updateConfig({ hobbyAssemblyStep: Math.min(16, Math.max(config.hobbyAssemblyStep, nodesCount + 4)) });
            showNotification(
              `Ukończono misję Drona 3D (${nodesCount} węzłów LiDAR) — odblokowano pełny montaż makiety!`
            );
          }}
        />
      )}

      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-4 bg-[#0B0F17]/95 border-b border-slate-800/90">
        {/* Zone 1: Single Text Element Brand Wordmark */}
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          HoloArch AR Studio
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="#simulator"
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Przestrzeń 3D i Agenci
          </a>
          <a
            href="#extensions-gallery"
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 text-amber-300"
          >
            Obrazki i Rozszerzenia (52)
          </a>
          <a
            href="#gemini-ai-hub"
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Studio Gemini AI
          </a>
          <a
            href="#google-drive"
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 text-cyan-300"
          >
            Google Drive & Firestore
          </a>
          <a
            href="#devices"
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0"
          >
            Wspierane Urządzenia
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Eksportuj Projekt do PDF</span>
          </button>
        </div>
      </header>

      {/* Non-intrusive Status Toast */}
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-cyan-500/50 text-slate-100 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2.5 text-xs font-medium">
          <Check className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Main Content Container (1440px Desktop Presence) */}
      <main id="top" className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
        {/* Section 1: Interactive 3D/AR Hologram Simulator & Scene Selector */}
        <section id="simulator" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-800/80 pb-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono tabular-nums">
                <span>Unity 6 AR Foundation</span>
                <span aria-hidden="true">·</span>
                <span>ARKit LiDAR & ARCore Depth API</span>
                <span aria-hidden="true">·</span>
                <span>Agenci 3D NavMesh: {config.activeAgentsCount} aktywnych</span>
                <span aria-hidden="true">·</span>
                <span>Tryb Offline: {config.offlineModeEnabled ? 'Aktywny' : 'Wył.'}</span>
              </div>
              <h1
                className="text-2xl sm:text-4xl font-bold text-white tracking-tight font-display"
                style={{ textWrap: 'balance' }}
              >
                Symulator Hologramów Architektonicznych 3D i Autonomicznych Agentów Przestrzennych
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Główny model 3D znajduje się bezpośrednio w centralnym oknie projekcyjnym poniżej.
                Wokół budynków poruszają się w czasie rzeczywistym autonomiczni agenci skanujący
                (`AG-01` – `AG-06`) oparci na siatce <strong>3D NavMesh / Waypoint Graph</strong>{' '}
                oraz czujnikach głębi stołu i podłogi.
              </p>
            </div>

            {/* Scene Transition Cards + 3D Drone Mission Game Launcher */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {ARCHITECTURAL_SCENES.map((scene) => {
                const active = config.sceneId === scene.id;
                return (
                  <button
                    key={scene.id}
                    onClick={() => updateConfig({ sceneId: scene.id, customSceneTitle: '' })}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {scene.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsDroneGameOpen(true)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border bg-emerald-500/20 border-emerald-400 text-emerald-200 hover:bg-emerald-500 hover:text-slate-950 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Gra 3D: Misja Drona LiDAR</span>
              </button>
            </div>
          </div>

          {/* Interactive Guide: How Agents Move in AI Studio & How to Work Step-by-Step */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                <h2 className="text-xs sm:text-sm font-semibold text-white">
                  Na jakiej bazie poruszają się Agenci w AI Studio i Przestrzeni 3D oraz Jak Pracować (Krok po Kroku)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAgentGuidePanel((prev) => !prev)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {showAgentGuidePanel ? 'Ukryj panel przewodnika ▲' : 'Pokaż przewodnik i sterowanie agentami ▼'}
              </button>
            </div>

            {showAgentGuidePanel && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800/80">
                {/* Left: 2-Layer Explanation of Agent Movement Base */}
                <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800/90 rounded-lg p-3.5 space-y-2.5 text-xs">
                  <div className="font-semibold text-cyan-300">
                    1. Baza ruchu agentów (2 warstwy technologiczne):
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-white">A) W silniku Gemini AI Studio (Backend):</strong>{' '}
                    Agenci poruszają się w pętli <strong>ReAct (Reason + Act)</strong> oraz{' '}
                    <strong>Interactions API</strong> (`gemini-3.8-flash` / `gemini-omni-1.1-flash`).
                    Odbierają Twój prompt, planują kroki i zwracają ustrukturyzowany schemat JSON.
                    Wcześniej górny pasek wykonywał tylko lokalny skrypt JS (`0.0 s`) — teraz wywołuje
                    pełny model Gemini na serwerze z licznikiem czasu na żywo (`1.2 s – 3.5 s`).
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    <strong className="text-white">B) W przestrzeni 3D AR / Unity (Viewport):</strong>{' '}
                    Agenci (`AG-01`..`AG-06` widoczni na scenie poniżej) poruszają się po{' '}
                    <strong>siatce nawigacyjnej 3D NavMesh, grafie punktów (Waypoint Splines)</strong>{' '}
                    oraz promieniach <strong>AR Raycasting</strong> rzutowanych na wykryty blat stołu
                    (`PlaneClassification.Table`) i podłogę (`Floor`).
                  </p>
                </div>

                {/* Middle: Live 3D Spatial Agent Controls */}
                <div className="lg:col-span-4 bg-slate-950/80 border border-slate-800/90 rounded-lg p-3.5 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-300">
                      2. Sterowanie Agentami 3D i Bryłą na Żywo:
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.showSpatialAgents !== false}
                        onChange={(e) => updateConfig({ showSpatialAgents: e.target.checked })}
                        className="accent-cyan-500 rounded"
                      />
                      <span>Pokaż Agentów 3D</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">
                      Baza trajektorii agentów (3D NavMesh Mode):
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'lidar_orbit', label: 'Orbita LiDAR' },
                        { id: 'facade_scan', label: 'Skan Elewacji' },
                        { id: 'floor_patrol', label: 'Patrol Blatu' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            updateConfig({
                              agentNavMode: mode.id as ARConfigState['agentNavMode'],
                              showSpatialAgents: true,
                            })
                          }
                          className={`px-2 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                            (config.agentNavMode || 'lidar_orbit') === mode.id
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Liczba agentów:</span>
                        <span className="font-mono text-cyan-400 tabular-nums">
                          {config.activeAgentsCount || 4}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={6}
                        step={1}
                        value={config.activeAgentsCount || 4}
                        onChange={(e) =>
                          updateConfig({
                            activeAgentsCount: parseInt(e.target.value, 10),
                            showSpatialAgents: true,
                          })
                        }
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Wysokość bryły:</span>
                        <span className="font-mono text-amber-400 tabular-nums">
                          {(config.towerHeightMultiplier || 1.0).toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.6}
                        max={1.7}
                        step={0.05}
                        value={config.towerHeightMultiplier || 1.0}
                        onChange={(e) =>
                          updateConfig({
                            towerHeightMultiplier: parseFloat(e.target.value),
                          })
                        }
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Right: 4-Step Interactive Walkthrough ("Pokaż jak pracować") */}
                <div className="lg:col-span-3 bg-slate-950/80 border border-slate-800/90 rounded-lg p-3.5 space-y-2 text-xs flex flex-col justify-between">
                  <div className="font-semibold text-emerald-300">
                    3. Pokaż jak pracować (Kliknij krok):
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        step: 1,
                        label: 'Krok 1: Osadź model 3D i 4 agentów LiDAR',
                      },
                      {
                        step: 2,
                        label: 'Krok 2: Włącz skan elewacji + rozstrzel warstwy',
                      },
                      {
                        step: 3,
                        label: 'Krok 3: Załaduj prompt AI dla przestrzeni 3D',
                      },
                      {
                        step: 4,
                        label: 'Krok 4: Pobierz raport PDF / siatkę .OBJ',
                      },
                    ].map((item) => (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => handleRunGuidedDemoStep(item.step)}
                        className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors flex items-center justify-between ${
                          activeWorkflowStep === item.step
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 font-semibold'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        <span className="font-mono text-[10px] text-emerald-400 shrink-0 ml-1">
                          Uruchom →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prominent Top Prompt Input Bar with Real Gemini 3.8 Flash Execution & Timer */}
          <form
            onSubmit={handleApplyPromptTo3DScene}
            className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-4 shadow-lg space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="main-prompt-input"
                className="text-xs sm:text-sm font-semibold text-cyan-300 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>
                  KREATOR PRZESTRZENI 3D GEMINI AI (Wpisz polecenie, aby przebudować model 3D i ruch agentów):
                </span>
              </label>
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                {isBuilding3DSpace ? (
                  <span className="text-amber-300 font-semibold">
                    Gemini 3.8 Flash przetwarza przestrzeń 3D: {buildElapsedSec.toFixed(1)} s...
                  </span>
                ) : lastAiSpaceResult ? (
                  <span className="text-emerald-400">
                    Ostatnie wykonanie Gemini AI: {lastAiSpaceResult.elapsedSeconds} s
                  </span>
                ) : (
                  <a href="#gemini-ai-hub" className="text-cyan-400 hover:underline font-sans">
                    Przejdź do Generatora Obrazów 2D / Wideo MP4 ↓
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="main-prompt-input"
                type="text"
                value={quickPromptText}
                onChange={(e) => setQuickPromptText(e.target.value)}
                placeholder="Wpisz opis przestrzeni 3D, np.: Wysokościowiec 1.5x, złote światło 3000K, 6 agentów skanujących elewację, rozstrzelone warstwy..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isBuilding3DSpace}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 font-semibold text-xs sm:text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center justify-center gap-2"
              >
                {isBuilding3DSpace ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Budowanie 3D ({buildElapsedSec.toFixed(1)} s)...</span>
                  </>
                ) : (
                  <span>Przebuduj Przestrzeń 3D przez Gemini</span>
                )}
              </button>
              <a
                href="#gemini-ai-hub"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-medium text-xs sm:text-sm rounded-lg transition-colors text-center whitespace-nowrap shrink-0"
              >
                Studio AI (Czat / Obraz / Wideo)
              </a>
            </div>

            {/* Proof-of-Work Telemetry Box showing real Gemini execution time & steps */}
            {lastAiSpaceResult && (
              <div className="bg-slate-950/90 border border-emerald-500/30 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-300">
                    Raport wykonania agenta {lastAiSpaceResult.modelUsed}:
                  </span>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    Czas wnioskowania API: {lastAiSpaceResult.elapsedSeconds} s
                  </span>
                </div>
                <p className="text-slate-200">{lastAiSpaceResult.architecturalSummary}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {lastAiSpaceResult.executionSteps.map((step, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300"
                    >
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* 3D Hologram, Bounded Deep-Parallax Workspace & Virtual Drone Flight Viewport */}
          <HologramViewport3D
            config={config}
            onUpdateConfig={updateConfig}
            onCaptureScreenshot={handleCaptureScreenshot}
            onExportMessage={showNotification}
          />

          {/* Translucent Glass Hardware Console: 24 Thin LEDs, 16 Tactile Pads, Safe-Click Rotary Mixer Dial, Scratch Platter & 3D Gyroscope */}
          <LuxurySpatialDeck
            config={config}
            onUpdateConfig={updateConfig}
            onUpdatePalette={(pal) => updateUiSettings({ palette: pal })}
            onNotify={showNotification}
          />

          {/* Architectural Telemetry Bar & Captured Device Screenshots Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/90 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-cyan-400">
                    Specyfikacja aktywnej sceny 3D
                  </span>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {activeSceneMeta.partsCount} modułów · {activeSceneMeta.verticesEstimate} wierzchołków · Pow.{' '}
                    {activeSceneMeta.footprintSqm.toLocaleString('pl-PL')} m²
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">{activeSceneMeta.name}</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {activeSceneMeta.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-slate-800/80 text-xs">
                {activeSceneMeta.layers.map((layerName, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="font-mono text-slate-400 tabular-nums">
                      Warstwa 0{idx + 1}
                    </span>
                    <p className="text-slate-200 font-medium leading-snug">{layerName}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Visualization & Captured Gallery Strip */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/90 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Galeria Zrzutów Ekranu i Obraz Wzorcowy AR
                  </h3>
                  <p className="text-xs text-slate-400">
                    Zrzuty zapisywane są bezpośrednio do urządzenia oraz do raportu PDF
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400 tabular-nums">
                  {screenshots.length} zapisanych
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Uploaded Reference Image Card */}
                <div className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src="/assets/aistudio/Dashboard_dex_eeffcbc7.jpg"
                    alt="Wzorcowy stół konferencyjny AR z hologramem"
                    referrerPolicy="no-referrer"
                    className="w-full h-28 object-cover"
                  />
                  <div className="p-2 bg-slate-950/90 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        Wzorzec: Stół Konferencyjny AR
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                        Załączony plik referencyjny
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveGalleryImageToDrive('reference')}
                      disabled={isSavingGalleryToDrive === 'ref'}
                      className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-md shrink-0 text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                      title="Zapisz obraz wzorcowy bezpośrednio na Dysku Google"
                    >
                      <HardDrive className="w-3 h-3" />
                      <span>{isSavingGalleryToDrive === 'ref' ? '...' : 'Drive'}</span>
                    </button>
                  </div>
                </div>

                {/* Latest Captured Screenshot or Empty State */}
                {screenshots.length > 0 ? (
                  <div className="relative rounded-lg overflow-hidden border border-cyan-500/40 bg-slate-950">
                    <img
                      src={screenshots[0].dataUrl}
                      alt={screenshots[0].title}
                      referrerPolicy="no-referrer"
                      className="w-full h-28 object-cover"
                    />
                    <div className="p-2 bg-slate-950/90 flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-cyan-300 truncate">
                          {screenshots[0].title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {screenshots[0].timestamp}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveGalleryImageToDrive('screenshot', screenshots[0])
                          }
                          disabled={isSavingGalleryToDrive === screenshots[0].id}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-md text-[11px] font-semibold flex items-center gap-1 disabled:opacity-50"
                          title="Zapisz ten zrzut ekranu 3D na Dysku Google"
                        >
                          <HardDrive className="w-3 h-3" />
                          <span>
                            {isSavingGalleryToDrive === screenshots[0].id ? '...' : 'Drive'}
                          </span>
                        </button>
                        <a
                          href={screenshots[0].dataUrl}
                          download={`HoloArch_${screenshots[0].id}.png`}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md"
                          title="Pobierz ponownie do galerii"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-3 flex flex-col items-center justify-center text-center h-[160px]">
                    <ImageIcon className="w-5 h-5 text-slate-500 mb-1.5" />
                    <p className="text-xs font-medium text-slate-300">Brak zrzutów z sesji</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Kliknij „Zrzut do galerii” w dolnym doku 3D, aby zapisać kadr AR
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 1A: 52 Uploaded Reference Images Catalog & 3D/AR Shader & CAD Extensions Hub */}
        <StudioExtensionsHub
          config={config}
          onUpdateConfig={updateConfig}
          onUpdatePalette={(pal) => updateUiSettings({ palette: pal })}
          onApplyPresetPrompt={(promptText) => setQuickPromptText(promptText)}
          onNotify={showNotification}
        />

        {/* Section 1B: Multimodal Gemini AI Studio (Chat, Nano Banana 2.1 Images, Omni 1.2 Flash Video, Live 3.8 Voice, Transcribe 3.5, Lyria 3 Music, Google Search & Maps Grounding) */}
        <GeminiStudioHub
          latestScreenshot={screenshots[0]}
          defaultVisualPrompt={generatedPrompts.visualPromptEN}
          onNotify={showNotification}
        />

        {/* Section 1C: Google Maps Platform Interactive Geospatial Anchors & Architectural Sites */}
        <ArchitecturalMapPanel
          activeSceneId={config.sceneId}
          onSelectSiteFor3D={(sceneId, palette, customTitle, altitudeM) => {
            updateConfig({
              sceneId,
              customSceneTitle: customTitle,
              droneAltitudeM: altitudeM,
            });
            updateUiSettings({ palette });
          }}
          onNotify={showNotification}
        />

        {/* Section 2: Prompt Engineering Studio ("Jak napisać prompta...") */}
        <section id="prompt-studio" className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs text-amber-400 font-mono">
                01. Inżynieria Promptów AR / Unity 6 / AI Generators
              </div>
              <h2 className="text-2xl font-bold text-white font-display">
                Jak napisać skutecznego prompta dla hologramów architektonicznych AR
              </h2>
              <p className="text-sm text-slate-300 max-w-3xl">
                Aby model AI (np. Claude, GPT-4o, Gemini, Cursor) lub generator wizualny
                wygenerował kompletną aplikację Unity z obsługą czujników głębi ARKit/ARCore,
                prompt musi być podzielony na 6 precyzyjnych bloków architektonicznych. Poniższy
                generator reaguje na żywo na Twoje ustawienia z symulatora.
              </p>
            </div>

            {/* Prompt Mode Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
              <button
                onClick={() => setActivePromptTab('pl_master')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePromptTab === 'pl_master'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Prompt Systemowy (PL)
              </button>
              <button
                onClick={() => setActivePromptTab('en_master')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePromptTab === 'en_master'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                System Prompt (EN)
              </button>
              <button
                onClick={() => setActivePromptTab('visual_ai')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePromptTab === 'visual_ai'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Wizualizacja AI (Midjourney)
              </button>
              <button
                onClick={() => setActivePromptTab('unity_csharp')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePromptTab === 'unity_csharp'
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Kod Unity C# (AR Foundation)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: 6 Structural Pillars of the Prompt */}
            <div className="lg:col-span-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Anatomia idealnego prompta (6 modułów wymaganych w specyfikacji):
              </h3>

              {[
                {
                  num: '01',
                  title: 'Detekcja blatów i podłóg przez czujniki głębi (ARKit / ARCore)',
                  desc: 'Wymuś użycie ARPlaneManager (Horizontal) połączonego z AROcclusionManager (ToF / LiDAR Depth API) oraz klasyfikacją semantyczną PlaneClassification.Table i Floor.',
                },
                {
                  num: '02',
                  title: 'Silnik Unity URP, Oświetlenie Środowiskowe i Okluzja',
                  desc: 'Określ subskrypcję zdarzenia ARCameraManager.frameReceived do odczytu temperatury barwowej (K), kierunku światła i okluzji głębi (EnvironmentDepthMode.Best).',
                },
                {
                  num: '03',
                  title: 'Paralaksa 6DoF oraz efekty cząsteczkowe za oknami',
                  desc: 'Zdefiniuj wielowarstwową paralaksę (mapa w blacie -> hologram budynku -> panele HUD) oraz system cząsteczek Unity VFX Graph za płaszczyznami okien.',
                },
                {
                  num: '04',
                  title: 'Sterowanie dotykowe, płynne przejścia scen i zrzuty ekranu',
                  desc: 'Wskaż EnhancedTouch API (Pinch-to-scale 2 palcami, obrót wokół osi Y), animacje przejść (SmoothStep + Dissolve Shader) i zapis do MediaStore / PHPhotoLibrary.',
                },
                {
                  num: '05',
                  title: 'Tryb Offline, synchronizacja w chmurze oraz eksport OBJ/STL/PDF',
                  desc: 'Zażądaj lokalnego cache w Application.persistentDataPath (praca bez sieci), synchronizacji Cloud Anchors oraz serializacji siatek MeshFilter do .OBJ, .STL i raportu .PDF.',
                },
                {
                  num: '06',
                  title: 'Personalizacja UI oraz lista wspieranych urządzeń Android',
                  desc: 'Uwzględnij przełącznik palet shaderów, gęstości interfejsu oraz docelową macierz tabletów (Galaxy Tab S9 Ultra, OnePlus Pad 2) i smartfonów z sensorem ToF.',
                },
              ].map((item) => (
                <div
                  key={item.num}
                  className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-cyan-400 tabular-nums">
                      {item.num}.
                    </span>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">{item.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-6">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Right Column: Live Interactive Prompt Output Box */}
            <div className="lg:col-span-7 bg-[#070A10] border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>{generatedPrompts.title}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyPrompt(activePromptContent, activePromptTab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {copiedKey === activePromptTab ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Skopiowano!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopiuj gotowy prompt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="p-5 text-xs sm:text-[13px] font-mono text-slate-200 leading-relaxed overflow-x-auto max-h-[540px] overflow-y-auto whitespace-pre-wrap">
                {activePromptContent}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 3: AR Sensor Parameters, Environmental Lighting, Occlusion & CAD Export */}
        <section id="ar-parameters" className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs text-cyan-400 font-mono">
              02. Konfiguracja Sprzętowa ARKit / ARCore i Moduł Eksportu
            </div>
            <h2 className="text-2xl font-bold text-white font-display">
              Parametry czujników głębi, oświetlenia środowiskowego i formatów eksportu
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Plane Detection & Depth Sensors */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Detekcja Blatów i Podłóg
                </h3>
                <span className="text-xs font-mono text-cyan-400">ARPlaneManager</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-medium">
                    Docelowy Framework AR:
                  </label>
                  <select
                    value={config.framework}
                    onChange={(e) =>
                      updateConfig({
                        framework: e.target.value as ARConfigState['framework'],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="unity_arfoundation">
                      Unity 6 AR Foundation (ARKit + ARCore Cross-Platform)
                    </option>
                    <option value="arcore_native">
                      Google ARCore Extensions (Android Depth & Planes)
                    </option>
                    <option value="arkit_native">
                      Apple ARKit 6 LiDAR Scene Reconstruction
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-medium">
                    Tryb rozpoznawania powierzchni:
                  </label>
                  <select
                    value={config.planeDetectionMode}
                    onChange={(e) =>
                      updateConfig({
                        planeDetectionMode: e.target.value as ARConfigState['planeDetectionMode'],
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="table_and_floor">
                      Powierzchnie Blatu Stołu + Podłogi (Horizontal Dual)
                    </option>
                    <option value="table_only">
                      Wyłącznie podwyższone blaty stołów i biurek (Tabletop)
                    </option>
                    <option value="full_spatial">
                      Pełna siatka pomieszczenia (Blat + Podłoga + Okna)
                    </option>
                  </select>
                </div>

                <label className="flex items-center justify-between pt-2 cursor-pointer">
                  <span className="text-slate-300">Aktywuj czujnik głębi ToF / LiDAR</span>
                  <input
                    type="checkbox"
                    checked={config.depthSensorActive}
                    onChange={(e) => updateConfig({ depthSensorActive: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Widoczna siatka konstrukcyjna Wireframe</span>
                  <input
                    type="checkbox"
                    checked={config.wireframeOverlay}
                    onChange={(e) => updateConfig({ wireframeOverlay: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </label>
              </div>
            </div>

            {/* Card 2: Environmental Lighting & Depth Occlusion */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  Oświetlenie i Okluzja
                </h3>
                <span className="text-xs font-mono text-amber-400">HDR Light Est.</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300 font-medium">
                    Oświetlenie środowiskowe na żywo (HDR)
                  </span>
                  <input
                    type="checkbox"
                    checked={config.environmentalLighting}
                    onChange={(e) => updateConfig({ environmentalLighting: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded"
                  />
                </label>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Temperatura barwowa otoczenia:</span>
                    <span className="font-mono tabular-nums text-amber-400">
                      {config.lightTemperatureK} K
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2800}
                    max={6500}
                    step={100}
                    value={config.lightTemperatureK}
                    onChange={(e) =>
                      updateConfig({ lightTemperatureK: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                    <span>2800K (Zachód słońca)</span>
                    <span>4500K (Biuro)</span>
                    <span>6500K (Dzień)</span>
                  </div>
                </div>

                <label className="flex items-center justify-between pt-1 cursor-pointer">
                  <div>
                    <span className="text-slate-300 font-medium block">
                      Okluzja głębi obiektów (AROcclusion)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Przedmioty na blacie (kubek, tablet) przysłaniają hologram
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.occlusionEnabled}
                    onChange={(e) => updateConfig({ occlusionEnabled: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded shrink-0"
                  />
                </label>
              </div>
            </div>

            {/* Card 3: Export Formats (OBJ, STL, PLY Point Cloud, Advanced PDF) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-400" />
                    Eksport CAD i Dokumentacji
                  </h3>
                  <span className="text-xs font-mono text-slate-400">OBJ · STL · PLY · PDF</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Uwzględnij w prompcie oraz wyeksportuj bezpośrednio z bieżącej sceny siatkę
                  architektoniczną lub chmurę punktów 3D (`.PLY`) do programów inżynierskich
                  (CloudCompare, MeshLab, Autodesk ReCap, Rhino, Blender).
                </p>

                <div className="space-y-2 text-xs pt-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Wsparcie eksportu Wavefront (.OBJ)</span>
                    <input
                      type="checkbox"
                      checked={config.exportFormats.obj}
                      onChange={(e) =>
                        updateConfig({
                          exportFormats: { ...config.exportFormats, obj: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Wsparcie eksportu druku 3D (.STL)</span>
                    <input
                      type="checkbox"
                      checked={config.exportFormats.stl}
                      onChange={(e) =>
                        updateConfig({
                          exportFormats: { ...config.exportFormats, stl: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">
                      Chmura punktów inżynierskich (.PLY — XYZ + Normalne + RGB)
                    </span>
                    <input
                      type="checkbox"
                      checked={config.exportFormats.ply ?? true}
                      onChange={(e) =>
                        updateConfig({
                          exportFormats: { ...config.exportFormats, ply: e.target.checked },
                        })
                      }
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const stats = exportProjectToPLY(config);
                    showNotification(
                      `Wyeksportowano chmurę punktów 3D (.PLY): ${stats.pointCount.toLocaleString('pl-PL')} punktów gotowych do importu w CloudCompare / ReCap / MeshLab`
                    );
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Eksportuj Siatkę 3D jako Chmurę Punktów (.PLY)</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full py-2.5 px-4 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Pobierz Zaawansowany Raport i Prompt (.PDF)</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const res = exportProjectToGLTF(config);
                      showNotification(
                        `Wyeksportowano .GLTF 2.0 (${res.nodeCount} węzłów PBR Transmission)`
                      );
                    }}
                    className="py-2 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-colors"
                  >
                    Eksport .GLTF 2.0
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportProjectToIFC(config);
                      showNotification('Wyeksportowano plik BIM .IFC (Level 400)');
                    }}
                    className="py-2 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg transition-colors"
                  >
                    Eksport BIM .IFC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: UI Personalization Menu, Offline Mode & Cloud Synchronization */}
        <section id="personalization" className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs text-amber-400 font-mono">
              03. Personalizacja Interfejsu, Praca Offline i Synchronizacja Chmury
            </div>
            <h2 className="text-2xl font-bold text-white font-display">
              Ustawienia personalizacji HUD oraz moduł synchronizacji projektów między urządzeniami
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Personalization Menu */}
            <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  Menu Personalizacji Interfejsu i Shadera AR
                </h3>
                <span className="text-xs text-slate-400">Motyw wizualny</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(HOLOGRAM_PALETTES) as HologramPaletteId[]).map((palKey) => {
                  const pal = HOLOGRAM_PALETTES[palKey];
                  const isSelected = config.uiSettings.palette === palKey;
                  return (
                    <button
                      key={palKey}
                      onClick={() => updateUiSettings({ palette: palKey })}
                      className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-400'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs font-medium text-slate-200">{pal.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: pal.primaryHex }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20"
                          style={{ backgroundColor: pal.secondaryHex }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Wyświetlaj siatkę płaszczyzny podłogi</span>
                  <input
                    type="checkbox"
                    checked={config.uiSettings.showPlaneGrid}
                    onChange={(e) => updateUiSettings({ showPlaneGrid: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Zawieszone tablice telemetryczne HUD</span>
                  <input
                    type="checkbox"
                    checked={config.uiSettings.showFloatingPanels}
                    onChange={(e) => updateUiSettings({ showFloatingPanels: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Automatyczny obrót hologramu 360°</span>
                  <input
                    type="checkbox"
                    checked={config.autoRotate}
                    onChange={(e) => updateConfig({ autoRotate: e.target.checked })}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Gęstość opisów HUD:</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
                    <button
                      onClick={() => updateUiSettings({ hudDensity: 'compact' })}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        config.uiSettings.hudDensity === 'compact'
                          ? 'bg-cyan-500 text-slate-950 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      Kompaktowy
                    </button>
                    <button
                      onClick={() => updateUiSettings({ hudDensity: 'detailed' })}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        config.uiSettings.hudDensity === 'detailed'
                          ? 'bg-cyan-500 text-slate-950 font-semibold'
                          : 'text-slate-400'
                      }`}
                    >
                      Pełny
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Offline Mode & Cloud Project Synchronization Module */}
            <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  Tryb Offline i Synchronizacja Chmury
                </h3>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tryb Offline</span>
                    <input
                      type="checkbox"
                      checked={config.offlineModeEnabled}
                      onChange={(e) => updateConfig({ offlineModeEnabled: e.target.checked })}
                      className="accent-emerald-500"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cloud Sync</span>
                    <input
                      type="checkbox"
                      checked={config.cloudSyncEnabled}
                      onChange={(e) => updateConfig({ cloudSyncEnabled: e.target.checked })}
                      className="accent-cyan-500"
                    />
                  </label>
                </div>
              </div>

              <form onSubmit={handleSaveCloudProject} className="flex gap-2">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Nazwa nowego projektu AR (np. Makieta Wieżowca Wersja B)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Zapisz i Synchronizuj
                </button>
              </form>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Kliknij <strong className="text-cyan-300 font-mono">A</strong> lub{' '}
                  <strong className="text-amber-300 font-mono">B</strong> przy dowolnym projekcie, aby
                  porównać parametry Side-by-Side:
                </span>
                <button
                  type="button"
                  onClick={() => setShowComparisonPanel((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>
                    {showComparisonPanel ? 'Ukryj porównywarkę' : 'Pokaż porównywarkę A vs B'}
                  </span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedProjects.map((proj) => {
                  const isSelectedA = compareIdA === proj.id;
                  const isSelectedB = compareIdB === proj.id;
                  return (
                    <div
                      key={proj.id}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border text-xs transition-colors ${
                        isSelectedA
                          ? 'bg-cyan-950/30 border-cyan-500/50'
                          : isSelectedB
                          ? 'bg-amber-950/30 border-amber-500/50'
                          : 'bg-slate-950/80 border-slate-800/90'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-200 truncate">{proj.name}</p>
                          {isSelectedA && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 shrink-0">
                              PROJEKT A
                            </span>
                          )}
                          {isSelectedB && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono text-amber-300 shrink-0">
                              PROJEKT B
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {proj.updatedAt} · {proj.syncStatus}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCompareIdA(proj.id);
                            setShowComparisonPanel(true);
                            showNotification(`Ustawiono jako Projekt A (Bazowy): ${proj.name}`);
                          }}
                          className={`px-2 py-1 rounded font-mono text-[11px] font-bold border transition-colors ${
                            isSelectedA
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-slate-700'
                          }`}
                          title="Wybierz jako Projekt A w porównaniu Side-by-Side"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCompareIdB(proj.id);
                            setShowComparisonPanel(true);
                            showNotification(
                              `Ustawiono jako Projekt B (Porównywany): ${proj.name}`
                            );
                          }}
                          className={`px-2 py-1 rounded font-mono text-[11px] font-bold border transition-colors ${
                            isSelectedB
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                          }`}
                          title="Wybierz jako Projekt B w porównaniu Side-by-Side"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfig(mergeWithDefaultConfig(proj.config));
                            showNotification(`Wczytano projekt: ${proj.name}`);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-medium transition-colors"
                        >
                          Wczytaj
                        </button>
                        {savedProjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSavedProjects((prev) => prev.filter((p) => p.id !== proj.id))
                            }
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Usuń zapisany projekt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side-by-Side Saved Projects Configuration Comparison View */}
          {showComparisonPanel && (
            <ProjectComparisonView
              savedProjects={savedProjects}
              currentLiveConfig={config}
              selectedIdA={compareIdA}
              selectedIdB={compareIdB}
              onSelectIdA={setCompareIdA}
              onSelectIdB={setCompareIdB}
              onLoadProjectConfig={(loadedCfg, label) => {
                setConfig(mergeWithDefaultConfig(loadedCfg));
                showNotification(`Wczytano konfigurację z porównania: ${label}`);
              }}
              onApplySingleParam={(partialCfg, paramLabel) => {
                updateConfig(partialCfg);
                showNotification(`Zastosowano parametr na aktywnej scenie 3D: ${paramLabel}`);
              }}
              onNotify={showNotification}
            />
          )}

          {/* Google Drive API v3 & Firebase Firestore Cloud Workspace */}
          <GoogleDriveWorkspacePanel
            config={config}
            onLoadConfig={(loadedCfg, sourceLabel) => {
              setConfig(mergeWithDefaultConfig(loadedCfg));
              showNotification(`Wczytano konfigurację 3D z ${sourceLabel}`);
            }}
            latestScreenshot={screenshots[0]}
            systemPromptMarkdown={`${generatedPrompts.systemPromptPL}\n\n---\n\n\`\`\`csharp\n${generatedPrompts.unityCSharpCode}\n\`\`\``}
            onNotify={showNotification}
          />
        </section>

        {/* Section 5: Supported Mobile Devices Matrix (Android Tablets & Smartphones) */}
        <section id="devices" className="space-y-6 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-cyan-400 font-mono">
                04. Kompatybilność Sprzętowa ARCore / ARKit
              </div>
              <h2 className="text-2xl font-bold text-white font-display">
                Lista wspieranych urządzeń mobilnych (Smartfony i Tablety Android oraz iOS)
              </h2>
              <p className="text-sm text-slate-300 max-w-3xl">
                Zestawienie certyfikowanych tabletów oraz smartfonów z systemem Android (oraz
                referencyjnych urządzeń iOS LiDAR) obsługujących śledzenie płaszczyzn stołów/podłóg,
                mapowanie głębi ToF oraz oświetlenie środowiskowe HDR w silniku Unity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Szukaj modelu lub czujnika..."
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Form Factor Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                {[
                  { id: 'ALL', label: 'Wszystkie' },
                  { id: 'Tablet Android', label: 'Tablety Android' },
                  { id: 'Smartfon Android', label: 'Smartfony Android' },
                  { id: 'Urządzenie iOS (Referencyjne)', label: 'iOS LiDAR' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDeviceFilter(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      deviceFilter === tab.id
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono text-slate-400">
                    <th className="py-3 px-4">Producent i Model</th>
                    <th className="py-3 px-4">Typ Urządzenia</th>
                    <th className="py-3 px-4">System i SDK AR</th>
                    <th className="py-3 px-4">Czujnik Głębi (Depth Sensor)</th>
                    <th className="py-3 px-4">Precyzja Blat / Podłoga</th>
                    <th className="py-3 px-4">Okluzja</th>
                    <th className="py-3 px-4 text-right">Docelowe FPS</th>
                    <th className="py-3 px-4">Stabilność FPS w Sesji AR (Sparkline CSS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {filteredDevices.map((dev) => {
                    const samples =
                      Array.isArray(dev.fpsSamples) && dev.fpsSamples.length > 0
                        ? dev.fpsSamples
                        : [dev.targetFps, dev.targetFps, dev.targetFps, dev.targetFps];
                    const stability =
                      typeof dev.fpsStabilityPercent === 'number' ? dev.fpsStabilityPercent : 99.0;
                    const onePercentLow =
                      typeof dev.fps1PercentLow === 'number'
                        ? dev.fps1PercentLow
                        : dev.targetFps - 2;
                    const sparkChars = ['▂', '▃', '▄', '▅', '▆', '▇', '█'];
                    const minSample = dev.targetFps - 10;
                    const textSparkline = samples
                      .map((fps) => {
                        const norm = Math.max(0, Math.min(1, (fps - minSample) / 10));
                        const charIdx = Math.round(norm * (sparkChars.length - 1));
                        return sparkChars[charIdx];
                      })
                      .join('');

                    return (
                      <tr
                        key={dev.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          {dev.brand} {dev.model}
                        </td>
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {dev.formFactor.includes('Tablet') ? (
                              <Tablet className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            {dev.formFactor}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {dev.osVersion} · {dev.arCoreOrKitSupport}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{dev.depthSensor}</td>
                        <td className="py-3 px-4 font-mono tabular-nums text-cyan-300">
                          {dev.planeDetectionAccuracy}
                        </td>
                        <td className="py-3 px-4 text-slate-300">{dev.occlusionSupport}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold whitespace-nowrap">
                          {dev.targetFps} FPS
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div
                            className="inline-flex items-center gap-2.5 font-mono tabular-nums"
                            title={`Próbki sesji AR (${samples.length} pomiarów): ${samples.join(' / ')} FPS · 1% Low: ${onePercentLow} FPS`}
                          >
                            {/* Pure-CSS Micro-Bar + Textual Block Sparkline */}
                            <div className="inline-flex items-end gap-[2px] h-4 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800">
                              {samples.map((sample, sIdx) => {
                                const ratio = Math.max(
                                  0.25,
                                  Math.min(1, (sample - (dev.targetFps - 12)) / 12)
                                );
                                const isDip = sample < dev.targetFps - 3;
                                return (
                                  <span
                                    key={sIdx}
                                    style={{ height: `${Math.round(ratio * 100)}%` }}
                                    className={`w-[3px] rounded-t-[1px] transition-all ${
                                      isDip
                                        ? 'bg-amber-400'
                                        : stability >= 99
                                        ? 'bg-emerald-400'
                                        : 'bg-cyan-400'
                                    }`}
                                  />
                                );
                              })}
                            </div>

                            {/* Textual CSS Sparkline Glyph Sequence */}
                            <span
                              className={`text-[11px] tracking-tighter select-all ${
                                stability >= 99
                                  ? 'text-emerald-400'
                                  : 'text-cyan-300'
                              }`}
                              aria-label={`Wykres tekstowy stabilności: ${textSparkline}`}
                            >
                              {textSparkline}
                            </span>

                            {/* Stability % & 1% Low Telemetry */}
                            <span className="text-[11px] text-slate-300">
                              {stability.toFixed(1)}%{' '}
                              <span className="text-slate-500">
                                (min {onePercentLow})
                              </span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Quiet Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-6 px-6 text-xs text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            HoloArch AR Studio — Generator Promptów Architektonicznych i Symulator 3D (Unity ARKit /
            ARCore)
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportPDF}
              className="hover:text-cyan-400 transition-colors"
            >
              Pobierz pełną dokumentację PDF
            </button>
            <span aria-hidden="true">·</span>
            <a href="#prompt-studio" className="hover:text-cyan-400 transition-colors">
              Kopiuj Prompt Systemowy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
