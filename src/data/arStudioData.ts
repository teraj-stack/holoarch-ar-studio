import {
  ARConfigState,
  ArchitecturalSceneMeta,
  HologramPaletteId,
  SupportedDevice,
} from '../types/arStudio';

export const HOLOGRAM_PALETTES: Record<
  HologramPaletteId,
  {
    name: string;
    primaryHex: string;
    secondaryHex: string;
    gridHex: string;
    badgeBg: string;
    accentText: string;
  }
> = {
  cyan_blueprint: {
    name: 'Cyan Blueprint (Standard AR)',
    primaryHex: '#06B6D4',
    secondaryHex: '#F59E0B',
    gridHex: '#0EA5E9',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    accentText: 'text-cyan-400',
  },
  amber_gold: {
    name: 'Złoty Bursztyn (Sunset Executive)',
    primaryHex: '#F59E0B',
    secondaryHex: '#38BDF8',
    gridHex: '#D97706',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    accentText: 'text-amber-400',
  },
  emerald_matrix: {
    name: 'Szmaragdowy LiDAR (CAD Scan)',
    primaryHex: '#10B981',
    secondaryHex: '#06B6D4',
    gridHex: '#059669',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    accentText: 'text-emerald-400',
  },
  platinum_arch: {
    name: 'Platynowy Monolit (White BIM)',
    primaryHex: '#E2E8F0',
    secondaryHex: '#38BDF8',
    gridHex: '#94A3B8',
    badgeBg: 'bg-slate-200/15 text-slate-200 border-slate-400/30',
    accentText: 'text-slate-200',
  },
};

export const ARCHITECTURAL_SCENES: ArchitecturalSceneMeta[] = [
  {
    id: 'skyline_financial',
    name: '01. Kompleks Finansowy „Skyline Core”',
    subtitle: 'Zespół wysokościowców z diagridem konstrukcyjnym i podium wielofunkcyjnym',
    architecturalStyle: 'High-Tech / Supertall Parametric Glass',
    realWorldHeightM: 342,
    footprintSqm: 48500,
    partsCount: 11,
    verticesEstimate: 18420,
    layers: [
      'Płyta fundamentowa i siatka geodezyjna blatu',
      'Trzon żelbetowy i komunikacja pionowa',
      'Fasada kurtynowa z podziałem szprosowym (Diagrid)',
      'Mosty powietrzne (Skybridges) i iglica telekomunikacyjna',
    ],
    description:
      'Wieloczęściowy hologram zespołu wieżowców inspirowany wizualizacją stołu konferencyjnego. Zawiera centralną dominantę wysokościową z uskokami (setbacks), cztery wieże satelitarne, przewiązki napowietrzne oraz podświetlaną mapę globalnej sieci na blacie.',
  },
  {
    id: 'eco_atrium',
    name: '02. Kampus Bioklimatyczny „Eco-Atrium”',
    subtitle: 'Tarasowy kompleks badawczy z centralną kopułą geodezyjną i żaluzjami solarnymi',
    architecturalStyle: 'Biophilic Sustainable Brutalism & Glass',
    realWorldHeightM: 128,
    footprintSqm: 64000,
    partsCount: 9,
    verticesEstimate: 15680,
    layers: [
      'Podziemne atrium i obrys płaszczyzny podłogi',
      'Pierścienie konstrukcyjne i trzony klatek',
      'Kopuła bioklimatyczna i przeszklone tarasy kaskadowe',
      'Dynamiczne łamacze światła (Brise-soleil) i panele PV',
    ],
    description:
      'Holograficzny model zrównoważonego kampusu technologicznego. Zaprojektowany do prezentacji na dużych blatach konferencyjnych oraz bezpośrednio w skali 1:20 na powierzchni podłogi z pełną okluzją środowiskową.',
  },
  {
    id: 'aero_hub',
    name: '03. Terminal Multimodalny „AeroHub”',
    subtitle: 'Rozpiętościowa konstrukcja łupinowa z kratownicami dachowymi i wieżą kontroli',
    architecturalStyle: 'Structural Expressionism / Parametric Shell',
    realWorldHeightM: 86,
    footprintSqm: 112000,
    partsCount: 10,
    verticesEstimate: 21340,
    layers: [
      'Płyta peronowa i korytarze kolei dużych prędkości',
      'Filary podporowe V-kształtne i rdzenie komunikacyjne',
      'Hala główna odpraw z fasadą akustyczną',
      'Wielkoprzestrzenne przekrycie dachowe i wieża nawigacyjna',
    ],
    description:
      'Model inżynieryjny węzła przesiadkowego z widoczną strukturą kratownic dachowych, peronami podziemnymi i aerodynamicznym zadaszeniem. Idealny do testowania efektu paralaksy 6DoF oraz eksportu siatki do formatów OBJ i STL.',
  },
  {
    id: 'crystal_stacked_prism',
    name: '04. Makieta Warstwowa „Crystal Prism LED”',
    subtitle: 'Wspornikowa makieta ze szlifowanego szkła optycznego i ciepłych kolumn świetlnych LED',
    architecturalStyle: 'Refractive Acrylic & Cantilevered Glass Slabs (IOR 1.52)',
    realWorldHeightM: 215,
    footprintSqm: 38400,
    partsCount: 12,
    verticesEstimate: 24600,
    layers: [
      'Czarny postument gablotowy z podświetleniem obwodowym',
      'Ciepłe trzony świetlne LED (2900K) i kolumny nośne',
      'Kaskadowe tafle ze szlifowanego szkła akrylowego z fazowaniem',
      'Wspornikowe tarasy widokowe i świetlik dachowy Prism',
    ],
    description:
      'Bezpośrednie odwzorowanie załączonych fotografii fizycznych makiet architektonicznych ze szkła warstwowego (glass1.png, glass2.png, 50 Rise Tower). Łączy krystalicznie przezroczyste płyty stropowe z ciepłym bursztynowym rdzeniem LED.',
  },
  {
    id: 'voronoi_bionic_spire',
    name: '05. Wieża Bioniczna „Voronoi Helix Spire”',
    subtitle: 'Parametryczny egzoszkielet komórkowy Voronoi ze skręconą helisą aerodynamiczną',
    architecturalStyle: 'Parametric Bionic Voronoi & Twisted Diagrid',
    realWorldHeightM: 325,
    footprintSqm: 42000,
    partsCount: 11,
    verticesEstimate: 31200,
    layers: [
      'Organiczna baza korzeniowa i pierścień kotwiący AR',
      'Skręcony trzon helikalny (The Torch / Spirala 325m)',
      'Komórkowy egzoszkielet Voronoi o zmiennej gęstości oczek',
      'Korona obserwacyjna z podwójną wstęgą Mobiusa i iglicą',
    ],
    description:
      'Zainspirowana załączonymi wizualizacjami parametrycznych wieżowców (The Torch NY 325m, Tashkent City, struktury bioniczne Voronoi). Idealna do prezentacji złożonych siatek 3D oraz skanowania elewacji przez agentów AG-01..AG-06.',
  },
  {
    id: 'kinetic_calatrava_wing',
    name: '06. Rzeźba Kinetyczna „Aerodynamic Wing”',
    subtitle: 'Wachlarzowa struktura bionicznych żeber tytanowych w spirali logarytmicznej',
    architecturalStyle: 'Kinetic Sculptural Expressionism & Brushed Titanium',
    realWorldHeightM: 64,
    footprintSqm: 19500,
    partsCount: 12,
    verticesEstimate: 28900,
    layers: [
      'Ciężka baza z ciemnego szczotkowanego tytanu na blacie',
      'Wygięty łukowo kręgosłup konstrukcyjny (Cantilever Spine)',
      'Sekwencja 18 aerodynamicznych piór/żeber w układzie wachlarzowym',
      'Szczytowe pióra stabilizujące z refleksami krawędziowymi',
    ],
    description:
      'Wierna rekonstrukcja 3D załączonych fotografii rzeźby kinetycznego skrzydła (-0.png, 67243a334ef658da6dda9b7adeabd8e0.jpg). Każde żebro obraca się ze stopniowym przesunięciem fazowym, tworząc hipnotyzującą bryłę w przestrzeni AR.',
  },
  {
    id: 'hydro_aqua_sculpture',
    name: '07. Hydro-Rzeźba „Liquid Crystal Splash”',
    subtitle: 'Dynamiczna kompozycja płynnego szkła, zamrożonej fali i zawieszonych kropel w 6DoF',
    architecturalStyle: 'Fluid Dynamics / Refractive Aqua Sculpture (IOR 1.333)',
    realWorldHeightM: 48,
    footprintSqm: 14200,
    partsCount: 12,
    verticesEstimate: 34800,
    layers: [
      'Cylindryczne naczynie krystaliczne z taflą wody i bąbelkami powietrza',
      'Dynamiczny trzon wodny wznoszący się z wiru (Hydro Vortex)',
      'Rozpostarte ramiona fali i korona rozbryzgu (Splash Crest)',
      'Zawieszone w próżni sferyczne krople refrakcyjne 3D',
    ],
    description:
      'Trójwymiarowa interpretacja załączonych obrazów wodnych i szklanych rzeźb (0.jpg, 97a6d95b, 923f4fd5). Wykorzystuje zaawansowany shader refrakcji wodnej, zawieszone w przestrzeni sfery kropel oraz efekt paralaksy 6DoF.',
  },
];

export const SUPPORTED_MOBILE_DEVICES: SupportedDevice[] = [
  {
    id: 's24-ultra',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra / S23 Ultra',
    formFactor: 'Smartfon Android',
    osVersion: 'Android 14 (One UI 6.1)',
    arCoreOrKitSupport: 'ARCore 1.44 + Raw Depth API',
    depthSensor: 'Laser AF + Dual Pixel Depth Map',
    planeDetectionAccuracy: '±1.2 mm (Blat i Podłoga)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 120,
    fpsSamples: [119, 120, 120, 118, 120, 119, 117, 120, 120, 119, 120, 120],
    fpsStabilityPercent: 99.1,
    fps1PercentLow: 116,
    verified: true,
  },
  {
    id: 'tab-s9-ultra',
    brand: 'Samsung',
    model: 'Galaxy Tab S9 Ultra / S9+ (14.6" AMOLED)',
    formFactor: 'Tablet Android',
    osVersion: 'Android 14 (One UI 6.1)',
    arCoreOrKitSupport: 'ARCore 1.44 + Environmental HDR',
    depthSensor: 'Dual Camera Stereo Depth + IMU 6DoF',
    planeDetectionAccuracy: '±1.5 mm (Duże płaszczyzny stołów)',
    occlusionSupport: 'Programowa (ARCore Depth API)',
    targetFps: 120,
    fpsSamples: [118, 119, 120, 116, 118, 120, 115, 119, 120, 118, 119, 120],
    fpsStabilityPercent: 98.4,
    fps1PercentLow: 113,
    verified: true,
  },
  {
    id: 'pixel-9-pro',
    brand: 'Google',
    model: 'Pixel 9 Pro XL / Pixel 8 Pro',
    formFactor: 'Smartfon Android',
    osVersion: 'Android 15',
    arCoreOrKitSupport: 'ARCore Native + Geospatial & Scene Semantics',
    depthSensor: 'Multi-zone Laser Detect + Tensor G4 Depth',
    planeDetectionAccuracy: '±1.0 mm (Najwyższa precyzja ARCore)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 120,
    fpsSamples: [120, 120, 119, 120, 120, 118, 120, 119, 120, 120, 119, 120],
    fpsStabilityPercent: 99.5,
    fps1PercentLow: 118,
    verified: true,
  },
  {
    id: 'xiaomi-14-ultra',
    brand: 'Xiaomi',
    model: 'Xiaomi 14 Ultra / 14 Pro',
    formFactor: 'Smartfon Android',
    osVersion: 'Android 14 (HyperOS)',
    arCoreOrKitSupport: 'ARCore 1.43 + Light Estimation HDR',
    depthSensor: 'dToF (Direct Time-of-Flight) 3D Laser',
    planeDetectionAccuracy: '±1.3 mm (Szybkie wykrywanie szkła i drewna)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 90,
    fpsSamples: [90, 89, 90, 88, 90, 89, 86, 89, 90, 90, 88, 90],
    fpsStabilityPercent: 98.2,
    fps1PercentLow: 85,
    verified: true,
  },
  {
    id: 'oneplus-pad-2',
    brand: 'OnePlus',
    model: 'OnePlus Pad 2 (Snapdragon 8 Gen 3)',
    formFactor: 'Tablet Android',
    osVersion: 'Android 14 (OxygenOS 14)',
    arCoreOrKitSupport: 'ARCore 1.44 + Plane Boundary Polygon',
    depthSensor: 'AI Stereo Depth Engine',
    planeDetectionAccuracy: '±2.0 mm (Prezentacje makiet na stołach)',
    occlusionSupport: 'Programowa (ARCore Depth API)',
    targetFps: 120,
    fpsSamples: [117, 119, 118, 114, 117, 119, 112, 116, 119, 118, 117, 119],
    fpsStabilityPercent: 97.6,
    fps1PercentLow: 110,
    verified: true,
  },
  {
    id: 'lenovo-tab-p12-pro',
    brand: 'Lenovo',
    model: 'Tab P12 Pro / Legion Tab',
    formFactor: 'Tablet Android',
    osVersion: 'Android 13 / 14 (ZUI)',
    arCoreOrKitSupport: 'ARCore + ToF Anti-Drift Anchors',
    depthSensor: 'Czujnik głębi ToF (Time-of-Flight)',
    planeDetectionAccuracy: '±1.6 mm (Stabilne kotwiczenie podłogowe)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 90,
    fpsSamples: [89, 90, 88, 87, 89, 90, 84, 88, 89, 90, 88, 89],
    fpsStabilityPercent: 97.8,
    fps1PercentLow: 83,
    verified: true,
  },
  {
    id: 'sony-xperia-1-vi',
    brand: 'Sony',
    model: 'Xperia 1 VI / 1 V',
    formFactor: 'Smartfon Android',
    osVersion: 'Android 14',
    arCoreOrKitSupport: 'ARCore + 3D iToF Sensor Integration',
    depthSensor: 'dedykowany sensor 3D iToF',
    planeDetectionAccuracy: '±1.1 mm (Rozpoznawanie krawędzi mebli)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 120,
    fpsSamples: [120, 119, 120, 119, 118, 120, 117, 119, 120, 120, 119, 120],
    fpsStabilityPercent: 99.0,
    fps1PercentLow: 115,
    verified: true,
  },
  {
    id: 'ipad-pro-m4',
    brand: 'Apple',
    model: 'iPad Pro 13" (M4) / iPhone 16 Pro Max',
    formFactor: 'Urządzenie iOS (Referencyjne)',
    osVersion: 'iPadOS 18 / iOS 18',
    arCoreOrKitSupport: 'ARKit 6 + Scene Reconstruction Mesh',
    depthSensor: 'Skaner LiDAR dToF (Direct Time-of-Flight)',
    planeDetectionAccuracy: '±0.8 mm (Siatka topologiczna w czasie rzeczywistym)',
    occlusionSupport: 'Sprzętowa (ToF / LiDAR)',
    targetFps: 120,
    fpsSamples: [120, 120, 120, 119, 120, 120, 119, 120, 120, 120, 120, 120],
    fpsStabilityPercent: 99.8,
    fps1PercentLow: 119,
    verified: true,
  },
];

export function generateMasterPrompt(config: ARConfigState): {
  title: string;
  systemPromptPL: string;
  systemPromptEN: string;
  visualPromptEN: string;
  unityCSharpCode: string;
} {
  const sceneMeta =
    ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId) || ARCHITECTURAL_SCENES[0];
  const frameworkLabel =
    config.framework === 'unity_arfoundation'
      ? 'Unity 6 (AR Foundation 6.0 + XR Interaction Toolkit z jednoczesnym wsparciem ARCore i ARKit)'
      : config.framework === 'arcore_native'
      ? 'Unity 6 + Google ARCore Extensions (Android Native Depth & Plane API)'
      : 'Unity 6 + Apple ARKit XR Plugin (LiDAR Scene Mesh & Plane Detection)';

  const planeModeLabel =
    config.planeDetectionMode === 'table_and_floor'
      ? 'Rozpoznawanie płaszczyzn poziomych blatu stołu (Tabletop) oraz podłogi (Floor) za pomocą czujników głębi ToF/LiDAR i ARPlaneManager'
      : config.planeDetectionMode === 'table_only'
      ? 'Precyzyjne wykrywanie powierzchni poziomych podwyższonych (blaty stołów konferencyjnych i biurek)'
      : 'Pełne skanowanie przestrzenne 3D (Blaty, Podłogi, Ściany oraz ramy okienne pomieszczenia)';

  const systemPromptPL = `### ROLA I CEL ZADANIA
Jesteś Starszym Architektem Systemów XR/AR oraz Głównym Inżynierem Unity 3D. Twoim zadaniem jest zaprojektowanie i wdrożenie kompletnej aplikacji rozszerzonej rzeczywistości (AR) prezentującej w czasie rzeczywistym hologramowe modele budynków z pełnymi detalami architektonicznymi ("${sceneMeta.name}"), osadzane precyzyjnie na powierzchniach blatów stołów oraz podłóg.

---

### 1. SILNIK, FRAMEWORKI AR I DETEKCJA POWIERZCHNI (CZUJNIKI GŁĘBI)
- **Silnik i SDK**: ${frameworkLabel}, potok renderowania **Universal Render Pipeline (URP)** zoptymalizowany pod urządzenia mobilne (${config.modelScale.toFixed(2)}x skala bazowa).
- **Wykrywanie powierzchni i czujniki głębi**:
  - Skonfiguruj \`ARPlaneManager\` (tryb: \`PlaneDetectionMode.Horizontal\`) oraz \`ARRaycastManager\` wspierany przez dane z czujnika głębi (\`AROcclusionManager\` / ARCore Depth API / LiDAR).
  - **Zakres rozpoznawania**: ${planeModeLabel}.
  - Rozróżniaj semantycznie poziom podłogi (\`PlaneClassification.Floor\`) od powierzchni blatu stołu (\`PlaneClassification.Table\`) na podstawie wysokości względnej względem kamery oraz obrysu poligonu \`ARPlane.boundary\`.
  - Wyświetlaj subtelną siatkę kalibracyjną (Holographic Grid Shader) podczas skanowania i automatycznie kotwicz (\`ARAnchorManager\`) model budynku po zatwierdzeniu pozycji.

### 2. HOLOGRAFICZNE MODELE BUDYNKÓW, OŚWIETLENIE ŚRODOWISKOWE I OKLUZJA
- **Detale architektoniczne w czasie rzeczywistym**:
  - Model docelowy: **${sceneMeta.name}** (${sceneMeta.architecturalStyle}, ${sceneMeta.partsCount} modułów konstrukcyjnych, ok. ${sceneMeta.verticesEstimate} wierzchołków).
  - Zastosuj autorski shader w **Unity Shader Graph** (Fresnel Rim Glow + Scanline + Vertex Wireframe Overlay + Additive Transparency) z obsługą przekrojów architektonicznych i rozstrzelenia warstw (Exploded View = ${(config.explodedViewFactor * 100).toFixed(0)}%).
- **Oświetlenie środowiskowe (Environmental Lighting)**:
  - Status: **${config.environmentalLighting ? 'AKTYWNE (ARCameraManager Light Estimation)' : 'Statyczne studyjne'}** (Temperatura barwowa otoczenia: **${config.lightTemperatureK}K**).
  - Odczytuj w czasie rzeczywistym \`args.lightEstimation.averageBrightness\`, \`averageColorTemperature\` oraz \`mainLightDirection\` + \`ambientSphericalHarmonics\`, dynamicznie modulując intensywność odbić na szklanych fasadach hologramu oraz miękkie cienie kontaktowe na blacie.
- **Okluzja głębi (Real-Time Depth Occlusion)**:
  - Status: **${config.occlusionEnabled ? 'WŁĄCZONA (EnvironmentDepthMode.Best + HumanStencil)' : 'Wyłączona'}**.
  - Obiekty fizyczne na stole (np. kubek, laptop, dłonie użytkownika) oraz krawędzie mebli znajdujące się bliżej kamery niż hologram muszą prawidłowo przysłaniać wirtualne budynki na podstawie mapy głębi z czujnika ToF/ARCore Depth API.

### 3. EFEKT PARALAKSY 6DoF I DYNAMICZNE CZĄSTECZKI ZA OKNAMI POMIESZCZENIA
- **Paralaksa głębi obrazu (Intensity: ${(config.parallaxIntensity * 100).toFixed(0)}%)**:
  - Wykorzystaj dane śledzenia 6DoF kamery (\`ARCamera\`) oraz żyroskopu urządzenia, aby wygenerować wielowarstwową paralaksę pomiędzy:
    1) Podświetloną mapą wektorową wewnątrz blatu stołu (warstwa głęboka),
    2) Trójwymiarową bryłą architektoniczną z wewnętrznym rdzeniem konstrukcyjnym (warstwa środkowa),
    3) Zawieszonymi w przestrzeni tablicami telemetrycznymi HUD (warstwa bliższa).
- **Dynamiczne efekty cząsteczkowe za oknami i wewnątrz sceny (Intensity: ${(config.windowParticlesIntensity * 100).toFixed(0)}%)**:
  - Wykorzystaj **Unity VFX Graph / Particle System** z kolizją płaszczyzn.
  - Za oknami pomieszczenia (wykrytymi przez pionowe płaszczyzny lub maskę głębi dalekiego planu) generuj dynamiczne smugi świetlne zachodu słońca i atmosferyczny pył miejski, a bezpośrednio wokół hologramu budynku unoszące się cząsteczki strumieni danych (Data Motes).

### 4. INTUICYJNE STEROWANIE DOTYKOWE, ANIMACJE PRZEJŚĆ I ZRZUTY EKRANU
- **Gesty dotykowe (Touch Input - EnhancedTouch API)**:
  - **Pinch-to-Scale (2 palce)**: Płynne skalowanie makiety w zakresie \`0.25x – 2.50x\` z zachowaniem punktu zakotwiczenia na blacie/podłodze.
  - **One/Two-Finger Twist & Drag**: Obrót modelu wokół osi Y (aktualnie \`${config.modelRotationY}°\`) z tłumieniem wykładniczym (\`Mathf.SmoothDamp\`).
- **Płynne animacje przejść między scenami 3D**:
  - Przy przełączaniu pomiędzy scenami (Kompleks Finansowy <-> Kampus Eco-Atrium <-> Terminal AeroHub) zastosuj sekwencję przejścia opartą na krzywych Beziera: zeskalowanie i rozproszenie cząsteczkowe bieżącej makiety (Dissolve Shader) oraz płynne wyłonienie nowego modelu z powierzchni blatu w czasie \`650 ms\`.
- **Zapis zrzutów ekranu do galerii urządzenia**:
  - Zaimplementuj przechwyt klatki \`ScreenCapture.CaptureScreenshotAsTexture()\` (z opcją ukrycia interfejsu UI przed renderem) i zapis bezpośrednio do natywnej galerii systemowej Android (\`MediaStore.Images.Media\`) oraz iOS (\`PHPhotoLibrary\`).

### 5. TRYB OFFLINE, SYNCHRONIZACJA W CHMURZE ORAZ EKSPORT (OBJ, STL, PDF)
- **Tryb Offline (${config.offlineModeEnabled ? 'WŁĄCZONY' : 'Opcjonalny'})**:
  - Wszystkie siatki 3D, shadery oraz konfiguracje scen przechowuj w lokalnej pamięci podręcznej (\`Application.persistentDataPath\` + SQLite/JSON). Aplikacja musi działać w 100% bez dostępu do sieci.
- **Moduł Chmury (${config.cloudSyncEnabled ? 'AKTYWNY' : 'Opcjonalny'})**:
  - Asynchroniczna synchronizacja projektów, kotwic przestrzennych (Cloud Anchors) i ustawień personalizacji pomiędzy smartfonem a tabletem użytkownika po wykryciu połączenia (Conflict-free Replicated Data State).
- **Eksport plików inżynierskich i dokumentacji**:
  - **Format .OBJ (Wavefront)**: Eksport pełnej siatki wielokątów (\`v\`, \`vn\`, \`vt\`, \`f\`) z podziałem na grupy konstrukcyjne budynku.
  - **Format .STL (Stereolithography)**: Eksport zamkniętej bryły trójkątów (ASCII/Binary STL) gotowej do druku 3D makiety architektonicznej.
  - **Zaawansowany eksport .PDF**: Generowanie wielostronicowego raportu PDF zawierającego zrzut widoku AR, parametry techniczne budynku, rzut warstw oraz specyfikację urządzenia.

### 6. MENU PERSONALIZACJI INTERFEJSU I WSPIERANE URZĄDZENIA MOBILNE
- **Personalizacja UI**: Wybór palety barwnej hologramu (aktualnie: *${HOLOGRAM_PALETTES[config.uiSettings.palette].name}*), gęstości paneli HUD (${config.uiSettings.hudDensity}), widoczności siatki LiDAR oraz języka dokumentacji.
- **Wspierane urządzenia mobilne (Smartfony i Tablety Android + iOS)**:
  - *Smartfony Android*: Samsung Galaxy S24/S23 Ultra, Google Pixel 9/8 Pro, Xiaomi 14 Ultra/Pro, Sony Xperia 1 VI (pełne wsparcie ARCore Depth API + ToF 120 FPS).
  - *Tablety Android*: Samsung Galaxy Tab S9 Ultra / S9+, OnePlus Pad 2, Lenovo Tab P12 Pro (optymalizacja pod duże ekrany 12"–14.6" do prezentacji przy stole konferencyjnym).`;

  const systemPromptEN = `### ROLE & OBJECTIVE
Act as a Principal XR/AR Systems Architect and Lead Unity 3D Developer. Design and implement a real-time Augmented Reality (AR) Architectural Hologram Application rendering high-detail building complexes ("${sceneMeta.name}") anchored accurately onto physical tabletops and floors.

### 1. ENGINE, AR FRAMEWORKS & DEPTH SENSOR PLANE DETECTION
- **Engine & SDK**: ${frameworkLabel} using Universal Render Pipeline (URP).
- **Surface Plane Recognition**: Use \`ARPlaneManager\` (Horizontal Tabletop & Floor classification) and \`ARRaycastManager\` fused with hardware Time-of-Flight (ToF) / LiDAR depth sensors via \`AROcclusionManager\`.
- **Environmental Lighting & Occlusion**: Enable HDR Light Estimation (\`${config.lightTemperatureK}K\` ambient adaptation, directional shadows) and real-time per-pixel depth occlusion (\`EnvironmentDepthMode.Best\`).

### 2. 6DoF PARALLAX, WINDOW PARTICLES & TOUCH CONTROLS
- **Parallax Depth (${(config.parallaxIntensity * 100).toFixed(0)}%)**: Multi-plane 6DoF parallax between the recessed tabletop world-map projection, the multi-layered 3D architectural hologram, and floating spatial telemetry cards.
- **Dynamic Window & Scene Particles (${(config.windowParticlesIntensity * 100).toFixed(0)}%)**: Volumetric atmospheric dust motes and sunset light shafts rendered behind detected room window planes using Unity VFX Graph, plus rising data particles around the towers.
- **Touch Gestures**: Two-finger pinch-to-scale (0.25x–2.50x) and single/two-finger twist rotation with exponential smoothing (\`Mathf.SmoothDamp\`).
- **Smooth 3D Scene Transitions**: Animated holographic dissolve and vertical emergence transitions between architectural scenes.

### 3. NATIVE GALLERY SCREENSHOTS, OFFLINE/CLOUD SYNC & OBJ/STL/PDF EXPORT
- **Direct Gallery Save**: Capture clean high-DPI frames directly into Android \`MediaStore\` / iOS \`PHPhotoLibrary\`.
- **Offline-First + Cloud Sync**: Full local caching in \`Application.persistentDataPath\` for offline site inspections, with automatic background cloud delta synchronization across user tablets and smartphones.
- **CAD & Documentation Export**: Real-time mesh serialization to Wavefront \`.OBJ\`, 3D-printable \`.STL\`, and multi-page architectural report \`.PDF\`.
- **Supported Android Hardware**: Optimized for Android Tablets (Samsung Galaxy Tab S9 Ultra, OnePlus Pad 2, Lenovo Tab P12 Pro) and Android Smartphones (Galaxy S24 Ultra, Pixel 9 Pro, Xiaomi 14 Ultra, Xperia 1 VI).`;

  const visualPromptEN = `Photorealistic architectural AR visualization inside a modern high-rise executive conference room at golden hour sunset, inspired by futuristic spatial computing dashboards. In the center of a sleek dark reflective obsidian conference table rises a detailed glowing cyan and golden holographic 3D architectural model of "${sceneMeta.name}" (${sceneMeta.architecturalStyle}), featuring intricate structural diagrid frames, translucent glass curtain walls, internal elevator cores, and skybridges. Across the tabletop surface spreads an illuminated vector world map network glowing with warm amber and electric blue fiber-optic nodes. Floating translucent holographic HUD data panels hover in mid-air with 6DoF depth parallax. Through the floor-to-ceiling panoramic room windows in the background, dynamic volumetric sunset particles and atmospheric light rays drift above a distant city skyline. LiDAR depth sensor surface grid lines subtly anchor the hologram base to the tabletop plane, Unreal Engine 5 / Unity URP Octane Render, 8k resolution, architectural photography --ar 16:9 --v 6.0`;

  const unityCSharpCode = `using System.Collections;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using UnityEngine.InputSystem.EnhancedTouch;
using Touch = UnityEngine.InputSystem.EnhancedTouch.Touch;

namespace HoloArchAR
{
    /// <summary>
    /// Kompleksowy kontroler osadzania hologramów architektonicznych na blatach i podłogach
    /// z obsługą czujników głębi (ARKit/ARCore), oświetlenia środowiskowego, paralaksy 6DoF,
    /// gestów dotykowych, zrzutów ekranu oraz eksportu OBJ/STL.
    /// </summary>
    [RequireComponent(typeof(ARPlaneManager), typeof(ARRaycastManager), typeof(AROcclusionManager))]
    public class HoloArchARController : MonoBehaviour
    {
        [Header("Komponenty AR Foundation")]
        public ARPlaneManager planeManager;
        public ARRaycastManager raycastManager;
        public AROcclusionManager occlusionManager;
        public ARCameraManager cameraManager;

        [Header("Sceny Architektoniczne 3D i Efekty")]
        public GameObject[] architecturalScenes;
        public ParticleSystem windowAtmosphericParticles;
        public Light directionalEnvLight;
        public Transform parallaxTableLayer;
        public Transform parallaxFloatingHudLayer;

        [Header("Parametry Sterowania i Paralaksy")]
        [Range(0.25f, 2.5f)] public float currentScale = ${config.modelScale.toFixed(2)}f;
        [Range(0f, 1f)] public float parallaxStrength = ${config.parallaxIntensity.toFixed(2)}f;
        private int activeSceneIndex = 0;
        private GameObject spawnedHologram;
        private Vector3 initialCameraLocalPos;

        private void OnEnable()
        {
            EnhancedTouchSupport.Enable();
            if (cameraManager != null)
                cameraManager.frameReceived += OnCameraFrameReceived;
        }

        private void OnDisable()
        {
            if (cameraManager != null)
                cameraManager.frameReceived -= OnCameraFrameReceived;
            EnhancedTouchSupport.Disable();
        }

        private void Start()
        {
            // Konfiguracja czujnika głębi i okluzji (ARCore Depth API / ARKit LiDAR)
            occlusionManager.requestedEnvironmentDepthMode = ${
              config.occlusionEnabled
                ? 'EnvironmentDepthMode.Best'
                : 'EnvironmentDepthMode.Disabled'
            };
            planeManager.requestedDetectionMode = PlaneDetectionMode.Horizontal;
            initialCameraLocalPos = Camera.main.transform.localPosition;
        }

        private void Update()
        {
            HandleTouchGestures();
            ApplySixDoFParallax();
        }

        /// <summary>
        /// Oświetlenie środowiskowe w czasie rzeczywistym (HDR Light Estimation)
        /// </summary>
        private void OnCameraFrameReceived(ARCameraFrameEventArgs args)
        {
            if (!${config.environmentalLighting ? 'true' : 'false'}) return;

            if (args.lightEstimation.averageBrightness.HasValue)
                directionalEnvLight.intensity = Mathf.Clamp(args.lightEstimation.averageBrightness.Value * 1.4f, 0.4f, 2.2f);

            if (args.lightEstimation.colorCorrection.HasValue)
                directionalEnvLight.color = args.lightEstimation.colorCorrection.Value;

            if (args.lightEstimation.mainLightDirection.HasValue)
                directionalEnvLight.transform.rotation = Quaternion.LookRotation(args.lightEstimation.mainLightDirection.Value);
        }

        /// <summary>
        /// Intuicyjne sterowanie dotykowe: Pinch-to-Scale, Rotacja oraz osadzanie na blacie/podłodze
        /// </summary>
        private void HandleTouchGestures()
        {
            var activeTouches = Touch.activeTouches;
            if (activeTouches.Count == 1 && activeTouches[0].phase == UnityEngine.InputSystem.TouchPhase.Moved)
            {
                if (spawnedHologram != null)
                {
                    float rotDelta = activeTouches[0].delta.x * 0.35f;
                    spawnedHologram.transform.Rotate(Vector3.up, -rotDelta, Space.World);
                }
            }
            else if (activeTouches.Count == 2)
            {
                var t0 = activeTouches[0];
                var t1 = activeTouches[1];
                float prevDist = Vector2.Distance(t0.screenPosition - t0.delta, t1.screenPosition - t1.delta);
                float currDist = Vector2.Distance(t0.screenPosition, t1.screenPosition);
                if (prevDist > 0.01f && spawnedHologram != null)
                {
                    currentScale = Mathf.Clamp(currentScale * (currDist / prevDist), 0.25f, 2.5f);
                    spawnedHologram.transform.localScale = Vector3.Lerp(
                        spawnedHologram.transform.localScale,
                        Vector3.one * currentScale,
                        Time.deltaTime * 12f
                    );
                }
            }
        }

        /// <summary>
        /// Efekt paralaksy głębi obrazu podczas poruszania urządzeniem wokół modelu
        /// </summary>
        private void ApplySixDoFParallax()
        {
            if (Camera.main == null || spawnedHologram == null) return;
            Vector3 camOffset = Camera.main.transform.position - spawnedHologram.transform.position;

            if (parallaxTableLayer != null)
                parallaxTableLayer.localPosition = new Vector3(-camOffset.x * 0.04f * parallaxStrength, 0f, -camOffset.z * 0.04f * parallaxStrength);

            if (parallaxFloatingHudLayer != null)
                parallaxFloatingHudLayer.localPosition = new Vector3(camOffset.x * 0.08f * parallaxStrength, 0.25f, camOffset.z * 0.08f * parallaxStrength);
        }

        /// <summary>
        /// Płynna animacja przejścia między poszczególnymi scenami 3D
        /// </summary>
        public IEnumerator TransitionToScene(int nextIndex)
        {
            if (spawnedHologram != null)
            {
                float t = 0f;
                Vector3 startScale = spawnedHologram.transform.localScale;
                while (t < 0.3f)
                {
                    t += Time.deltaTime;
                    spawnedHologram.transform.localScale = Vector3.Lerp(startScale, Vector3.zero, t / 0.3f);
                    yield return null;
                }
                Destroy(spawnedHologram);
            }

            activeSceneIndex = nextIndex % architecturalScenes.Length;
            spawnedHologram = Instantiate(architecturalScenes[activeSceneIndex], transform.position, Quaternion.identity);
            spawnedHologram.transform.localScale = Vector3.zero;

            float appearTime = 0f;
            while (appearTime < 0.35f)
            {
                appearTime += Time.deltaTime;
                float smooth = Mathf.SmoothStep(0f, 1f, appearTime / 0.35f);
                spawnedHologram.transform.localScale = Vector3.one * (currentScale * smooth);
                yield return null;
            }
        }
    }
}`;

  return {
    title: `Specyfikacja Promptu AR: ${sceneMeta.name}`,
    systemPromptPL,
    systemPromptEN,
    visualPromptEN,
    unityCSharpCode,
  };
}
