export type ArchitecturalSceneId =
  | 'skyline_financial'
  | 'eco_atrium'
  | 'aero_hub'
  | 'crystal_stacked_prism'
  | 'voronoi_bionic_spire'
  | 'kinetic_calatrava_wing'
  | 'hydro_aqua_sculpture';

export type HologramPaletteId = 'cyan_blueprint' | 'amber_gold' | 'emerald_matrix' | 'platinum_arch';

export type PromptCategory = 'master_system' | 'unity_csharp' | 'visual_midjourney' | 'architecture_spec';

export type AgentNavMode = 'lidar_orbit' | 'facade_scan' | 'floor_patrol';

export type DroneLandscapeId =
  | 'alpine_peaks'
  | 'cosmic_orbital'
  | 'metropolis_dawn'
  | 'ocean_wellness'
  | 'executive_boardroom';

export type CompositionGridMode =
  | 'golden_ratio'
  | 'perspective_rays'
  | 'rule_of_thirds'
  | 'depth_planes'
  | 'none';

export type MixerDialTarget =
  | 'scale_size'
  | 'levels_exploded'
  | 'perspective_fov'
  | 'drone_altitude';

export type StudioExtensionId =
  | 'ext_pbr_glass_ior'
  | 'ext_voronoi_lattice'
  | 'ext_kinetic_ribs'
  | 'ext_hydro_refraction'
  | 'ext_led_slab_core'
  | 'ext_bim_ifc400'
  | 'ext_usdz_visionos'
  | 'ext_gltf_draco';

export interface ARConfigState {
  sceneId: ArchitecturalSceneId;
  customSceneTitle?: string;
  activeReferenceImageId?: string;
  activeExtensions?: StudioExtensionId[];
  framework: 'unity_arfoundation' | 'arkit_native' | 'arcore_native';
  planeDetectionMode: 'table_and_floor' | 'table_only' | 'full_spatial';
  depthSensorActive: boolean;
  environmentalLighting: boolean;
  lightTemperatureK: number; // 2800 - 6500
  occlusionEnabled: boolean;
  parallaxIntensity: number; // 0 to 1
  windowParticlesIntensity: number; // 0 to 1
  modelScale: number; // 0.4 to 2.2
  towerHeightMultiplier: number; // 0.6 to 1.8
  modelRotationY: number; // degrees
  explodedViewFactor: number; // 0 to 1
  wireframeOverlay: boolean;
  autoRotate: boolean;
  showSpatialAgents: boolean;
  agentNavMode: AgentNavMode;
  activeAgentsCount: number; // 2 to 6
  // New Deep Parallax, Perspective, Composition & Drone Hobbyist Workspace fields
  perspectiveFovDeg: number; // 28 (Telephoto) to 85 (Ultra-Wide Perspective)
  workspaceMarginPx: number; // 12 to 48 px framed margin
  compositionGrid: CompositionGridMode;
  depthOfFieldIntensity: number; // 0 to 1
  horizonOffsetY: number; // -0.25 to +0.25
  droneFlightActive: boolean;
  droneSpeed: number; // 0.1 to 2.0
  droneAltitudeM: number; // 120 to 2400
  droneLandscape: DroneLandscapeId;
  hobbyAssemblyStep: number; // 1 to 12 (Kitbash model gluing/assembly stages)
  hobbyBlueprintConnectors: boolean;
  safeClickSoundEnabled: boolean;
  gyroPitchDeg: number;
  gyroRollDeg: number;
  offlineModeEnabled: boolean;
  cloudSyncEnabled: boolean;
  exportFormats: {
    obj: boolean;
    stl: boolean;
    ply?: boolean;
    pdf: boolean;
    gltf?: boolean;
    usdz?: boolean;
    ifc?: boolean;
  };
  uiSettings: {
    palette: HologramPaletteId;
    hudDensity: 'compact' | 'detailed';
    showPlaneGrid: boolean;
    showFloatingPanels: boolean;
    promptLanguage: 'pl' | 'en';
  };
}

export interface ArchitecturalSceneMeta {
  id: ArchitecturalSceneId;
  name: string;
  subtitle: string;
  architecturalStyle: string;
  realWorldHeightM: number;
  footprintSqm: number;
  partsCount: number;
  verticesEstimate: number;
  layers: string[];
  description: string;
}

export interface SupportedDevice {
  id: string;
  brand: string;
  model: string;
  formFactor: 'Smartfon Android' | 'Tablet Android' | 'Urządzenie iOS (Referencyjne)';
  osVersion: string;
  arCoreOrKitSupport: string;
  depthSensor: string;
  planeDetectionAccuracy: string;
  occlusionSupport: 'Sprzętowa (ToF / LiDAR)' | 'Programowa (ARCore Depth API)';
  targetFps: number;
  fpsSamples: number[]; // 12-point AR session frame rate profile
  fpsStabilityPercent: number; // e.g. 99.2%
  fps1PercentLow: number; // 1% Low FPS during heavy mesh occlusion
  verified: boolean;
}

export interface CapturedScreenshot {
  id: string;
  title: string;
  sceneName: string;
  timestamp: string;
  dataUrl: string;
  resolution: string;
}

export interface SavedCloudProject {
  id: string;
  name: string;
  updatedAt: string;
  syncStatus: 'Zsynchronizowano w chmurze' | 'Zapisano lokalnie (Offline)';
  config: ARConfigState;
}
