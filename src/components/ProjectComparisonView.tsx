import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Filter,
  GitCompare,
  Layers,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  ARConfigState,
  HologramPaletteId,
  SavedCloudProject,
} from '../types/arStudio';
import { ARCHITECTURAL_SCENES, HOLOGRAM_PALETTES } from '../data/arStudioData';

interface ProjectComparisonViewProps {
  savedProjects: SavedCloudProject[];
  currentLiveConfig: ARConfigState;
  selectedIdA: string;
  selectedIdB: string;
  onSelectIdA: (id: string) => void;
  onSelectIdB: (id: string) => void;
  onLoadProjectConfig: (cfg: ARConfigState, label: string) => void;
  onApplySingleParam: (partial: Partial<ARConfigState>, label: string) => void;
  onNotify: (msg: string) => void;
}

interface ComparisonRow {
  key: string;
  category:
    | 'Geometria i Scena Architektoniczna 3D'
    | 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR'
    | 'Perspektywa, Głęboka Paralaksa i Lot Dronem'
    | 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM';
  label: string;
  valueA: string;
  valueB: string;
  isDifferent: boolean;
  deltaBadge?: string;
  paletteSwatchesA?: { primary: string; secondary: string };
  paletteSwatchesB?: { primary: string; secondary: string };
  applyFromA?: Partial<ARConfigState>;
  applyFromB?: Partial<ARConfigState>;
}

const FRAMEWORK_LABELS: Record<ARConfigState['framework'], string> = {
  unity_arfoundation: 'Unity 6 AR Foundation (URP)',
  arkit_native: 'Apple ARKit 6 + RealityKit (LiDAR)',
  arcore_native: 'Google ARCore 1.44 Depth API',
};

const PLANE_LABELS: Record<ARConfigState['planeDetectionMode'], string> = {
  table_and_floor: 'Blat Stołu + Podłoga (Dual-Plane)',
  table_only: 'Tylko Blat Konferencyjny (Horizontal)',
  full_spatial: 'Pełna Siatka Przestrzenna 3D (Spatial Mesh)',
};

const AGENT_NAV_LABELS: Record<ARConfigState['agentNavMode'], string> = {
  lidar_orbit: 'Orbita LiDAR 360° wokół iglicy',
  facade_scan: 'Pionowe skanowanie elewacji ( góra/dół )',
  floor_patrol: 'Patrol po siatce blatu stołu i podłogi',
};

const LANDSCAPE_LABELS: Record<ARConfigState['droneLandscape'], string> = {
  alpine_peaks: 'Szczyty Alpejskie (Alpine Peaks)',
  cosmic_orbital: 'Orbita Kosmiczna (Low-Earth Orbit)',
  metropolis_dawn: 'Metropolia o Świcie (Cyber-Dawn)',
  ocean_wellness: 'Klify Oceaniczne (Nordic Fjord)',
  executive_boardroom: 'Sala Konferencyjna Zarządu (Boardroom)',
};

const GRID_LABELS: Record<ARConfigState['compositionGrid'], string> = {
  golden_ratio: 'Złoty Podział Fibonacciego (1:1.618)',
  perspective_rays: 'Promienie Zbieżności Perspektywy',
  rule_of_thirds: 'Trójpodział Kadru Architektonicznego',
  depth_planes: 'Płaszczyzny Głębi Paraleksy (Z-Planes)',
  none: 'Wyłączona siatka pomocnicza',
};

function formatSceneName(sceneId: ARConfigState['sceneId']): string {
  const found = ARCHITECTURAL_SCENES.find((s) => s.id === sceneId);
  return found ? `${found.name} (${sceneId})` : sceneId;
}

function formatBool(val: boolean): string {
  return val ? 'Włączone (Tak)' : 'Wyłączone (Nie)';
}

function formatSignedDelta(numA: number, numB: number, unit: string, decimals = 2): string | undefined {
  const diff = numB - numA;
  if (Math.abs(diff) < 0.001) return undefined;
  const sign = diff > 0 ? '+' : '';
  return `Δ ${sign}${diff.toFixed(decimals)}${unit}`;
}

export const ProjectComparisonView: React.FC<ProjectComparisonViewProps> = ({
  savedProjects,
  currentLiveConfig,
  selectedIdA,
  selectedIdB,
  onSelectIdA,
  onSelectIdB,
  onLoadProjectConfig,
  onApplySingleParam,
  onNotify,
}) => {
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);

  // Build list of selectable options including a live current scene option
  const comparisonCandidates = useMemo<SavedCloudProject[]>(() => {
    const liveCandidate: SavedCloudProject = {
      id: '__LIVE_SCENE__',
      name: '⚡ Bieżąca Scena 3D (Na żywo w symulatorze)',
      updatedAt: 'Teraz (Aktywna sesja)',
      syncStatus: 'Zsynchronizowano w chmurze',
      config: currentLiveConfig,
    };
    return [...savedProjects, liveCandidate];
  }, [savedProjects, currentLiveConfig]);

  const projectA = useMemo(() => {
    return (
      comparisonCandidates.find((p) => p.id === selectedIdA) ||
      comparisonCandidates[0]
    );
  }, [comparisonCandidates, selectedIdA]);

  const projectB = useMemo(() => {
    return (
      comparisonCandidates.find((p) => p.id === selectedIdB) ||
      comparisonCandidates[Math.min(1, comparisonCandidates.length - 1)]
    );
  }, [comparisonCandidates, selectedIdB]);

  const rows = useMemo<ComparisonRow[]>(() => {
    if (!projectA || !projectB) return [];
    const cfgA = projectA.config;
    const cfgB = projectB.config;

    const palAKey: HologramPaletteId = cfgA.uiSettings?.palette || 'cyan_blueprint';
    const palBKey: HologramPaletteId = cfgB.uiSettings?.palette || 'cyan_blueprint';
    const palA = HOLOGRAM_PALETTES[palAKey] || HOLOGRAM_PALETTES.cyan_blueprint;
    const palB = HOLOGRAM_PALETTES[palBKey] || HOLOGRAM_PALETTES.cyan_blueprint;

    const extA = Array.isArray(cfgA.activeExtensions) ? cfgA.activeExtensions : [];
    const extB = Array.isArray(cfgB.activeExtensions) ? cfgB.activeExtensions : [];

    const exportsAList = Object.entries(cfgA.exportFormats || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.toUpperCase())
      .join(', ');
    const exportsBList = Object.entries(cfgB.exportFormats || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k.toUpperCase())
      .join(', ');

    const allRows: ComparisonRow[] = [
      // 1. Geometria i Scena Architektoniczna 3D
      {
        key: 'sceneId',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Model Architektoniczny 3D',
        valueA: formatSceneName(cfgA.sceneId),
        valueB: formatSceneName(cfgB.sceneId),
        isDifferent: cfgA.sceneId !== cfgB.sceneId,
        applyFromA: { sceneId: cfgA.sceneId },
        applyFromB: { sceneId: cfgB.sceneId },
      },
      {
        key: 'modelScale',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Skala Hologramu na Stole / Podłodze',
        valueA: `${Number(cfgA.modelScale ?? 1).toFixed(2)}x`,
        valueB: `${Number(cfgB.modelScale ?? 1).toFixed(2)}x`,
        isDifferent: Math.abs((cfgA.modelScale ?? 1) - (cfgB.modelScale ?? 1)) > 0.005,
        deltaBadge: formatSignedDelta(cfgA.modelScale ?? 1, cfgB.modelScale ?? 1, 'x', 2),
        applyFromA: { modelScale: cfgA.modelScale },
        applyFromB: { modelScale: cfgB.modelScale },
      },
      {
        key: 'towerHeightMultiplier',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Mnożnik Wysokości Kondygnacji',
        valueA: `${Number(cfgA.towerHeightMultiplier ?? 1).toFixed(2)}x`,
        valueB: `${Number(cfgB.towerHeightMultiplier ?? 1).toFixed(2)}x`,
        isDifferent:
          Math.abs((cfgA.towerHeightMultiplier ?? 1) - (cfgB.towerHeightMultiplier ?? 1)) > 0.005,
        deltaBadge: formatSignedDelta(
          cfgA.towerHeightMultiplier ?? 1,
          cfgB.towerHeightMultiplier ?? 1,
          'x',
          2
        ),
        applyFromA: { towerHeightMultiplier: cfgA.towerHeightMultiplier },
        applyFromB: { towerHeightMultiplier: cfgB.towerHeightMultiplier },
      },
      {
        key: 'explodedViewFactor',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Rozstrzelenie Warstw BIM (Exploded View)',
        valueA: `${Math.round((cfgA.explodedViewFactor ?? 0) * 100)}%`,
        valueB: `${Math.round((cfgB.explodedViewFactor ?? 0) * 100)}%`,
        isDifferent:
          Math.abs((cfgA.explodedViewFactor ?? 0) - (cfgB.explodedViewFactor ?? 0)) > 0.01,
        deltaBadge: formatSignedDelta(
          (cfgA.explodedViewFactor ?? 0) * 100,
          (cfgB.explodedViewFactor ?? 0) * 100,
          '%',
          0
        ),
        applyFromA: { explodedViewFactor: cfgA.explodedViewFactor },
        applyFromB: { explodedViewFactor: cfgB.explodedViewFactor },
      },
      {
        key: 'modelRotationY',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Kąt Obrotu Makiety (Oś Y)',
        valueA: `${Math.round(cfgA.modelRotationY ?? 0)}°`,
        valueB: `${Math.round(cfgB.modelRotationY ?? 0)}°`,
        isDifferent: Math.round(cfgA.modelRotationY ?? 0) !== Math.round(cfgB.modelRotationY ?? 0),
        deltaBadge: formatSignedDelta(
          cfgA.modelRotationY ?? 0,
          cfgB.modelRotationY ?? 0,
          '°',
          0
        ),
        applyFromA: { modelRotationY: cfgA.modelRotationY },
        applyFromB: { modelRotationY: cfgB.modelRotationY },
      },
      {
        key: 'wireframeOverlay',
        category: 'Geometria i Scena Architektoniczna 3D',
        label: 'Siatka Konstrukcyjna CAD (Wireframe)',
        valueA: formatBool(Boolean(cfgA.wireframeOverlay)),
        valueB: formatBool(Boolean(cfgB.wireframeOverlay)),
        isDifferent: Boolean(cfgA.wireframeOverlay) !== Boolean(cfgB.wireframeOverlay),
        applyFromA: { wireframeOverlay: cfgA.wireframeOverlay },
        applyFromB: { wireframeOverlay: cfgB.wireframeOverlay },
      },

      // 2. Środowisko AR, Czujniki Głębi i Oświetlenie HDR
      {
        key: 'framework',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: 'Docelowy Silnik i SDK AR',
        valueA: FRAMEWORK_LABELS[cfgA.framework] || cfgA.framework,
        valueB: FRAMEWORK_LABELS[cfgB.framework] || cfgB.framework,
        isDifferent: cfgA.framework !== cfgB.framework,
        applyFromA: { framework: cfgA.framework },
        applyFromB: { framework: cfgB.framework },
      },
      {
        key: 'planeDetectionMode',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: 'Tryb Śledzenia Płaszczyzn AR',
        valueA: PLANE_LABELS[cfgA.planeDetectionMode] || cfgA.planeDetectionMode,
        valueB: PLANE_LABELS[cfgB.planeDetectionMode] || cfgB.planeDetectionMode,
        isDifferent: cfgA.planeDetectionMode !== cfgB.planeDetectionMode,
        applyFromA: { planeDetectionMode: cfgA.planeDetectionMode },
        applyFromB: { planeDetectionMode: cfgB.planeDetectionMode },
      },
      {
        key: 'lightTemperatureK',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: 'Temperatura Barwowa Otoczenia (HDR)',
        valueA: `${cfgA.lightTemperatureK ?? 4200} K`,
        valueB: `${cfgB.lightTemperatureK ?? 4200} K`,
        isDifferent: (cfgA.lightTemperatureK ?? 4200) !== (cfgB.lightTemperatureK ?? 4200),
        deltaBadge: formatSignedDelta(
          cfgA.lightTemperatureK ?? 4200,
          cfgB.lightTemperatureK ?? 4200,
          ' K',
          0
        ),
        applyFromA: { lightTemperatureK: cfgA.lightTemperatureK },
        applyFromB: { lightTemperatureK: cfgB.lightTemperatureK },
      },
      {
        key: 'environmentalLighting',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: 'Estymacja Oświetlenia Środowiskowego HDR',
        valueA: formatBool(Boolean(cfgA.environmentalLighting)),
        valueB: formatBool(Boolean(cfgB.environmentalLighting)),
        isDifferent: Boolean(cfgA.environmentalLighting) !== Boolean(cfgB.environmentalLighting),
        applyFromA: { environmentalLighting: cfgA.environmentalLighting },
        applyFromB: { environmentalLighting: cfgB.environmentalLighting },
      },
      {
        key: 'depthSensorActive',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: ' Skaner Głębi ToF / LiDAR',
        valueA: formatBool(Boolean(cfgA.depthSensorActive)),
        valueB: formatBool(Boolean(cfgB.depthSensorActive)),
        isDifferent: Boolean(cfgA.depthSensorActive) !== Boolean(cfgB.depthSensorActive),
        applyFromA: { depthSensorActive: cfgA.depthSensorActive },
        applyFromB: { depthSensorActive: cfgB.depthSensorActive },
      },
      {
        key: 'occlusionEnabled',
        category: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
        label: 'Okluzja Obiektów Rzeczywistych (AROcclusion)',
        valueA: formatBool(Boolean(cfgA.occlusionEnabled)),
        valueB: formatBool(Boolean(cfgB.occlusionEnabled)),
        isDifferent: Boolean(cfgA.occlusionEnabled) !== Boolean(cfgB.occlusionEnabled),
        applyFromA: { occlusionEnabled: cfgA.occlusionEnabled },
        applyFromB: { occlusionEnabled: cfgB.occlusionEnabled },
      },

      // 3. Perspektywa, Głęboka Paralaksa i Lot Dronem
      {
        key: 'perspectiveFovDeg',
        category: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
        label: 'Kąt Widzenia Obiektywu (FOV)',
        valueA: `${cfgA.perspectiveFovDeg ?? 64}°`,
        valueB: `${cfgB.perspectiveFovDeg ?? 64}°`,
        isDifferent: (cfgA.perspectiveFovDeg ?? 64) !== (cfgB.perspectiveFovDeg ?? 64),
        deltaBadge: formatSignedDelta(
          cfgA.perspectiveFovDeg ?? 64,
          cfgB.perspectiveFovDeg ?? 64,
          '°',
          0
        ),
        applyFromA: { perspectiveFovDeg: cfgA.perspectiveFovDeg },
        applyFromB: { perspectiveFovDeg: cfgB.perspectiveFovDeg },
      },
      {
        key: 'parallaxIntensity',
        category: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
        label: 'Głębokość Paraleksy 3D',
        valueA: `${Math.round((cfgA.parallaxIntensity ?? 0.75) * 100)}%`,
        valueB: `${Math.round((cfgB.parallaxIntensity ?? 0.75) * 100)}%`,
        isDifferent:
          Math.abs((cfgA.parallaxIntensity ?? 0.75) - (cfgB.parallaxIntensity ?? 0.75)) > 0.01,
        deltaBadge: formatSignedDelta(
          (cfgA.parallaxIntensity ?? 0.75) * 100,
          (cfgB.parallaxIntensity ?? 0.75) * 100,
          '%',
          0
        ),
        applyFromA: { parallaxIntensity: cfgA.parallaxIntensity },
        applyFromB: { parallaxIntensity: cfgB.parallaxIntensity },
      },
      {
        key: 'compositionGrid',
        category: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
        label: 'Siatka Kompozycyjna i Planowania Głębi',
        valueA: GRID_LABELS[cfgA.compositionGrid || 'golden_ratio'],
        valueB: GRID_LABELS[cfgB.compositionGrid || 'golden_ratio'],
        isDifferent:
          (cfgA.compositionGrid || 'golden_ratio') !== (cfgB.compositionGrid || 'golden_ratio'),
        applyFromA: { compositionGrid: cfgA.compositionGrid },
        applyFromB: { compositionGrid: cfgB.compositionGrid },
      },
      {
        key: 'droneLandscape',
        category: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
        label: 'Krajobraz Wirtualnego Lotu Dronem',
        valueA: `${LANDSCAPE_LABELS[cfgA.droneLandscape || 'alpine_peaks']} (${cfgA.droneAltitudeM ?? 1250} m)`,
        valueB: `${LANDSCAPE_LABELS[cfgB.droneLandscape || 'alpine_peaks']} (${cfgB.droneAltitudeM ?? 1250} m)`,
        isDifferent:
          cfgA.droneLandscape !== cfgB.droneLandscape ||
          (cfgA.droneAltitudeM ?? 1250) !== (cfgB.droneAltitudeM ?? 1250),
        deltaBadge: formatSignedDelta(
          cfgA.droneAltitudeM ?? 1250,
          cfgB.droneAltitudeM ?? 1250,
          ' m',
          0
        ),
        applyFromA: {
          droneLandscape: cfgA.droneLandscape,
          droneAltitudeM: cfgA.droneAltitudeM,
        },
        applyFromB: {
          droneLandscape: cfgB.droneLandscape,
          droneAltitudeM: cfgB.droneAltitudeM,
        },
      },
      {
        key: 'hobbyAssemblyStep',
        category: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
        label: 'Etap Montażu Modelarskiego (Safe-Click)',
        valueA: `Stopień ${cfgA.hobbyAssemblyStep ?? 12} / 12`,
        valueB: `Stopień ${cfgB.hobbyAssemblyStep ?? 12} / 12`,
        isDifferent: (cfgA.hobbyAssemblyStep ?? 12) !== (cfgB.hobbyAssemblyStep ?? 12),
        deltaBadge: formatSignedDelta(
          cfgA.hobbyAssemblyStep ?? 12,
          cfgB.hobbyAssemblyStep ?? 12,
          ' st.',
          0
        ),
        applyFromA: { hobbyAssemblyStep: cfgA.hobbyAssemblyStep },
        applyFromB: { hobbyAssemblyStep: cfgB.hobbyAssemblyStep },
      },

      // 4. Agenci 3D, Personalizacja HUD i Eksport CAD/BIM
      {
        key: 'palette',
        category: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
        label: 'Paleta Kolorystyczna Shadera AR',
        valueA: palA.name,
        valueB: palB.name,
        isDifferent: palAKey !== palBKey,
        paletteSwatchesA: { primary: palA.primaryHex, secondary: palA.secondaryHex },
        paletteSwatchesB: { primary: palB.primaryHex, secondary: palB.secondaryHex },
        applyFromA: {
          uiSettings: { ...currentLiveConfig.uiSettings, palette: palAKey },
        },
        applyFromB: {
          uiSettings: { ...currentLiveConfig.uiSettings, palette: palBKey },
        },
      },
      {
        key: 'agents',
        category: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
        label: 'Agenci Przestrzeni 3D (Liczba i NavMesh)',
        valueA: cfgA.showSpatialAgents
          ? `${cfgA.activeAgentsCount ?? 4} agentów · ${AGENT_NAV_LABELS[cfgA.agentNavMode || 'lidar_orbit']}`
          : 'Agenci wyłączeni',
        valueB: cfgB.showSpatialAgents
          ? `${cfgB.activeAgentsCount ?? 4} agentów · ${AGENT_NAV_LABELS[cfgB.agentNavMode || 'lidar_orbit']}`
          : 'Agenci wyłączeni',
        isDifferent:
          cfgA.showSpatialAgents !== cfgB.showSpatialAgents ||
          cfgA.activeAgentsCount !== cfgB.activeAgentsCount ||
          cfgA.agentNavMode !== cfgB.agentNavMode,
        applyFromA: {
          showSpatialAgents: cfgA.showSpatialAgents,
          activeAgentsCount: cfgA.activeAgentsCount,
          agentNavMode: cfgA.agentNavMode,
        },
        applyFromB: {
          showSpatialAgents: cfgB.showSpatialAgents,
          activeAgentsCount: cfgB.activeAgentsCount,
          agentNavMode: cfgB.agentNavMode,
        },
      },
      {
        key: 'hudSettings',
        category: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
        label: 'Interfejs HUD (Gęstość, Siatka, Panele)',
        valueA: `${cfgA.uiSettings?.hudDensity === 'compact' ? 'Kompaktowy' : 'Pełny'} · Siatka: ${cfgA.uiSettings?.showPlaneGrid ? 'Tak' : 'Nie'} · HUD: ${cfgA.uiSettings?.showFloatingPanels ? 'Tak' : 'Nie'}`,
        valueB: `${cfgB.uiSettings?.hudDensity === 'compact' ? 'Kompaktowy' : 'Pełny'} · Siatka: ${cfgB.uiSettings?.showPlaneGrid ? 'Tak' : 'Nie'} · HUD: ${cfgB.uiSettings?.showFloatingPanels ? 'Tak' : 'Nie'}`,
        isDifferent:
          cfgA.uiSettings?.hudDensity !== cfgB.uiSettings?.hudDensity ||
          cfgA.uiSettings?.showPlaneGrid !== cfgB.uiSettings?.showPlaneGrid ||
          cfgA.uiSettings?.showFloatingPanels !== cfgB.uiSettings?.showFloatingPanels,
        applyFromA: { uiSettings: { ...cfgA.uiSettings } },
        applyFromB: { uiSettings: { ...cfgB.uiSettings } },
      },
      {
        key: 'activeExtensions',
        category: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
        label: 'Aktywne Wtyczki i Shadery Silnika',
        valueA: `${extA.length} aktywnych (${extA.join(', ') || 'brak'})`,
        valueB: `${extB.length} aktywnych (${extB.join(', ') || 'brak'})`,
        isDifferent: extA.slice().sort().join(',') !== extB.slice().sort().join(','),
        applyFromA: { activeExtensions: extA },
        applyFromB: { activeExtensions: extB },
      },
      {
        key: 'exportFormats',
        category: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
        label: 'Formaty Eksportu CAD / BIM',
        valueA: exportsAList || 'Brak',
        valueB: exportsBList || 'Brak',
        isDifferent: exportsAList !== exportsBList,
        applyFromA: { exportFormats: { ...cfgA.exportFormats } },
        applyFromB: { exportFormats: { ...cfgB.exportFormats } },
      },
    ];

    return allRows;
  }, [projectA, projectB, currentLiveConfig.uiSettings]);

  const diffCount = useMemo(() => rows.filter((r) => r.isDifferent).length, [rows]);
  const similarityPercent = useMemo(() => {
    if (rows.length === 0) return 100;
    return Math.round(((rows.length - diffCount) / rows.length) * 100);
  }, [rows.length, diffCount]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (showOnlyDifferences && !row.isDifferent) return false;
      if (selectedCategory !== 'ALL' && row.category !== selectedCategory) return false;
      return true;
    });
  }, [rows, showOnlyDifferences, selectedCategory]);

  const handleSwapProjects = () => {
    const prevA = projectA?.id || selectedIdA;
    const prevB = projectB?.id || selectedIdB;
    onSelectIdA(prevB);
    onSelectIdB(prevA);
    onNotify('Zamieniono miejscami porównywane projekty A ↔ B');
  };

  const handleCopyComparisonMarkdown = () => {
    if (!projectA || !projectB) return;
    const lines: string[] = [
      `# Raport Porównania Konfiguracji Projektów HoloArch AR Studio`,
      `- **Projekt A (Bazowy):** ${projectA.name} (${projectA.updatedAt})`,
      `- **Projekt B (Porównywany):** ${projectB.name} (${projectB.updatedAt})`,
      `- **Wykryte różnice:** ${diffCount} z ${rows.length} parametrów (Zgodność: ${similarityPercent}%)`,
      ``,
      `| Kategoria | Parametr | Projekt A | Projekt B | Status / Delta |`,
      `|---|---|---|---|---|`,
      ...rows.map(
        (r) =>
          `| ${r.category} | ${r.label} | ${r.valueA} | ${r.valueB} | ${
            r.isDifferent ? `RÓŻNICA ${r.deltaBadge || ''}`.trim() : 'IDENTYCZNE'
          } |`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedDiff(true);
    onNotify('Skopiowano zestawienie porównawcze Side-by-Side (Markdown) do schowka');
    setTimeout(() => setCopiedDiff(false), 2200);
  };

  if (!projectA || !projectB) return null;

  return (
    <div className="bg-slate-900/75 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
      {/* Top Header & KPI Summary Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <GitCompare className="w-4 h-4" />
            <span>MODUŁ PORÓWNYWANIA KONFIGURACJI PROJEKTÓW (SIDE-BY-SIDE DIFF)</span>
          </div>
          <h3 className="text-lg font-bold text-white font-display">
            Porównanie Parametrów Dwóch Zapisanych Projektów Chmurowych / Offline
          </h3>
          <p className="text-xs text-slate-400">
            Wybierz dowolne dwa zapisane projekty (lub porównaj zapisany projekt z bieżącą sceną 3D
            na żywo), aby zobaczyć dokładne różnice w geometrii, oświetleniu HDR, paralaksie i
            ustawieniach AR.
          </p>
        </div>

        {/* Summary KPI Badges */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 mr-1.5">Parametry:</span>
            <span className="font-mono font-semibold text-slate-100 tabular-nums">
              {rows.length}
            </span>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg border text-xs ${
              diffCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className="mr-1.5">Różnice:</span>
            <span className="font-mono font-bold tabular-nums">{diffCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300">
            <span className="mr-1.5">Zgodność:</span>
            <span className="font-mono font-bold tabular-nums">{similarityPercent}%</span>
          </div>
          <button
            type="button"
            onClick={handleCopyComparisonMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            title="Skopiuj pełną tabelę porównania jako Markdown"
          >
            {copiedDiff ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Skopiowano!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Kopiuj Zestawienie (.MD)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Side-by-Side Project Selectors (Project A vs Project B) */}
      <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-stretch">
        {/* Selector A */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-cyan-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-mono font-semibold text-cyan-300">
              PROJEKT A (BAZOWY)
            </span>
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {projectA.updatedAt} · {projectA.syncStatus}
            </span>
          </div>

          <select
            value={projectA.id}
            onChange={(e) => onSelectIdA(e.target.value)}
            aria-label="Wybierz Projekt A do porównania"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-cyan-400"
          >
            {comparisonCandidates.map((cand) => (
              <option key={cand.id} value={cand.id}>
                {cand.name} ({cand.updatedAt})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-mono truncate">
              Scena: {projectA.config.sceneId} · Skala {projectA.config.modelScale}x
            </span>
            {projectA.id !== '__LIVE_SCENE__' && (
              <button
                type="button"
                onClick={() => onLoadProjectConfig(projectA.config, projectA.name)}
                className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
              >
                <Play className="w-3 h-3" />
                <span>Wczytaj A do 3D</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Swap Button */}
        <div className="lg:col-span-1 flex items-center justify-center">
          <button
            type="button"
            onClick={handleSwapProjects}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-xs font-mono"
            title="Zamień miejscami Projekt A i Projekt B"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="lg:hidden">Zamień A ↔ B</span>
          </button>
        </div>

        {/* Selector B */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[11px] font-mono font-semibold text-amber-300">
              PROJEKT B (PORÓWNYWANY)
            </span>
            <span className="text-[11px] font-mono text-slate-400 truncate">
              {projectB.updatedAt} · {projectB.syncStatus}
            </span>
          </div>

          <select
            value={projectB.id}
            onChange={(e) => onSelectIdB(e.target.value)}
            aria-label="Wybierz Projekt B do porównania"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-amber-400"
          >
            {comparisonCandidates.map((cand) => (
              <option key={cand.id} value={cand.id}>
                {cand.name} ({cand.updatedAt})
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-mono truncate">
              Scena: {projectB.config.sceneId} · Skala {projectB.config.modelScale}x
            </span>
            {projectB.id !== '__LIVE_SCENE__' && (
              <button
                type="button"
                onClick={() => onLoadProjectConfig(projectB.config, projectB.name)}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
              >
                <Play className="w-3 h-3" />
                <span>Wczytaj B do 3D</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar: Diff Only Toggle & Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Wszystkie kategorie (${rows.length})` },
            { id: 'Geometria i Scena Architektoniczna 3D', label: 'Geometria 3D' },
            {
              id: 'Środowisko AR, Czujniki Głębi i Oświetlenie HDR',
              label: 'Środowisko AR i HDR',
            },
            {
              id: 'Perspektywa, Głęboka Paralaksa i Lot Dronem',
              label: 'Paralaksa i Dron',
            },
            {
              id: 'Agenci 3D, Personalizacja HUD i Eksport CAD/BIM',
              label: 'Agenci, HUD i Eksport',
            },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyDifferences((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            showOnlyDifferences
              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>
            {showOnlyDifferences
              ? `Pokazywanie tylko różnic (${diffCount})`
              : `Pokaż tylko różnice (${diffCount})`}
          </span>
        </button>
      </div>

      {/* Side-by-Side Comparison Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/80">
        {visibleRows.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Sparkles className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-white">
              Brak różnic w wybranej kategorii!
            </p>
            <p className="text-xs text-slate-400">
              Oba wybrane projekty posiadają identyczne wartości dla tych parametrów. Wyłącz filtr
              „Pokaż tylko różnice”, aby zobaczyć pełną listę.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-[11px] font-mono text-slate-400">
                  <th className="py-3 px-4 w-[28%]">Parametr i Kategoria</th>
                  <th className="py-3 px-4 w-[29%] text-cyan-300 border-l border-slate-800/80">
                    PROJEKT A: {projectA.name}
                  </th>
                  <th className="py-3 px-4 w-[29%] text-amber-300 border-l border-slate-800/80">
                    PROJEKT B: {projectB.name}
                  </th>
                  <th className="py-3 px-4 w-[14%] text-right border-l border-slate-800/80">
                    Status / Różnica (Δ)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {visibleRows.map((row) => (
                  <tr
                    key={row.key}
                    className={`transition-colors ${
                      row.isDifferent
                        ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.11]'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Parameter Name & Category */}
                    <td className="py-3 px-4 align-middle">
                      <p className="font-semibold text-slate-100">{row.label}</p>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        {row.category}
                      </span>
                    </td>

                    {/* Project A Value */}
                    <td className="py-3 px-4 align-middle border-l border-slate-800/70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.paletteSwatchesA && (
                            <span className="flex items-center gap-1 shrink-0">
                              <span
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: row.paletteSwatchesA.primary }}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: row.paletteSwatchesA.secondary }}
                              />
                            </span>
                          )}
                          <span
                            className={`font-mono ${
                              row.isDifferent ? 'text-cyan-200 font-semibold' : 'text-slate-300'
                            }`}
                          >
                            {row.valueA}
                          </span>
                        </div>
                        {row.isDifferent && row.applyFromA && (
                          <button
                            type="button"
                            onClick={() =>
                              onApplySingleParam(row.applyFromA!, `${row.label} (z Projektu A)`)
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-cyan-500/20 text-[10px] font-mono text-cyan-300 border border-slate-700 shrink-0"
                            title="Zastosuj tę wartość z Projektu A na aktywnej scenie 3D"
                          >
                            Użyj A
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Project B Value */}
                    <td className="py-3 px-4 align-middle border-l border-slate-800/70">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {row.paletteSwatchesB && (
                            <span className="flex items-center gap-1 shrink-0">
                              <span
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: row.paletteSwatchesB.primary }}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: row.paletteSwatchesB.secondary }}
                              />
                            </span>
                          )}
                          <span
                            className={`font-mono ${
                              row.isDifferent ? 'text-amber-200 font-semibold' : 'text-slate-300'
                            }`}
                          >
                            {row.valueB}
                          </span>
                        </div>
                        {row.isDifferent && row.applyFromB && (
                          <button
                            type="button"
                            onClick={() =>
                              onApplySingleParam(row.applyFromB!, `${row.label} (z Projektu B)`)
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 text-[10px] font-mono text-amber-300 border border-slate-700 shrink-0"
                            title="Zastosuj tę wartość z Projektu B na aktywnej scenie 3D"
                          >
                            Użyj B
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Diff Badge & Delta */}
                    <td className="py-3 px-4 align-middle text-right border-l border-slate-800/70 whitespace-nowrap">
                      {row.isDifferent ? (
                        <div className="inline-flex flex-col items-end gap-0.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300">
                            RÓŻNICA
                          </span>
                          {row.deltaBadge && (
                            <span className="text-[11px] font-mono text-cyan-300 tabular-nums">
                              {row.deltaBadge}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                          IDENTYCZNE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
