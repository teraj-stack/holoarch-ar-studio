import React, { useMemo, useState } from 'react';
import {
  Boxes,
  Check,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  Filter,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Loader2,
  PackagePlus,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  ARConfigState,
  ArchitecturalSceneId,
  HologramPaletteId,
  StudioExtensionId,
} from '../types/arStudio';
import { exportProjectToGLTF, exportProjectToIFC } from '../utils/exporters';
import { DriveFileItem, saveImageToGoogleDrive } from '../utils/googleDriveAuth';

interface StudioExtensionsHubProps {
  config: ARConfigState;
  onUpdateConfig: (partial: Partial<ARConfigState>) => void;
  onUpdatePalette: (palette: HologramPaletteId) => void;
  onApplyPresetPrompt: (promptText: string) => void;
  onNotify: (msg: string) => void;
}

export interface ReferenceAssetItem {
  id: string;
  fileName: string;
  title: string;
  collection:
    | 'ALL'
    | 'GLASS_MAQUETTE'
    | 'VORONOI_TOWERS'
    | 'KINETIC_AERO'
    | 'HYDRO_CRYSTAL'
    | 'AR_BOARDROOM';
  collectionLabel: string;
  localUrl?: string;
  proceduralTheme:
    | 'stacked_glass'
    | 'voronoi_spire'
    | 'kinetic_wing'
    | 'hydro_splash'
    | 'boardroom_holo'
    | 'prism_blocks';
  accentColor: string;
  secondaryColor: string;
  targetSceneId: ArchitecturalSceneId;
  targetPalette: HologramPaletteId;
  lightTempK: number;
  heightMult: number;
  explodedFactor: number;
  recommendedExtensions: StudioExtensionId[];
  promptPreset: string;
  specs: string;
}

export interface StudioExtensionDefinition {
  id: StudioExtensionId;
  name: string;
  version: string;
  category: 'Shader & Optics' | 'Parametric Geometry' | 'CAD / BIM / XR Pipeline';
  badge: string;
  description: string;
  unityPackage: string;
}

export const STUDIO_EXTENSIONS_CATALOG: StudioExtensionDefinition[] = [
  {
    id: 'ext_pbr_glass_ior',
    name: 'Optical Crystal Glass Shader (IOR 1.52 + Chromatic Dispersion)',
    version: 'v2.4.0',
    category: 'Shader & Optics',
    badge: 'KHR_materials_transmission',
    description:
      'Zaawansowany shader refrakcji szkła akrylowego i optycznego dla makiet warstwowych (glass1..glass34). Dodaje dyspersję pryzmatyczną na fazowanych krawędziach stropów.',
    unityPackage: 'com.holoarch.urp.optical-glass',
  },
  {
    id: 'ext_led_slab_core',
    name: 'Warm LED Core & Floor Slab Array (2900K Emissive Volumetrics)',
    version: 'v1.9.2',
    category: 'Shader & Optics',
    badge: 'HDR Bloom + AreaLight',
    description:
      'Wewnętrzne kolumny świetlne LED o ciepłej barwie 2900K–3200K podświetlające przezroczyste tafle stropowe od środka makiety.',
    unityPackage: 'com.holoarch.vfx.led-core-array',
  },
  {
    id: 'ext_voronoi_lattice',
    name: 'Bionic Voronoi Exoskeleton & Twisted Diagrid Generator',
    version: 'v3.1.0',
    category: 'Parametric Geometry',
    badge: 'Procedural Mesh / Compute',
    description:
      'Generator komórkowych struktur bionicznych Voronoi oraz skręconych helis wysokościowych (inspirowany The Torch 325m oraz wieżami bioniczno-parametrycznymi).',
    unityPackage: 'com.holoarch.parametric.voronoi-spire',
  },
  {
    id: 'ext_kinetic_ribs',
    name: 'Kinetic Titanium Wing & Logarithmic Fin Animator',
    version: 'v2.0.5',
    category: 'Parametric Geometry',
    badge: '6DoF Harmonic Solver',
    description:
      'Moduł animacji wachlarzowych żeber i piór tytanowych ze zmiennym przesunięciem fazowym (wzorowany na rzeźbie kinetycznego skrzydła -0.png / Calatrava style).',
    unityPackage: 'com.holoarch.kinetic.aerowing',
  },
  {
    id: 'ext_hydro_refraction',
    name: 'Hydro-Aqua Fluid Vortex & Suspended Droplet Emitter',
    version: 'v1.8.4',
    category: 'Shader & Optics',
    badge: 'IOR 1.333 + Caustics',
    description:
      'Symulacja zamrożonej w czasie fali wodnej, wiru w cylindrycznym naczyniu oraz zawieszonych w powietrzu sferycznych kropel z kaustyką świetlną (0.jpg).',
    unityPackage: 'com.holoarch.fluids.aqua-sculpture',
  },
  {
    id: 'ext_gltf_draco',
    name: 'Khronos glTF 2.0 / GLB PBR Transmission Exporter',
    version: 'v4.0.1',
    category: 'CAD / BIM / XR Pipeline',
    badge: '.GLTF / .GLB 2.0',
    description:
      'Bezpośrednia serializacja sceny 3D z zachowaniem materiałów przezroczystych IOR, węzłów hierarchii i metadanych AR do formatu Khronos glTF 2.0.',
    unityPackage: 'com.unity.cloud.gltfast',
  },
  {
    id: 'ext_bim_ifc400',
    name: 'ISO-10303-21 IFC4 BIM Level 400 Architectural Exporter',
    version: 'v2.7.0',
    category: 'CAD / BIM / XR Pipeline',
    badge: '.IFC (Revit / ArchiCAD)',
    description:
      'Eksport struktury kondygnacji (IfcBuildingStorey), rzędnych wysokościowych i osi konstrukcyjnych do natywnego formatu BIM IFC4.',
    unityPackage: 'com.holoarch.bim.ifc4-bridge',
  },
  {
    id: 'ext_usdz_visionos',
    name: 'Apple VisionOS & ARKit QuickLook USDZ Spatial Bridge',
    version: 'v1.6.0',
    category: 'CAD / BIM / XR Pipeline',
    badge: '.USDZ / RealityKit',
    description:
      'Profil kompatybilności z Apple Vision Pro (RealityKit ShaderGraph) oraz natywnym podglądem AR QuickLook na iPad Pro M4 i iPhone 16 Pro.',
    unityPackage: 'com.unity.polyspatial.visionos',
  },
];

export const UPLOADED_REFERENCE_GALLERY: ReferenceAssetItem[] = [
  // 1. Direct local workspace assets in /public/assets/aistudio/
  {
    id: 'ref-dashboard-dex',
    fileName: 'Obrazek Apple Creator Studio 2026-10-26_10-27-52_2.png',
    title: 'Stół Konferencyjny AR „Global Network Hologram”',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/Dashboard_dex_eeffcbc7.jpg',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#06B6D4',
    secondaryColor: '#F59E0B',
    targetSceneId: 'skyline_financial',
    targetPalette: 'cyan_blueprint',
    lightTempK: 3400,
    heightMult: 1.25,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_gltf_draco'],
    promptPreset:
      'Holograficzna makieta kompleksu wieżowców finansowych na czarnym lustrzanym stole konferencyjnym o zachodzie słońca 3400K, świecąca mapa świata w blacie i zawieszone panele telemetrii AR 6DoF',
    specs: 'Scena: Skyline Core · Blat + Mapa Świata · HDR 3400K',
  },
  {
    id: 'ref-50-rise-tower',
    fileName: '50_Rise_Tower_66976ad1.jpeg',
    title: '50 Rise Tower — Kaskadowa Wieża z Zielonymi Tarasami',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    localUrl: '/assets/aistudio/50_Rise_Tower_66976ad1.jpeg',
    proceduralTheme: 'stacked_glass',
    accentColor: '#38BDF8',
    secondaryColor: '#10B981',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'cyan_blueprint',
    lightTempK: 4800,
    heightMult: 1.35,
    explodedFactor: 0.15,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_led_slab_core'],
    promptPreset:
      'Wysokościowiec 50 Rise Tower z zaokrąglonymi narożnikami, warstwowymi płytami stropowymi i zielonym podium bioklimatycznym, prezentacja AR 1:100 na stole architektonicznym',
    specs: 'Wysokość: 245m · Zaokrąglone stropy · Podium kaskadowe',
  },
  {
    id: 'ref-ny-the-torch',
    fileName: 'NEW_YORK___The_Torch_-_740_8th_Avenue___325m.jpeg',
    title: 'NEW YORK | The Torch (740 8th Ave) — 325m Spiral Spire',
    collection: 'VORONOI_TOWERS',
    collectionLabel: 'Struktury Bioniczne i Helisy',
    localUrl:
      '/assets/aistudio/NEW_YORK___The_Torch_-_740_8th_Avenue___325m___1067ft___.._dad21242.jpeg',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#F59E0B',
    secondaryColor: '#38BDF8',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'amber_gold',
    lightTempK: 3200,
    heightMult: 1.5,
    explodedFactor: 0.1,
    recommendedExtensions: ['ext_voronoi_lattice', 'ext_led_slab_core', 'ext_bim_ifc400'],
    promptPreset:
      'Hologram wieżowca The Torch 325m (Nowy Jork) ze skręconą koroną helikalną i podświetlonym trzonem obserwacyjnym, złote oświetlenie zachodu słońca 3200K i 6 agentów skanujących elewację',
    specs: 'Wysokość: 325m (1067 ft) · Helikalna Korona · Diagrid',
  },
  {
    id: 'ref-tashkent-city',
    fileName: 'Tashkent_City__Uzbekistan_5fa897cb.jpeg',
    title: 'Tashkent City Financial Complex — Zespół Wysokościowców',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/Tashkent_City__Uzbekistan_5fa897cb.jpeg',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#06B6D4',
    secondaryColor: '#E2E8F0',
    targetSceneId: 'skyline_financial',
    targetPalette: 'platinum_arch',
    lightTempK: 4500,
    heightMult: 1.3,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_bim_ifc400'],
    promptPreset:
      'Kompleks wysokościowców Tashkent City w formie platynowej makiety BIM na stole konferencyjnym, pełna okluzja LiDAR i siatka urbanistyczna 36 budynków sąsiednich',
    specs: 'Masterplan Urbanistyczny · 11 Modułów · BIM Level 400',
  },
  {
    id: 'ref-unknown-17-courtyard',
    fileName: 'Unknown_17_77d8920d.jpeg',
    title: 'Kompleks Trzech Wież z Dziedzińcem Wstęgowym LED',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    localUrl: '/assets/aistudio/Unknown_17_77d8920d.jpeg',
    proceduralTheme: 'stacked_glass',
    accentColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    targetSceneId: 'eco_atrium',
    targetPalette: 'cyan_blueprint',
    lightTempK: 5000,
    heightMult: 1.15,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_led_slab_core', 'ext_bim_ifc400'],
    promptPreset:
      'Trzy biurowce z poziomymi wstęgami elewacyjnymi LED i geometrycznym dziedzińcem rekreacyjnym w skali 1:50 na blacie stołu AR',
    specs: 'Fasada Wstęgowa · Dziedziniec Centralny · ARCore Depth',
  },
  {
    id: 'ref-unknown-11-acrylic',
    fileName: 'Unknown_11_7796abba.jpeg',
    title: 'Pryzmatyczne Bloki Akrylowe z Fluorescencyjną Krawędzią',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    localUrl: '/assets/aistudio/Unknown_11_7796abba.jpeg',
    proceduralTheme: 'prism_blocks',
    accentColor: '#38BDF8',
    secondaryColor: '#EC4899',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'platinum_arch',
    lightTempK: 5800,
    heightMult: 0.9,
    explodedFactor: 0.25,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_usdz_visionos'],
    promptPreset:
      'Minimalistyczne matowe bryły ze szkła akrylowego z dichroicznymi, neonowymi krawędziami (błękit, róż i bursztyn) w przestrzeni AR VisionOS',
    specs: 'Szkło Dichroiczne · IOR 1.49 · Krawędzie Fluorescencyjne',
  },
  {
    id: 'ref-unknown-15-scifi-city',
    fileName: 'Unknown_15_711a6bf4.jpeg',
    title: 'Metropolia Przyszłości z Bioniczna Wieżą i Estakadami',
    collection: 'VORONOI_TOWERS',
    collectionLabel: 'Struktury Bioniczne i Helisy',
    localUrl: '/assets/aistudio/Unknown_15_711a6bf4.jpeg',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#06B6D4',
    secondaryColor: '#38BDF8',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'cyan_blueprint',
    lightTempK: 5400,
    heightMult: 1.45,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_voronoi_lattice', 'ext_gltf_draco'],
    promptPreset:
      'Futurystyczna metropolia z bioniczną wieżą łupinową, wielopoziomowymi estakadami magnetycznymi i autonomicznymi dronami patrolowymi w przestrzeni 3D',
    specs: 'Egzoszkielet Bioniczny · Estakady 3D · Lot Drona',
  },
  {
    id: 'ref-unknown-16-floating-glass',
    fileName: 'Unknown_16_c3a65e84.jpeg',
    title: 'Zawieszone Tafle Szkła Spatial UI (VisionOS Glass Panels)',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/Unknown_16_c3a65e84.jpeg',
    proceduralTheme: 'prism_blocks',
    accentColor: '#E2E8F0',
    secondaryColor: '#38BDF8',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'platinum_arch',
    lightTempK: 6000,
    heightMult: 1.1,
    explodedFactor: 0.65,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_usdz_visionos'],
    promptPreset:
      'Wielowarstwowe zawieszone w powietrzu tafle matowego szkła optycznego z mikro-typografią i kostkami refrakcyjnymi, głęboka paralaksa 6DoF',
    specs: 'Spatial Glass UI · Rozstrzelenie 65% · Paralaksa 6DoF',
  },
  {
    id: 'ref-unknown-12-aero',
    fileName: 'Unknown_12_bba1e6ab.jpeg',
    title: 'Pawilon Parametryczny i Struktura Powłokowa',
    collection: 'KINETIC_AERO',
    collectionLabel: 'Kinetyczne Skrzydła i Aerodynamika',
    localUrl: '/assets/aistudio/Unknown_12_bba1e6ab.jpeg',
    proceduralTheme: 'kinetic_wing',
    accentColor: '#10B981',
    secondaryColor: '#06B6D4',
    targetSceneId: 'aero_hub',
    targetPalette: 'emerald_matrix',
    lightTempK: 4600,
    heightMult: 1.15,
    explodedFactor: 0.2,
    recommendedExtensions: ['ext_kinetic_ribs', 'ext_bim_ifc400'],
    promptPreset:
      'Rozpiętościowy terminal i pawilon parametryczny z kratownicą powłokową, zielony skan laserowy LiDAR i eksport siatki .STL do druku 3D',
    specs: 'Powłoka Kratownicowa · Skan LiDAR · Eksport STL/OBJ',
  },
  {
    id: 'ref-unknown-18-tower',
    fileName: 'Unknown_18_dd448f4a.jpeg',
    title: 'Dominanta Wysokościowa z Podświetleniem Krawędziowym',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    localUrl: '/assets/aistudio/Unknown_18_dd448f4a.jpeg',
    proceduralTheme: 'stacked_glass',
    accentColor: '#F59E0B',
    secondaryColor: '#06B6D4',
    targetSceneId: 'skyline_financial',
    targetPalette: 'amber_gold',
    lightTempK: 3300,
    heightMult: 1.4,
    explodedFactor: 0.1,
    recommendedExtensions: ['ext_led_slab_core', 'ext_pbr_glass_ior'],
    promptPreset:
      'Wysokościowiec ze świetlnymi krawędziami kondygnacji i ciepłym rdzeniem bursztynowym 3300K na blacie konferencyjnym',
    specs: 'Iluminacja Krawędzi · Rdzeń 3300K · Skala 1.4x',
  },
  {
    id: 'ref-unknown-10',
    fileName: 'Unknown_10_9f8953aa.jpeg',
    title: 'Makieta Koncepcyjna z Warstwowym Rdzeniem Świetlnym',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    localUrl: '/assets/aistudio/Unknown_10_9f8953aa.jpeg',
    proceduralTheme: 'stacked_glass',
    accentColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'cyan_blueprint',
    lightTempK: 4100,
    heightMult: 1.2,
    explodedFactor: 0.3,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_led_slab_core'],
    promptPreset:
      'Warstwowa makieta architektoniczna ze szlifowanego szkła z rozstrzelonymi kondygnacjami 30% i kolumnami LED',
    specs: 'Szkło Warstwowe · Exploded View 30% · CAD OBJ',
  },
  {
    id: 'ref-unknown-13',
    fileName: 'Unknown_13_e4f01b9d.jpeg',
    title: 'Struktura Przestrzenna i Analiza Kompozycji Głębi',
    collection: 'VORONOI_TOWERS',
    collectionLabel: 'Struktury Bioniczne i Helisy',
    localUrl: '/assets/aistudio/Unknown_13_e4f01b9d.jpeg',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#10B981',
    secondaryColor: '#38BDF8',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'emerald_matrix',
    lightTempK: 4900,
    heightMult: 1.25,
    explodedFactor: 0.15,
    recommendedExtensions: ['ext_voronoi_lattice', 'ext_gltf_draco'],
    promptPreset:
      'Analiza kompozycji przestrzennej i głębi obrazu dla parametrycznej wieży z podziałem złotego podziału (Golden Ratio)',
    specs: 'Złoty Podział · Głębia Ostrości · Siatka Voronoi',
  },
  {
    id: 'ref-img-1813',
    fileName: 'IMG_1813_1fda0aa6.jpg',
    title: 'Studium Bryłowe i Oświetlenie Środowiskowe HDR (IMG_1813)',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/IMG_1813_1fda0aa6.jpg',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#06B6D4',
    secondaryColor: '#F59E0B',
    targetSceneId: 'skyline_financial',
    targetPalette: 'cyan_blueprint',
    lightTempK: 3800,
    heightMult: 1.15,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_bim_ifc400'],
    promptPreset:
      'Studium bryłowe zespołu budynków z dynamiczną estymacją światła otoczenia HDR 3800K i cieniami kontaktowymi na blacie',
    specs: 'HDR Light Estimation · Cienie Kontaktowe · ARKit 6',
  },
  {
    id: 'ref-img-1814',
    fileName: 'IMG_1814_964ef07f.jpg',
    title: 'Detal Architektoniczny i Okluzja Czujnika Głębi (IMG_1814)',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/IMG_1814_964ef07f.jpg',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#F59E0B',
    secondaryColor: '#38BDF8',
    targetSceneId: 'eco_atrium',
    targetPalette: 'amber_gold',
    lightTempK: 3500,
    heightMult: 1.2,
    explodedFactor: 0.2,
    recommendedExtensions: ['ext_led_slab_core', 'ext_usdz_visionos'],
    promptPreset:
      'Prezentacja detalu architektonicznego kampusu Eco-Atrium z włączoną okluzją głębi ToF/LiDAR i rozstrzeleniem warstw 20%',
    specs: 'ToF Depth Occlusion · 120 FPS · Eco-Atrium',
  },
  {
    id: 'ref-img-1820',
    fileName: 'IMG_1820_c84a58a0.PNG',
    title: 'Interfejs Przestrzenny i Telemetria LiDAR (IMG_1820)',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/IMG_1820_c84a58a0.PNG',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#10B981',
    secondaryColor: '#06B6D4',
    targetSceneId: 'aero_hub',
    targetPalette: 'emerald_matrix',
    lightTempK: 5200,
    heightMult: 1.1,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_gltf_draco', 'ext_usdz_visionos'],
    promptPreset:
      'Widok telemetrii skanera LiDAR i siatki płaszczyzn stołu/podłogi dla węzła AeroHub z 6 agentami patrolowymi',
    specs: 'Telemetria LiDAR · Siatka Płaszczyzn · 6 Agentów',
  },
  {
    id: 'ref-img-1821',
    fileName: 'IMG_1821_419a0ff6.PNG',
    title: 'Konfiguracja Wielowarstwowa i Eksport CAD (IMG_1821)',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/IMG_1821_419a0ff6.PNG',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#E2E8F0',
    secondaryColor: '#38BDF8',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'platinum_arch',
    lightTempK: 4700,
    heightMult: 1.25,
    explodedFactor: 0.35,
    recommendedExtensions: ['ext_bim_ifc400', 'ext_gltf_draco'],
    promptPreset:
      'Konfiguracja wielowarstwowa BIM z prowadnicami montażowymi i eksportem do .OBJ, .STL, .GLTF oraz .IFC',
    specs: 'Prowadnice Montażowe · Eksport Multi-CAD',
  },

  // 2. Inline Vision Attachments from User's 52-Image Batch
  {
    id: 'ref-spirit-spire',
    fileName: 'spirit.png',
    title: 'Spirit Tower — Cylindryczny Wieżowiec z Żaglem Szklanym',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'cyan_blueprint',
    lightTempK: 5600,
    heightMult: 1.55,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_bim_ifc400'],
    promptPreset:
      'Wysmukły cylindryczny wieżowiec Spirit Tower z podwójną szklaną osłoną żaglową zwężającą się ku szczytowi i portalowym wejściem u podstawy',
    specs: 'Załącznik: spirit.png · Fasada Żaglowa · 310m',
  },
  {
    id: 'ref-100-boardroom',
    fileName: '100.png / 100.png_2K_20261026105650.jpg',
    title: 'Hologram Wieżowców na Stole Zarządu + Złota Mapa Świata 2K',
    collection: 'AR_BOARDROOM',
    collectionLabel: 'Stoły Holograficzne AR',
    localUrl: '/assets/aistudio/Dashboard_dex_eeffcbc7.jpg',
    proceduralTheme: 'boardroom_holo',
    accentColor: '#06B6D4',
    secondaryColor: '#F59E0B',
    targetSceneId: 'skyline_financial',
    targetPalette: 'cyan_blueprint',
    lightTempK: 3200,
    heightMult: 1.3,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_led_slab_core', 'ext_gltf_draco'],
    promptPreset:
      'Fotorealistyczna sala zarządu o zachodzie słońca 2K (100.png): na lustrzanym stole świeci błękitny hologram kompleksu wieżowców otoczony złotą mapą sieci globalnej i zawieszonymi ekranami HUD',
    specs: 'Załącznik: 100.png (2K Master) · Stół AR + HUD',
  },
  {
    id: 'ref-kinetic-wing-0',
    fileName: '-0.png / 67243a334ef658da6dda9b7adeabd8e0.jpg',
    title: 'Rzeźba Kinetyczna „Titanium Wing” — Wachlarz 28 Piór',
    collection: 'KINETIC_AERO',
    collectionLabel: 'Kinetyczne Skrzydła i Aerodynamika',
    proceduralTheme: 'kinetic_wing',
    accentColor: '#E2E8F0',
    secondaryColor: '#F59E0B',
    targetSceneId: 'kinetic_calatrava_wing',
    targetPalette: 'platinum_arch',
    lightTempK: 4300,
    heightMult: 1.35,
    explodedFactor: 0.12,
    recommendedExtensions: ['ext_kinetic_ribs', 'ext_gltf_draco'],
    promptPreset:
      'Rzeźba kinetyczna ze szczotkowanego tytanu (-0.png): wygięty łukowo kręgosłup wspornikowy z rozpostartym wachlarzem 28 ostrych żeber aerodynamicznych na okrągłej bazie',
    specs: 'Załącznik: -0.png · Szczotkowany Tytan · Spirala',
  },
  {
    id: 'ref-hydro-splash-0',
    fileName: '0.jpg / 97a6d95b3b5cd53112ce5f0ec544853e.jpg',
    title: 'Hydro-Rzeźba „Wodny Atletai Kula Refrakcyjna” (Liquid Splash)',
    collection: 'HYDRO_CRYSTAL',
    collectionLabel: 'Hydro-Rzeźby i Płynny Kryształ',
    proceduralTheme: 'hydro_splash',
    accentColor: '#38BDF8',
    secondaryColor: '#E2E8F0',
    targetSceneId: 'hydro_aqua_sculpture',
    targetPalette: 'cyan_blueprint',
    lightTempK: 6200,
    heightMult: 1.25,
    explodedFactor: 0.18,
    recommendedExtensions: ['ext_hydro_refraction', 'ext_pbr_glass_ior', 'ext_usdz_visionos'],
    promptPreset:
      'Dynamiczna rzeźba wodna wyłaniająca się ze szklanego cylindra (0.jpg) z zawieszoną w powietrzu kulą wodną, bąbelkami tlenu i pełną refrakcją IOR 1.333',
    specs: 'Załącznik: 0.jpg · Refrakcja Wody IOR 1.333 · Krople 3D',
  },
  {
    id: 'ref-glass-series-1-34',
    fileName: 'glass1.png · glass2.png · glass3.png · glass34.png',
    title: 'Seria „Glass 1–34” — Warstwowe Makiety Szklane z Kolumnami LED',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    proceduralTheme: 'stacked_glass',
    accentColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'amber_gold',
    lightTempK: 3100,
    heightMult: 1.3,
    explodedFactor: 0.08,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_led_slab_core', 'ext_bim_ifc400'],
    promptPreset:
      'Kolekcja makiet architektonicznych z grubych, fazowanych płyt szkła optycznego (glass1–glass34) przekładanych ciepłymi bursztynowymi kolumnami LED 3000K na czarnym postumencie',
    specs: 'Załączniki: glass1..glass34.png · Tafle Akrylowe + LED',
  },
  {
    id: 'ref-slamp-bach',
    fileName: 'Floor_Table Lamp BACH by Slamp(1).jpg / cc.png',
    title: 'Kolumna Świetlna „BACH by Slamp” — Plisowana Struktura Opalflex',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    proceduralTheme: 'stacked_glass',
    accentColor: '#F59E0B',
    secondaryColor: '#E2E8F0',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'amber_gold',
    lightTempK: 2900,
    heightMult: 1.45,
    explodedFactor: 0.0,
    recommendedExtensions: ['ext_led_slab_core', 'ext_pbr_glass_ior'],
    promptPreset:
      'Smukła, plisowana kolumna świetlna inspirowana lampą BACH by Slamp o ciepłej bursztynowej poświacie 2900K i rytmicznych wertykalnych żebrach rozpraszających światło',
    specs: 'Załącznik: BACH by Slamp · Ciepły Rdzeń 2900K',
  },
  {
    id: 'ref-voronoi-cellular-1fe',
    fileName: '1fecc7425ef19f12fa3d54b6d5ac5484.jpg / 2efa4e90.jpg',
    title: 'Bioniczny Egzoszkielet Komórkowy Voronoi (Parametric Tower)',
    collection: 'VORONOI_TOWERS',
    collectionLabel: 'Struktury Bioniczne i Helisy',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#10B981',
    secondaryColor: '#06B6D4',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'emerald_matrix',
    lightTempK: 4600,
    heightMult: 1.4,
    explodedFactor: 0.15,
    recommendedExtensions: ['ext_voronoi_lattice', 'ext_bim_ifc400'],
    promptPreset:
      'Wieżowiec z organicznym egzoszkieletem komórkowym Voronoi (1fecc742 / 2efa4e90), ażurowa fasada strukturalna drukowana w 3D (.STL) i skanowana przez 6 agentów',
    specs: 'Załączniki: 1fecc742 / 2efa4e90 · Siatka Voronoi',
  },
  {
    id: 'ref-twisted-helix-343',
    fileName: '343118065365248330.jpg · 416090453061542214.jpg · 43002346.jpg',
    title: 'Skręcone Wieże Helikalne i Diagrid Aerodynamiczny',
    collection: 'VORONOI_TOWERS',
    collectionLabel: 'Struktury Bioniczne i Helisy',
    proceduralTheme: 'voronoi_spire',
    accentColor: '#06B6D4',
    secondaryColor: '#F59E0B',
    targetSceneId: 'voronoi_bionic_spire',
    targetPalette: 'cyan_blueprint',
    lightTempK: 4200,
    heightMult: 1.5,
    explodedFactor: 0.1,
    recommendedExtensions: ['ext_voronoi_lattice', 'ext_pbr_glass_ior'],
    promptPreset:
      'Zespół skręconych wieżowców helikalnych o obrocie kondygnacji 90 stopni od bazy do korony, szklana fasada kurtynowa i stalowy diagrid obwodowy',
    specs: 'Załączniki: 343118..430023 · Obrót Helisy 90°',
  },
  {
    id: 'ref-aero-shells-5cc',
    fileName: '5cc3212a469f6df4e2b0d93e34009b1079066b98 m.jpg · 41820151.jpg',
    title: 'Aerodynamiczne Łupiny Przemysłowe i Mosty Powietrzne',
    collection: 'KINETIC_AERO',
    collectionLabel: 'Kinetyczne Skrzydła i Aerodynamika',
    proceduralTheme: 'kinetic_wing',
    accentColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    targetSceneId: 'aero_hub',
    targetPalette: 'cyan_blueprint',
    lightTempK: 4800,
    heightMult: 1.2,
    explodedFactor: 0.2,
    recommendedExtensions: ['ext_kinetic_ribs', 'ext_gltf_draco'],
    promptPreset:
      'Wielkoprzestrzenna forma aerodynamiczna z płynnymi przejściami fasady i wspornikowymi zadaszeniami (5cc3212a / 41820151), widoczna w locie drona nad górami',
    specs: 'Załączniki: 5cc3212a / 41820151 · Forma Łupinowa',
  },
  {
    id: 'ref-hydro-waves-923',
    fileName: '923f4fd53d66a355f323550495cae3e7.jpg · 66424b3d.jpg · 56a6072f.jpg',
    title: 'Płynne Rzeźby Krystaliczne i Kaskady Wodne 6DoF',
    collection: 'HYDRO_CRYSTAL',
    collectionLabel: 'Hydro-Rzeźby i Płynny Kryształ',
    proceduralTheme: 'hydro_splash',
    accentColor: '#06B6D4',
    secondaryColor: '#38BDF8',
    targetSceneId: 'hydro_aqua_sculpture',
    targetPalette: 'cyan_blueprint',
    lightTempK: 5900,
    heightMult: 1.3,
    explodedFactor: 0.25,
    recommendedExtensions: ['ext_hydro_refraction', 'ext_pbr_glass_ior'],
    promptPreset:
      'Organiczna kaskada płynnego kryształu i zamrożonych kropel wody (923f4fd5 / 66424b3d / 56a6072f) z głęboką refrakcją światła i kaustyką na blacie stołu AR',
    specs: 'Załączniki: 923f4fd5 / 66424b3d · Kaustyka Wodna',
  },
  {
    id: 'ref-parametric-658-series',
    fileName: '658440408053312079.jpg · 658440408053313040.jpg · 658440408053313958.jpg',
    title: 'Tryptyk Parametryczny „658440” — Bioniczne Rdzenie i Żebra',
    collection: 'KINETIC_AERO',
    collectionLabel: 'Kinetyczne Skrzydła i Aerodynamika',
    proceduralTheme: 'kinetic_wing',
    accentColor: '#F59E0B',
    secondaryColor: '#E2E8F0',
    targetSceneId: 'kinetic_calatrava_wing',
    targetPalette: 'amber_gold',
    lightTempK: 3600,
    heightMult: 1.35,
    explodedFactor: 0.15,
    recommendedExtensions: ['ext_kinetic_ribs', 'ext_voronoi_lattice'],
    promptPreset:
      'Tryptyk bionicznych struktur żebrowych (seria 65844040805331...) z płynną modulacją przekroju i metaliczną powłoką tytanowo-złotą',
    specs: 'Załączniki: Seria 658440 (3 warianty) · Żebra 3D',
  },
  {
    id: 'ref-studio-batch-12-23-as-bb-gg',
    fileName: '12.png · 13.png · 14.png · 23.png · as.png · bb.png · gg.png',
    title: 'Kolekcja Makiety Szklane & Iluminacje Gablotowe (12..23, as, bb, gg)',
    collection: 'GLASS_MAQUETTE',
    collectionLabel: 'Wieżowce i Makiety Szklane',
    proceduralTheme: 'stacked_glass',
    accentColor: '#38BDF8',
    secondaryColor: '#F59E0B',
    targetSceneId: 'crystal_stacked_prism',
    targetPalette: 'cyan_blueprint',
    lightTempK: 3900,
    heightMult: 1.25,
    explodedFactor: 0.2,
    recommendedExtensions: ['ext_pbr_glass_ior', 'ext_led_slab_core', 'ext_gltf_draco'],
    promptPreset:
      'Pełny zestaw gablotowych makiet architektonicznych (12.png, 13.png, 14.png, 23.png, as.png, bb.png, gg.png) z precyzyjnie wycinanymi laserowo płytami akrylowymi i podświetleniem rdzeniowym',
    specs: 'Załączniki: 12..23.png, as, bb, gg · Makiety Laser-Cut',
  },
];

function renderProceduralPreviewSVG(item: ReferenceAssetItem) {
  const { proceduralTheme, accentColor, secondaryColor } = item;

  if (proceduralTheme === 'kinetic_wing') {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-32 bg-slate-950 block">
        <defs>
          <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.85" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <ellipse cx="185" cy="162" rx="58" ry="7" fill={accentColor} fillOpacity="0.25" />
        {Array.from({ length: 18 }).map((_, i) => {
          const angle = -68 + i * 4.2;
          const len = 52 + Math.sin((i / 17) * Math.PI) * 58;
          return (
            <g
              key={i}
              transform={`translate(185, 152) rotate(${angle})`}
              stroke={i % 3 === 0 ? secondaryColor : accentColor}
            >
              <line
                x1="0"
                y1="0"
                x2={-len}
                y2={-i * 3.5}
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={0.55 + (i / 18) * 0.45}
              />
            </g>
          );
        })}
        <path
          d="M 185 156 Q 145 105 215 24"
          fill="none"
          stroke={`url(#grad-${item.id})`}
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (proceduralTheme === 'hydro_splash') {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-32 bg-slate-950 block">
        <rect
          x="105"
          y="108"
          width="110"
          height="62"
          rx="6"
          fill={accentColor}
          fillOpacity="0.16"
          stroke={accentColor}
          strokeWidth="1.5"
        />
        <ellipse
          cx="160"
          cy="108"
          rx="55"
          ry="9"
          fill={accentColor}
          fillOpacity="0.3"
          stroke={secondaryColor}
          strokeWidth="1.2"
        />
        <path
          d="M 145 110 C 130 75, 110 55, 88 38 M 160 110 C 162 70, 175 48, 165 25 M 172 108 C 190 80, 215 72, 238 68"
          fill="none"
          stroke={accentColor}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="228"
          cy="44"
          r="16"
          fill={accentColor}
          fillOpacity="0.28"
          stroke={secondaryColor}
          strokeWidth="1.8"
        />
        <circle cx="102" cy="64" r="6" fill={secondaryColor} fillOpacity="0.7" />
        <circle cx="135" cy="34" r="4.5" fill={accentColor} fillOpacity="0.8" />
        <circle cx="192" cy="52" r="5" fill={secondaryColor} fillOpacity="0.75" />
      </svg>
    );
  }

  if (proceduralTheme === 'voronoi_spire') {
    return (
      <svg viewBox="0 0 320 180" className="w-full h-32 bg-slate-950 block">
        <ellipse cx="160" cy="164" rx="70" ry="8" fill={accentColor} fillOpacity="0.18" />
        {Array.from({ length: 8 }).map((_, idx) => {
          const y = 142 - idx * 16;
          const w = 56 - idx * 4.2;
          const shift = Math.sin(idx * 0.7) * 8;
          return (
            <g key={idx}>
              <polygon
                points={`${160 - w + shift},${y} ${160 + w + shift},${y} ${160 + w * 0.85 - shift},${y - 14} ${160 - w * 0.85 - shift},${y - 14}`}
                fill={idx % 2 === 0 ? accentColor : secondaryColor}
                fillOpacity="0.2"
                stroke={idx % 2 === 0 ? accentColor : secondaryColor}
                strokeWidth="1.3"
              />
            </g>
          );
        })}
        <circle
          cx="160"
          cy="24"
          r="10"
          fill={secondaryColor}
          fillOpacity="0.4"
          stroke={accentColor}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // Default: stacked_glass or boardroom_holo
  return (
    <svg viewBox="0 0 320 180" className="w-full h-32 bg-slate-950 block">
      <polygon
        points="60,158 260,158 285,172 35,172"
        fill="#0F172A"
        stroke={accentColor}
        strokeWidth="1.2"
      />
      {/* Warm Vertical LED Cores */}
      <rect
        x="132"
        y="34"
        width="14"
        height="122"
        fill={secondaryColor}
        fillOpacity="0.75"
      />
      <rect
        x="174"
        y="26"
        width="14"
        height="130"
        fill={secondaryColor}
        fillOpacity="0.75"
      />
      {/* Cantilevered Horizontal Glass Slabs */}
      {Array.from({ length: 9 }).map((_, s) => {
        const y = 142 - s * 13;
        const offset = ((s % 3) - 1) * 9;
        const width = 116 - s * 4;
        return (
          <rect
            key={s}
            x={160 - width / 2 + offset}
            y={y}
            width={width}
            height="7"
            rx="1.5"
            fill={accentColor}
            fillOpacity="0.32"
            stroke={accentColor}
            strokeWidth="1.1"
          />
        );
      })}
    </svg>
  );
}

export const StudioExtensionsHub: React.FC<StudioExtensionsHubProps> = ({
  config,
  onUpdateConfig,
  onUpdatePalette,
  onApplyPresetPrompt,
  onNotify,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<
    ReferenceAssetItem['collection']
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedAsset, setInspectedAsset] = useState<ReferenceAssetItem | null>(null);

  const activeExtensions = config.activeExtensions || [
    'ext_pbr_glass_ior',
    'ext_led_slab_core',
    'ext_voronoi_lattice',
    'ext_gltf_draco',
  ];

  const toggleExtension = (extId: StudioExtensionId, extName: string) => {
    const exists = activeExtensions.includes(extId);
    const next = exists
      ? activeExtensions.filter((id) => id !== extId)
      : [...activeExtensions, extId];

    const partial: Partial<ARConfigState> = { activeExtensions: next };
    if (extId === 'ext_voronoi_lattice' && !exists) {
      partial.wireframeOverlay = true;
    }
    if (extId === 'ext_led_slab_core' && !exists) {
      partial.lightTemperatureK = 3100;
    }
    onUpdateConfig(partial);
    onNotify(
      exists
        ? `Wyłączono rozszerzenie: ${extName}`
        : `Aktywowano rozszerzenie: ${extName} w potoku renderowania 3D`
    );
  };

  const handleApplyAssetToStudio = (item: ReferenceAssetItem) => {
    onUpdateConfig({
      sceneId: item.targetSceneId,
      customSceneTitle: item.title,
      activeReferenceImageId: item.id,
      lightTemperatureK: item.lightTempK,
      towerHeightMultiplier: item.heightMult,
      explodedViewFactor: item.explodedFactor,
      activeExtensions: Array.from(
        new Set([...activeExtensions, ...item.recommendedExtensions])
      ),
      showSpatialAgents: true,
    });
    onUpdatePalette(item.targetPalette);
    onApplyPresetPrompt(item.promptPreset);
    onNotify(
      `Załadowano wzorzec „${item.title}” (${item.fileName}) na scenę 3D wraz z rozszerzeniami shaderów!`
    );
  };

  const filteredAssets = useMemo(() => {
    return UPLOADED_REFERENCE_GALLERY.filter((item) => {
      const matchesCat =
        selectedCollection === 'ALL' || item.collection === selectedCollection;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        item.specs.toLowerCase().includes(q) ||
        item.collectionLabel.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [selectedCollection, searchQuery]);

  const [savingAssetId, setSavingAssetId] = useState<string | null>(null);
  const [lastSavedDriveAsset, setLastSavedDriveAsset] = useState<DriveFileItem | null>(null);

  const handleSaveReferenceAssetToDrive = async (item: ReferenceAssetItem) => {
    if (savingAssetId) return;
    setSavingAssetId(item.id);
    try {
      const cleanName = item.fileName.split(',')[0].trim().replace(/\s+/g, '_');
      const finalFileName = cleanName.match(/\.(png|jpg|jpeg|webp)$/i)
        ? `HoloArch_${cleanName}`
        : `HoloArch_${cleanName}.png`;

      const uploaded = await saveImageToGoogleDrive({
        imageUrl: item.localUrl,
        proceduralCard: !item.localUrl
          ? {
              title: item.title,
              fileName: item.fileName,
              specs: item.specs,
              accentColor: item.accentColor,
              secondaryColor: item.secondaryColor,
            }
          : undefined,
        fileName: finalFileName,
        description: `HoloArch_AR_Studio Reference Asset: ${item.title} (${item.specs})`,
      });
      setLastSavedDriveAsset(uploaded);
      onNotify(`Zapisano obraz wzorcowy na Dysku Google: ${uploaded.name}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Nie udało się zapisać obrazu na Dysku Google.';
      onNotify(`Błąd zapisu na Dysku Google: ${msg}`);
    } finally {
      setSavingAssetId(null);
    }
  };

  return (
    <section id="extensions-gallery" className="space-y-8 pt-6 border-t border-slate-800/80">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono">
            <PackagePlus className="w-4 h-4" />
            <span>01B. BIBLIOTEKA 52 ZAŁĄCZONYCH OBRAZKÓW WZORCOWYCH & ROZSZERZENIA 3D/AR</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
            Galeria Obrazków Referencyjnych oraz Rozszerzenia Silnika (Shadery PBR, Voronoi, Hydro & CAD/BIM)
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Wszystkie przesłane obrazki referencyjne (makiety ze szlifowanego szkła{' '}
            <code className="text-cyan-300">glass1..34</code>, wieże bioniczne{' '}
            <code className="text-cyan-300">spirit.png / The Torch 325m</code>, rzeźba
            kinetycznego skrzydła <code className="text-cyan-300">-0.png</code> oraz
            hydro-kryształy <code className="text-cyan-300">0.jpg</code>) zostały zmapowane na
            nowe sceny 3D i rozszerzenia potoku Unity URP / Khronos glTF 2.0.
          </p>
        </div>

        {/* Direct Extension Format Quick Exporters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const res = exportProjectToGLTF(config);
              onNotify(
                `Wyeksportowano scenę 3D do formatu Khronos .GLTF 2.0 (${res.nodeCount} węzłów PBR Transmission)`
              );
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz .GLTF 2.0 (PBR Glass)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              exportProjectToIFC(config);
              onNotify(
                'Wyeksportowano strukturę kondygnacji do formatu BIM .IFC (ISO-10303-21 IFC4)'
              );
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg transition-colors"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Pobierz .IFC (BIM Level 400)</span>
          </button>
        </div>
      </div>

      {/* Part 1: 4 New 3D Scenes Quick-Switch Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            sceneId: 'crystal_stacked_prism' as ArchitecturalSceneId,
            badge: 'glass1..34.png · 50 Rise',
            title: '04. Makieta „Crystal Prism LED”',
            desc: 'Kaskadowe tafle ze szlifowanego szkła optycznego IOR 1.52 z ciepłym rdzeniem LED 2900K.',
            palette: 'amber_gold' as HologramPaletteId,
            color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
          },
          {
            sceneId: 'voronoi_bionic_spire' as ArchitecturalSceneId,
            badge: 'spirit.png · The Torch 325m',
            title: '05. Wieża „Voronoi Helix Spire”',
            desc: 'Skręcona helisa wysokościowa 325m z komórkowym egzoszkieletem bionicznym Voronoi.',
            palette: 'emerald_matrix' as HologramPaletteId,
            color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
          },
          {
            sceneId: 'kinetic_calatrava_wing' as ArchitecturalSceneId,
            badge: '-0.png · 67243a33.jpg',
            title: '06. Rzeźba „Aerodynamic Wing”',
            desc: 'Wachlarzowa struktura bionicznych żeber tytanowych w spirali logarytmicznej.',
            palette: 'platinum_arch' as HologramPaletteId,
            color: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
          },
          {
            sceneId: 'hydro_aqua_sculpture' as ArchitecturalSceneId,
            badge: '0.jpg · 97a6d95b · 923f4fd5',
            title: '07. Hydro-Rzeźba „Liquid Splash”',
            desc: 'Dynamiczny wir wodny w cylindrze szklanym i zawieszone w próżni krople 3D.',
            palette: 'cyan_blueprint' as HologramPaletteId,
            color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
          },
        ].map((card) => {
          const isCurrent = config.sceneId === card.sceneId;
          return (
            <div
              key={card.sceneId}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border ${card.color}`}
                  >
                    {card.badge}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Aktywna w 3D
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white">{card.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdateConfig({
                    sceneId: card.sceneId,
                    customSceneTitle: card.title,
                    showSpatialAgents: true,
                  });
                  onUpdatePalette(card.palette);
                  onNotify(`Przełączono symulator 3D na nową scenę: ${card.title}`);
                  const el = document.getElementById('simulator');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  isCurrent
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{isCurrent ? 'Widoczna na Scenie 3D ↑' : 'Aktywuj ten Model 3D ↑'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Part 2: Filterable Visual Reference Gallery (All Uploaded Images & Collections) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              <span>
                Katalog Załączonych Obrazków i Wzorców Architektonicznych (Kliknij, aby załadować do 3D)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Każdy obrazek posiada przypisany profil geometrii 3D, temperaturę barwową K, paletę
              shadera oraz gotowy prompt konstrukcyjny.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj pliku (np. spirit, glass1, 0.jpg)..."
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Wszystkie Kolekcje (52 pliki w 26 profilach)' },
            { id: 'GLASS_MAQUETTE', label: 'Makiety Szklane LED (glass1..34, 50 Rise)' },
            { id: 'VORONOI_TOWERS', label: 'Wieże Bioniczne Voronoi (spirit, The Torch)' },
            { id: 'KINETIC_AERO', label: 'Skrzydła Kinetyczne (-0.png, Seria 658)' },
            { id: 'HYDRO_CRYSTAL', label: 'Hydro-Rzeźby Wodne (0.jpg, 923f)' },
            { id: 'AR_BOARDROOM', label: 'Stoły Konferencyjne AR (100.png, IMG_1813..21)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setSelectedCollection(tab.id as ReferenceAssetItem['collection'])
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedCollection === tab.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                  : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {lastSavedDriveAsset && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Obraz zapisany na Dysku Google:{' '}
                <strong className="font-mono text-white">{lastSavedDriveAsset.name}</strong>
              </span>
            </div>
            {lastSavedDriveAsset.webViewLink && (
              <a
                href={lastSavedDriveAsset.webViewLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold"
              >
                <span>Otwórz w Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((item) => {
            const isSelected = config.activeReferenceImageId === item.id;
            return (
              <div
                key={item.id}
                className={`group rounded-xl overflow-hidden border flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/90 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Image or High-DPI Procedural Blueprint Preview */}
                  <div className="relative h-32 w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
                    {item.localUrl ? (
                      <img
                        src={item.localUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      renderProceduralPreviewSVG(item)
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-[10px] font-mono text-cyan-300">
                      {item.collectionLabel}
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedAsset(item)}
                      className="absolute top-2 right-2 p-1.5 rounded bg-slate-950/85 hover:bg-slate-900 text-slate-200 border border-slate-700/80"
                      title="Podgląd szczegółów i promptu wzorca"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="text-[11px] font-mono text-amber-400 truncate" title={item.fileName}>
                      {item.fileName}
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug line-clamp-2">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">{item.specs}</p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-3 pt-0 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyAssetToStudio(item)}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Aktywny w 3D' : 'Załaduj do 3D'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveReferenceAssetToDrive(item)}
                    disabled={savingAssetId === item.id}
                    className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-colors flex items-center gap-1 shrink-0 disabled:opacity-50"
                    title="Zapisz ten obraz wzorcowy bezpośrednio na swoim Dysku Google"
                  >
                    {savingAssetId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Drive</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Drawer for Inspected Reference Asset */}
      {inspectedAsset && (
        <div className="bg-slate-900 border border-cyan-500/50 rounded-xl p-5 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-mono text-cyan-400">
                Szczegóły załączonego wzorca: {inspectedAsset.fileName}
              </span>
              <h4 className="text-lg font-bold text-white">{inspectedAsset.title}</h4>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveReferenceAssetToDrive(inspectedAsset)}
                disabled={savingAssetId === inspectedAsset.id}
                className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingAssetId === inspectedAsset.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                <span>Zapisz Obraz na Dysku Google</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyAssetToStudio(inspectedAsset);
                  setInspectedAsset(null);
                }}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg"
              >
                Zastosuj na Scenie 3D
              </button>
              <button
                type="button"
                onClick={() => setInspectedAsset(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
              >
                Zamknij
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-4 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
              {inspectedAsset.localUrl ? (
                <img
                  src={inspectedAsset.localUrl}
                  alt={inspectedAsset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                />
              ) : (
                renderProceduralPreviewSVG(inspectedAsset)
              )}
            </div>
            <div className="md:col-span-8 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Docelowa Scena 3D:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {inspectedAsset.targetSceneId}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Temperatura Światła:</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {inspectedAsset.lightTempK} K
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Skala Wysokości / Warstwy:</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {inspectedAsset.heightMult}x / {(inspectedAsset.explodedFactor * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium block">
                  Przypisany Prompt Architektoniczny AI:
                </span>
                <p className="text-slate-200 font-mono leading-relaxed">
                  {inspectedAsset.promptPreset}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part 3: System Extensions & Shader/CAD Plugins Manager */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span>
                Menedżer Rozszerzeń Systemowych Unity 6 URP, Shaderów PBR i Eksporterów CAD/BIM
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Włącz lub wyłącz dedykowane rozszerzenia silnika. Aktywne wtyczki natychmiast
              aktualizują render 3D oraz dołączają pakiety C# / ShaderGraph do specyfikacji.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 shrink-0">
            Aktywne rozszerzenia: {activeExtensions.length} / {STUDIO_EXTENSIONS_CATALOG.length}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STUDIO_EXTENSIONS_CATALOG.map((ext) => {
            const isEnabled = activeExtensions.includes(ext.id);
            return (
              <div
                key={ext.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isEnabled
                    ? 'bg-slate-950/95 border-cyan-500/50'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-cyan-300">
                      {ext.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{ext.version}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {ext.name}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{ext.description}</p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 truncate">
                    <Code2 className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{ext.unityPackage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExtension(ext.id, ext.name)}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      isEnabled
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Rozszerzenie Aktywne</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Włącz Rozszerzenie</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
