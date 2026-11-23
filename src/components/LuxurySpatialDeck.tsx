import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Disc,
  Eye,
  Grid,
  Layers,
  Maximize2,
  Mountain,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import {
  ARConfigState,
  CompositionGridMode,
  DroneLandscapeId,
  HologramPaletteId,
  MixerDialTarget,
} from '../types/arStudio';
import { playSafeLockDetentClick, playScratchJogPulse } from '../utils/soundEffects';

interface LuxurySpatialDeckProps {
  config: ARConfigState;
  onUpdateConfig: (partial: Partial<ARConfigState>) => void;
  onUpdatePalette: (palette: HologramPaletteId) => void;
  onNotify: (msg: string) => void;
}

export interface UploadedInspirationItem {
  id: string;
  title: string;
  category: string;
  src: string;
  preset: {
    sceneId: ARConfigState['sceneId'];
    palette: HologramPaletteId;
    droneLandscape: DroneLandscapeId;
    towerHeightMultiplier: number;
    explodedViewFactor: number;
    wireframeOverlay: boolean;
    perspectiveFovDeg: number;
  };
}

export const UPLOADED_INSPIRATION_GALLERY: UploadedInspirationItem[] = [
  {
    id: 'ref-glass-panels',
    title: 'Szklane Panele Przestrzenne UI',
    category: 'Trend: Frosted Glass HUD',
    src: '/assets/aistudio/Unknown_12_bba1e6ab.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'platinum_arch',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.15,
      explodedViewFactor: 0.35,
      wireframeOverlay: false,
      perspectiveFovDeg: 62,
    },
  },
  {
    id: 'ref-acrylic-cubes',
    title: 'Półprzezroczyste Bryły Akrylowe',
    category: 'Narzędzia Głębi i Kompozycji',
    src: '/assets/aistudio/Unknown_11_7796abba.jpeg',
    preset: {
      sceneId: 'eco_atrium',
      palette: 'cyan_blueprint',
      droneLandscape: 'ocean_wellness',
      towerHeightMultiplier: 0.95,
      explodedViewFactor: 0.45,
      wireframeOverlay: false,
      perspectiveFovDeg: 55,
    },
  },
  {
    id: 'ref-golden-grid',
    title: 'Złota Siatka Perspektywiczna 3D',
    category: 'Grid in Architecture',
    src: '/assets/aistudio/IMG_1821_419a0ff6.PNG',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'amber_gold',
      droneLandscape: 'cosmic_orbital',
      towerHeightMultiplier: 1.45,
      explodedViewFactor: 0.15,
      wireframeOverlay: true,
      perspectiveFovDeg: 74,
    },
  },
  {
    id: 'ref-multiverse-blueprint',
    title: 'Błękitny Blueprint Kwantowy',
    category: 'Głęboka Paralaksa',
    src: '/assets/aistudio/IMG_1820_c84a58a0.PNG',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'cyan_blueprint',
      droneLandscape: 'cosmic_orbital',
      towerHeightMultiplier: 1.5,
      explodedViewFactor: 0.55,
      wireframeOverlay: true,
      perspectiveFovDeg: 72,
    },
  },
  {
    id: 'ref-emerald-cube-matrix',
    title: 'Szmaragdowa Kostka Modułowa',
    category: 'Modelarstwo / Kitbash 3D',
    src: '/assets/aistudio/IMG_1814_964ef07f.jpg',
    preset: {
      sceneId: 'eco_atrium',
      palette: 'emerald_matrix',
      droneLandscape: 'cosmic_orbital',
      towerHeightMultiplier: 1.25,
      explodedViewFactor: 0.65,
      wireframeOverlay: false,
      perspectiveFovDeg: 64,
    },
  },
  {
    id: 'ref-node-cluster',
    title: 'Sieć Modułów Centralnego Rdzenia',
    category: 'Topologia Układu 3D',
    src: '/assets/aistudio/IMG_1813_1fda0aa6.jpg',
    preset: {
      sceneId: 'aero_hub',
      palette: 'cyan_blueprint',
      droneLandscape: 'metropolis_dawn',
      towerHeightMultiplier: 1.1,
      explodedViewFactor: 0.5,
      wireframeOverlay: false,
      perspectiveFovDeg: 68,
    },
  },
  {
    id: 'ref-50-rise-tower',
    title: '50 Rise Tower — Żyletkowa Iglica',
    category: 'Wieżowiec o ZmiennejZbieżności',
    src: '/assets/aistudio/50_Rise_Tower_66976ad1.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'amber_gold',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.65,
      explodedViewFactor: 0.0,
      wireframeOverlay: false,
      perspectiveFovDeg: 66,
    },
  },
  {
    id: 'ref-twisted-tower',
    title: 'Wieża Skrętna Parametric Twist',
    category: 'Geometria Żyroskopowa',
    src: '/assets/aistudio/Unknown_18_dd448f4a.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'platinum_arch',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.6,
      explodedViewFactor: 0.2,
      wireframeOverlay: false,
      perspectiveFovDeg: 70,
    },
  },
  {
    id: 'ref-nyc-torch',
    title: 'The Torch NYC (325m Diagrid)',
    category: 'Konstrukcja Diagrid',
    src: '/assets/aistudio/NEW_YORK___The_Torch_-_740_8th_Avenue___325m___1067ft___.._dad21242.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'platinum_arch',
      droneLandscape: 'metropolis_dawn',
      towerHeightMultiplier: 1.5,
      explodedViewFactor: 0.25,
      wireframeOverlay: true,
      perspectiveFovDeg: 60,
    },
  },
  {
    id: 'ref-tashkent-city',
    title: 'Tashkent City — Kompleks Wież',
    category: 'Kompozycja Wielobryłowa',
    src: '/assets/aistudio/Tashkent_City__Uzbekistan_5fa897cb.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'cyan_blueprint',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.35,
      explodedViewFactor: 0.1,
      wireframeOverlay: false,
      perspectiveFovDeg: 65,
    },
  },
  {
    id: 'ref-wellness-ocean',
    title: 'Next Generation Wellness Horizon',
    category: 'Space to Luksus — Ocean',
    src: '/assets/aistudio/Unknown_10_9f8953aa.jpeg',
    preset: {
      sceneId: 'eco_atrium',
      palette: 'platinum_arch',
      droneLandscape: 'ocean_wellness',
      towerHeightMultiplier: 0.9,
      explodedViewFactor: 0.3,
      wireframeOverlay: false,
      perspectiveFovDeg: 75,
    },
  },
  {
    id: 'ref-futuristic-aero',
    title: 'Aero-Metropolia i Korytarze Dronów',
    category: 'Wirtualny Lot Dronem',
    src: '/assets/aistudio/Unknown_15_711a6bf4.jpeg',
    preset: {
      sceneId: 'aero_hub',
      palette: 'cyan_blueprint',
      droneLandscape: 'metropolis_dawn',
      towerHeightMultiplier: 1.3,
      explodedViewFactor: 0.15,
      wireframeOverlay: false,
      perspectiveFovDeg: 78,
    },
  },
  {
    id: 'ref-courtyard-campus',
    title: 'Dziedziniec Biurowy z Tarasami',
    category: 'Perspektywa z Lotu Ptaka',
    src: '/assets/aistudio/Unknown_17_77d8920d.jpeg',
    preset: {
      sceneId: 'eco_atrium',
      palette: 'emerald_matrix',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.15,
      explodedViewFactor: 0.0,
      wireframeOverlay: false,
      perspectiveFovDeg: 68,
    },
  },
  {
    id: 'ref-green-podium',
    title: 'Wieżowiec z Zielonym Podium',
    category: 'Warstwy Kondygnacji',
    src: '/assets/aistudio/Unknown_16_c3a65e84.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'emerald_matrix',
      droneLandscape: 'alpine_peaks',
      towerHeightMultiplier: 1.4,
      explodedViewFactor: 0.35,
      wireframeOverlay: false,
      perspectiveFovDeg: 62,
    },
  },
  {
    id: 'ref-white-massing',
    title: 'Makieta Urbanistyczna (Massing)',
    category: 'Planowanie Kompozycji',
    src: '/assets/aistudio/Unknown_13_e4f01b9d.jpeg',
    preset: {
      sceneId: 'skyline_financial',
      palette: 'platinum_arch',
      droneLandscape: 'executive_boardroom',
      towerHeightMultiplier: 1.25,
      explodedViewFactor: 0.2,
      wireframeOverlay: true,
      perspectiveFovDeg: 52,
    },
  },
];

const TOTAL_LED_BARS = 24;

export const LuxurySpatialDeck: React.FC<LuxurySpatialDeckProps> = ({
  config,
  onUpdateConfig,
  onUpdatePalette,
  onNotify,
}) => {
  const [dialTarget, setDialTarget] = useState<MixerDialTarget>('scale_size');
  const [activePadIndex, setActivePadIndex] = useState<number>(0);
  const [lastDetentFlash, setLastDetentFlash] = useState<boolean>(false);
  const [resistanceTension, setResistanceTension] = useState<number>(0); // -1 to 1 visual spring tension before detent jump
  const [scratchAngle, setScratchAngle] = useState<number>(config.modelRotationY || 25);
  const [isScratching, setIsScratching] = useState<boolean>(false);
  const [gyroAnimPhase, setGyroAnimPhase] = useState<number>(0);

  const dialRef = useRef<HTMLDivElement | null>(null);
  const scratchRef = useRef<HTMLDivElement | null>(null);
  const isDraggingDialRef = useRef<boolean>(false);
  const dragAccumRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const lastScratchAngleRef = useRef<number>(0);

  // Continuous smooth 3-axis gyroscope animation loop
  useEffect(() => {
    let rafId = 0;
    const tick = (now: number) => {
      setGyroAnimPhase(now * 0.0012);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Normalize current dial target value to 0..24 discrete safe-lock detent steps
  const getNormalizedStep = (): number => {
    if (dialTarget === 'scale_size') {
      const norm = (config.modelScale - 0.4) / (2.2 - 0.4);
      return Math.round(Math.max(0, Math.min(1, norm)) * TOTAL_LED_BARS);
    }
    if (dialTarget === 'levels_exploded') {
      return Math.round(Math.max(0, Math.min(1, config.explodedViewFactor)) * TOTAL_LED_BARS);
    }
    if (dialTarget === 'perspective_fov') {
      const fov = config.perspectiveFovDeg || 60;
      const norm = (fov - 28) / (85 - 28);
      return Math.round(Math.max(0, Math.min(1, norm)) * TOTAL_LED_BARS);
    }
    const alt = config.droneAltitudeM || 650;
    const norm = (alt - 120) / (2400 - 120);
    return Math.round(Math.max(0, Math.min(1, norm)) * TOTAL_LED_BARS);
  };

  const currentStep = getNormalizedStep();

  const applyStepValue = (nextStep: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_LED_BARS, nextStep));
    if (clamped === currentStep) return;

    const isMajor = clamped % 4 === 0;
    playSafeLockDetentClick(
      clamped,
      TOTAL_LED_BARS,
      config.safeClickSoundEnabled !== false,
      isMajor
    );

    setLastDetentFlash(true);
    window.setTimeout(() => setLastDetentFlash(false), 140);

    const ratio = clamped / TOTAL_LED_BARS;
    if (dialTarget === 'scale_size') {
      const val = Number((0.4 + ratio * (2.2 - 0.4)).toFixed(2));
      onUpdateConfig({ modelScale: val });
    } else if (dialTarget === 'levels_exploded') {
      const val = Number(ratio.toFixed(2));
      onUpdateConfig({ explodedViewFactor: val });
    } else if (dialTarget === 'perspective_fov') {
      const val = Math.round(28 + ratio * (85 - 28));
      onUpdateConfig({ perspectiveFovDeg: val });
    } else {
      const val = Math.round(120 + ratio * (2400 - 120));
      onUpdateConfig({ droneAltitudeM: val });
    }
  };

  // Safe-lock rotary dial pointer handlers with mechanical resistance threshold ("wrażenie oporu i przeskoku")
  const handleDialPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingDialRef.current = true;
    lastYRef.current = e.clientY;
    dragAccumRef.current = 0;
  };

  const handleDialPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingDialRef.current) return;
    const dy = lastYRef.current - e.clientY;
    lastYRef.current = e.clientY;

    // Build mechanical resistance tension before snapping to next safe notch (18px threshold)
    dragAccumRef.current += dy;
    const DETENT_RESISTANCE_PX = 16;
    const tension = Math.max(-1, Math.min(1, dragAccumRef.current / DETENT_RESISTANCE_PX));
    setResistanceTension(tension);

    if (Math.abs(dragAccumRef.current) >= DETENT_RESISTANCE_PX) {
      const deltaSteps = Math.trunc(dragAccumRef.current / DETENT_RESISTANCE_PX);
      dragAccumRef.current -= deltaSteps * DETENT_RESISTANCE_PX;
      setResistanceTension(0);
      applyStepValue(currentStep + deltaSteps);
    }
  };

  const handleDialPointerUp = () => {
    isDraggingDialRef.current = false;
    dragAccumRef.current = 0;
    setResistanceTension(0);
  };

  // Right-side DJ Scratch / Jog Platter handlers
  const computeAngleFromCenter = (clientX: number, clientY: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI);
  };

  const handleScratchPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scratchRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScratching(true);
    lastScratchAngleRef.current = computeAngleFromCenter(
      e.clientX,
      e.clientY,
      scratchRef.current
    );
  };

  const handleScratchPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScratching || !scratchRef.current) return;
    const angle = computeAngleFromCenter(e.clientX, e.clientY, scratchRef.current);
    let delta = angle - lastScratchAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    lastScratchAngleRef.current = angle;

    if (Math.abs(delta) > 1.2) {
      const nextRot = (scratchAngle + delta * 1.15 + 360) % 360;
      setScratchAngle(nextRot);
      playScratchJogPulse(delta, config.safeClickSoundEnabled !== false);

      // Update 3D model rotation + subtle gyroscope roll/pitch bank
      onUpdateConfig({
        modelRotationY: Math.round(nextRot),
        autoRotate: false,
        gyroRollDeg: Math.max(-35, Math.min(35, Math.round(delta * 1.8))),
      });
    }
  };

  const handleScratchPointerUp = () => {
    setIsScratching(false);
    onUpdateConfig({ gyroRollDeg: 0 });
  };

  // 16 Tactile Studio / MPC Pads Definition (4x4 Matrix on the Left Glass Panel)
  const tactilePads: Array<{
    id: number;
    code: string;
    label: string;
    sub: string;
    accent: 'cyan' | 'amber' | 'emerald' | 'violet';
    onTrigger: () => void;
  }> = [
    {
      id: 1,
      code: 'PAD 01',
      label: 'Szeroki Kąt 76°',
      sub: 'Perspektywa Wide',
      accent: 'cyan',
      onTrigger: () => {
        onUpdateConfig({ perspectiveFovDeg: 76, workspaceMarginPx: 28 });
        onNotify('Ustawiono szeroką perspektywę 76° z zachowaniem marginesu kadru 28px');
      },
    },
    {
      id: 2,
      code: 'PAD 02',
      label: 'Teleobiektyw 36°',
      sub: 'Izometria Arch.',
      accent: 'cyan',
      onTrigger: () => {
        onUpdateConfig({ perspectiveFovDeg: 36, workspaceMarginPx: 32 });
        onNotify('Ustawiono długą ogniskową 36° (kompresja perspektywy architektonicznej)');
      },
    },
    {
      id: 3,
      code: 'PAD 03',
      label: 'Złoty Podział',
      sub: 'Kompozycja Phi',
      accent: 'amber',
      onTrigger: () => {
        onUpdateConfig({ compositionGrid: 'golden_ratio' });
        onNotify('Włączono linie kompozycyjne Złotego Podziału (Golden Ratio 1:1.618)');
      },
    },
    {
      id: 4,
      code: 'PAD 04',
      label: 'Promienie Zbiegu',
      sub: 'Punkt Perspektywy',
      accent: 'amber',
      onTrigger: () => {
        onUpdateConfig({ compositionGrid: 'perspective_rays' });
        onNotify('Włączono promienie punktów zbiegu perspektywy i linii horyzontu');
      },
    },
    {
      id: 5,
      code: 'PAD 05',
      label: 'Plany Głębi Z',
      sub: '1 / 2 / 3 Plan',
      accent: 'cyan',
      onTrigger: () => {
        onUpdateConfig({ compositionGrid: 'depth_planes', depthOfFieldIntensity: 0.85 });
        onNotify('Aktywowano podział przestrzeni na 3 plany głębi ostrości (DOF)');
      },
    },
    {
      id: 6,
      code: 'PAD 06',
      label: 'Margines Luksus',
      sub: 'Ramka 42px',
      accent: 'emerald',
      onTrigger: () => {
        const nextMargin = (config.workspaceMarginPx || 24) >= 40 ? 18 : 42;
        onUpdateConfig({ workspaceMarginPx: nextMargin });
        onNotify(`Margines ograniczonej przestrzeni głębokiej paralaksy: ${nextMargin}px`);
      },
    },
    {
      id: 7,
      code: 'PAD 07',
      label: 'Lot: Góry Alpy',
      sub: 'Krajobraz Drona',
      accent: 'emerald',
      onTrigger: () => {
        onUpdateConfig({
          droneLandscape: 'alpine_peaks',
          droneFlightActive: true,
          droneAltitudeM: 1450,
        });
        onNotify('Wirtualny lot dronem: Szczyty Alpejskie (1450 m n.p.m.) — „Space to Luksus”');
      },
    },
    {
      id: 8,
      code: 'PAD 08',
      label: 'Lot: Kosmos',
      sub: 'Orbita & Mgławica',
      accent: 'violet',
      onTrigger: () => {
        onUpdateConfig({
          droneLandscape: 'cosmic_orbital',
          droneFlightActive: true,
          droneAltitudeM: 2400,
        });
        onNotify('Wirtualny lot dronem: Przestrzeń Orbitalna — „Space to Luksus”');
      },
    },
    {
      id: 9,
      code: 'PAD 09',
      label: 'Lot: Metropolia',
      sub: 'Korytarz Powietrzny',
      accent: 'cyan',
      onTrigger: () => {
        onUpdateConfig({
          droneLandscape: 'metropolis_dawn',
          droneFlightActive: true,
          droneAltitudeM: 520,
        });
        onNotify('Wirtualny lot dronem: Korytarz powietrzny nad futurystyczną metropolią');
      },
    },
    {
      id: 10,
      code: 'PAD 10',
      label: 'Lot: Ocean Zen',
      sub: 'Horyzont Wellness',
      accent: 'emerald',
      onTrigger: () => {
        onUpdateConfig({
          droneLandscape: 'ocean_wellness',
          droneFlightActive: true,
          droneAltitudeM: 220,
        });
        onNotify('Wirtualny lot dronem: Spokojny oceaniczny horyzont do relaksu i modelarstwa');
      },
    },
    {
      id: 11,
      code: 'PAD 11',
      label: 'Klej Moduł +1',
      sub: 'Hobby: Składanie',
      accent: 'amber',
      onTrigger: () => {
        const current = config.hobbyAssemblyStep || 12;
        const next = current >= 12 ? 1 : current + 1;
        onUpdateConfig({
          hobbyAssemblyStep: next,
          hobbyBlueprintConnectors: true,
        });
        onNotify(`Warsztat modelarski: Przyklejono sekcję konstrukcyjną ${next} z 12`);
      },
    },
    {
      id: 12,
      code: 'PAD 12',
      label: 'Rozłóż Zestaw',
      sub: 'Widok Części CAD',
      accent: 'amber',
      onTrigger: () => {
        const nextExp = config.explodedViewFactor > 0.4 ? 0.0 : 0.72;
        onUpdateConfig({
          explodedViewFactor: nextExp,
          hobbyBlueprintConnectors: true,
        });
        onNotify(
          nextExp > 0
            ? 'Rozłożono model na części pierwsze (widok instrukcji sklejania 3D)'
            : 'Złożono wszystkie podzespoły modelu w jednolitą bryłę'
        );
      },
    },
    {
      id: 13,
      code: 'PAD 13',
      label: 'Łączniki Kleju',
      sub: 'Wektory Montażu',
      accent: 'cyan',
      onTrigger: () => {
        onUpdateConfig({
          hobbyBlueprintConnectors: !config.hobbyBlueprintConnectors,
        });
        onNotify(
          !config.hobbyBlueprintConnectors
            ? 'Włączono linie prowadzące i punkty klejenia modułów 3D'
            : 'Ukryto pomocnicze wektory montażowe'
        );
      },
    },
    {
      id: 14,
      code: 'PAD 14',
      label: 'Siatka Złota 3D',
      sub: 'Styl Wireframe',
      accent: 'amber',
      onTrigger: () => {
        onUpdatePalette('amber_gold');
        onUpdateConfig({ wireframeOverlay: !config.wireframeOverlay });
        onNotify('Przełączono złotą siatkę architektoniczną (Grid in Architecture)');
      },
    },
    {
      id: 15,
      code: 'PAD 15',
      label: 'Kalibruj Żyro',
      sub: 'Poziom 0.0°',
      accent: 'emerald',
      onTrigger: () => {
        onUpdateConfig({
          gyroPitchDeg: 0,
          gyroRollDeg: 0,
          horizonOffsetY: 0,
          modelRotationY: 30,
        });
        onNotify('Żyroskop 3-osiowy wyzerowany do idealnego poziomu horyzontu 0.0°');
      },
    },
    {
      id: 16,
      code: 'PAD 16',
      label: 'Klik Sejfowy',
      sub: config.safeClickSoundEnabled !== false ? 'Dźwięk AKTYWNY' : 'Wyciszono',
      accent: 'violet',
      onTrigger: () => {
        const nextSound = config.safeClickSoundEnabled === false;
        onUpdateConfig({ safeClickSoundEnabled: nextSound });
        onNotify(
          nextSound
            ? 'Aktywowano mechaniczny dźwięk zapadek sejfu na pokrętle i padach'
            : 'Wyciszono dźwięk zapadek sejfu'
        );
      },
    },
  ];

  // Dial rotation angle (-135deg to +135deg) + subtle spring resistance offset
  const dialAngleDeg =
    -135 + (currentStep / TOTAL_LED_BARS) * 270 + resistanceTension * 6.5;

  const formattedDialValue = () => {
    if (dialTarget === 'scale_size') return `${config.modelScale.toFixed(2)}×`;
    if (dialTarget === 'levels_exploded') return `${Math.round(config.explodedViewFactor * 100)}%`;
    if (dialTarget === 'perspective_fov') return `${config.perspectiveFovDeg || 60}° FOV`;
    return `${config.droneAltitudeM || 650} m`;
  };

  // Live animated gyroscope angles
  const livePitch =
    (config.gyroPitchDeg || 0) +
    (config.droneFlightActive ? Math.sin(gyroAnimPhase * 1.4) * 8 : Math.sin(gyroAnimPhase * 0.5) * 2);
  const liveRoll =
    (config.gyroRollDeg || 0) +
    (config.droneFlightActive ? Math.cos(gyroAnimPhase * 1.1) * 11 : Math.cos(gyroAnimPhase * 0.4) * 2);
  const liveYaw = (config.modelRotationY + (config.droneFlightActive ? gyroAnimPhase * 18 : 0)) % 360;

  return (
    <div className="space-y-4">
      {/* Main Translucent Frosted-Glass Tactile Console Deck */}
      <div className="relative rounded-2xl bg-slate-950/65 backdrop-blur-xl border border-white/15 shadow-2xl p-4 sm:p-5 overflow-hidden">
        {/* Subtle Glass Top Specular Highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
          aria-hidden="true"
        />

        {/* Console Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-white/10">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono tabular-nums">
              <span>SPACE TO LUKSUS</span>
              <span aria-hidden="true">·</span>
              <span>SZKLANA KONSOLA KOMPOZYCJI, PERSPEKTYWY I LOTU DRONEM</span>
              <span aria-hidden="true">·</span>
              <span>TRYB HOBBY / MODELARSTWO 3D</span>
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-white">
              Szklany Panel Sterowania: 24 Diody LED Stopni · 16 Przycisków Warsztatowych · Masywne Pokrętło Sejfowe · Scratch Platter i Żyroskop
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  safeClickSoundEnabled: config.safeClickSoundEnabled === false,
                })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                config.safeClickSoundEnabled !== false
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900/70 border-white/10 text-slate-400'
              }`}
            >
              {config.safeClickSoundEnabled !== false ? (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                Klik Sejfowy: {config.safeClickSoundEnabled !== false ? 'WŁ.' : 'WYŁ.'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateConfig({
                  droneFlightActive: !config.droneFlightActive,
                })
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                config.droneFlightActive
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                  : 'bg-slate-900/70 border-white/10 text-slate-300'
              }`}
            >
              <Mountain className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Lot Dronem: {config.droneFlightActive ? 'W LOCIE' : 'PAUZA'}
              </span>
            </button>
          </div>
        </div>

        {/* 3-Column Glass Hardware Layout: Left (LED Ladder + 16 Pads) | Center (Massive Safe/Mixer Dial) | Right (Scratch Wheel + 3D Gyroscope) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          {/* LEFT WING: Numerous Thin LED Bars + 16 Tactile Buttons (4x4 Matrix) */}
          <div className="xl:col-span-5 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex gap-3.5">
            {/* Far-Left Column: 24 Thin Horizontal LED Bars Confirming Each Stepped Degree */}
            <div className="flex flex-col items-center justify-between py-1 px-2 rounded-lg bg-slate-950/90 border border-white/10 shrink-0 w-14">
              <span className="text-[9px] font-mono text-cyan-300 tracking-wider uppercase">
                LED {currentStep}/{TOTAL_LED_BARS}
              </span>

              <div className="flex flex-col-reverse gap-1 my-1.5 w-full">
                {Array.from({ length: TOTAL_LED_BARS }).map((_, idx) => {
                  const stepNum = idx + 1;
                  const isLit = stepNum <= currentStep;
                  const isTopPeak = stepNum === currentStep;
                  const barColor =
                    stepNum > 20
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.85)]'
                      : stepNum > 14
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]';

                  return (
                    <button
                      key={stepNum}
                      type="button"
                      onClick={() => applyStepValue(stepNum)}
                      title={`Ustaw stopień ${stepNum}/${TOTAL_LED_BARS}`}
                      className="group w-full py-0.5 flex items-center justify-center focus:outline-none"
                    >
                      <span
                        className={`block w-full transition-all duration-75 rounded-full ${
                          isTopPeak && lastDetentFlash
                            ? 'h-[4px] bg-white shadow-[0_0_12px_#ffffff]'
                            : isLit
                            ? `h-[3px] ${barColor}`
                            : 'h-[2px] bg-slate-800 group-hover:bg-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-[9px] font-mono text-slate-400 tabular-nums">
                STOPNIE
              </span>
            </div>

            {/* 4x4 Tactile Pad Matrix (16 Convenient Buttons) */}
            <div className="flex-1 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Panel 16 Przycisków Warsztatowych i Perspektywy</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  4×4 PAD MATRIX
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {tactilePads.map((pad, idx) => {
                  const isSelected = activePadIndex === idx;
                  const borderAccent =
                    pad.accent === 'amber'
                      ? 'hover:border-amber-400/70'
                      : pad.accent === 'emerald'
                      ? 'hover:border-emerald-400/70'
                      : pad.accent === 'violet'
                      ? 'hover:border-violet-400/70'
                      : 'hover:border-cyan-400/70';

                  return (
                    <button
                      key={pad.id}
                      type="button"
                      onClick={() => {
                        setActivePadIndex(idx);
                        playSafeLockDetentClick(
                          idx + 4,
                          16,
                          config.safeClickSoundEnabled !== false,
                          true
                        );
                        pad.onTrigger();
                      }}
                      className={`group relative text-left p-2 rounded-lg border transition-all active:scale-95 ${borderAccent} ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400 shadow-[inset_0_0_12px_rgba(34,211,238,0.25)]'
                          : 'bg-slate-900/75 border-white/10 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                        <span>{pad.code}</span>
                        <span
                          className={`w-2 h-1 rounded-full ${
                            isSelected ? 'bg-cyan-300' : 'bg-slate-700 group-hover:bg-slate-500'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-white truncate mt-0.5">
                        {pad.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{pad.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CENTER CONSOLE: Massive Studio Mixer / Safe-Lock Rotary Dial */}
          <div className="xl:col-span-4 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col justify-between items-center text-center">
            <div className="w-full flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Masywne Pokrętło Poziomów i Wielkości</span>
              </span>
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                OPÓR SEJFOWY 24-ST.
              </span>
            </div>

            {/* Target Parameter Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full bg-slate-950/80 p-1 rounded-lg border border-white/10 text-[11px] mb-3">
              {[
                { id: 'scale_size', label: 'Wielkość' },
                { id: 'levels_exploded', label: 'Poziomy' },
                { id: 'perspective_fov', label: 'Perspektywa' },
                { id: 'drone_altitude', label: 'Pułap Drona' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setDialTarget(t.id as MixerDialTarget);
                    playSafeLockDetentClick(12, 24, config.safeClickSoundEnabled !== false, false);
                  }}
                  className={`py-1 px-1.5 rounded font-medium transition-colors truncate ${
                    dialTarget === t.id
                      ? 'bg-amber-400 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Massive Rotary Safe-Lock / Studio Console Knob */}
            <div className="relative flex items-center justify-center my-1">
              {/* Outer 24-Notch Detent Ring SVG */}
              <svg className="w-48 h-48 -rotate-90 pointer-events-none" viewBox="0 0 180 180">
                {Array.from({ length: TOTAL_LED_BARS + 1 }).map((_, i) => {
                  const ratio = i / TOTAL_LED_BARS;
                  const deg = -135 + ratio * 270;
                  const rad = (deg * Math.PI) / 180;
                  const rInner = i % 4 === 0 ? 74 : 77;
                  const rOuter = 84;
                  const x1 = 90 + Math.cos(rad) * rInner;
                  const y1 = 90 + Math.sin(rad) * rInner;
                  const x2 = 90 + Math.cos(rad) * rOuter;
                  const y2 = 90 + Math.sin(rad) * rOuter;
                  const isActive = i <= currentStep;
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isActive ? '#38BDF8' : '#334155'}
                      strokeWidth={i % 4 === 0 ? 2.5 : 1.5}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Heavy Brushed-Metal & Frosted-Glass Rotary Drum */}
              <div
                ref={dialRef}
                onPointerDown={handleDialPointerDown}
                onPointerMove={handleDialPointerMove}
                onPointerUp={handleDialPointerUp}
                onPointerCancel={handleDialPointerUp}
                onWheel={(e) => {
                  e.preventDefault();
                  applyStepValue(currentStep + (e.deltaY < 0 ? 1 : -1));
                }}
                title="Przeciągnij w górę/dół lub użyj kółka myszy — wyczuwalny opór i przeskok zapadki sejfu"
                className={`absolute w-34 h-34 rounded-full cursor-ns-resize select-none flex flex-col items-center justify-center border-2 transition-shadow ${
                  lastDetentFlash
                    ? 'border-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.55),inset_0_2px_12px_rgba(255,255,255,0.35)]'
                    : 'border-slate-600/90 shadow-[0_12px_30px_rgba(0,0,0,0.85),inset_0_2px_10px_rgba(255,255,255,0.18)]'
                }`}
                style={{
                  background:
                    'radial-gradient(circle at 32% 28%, #1e293b 0%, #0f172a 55%, #020617 100%)',
                }}
              >
                {/* Rotating Indicator Ring */}
                <div
                  className="absolute inset-1.5 rounded-full border border-dashed border-white/15 pointer-events-none"
                  style={{
                    transform: `rotate(${dialAngleDeg}deg)`,
                    transition: isDraggingDialRef.current
                      ? 'transform 45ms cubic-bezier(0.22, 1, 0.36, 1)'
                      : 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <div className="w-2.5 h-5 bg-amber-400 rounded-full mx-auto -mt-1 shadow-[0_0_10px_#f59e0b]" />
                </div>

                {/* Center Digital Readout Inside Massive Knob */}
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  STOP. {currentStep}/{TOTAL_LED_BARS}
                </span>
                <span className="text-base font-bold font-mono text-white tabular-nums mt-0.5">
                  {formattedDialValue()}
                </span>
                <span className="text-[9px] font-mono text-cyan-300 mt-0.5">
                  {Math.abs(resistanceTension) > 0.15 ? 'OPÓR ZAPADKI...' : 'KLIK SEJFOWY'}
                </span>
              </div>
            </div>

            {/* Fine Single-Notch Stepper Buttons */}
            <div className="flex items-center justify-between w-full gap-2 pt-2">
              <button
                type="button"
                onClick={() => applyStepValue(currentStep - 1)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs font-mono text-slate-200 transition-colors"
              >
                −1 Stopień (Klik)
              </button>
              <button
                type="button"
                onClick={() => applyStepValue(currentStep + 1)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs font-mono text-cyan-300 transition-colors"
              >
                +1 Stopień (Klik)
              </button>
            </div>
          </div>

          {/* RIGHT WING: DJ Scratch / Jog Platter + Animated 3-Axis Gyroscope */}
          <div className="xl:col-span-3 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between space-y-3">
            {/* Top Half: DJ Scratch / Jog Controller */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Disc className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tarcza Scratch / Jog 360°</span>
                </span>
                <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                  {Math.round(scratchAngle)}° YAW
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Interactive Scratch Turntable Platter */}
                <div
                  ref={scratchRef}
                  onPointerDown={handleScratchPointerDown}
                  onPointerMove={handleScratchPointerMove}
                  onPointerUp={handleScratchPointerUp}
                  onPointerCancel={handleScratchPointerUp}
                  title="Obracaj tarczę jak w konsolecie DJ (Scratching obrotu bryły 3D i lotu drona)"
                  className="relative w-24 h-24 rounded-full cursor-grab active:cursor-grabbing select-none shrink-0 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center"
                  style={{
                    background:
                      'repeating-radial-gradient(circle at center, #090d16 0px, #090d16 4px, #162032 5px, #090d16 6px)',
                    transform: `rotate(${scratchAngle}deg)`,
                  }}
                >
                  {/* Scratch Platter Position Marker */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="w-7 h-7 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center">
                    <span className="text-[8px] font-mono text-amber-300">JOG</span>
                  </div>
                </div>

                {/* Scratch Platter Quick Actions & Hobby Step */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Przeciągnij po tarczy, aby „scratchować” obrót makiety 3D oraz kąt nalotu drona.
                  </p>
                  <div className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded border border-white/10 font-mono text-[11px]">
                    <span className="text-slate-400">Etap klejenia:</span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      {config.hobbyAssemblyStep || 12}/12
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Half: Animated 3-Axis Gyroscope (Pitch / Roll / Yaw) */}
            <div className="pt-2.5 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Animowany Żyroskop 3D</span>
                </span>
                <span className="font-mono text-[10px] text-emerald-300 tabular-nums">
                  P:{livePitch.toFixed(1)}° R:{liveRoll.toFixed(1)}°
                </span>
              </div>

              <div className="flex items-center gap-3 bg-slate-950/85 border border-white/10 rounded-xl p-2.5">
                {/* Animated SVG 3-Ring Gimbal Gyroscope */}
                <svg className="w-20 h-20 shrink-0" viewBox="0 0 100 100">
                  {/* Outer Fixed Bezel */}
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="rgba(148,163,184,0.25)"
                    strokeWidth="1.5"
                  />
                  {/* Yaw Ring */}
                  <g
                    style={{
                      transform: `rotate(${liveYaw}deg)`,
                      transformOrigin: '50px 50px',
                    }}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="39"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="1.8"
                      strokeDasharray="14 6"
                    />
                  </g>
                  {/* Roll Gimbal Ring */}
                  <g
                    style={{
                      transform: `rotate(${liveRoll * 2.2}deg)`,
                      transformOrigin: '50px 50px',
                    }}
                  >
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="31"
                      ry="18"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="1.8"
                    />
                    <line
                      x1="16"
                      y1="50"
                      x2="84"
                      y2="50"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                  </g>
                  {/* Pitch Gimbal Ring */}
                  <g
                    style={{
                      transform: `rotate(${livePitch * 2.5}deg)`,
                      transformOrigin: '50px 50px',
                    }}
                  >
                    <ellipse
                      cx="50"
                      cy="50"
                      rx="15"
                      ry="29"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="1.5"
                    />
                  </g>
                  {/* Center Core */}
                  <circle cx="50" cy="50" r="4" fill="#F8FAFC" />
                </svg>

                <div className="flex-1 space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between text-slate-300">
                    <span>PITCH (Nachylenie):</span>
                    <span className="text-emerald-400 tabular-nums">{livePitch.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ROLL (Przechył):</span>
                    <span className="text-amber-400 tabular-nums">{liveRoll.toFixed(1)}°</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>YAW (Azymut):</span>
                    <span className="text-cyan-400 tabular-nums">{Math.round(liveYaw)}°</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-0.5 border-t border-white/10">
                    <span>PUŁAP DRONA:</span>
                    <span className="text-white tabular-nums">
                      {config.droneAltitudeM || 650} m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deep Parallax, Perspective, Composition & Hobby Model-Crafting Quick Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 mt-4 border-t border-white/10 text-xs">
          {/* Control 1: Drone Flight Landscape ("Space to Luksus") */}
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                <span>Krajobraz Lotu Dronem:</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-300">Space to Luksus</span>
            </label>
            <select
              value={config.droneLandscape || 'alpine_peaks'}
              onChange={(e) => {
                onUpdateConfig({
                  droneLandscape: e.target.value as DroneLandscapeId,
                  droneFlightActive: true,
                });
                playSafeLockDetentClick(8, 24, config.safeClickSoundEnabled !== false, true);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="alpine_peaks">Góry Alpejskie i Przełęcze (Wysoka Głębia)</option>
              <option value="cosmic_orbital">Orbita Kosmiczna i Mgławica („Space to Luksus”)</option>
              <option value="metropolis_dawn">Futurystyczna Metropolia o Świcie</option>
              <option value="ocean_wellness">Oceaniczny Horyzont Wellness (Zen)</option>
              <option value="executive_boardroom">Klasyczny Stół Konferencyjny AR</option>
            </select>
          </div>

          {/* Control 2: Composition & Perspective Grid */}
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Planowanie Kompozycji i Głębi:</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-300">
                FOV {config.perspectiveFovDeg || 60}°
              </span>
            </label>
            <select
              value={config.compositionGrid || 'golden_ratio'}
              onChange={(e) => {
                onUpdateConfig({
                  compositionGrid: e.target.value as CompositionGridMode,
                });
                playSafeLockDetentClick(10, 24, config.safeClickSoundEnabled !== false, true);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="golden_ratio">Siatka Złotego Podziału + Margines Passe-Partout</option>
              <option value="perspective_rays">Linie Zbiegu Perspektywy i Horyzontu</option>
              <option value="depth_planes">Plany Głębi Ostrości (1. Plan / Środek / Tło)</option>
              <option value="rule_of_thirds">Klasyczny Trójpodział Kadru (Rule of Thirds)</option>
              <option value="none">Tylko Margines Roboczy (Bez linii pomocniczych)</option>
            </select>
          </div>

          {/* Control 3: Hobby Model-Gluing / Kitbash Step Slider */}
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                <span>Sklejanie Modelu (Etapy):</span>
              </span>
              <span className="font-mono text-amber-300 tabular-nums">
                {config.hobbyAssemblyStep || 12} / 12 części
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={config.hobbyAssemblyStep || 12}
              onChange={(e) => {
                const step = parseInt(e.target.value, 10);
                playSafeLockDetentClick(step * 2, 24, config.safeClickSoundEnabled !== false);
                onUpdateConfig({
                  hobbyAssemblyStep: step,
                  hobbyBlueprintConnectors: true,
                });
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2"
            />
          </div>

          {/* Control 4: Framed Workspace Margin & Horizon Tilt */}
          <div className="bg-slate-900/60 border border-white/10 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Margines Ramy Paralaksy:</span>
              </span>
              <span className="font-mono text-cyan-300 tabular-nums">
                {config.workspaceMarginPx || 28} px
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={52}
              step={2}
              value={config.workspaceMarginPx || 28}
              onChange={(e) => {
                const m = parseInt(e.target.value, 10);
                onUpdateConfig({ workspaceMarginPx: m });
              }}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2"
            />
          </div>
        </div>
      </div>

      {/* Interactive Gallery of the 15 Uploaded Architectural & Glass-UI Inspirations */}
      <div className="rounded-xl bg-slate-950/60 backdrop-blur-md border border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs sm:text-sm font-semibold text-white">
              Twoja Biblioteka 15 Wzorców: Szklane Panele, Głęboka Perspektywa i Wieżowce (Kliknij, aby załadować na scenę 3D)
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            15 załączonych referencji wizualnych
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {UPLOADED_INSPIRATION_GALLERY.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                playSafeLockDetentClick(idx + 1, 15, config.safeClickSoundEnabled !== false, true);
                onUpdatePalette(item.preset.palette);
                onUpdateConfig({
                  sceneId: item.preset.sceneId,
                  customSceneTitle: item.title,
                  droneLandscape: item.preset.droneLandscape,
                  droneFlightActive: true,
                  towerHeightMultiplier: item.preset.towerHeightMultiplier,
                  explodedViewFactor: item.preset.explodedViewFactor,
                  wireframeOverlay: item.preset.wireframeOverlay,
                  perspectiveFovDeg: item.preset.perspectiveFovDeg,
                });
                onNotify(`Załadowano wzorzec 3D i perspektywę: ${item.title}`);
              }}
              className="group text-left rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/80 bg-slate-900/70 transition-all flex flex-col"
            >
              <div className="relative h-20 w-full overflow-hidden bg-slate-950">
                <img
                  src={item.src}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/85 text-[9px] font-mono text-cyan-300">
                  {item.preset.perspectiveFovDeg}° FOV
                </span>
              </div>
              <div className="p-2">
                <div className="text-[11px] font-semibold text-white truncate">{item.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{item.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
