import React, { useState, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  MapCameraChangedEvent,
  MapCameraProps,
} from '@vis.gl/react-google-maps';
import { Compass, Layers, MapPin, Navigation, Sparkles } from 'lucide-react';
import { ArchitecturalSceneId, HologramPaletteId } from '../types/arStudio';

export interface ArchitecturalGeoSite {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  altitudeM: number;
  heightMeters: string;
  linkedSceneId: ArchitecturalSceneId;
  linkedPalette: HologramPaletteId;
  thumbnailUrl: string;
  description: string;
  arAnchorCode: string;
}

const ARCHITECTURAL_GEO_SITES: ArchitecturalGeoSite[] = [
  {
    id: 'site-warsaw-daszynskiego',
    name: 'Warsaw Spire & Rondo Daszyńskiego Hub',
    city: 'Warszawa',
    country: 'Polska',
    coordinates: { lat: 52.2302, lng: 20.9844 },
    altitudeM: 220,
    heightMeters: '220 m (49 kondygnacji)',
    linkedSceneId: 'skyline_financial',
    linkedPalette: 'cyan_blueprint',
    thumbnailUrl: '/assets/aistudio/50_Rise_Tower_66976ad1.jpeg',
    description:
      'Główny klaster wysokościowców finansowych z podwójną fasadą szklaną, idealny do kalibracji ARCore Earth Cloud Anchors.',
    arAnchorCode: 'PL-WAW-RD-01',
  },
  {
    id: 'site-ny-torch-8th',
    name: 'The Torch — 740 8th Avenue Supertall',
    city: 'Nowy Jork',
    country: 'USA',
    coordinates: { lat: 40.7594, lng: -73.9882 },
    altitudeM: 325,
    heightMeters: '325 m (1067 ft)',
    linkedSceneId: 'voronoi_bionic_spire',
    linkedPalette: 'amber_gold',
    thumbnailUrl:
      '/assets/aistudio/NEW_YORK___The_Torch_-_740_8th_Avenue___325m___1067ft___.._dad21242.jpeg',
    description:
      'Spiralna wieża widokowa na Manhattanie z koroną iluminacyjną i ekspozycją na kaniony urbanistyczne 6DoF.',
    arAnchorCode: 'US-NYC-8AV-02',
  },
  {
    id: 'site-tashkent-city',
    name: 'Tashkent City International Business Center',
    city: 'Taszkent',
    country: 'Uzbekistan',
    coordinates: { lat: 41.3145, lng: 69.2486 },
    altitudeM: 266,
    heightMeters: '266 m (Kompleks 8 stref)',
    linkedSceneId: 'eco_atrium',
    linkedPalette: 'emerald_matrix',
    thumbnailUrl: '/assets/aistudio/Tashkent_City__Uzbekistan_5fa897cb.jpeg',
    description:
      'Bioklimatyczny kwartał wysokościowy z tarasowymi dziedzińcami i zaokrąglonymi żyletkami stropowymi LED.',
    arAnchorCode: 'UZ-TAS-IBC-03',
  },
  {
    id: 'site-valencia-calatrava',
    name: 'Kinezyjne Skrzydło Pawilonu (Calatrava Bio-Wing)',
    city: 'Walencja',
    country: 'Hiszpania',
    coordinates: { lat: 39.4549, lng: -0.3504 },
    altitudeM: 125,
    heightMeters: '125 m (34 żebra kinetyczne)',
    linkedSceneId: 'kinetic_calatrava_wing',
    linkedPalette: 'platinum_arch',
    thumbnailUrl: '/assets/aistudio/12.png',
    description:
      'Bioniczna struktura żebrowa inspirowana skrzydłem ptaka do testów parametrycznych wiatru i cieniowania PBR.',
    arAnchorCode: 'ES-VLC-CAL-04',
  },
  {
    id: 'site-zurich-prism',
    name: 'Bioniczny Pawilon Pryzmatyczny (Optical Glass Lab)',
    city: 'Zurych',
    country: 'Szwajcaria',
    coordinates: { lat: 47.3769, lng: 8.5417 },
    altitudeM: 160,
    heightMeters: '85 m (Szkło IOR 1.52)',
    linkedSceneId: 'crystal_stacked_prism',
    linkedPalette: 'cyan_blueprint',
    thumbnailUrl: '/assets/aistudio/Unknown_11_7796abba.jpeg',
    description:
      'Laboratorium architektury monolitycznych bloków akrylowych z fluorescencyjnymi krawędziami.',
    arAnchorCode: 'CH-ZRH-OPT-05',
  },
  {
    id: 'site-singapore-aqua',
    name: 'Marina Hydro-Kinetic Vortex Pavilion',
    city: 'Singapur',
    country: 'Singapur',
    coordinates: { lat: 1.2834, lng: 103.8607 },
    altitudeM: 195,
    heightMeters: '140 m (Vortex Fluid)',
    linkedSceneId: 'hydro_aqua_sculpture',
    linkedPalette: 'cyan_blueprint',
    thumbnailUrl: '/assets/aistudio/23.png',
    description:
      'Instalacja wodno-holograficzna na nabrzeżu z symulacją cząsteczkową i refrakcją światła.',
    arAnchorCode: 'SG-SIN-HYD-06',
  },
];

interface ArchitecturalMapPanelProps {
  activeSceneId: ArchitecturalSceneId;
  onSelectSiteFor3D: (
    sceneId: ArchitecturalSceneId,
    palette: HologramPaletteId,
    customTitle: string,
    altitudeM: number
  ) => void;
  onNotify: (msg: string) => void;
}

export const ArchitecturalMapPanel: React.FC<ArchitecturalMapPanelProps> = ({
  activeSceneId,
  onSelectSiteFor3D,
  onNotify,
}) => {
  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ||
    ((typeof process !== 'undefined' &&
      (process.env as Record<string, string | undefined>)?.GOOGLE_MAPS_API_KEY) ||
      '');

  const [selectedSite, setSelectedSite] = useState<ArchitecturalGeoSite>(
    ARCHITECTURAL_GEO_SITES[0]
  );
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(true);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid' | 'satellite'>('hybrid');
  const [cameraProps, setCameraProps] = useState<MapCameraProps>({
    center: ARCHITECTURAL_GEO_SITES[0].coordinates,
    zoom: 15,
    tilt: 45,
    heading: 20,
  });

  const handleCameraChange = useCallback((ev: MapCameraChangedEvent) => {
    setCameraProps(ev.detail);
  }, []);

  const handleFocusSite = (site: ArchitecturalGeoSite) => {
    setSelectedSite(site);
    setInfoWindowOpen(true);
    setCameraProps({
      center: site.coordinates,
      zoom: 16,
      tilt: 55,
      heading: 35,
    });
  };

  const handleSyncSiteWith3DViewport = (site: ArchitecturalGeoSite) => {
    onSelectSiteFor3D(site.linkedSceneId, site.linkedPalette, site.name, site.altitudeM);
    onNotify(
      `Zsynchronizowano kotwicę geograficzną Google Maps (${site.city}) ze sceną 3D: ${site.name}`
    );
  };

  return (
    <section
      id="google-maps-platform"
      className="space-y-6 pt-4 border-t border-slate-800/80"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
            <Compass className="w-3.5 h-3.5" />
            <span>Google Maps Platform SDK (@vis.gl/react-google-maps)</span>
            <span aria-hidden="true">·</span>
            <span>AdvancedMarkerElement & Geospatial AR Anchors</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display">
            Geoprzestrzenna Mapa Lokalizacji Architektonicznych i Kotwic AR (Google Maps)
          </h2>
          <p className="text-sm text-slate-300 max-w-3xl">
            Wybierz rzeczywistą lokalizację inwestycji na interaktywnej mapie Google Maps (Warszawa,
            Nowy Jork, Taszkent, Walencja, Zurych, Singapur), sprawdź współrzędne kotwicy{' '}
            <strong>ARCore Geospatial API</strong> i przenieś budynek bezpośrednio na stół
            holograficzny 3D.
          </p>
        </div>

        {/* Map View Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg shrink-0 text-xs">
          {(
            [
              { id: 'hybrid', label: 'Satelita + Ulice (Hybrid)' },
              { id: 'satellite', label: 'Satelita 3D' },
              { id: 'roadmap', label: 'Mapa Wektorowa' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setMapTypeId(mode.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                mapTypeId === mode.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Architectural Sites List */}
        <div className="lg:col-span-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {ARCHITECTURAL_GEO_SITES.map((site) => {
            const isSelected = selectedSite.id === site.id;
            const isSceneActive = activeSceneId === site.linkedSceneId;
            return (
              <div
                key={site.id}
                onClick={() => handleFocusSite(site)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-400 shadow-lg'
                    : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={site.thumbnailUrl}
                    alt={site.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-emerald-400">
                        {site.city}, {site.country}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {site.arAnchorCode}
                      </span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                      {site.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      GPS: {site.coordinates.lat.toFixed(4)}°N, {site.coordinates.lng.toFixed(4)}°E ·{' '}
                      {site.heightMeters}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{site.description}</p>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[11px] font-mono text-cyan-300">
                    Scena 3D: {site.linkedSceneId}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSyncSiteWith3DViewport(site);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isSceneActive
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Załaduj na Stół 3D AR</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Interactive Google Map Canvas */}
        <div className="lg:col-span-8 bg-[#070A10] border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-white">{selectedSite.name}</span>
              <span className="text-slate-500">·</span>
              <span className="font-mono text-emerald-400 tabular-nums">
                {selectedSite.coordinates.lat.toFixed(4)}, {selectedSite.coordinates.lng.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              <span>Kotwica Geospatial: {selectedSite.arAnchorCode}</span>
            </div>
          </div>

          <div className="relative flex-1 w-full h-full">
            <APIProvider apiKey={apiKey}>
              <GoogleMap
                {...cameraProps}
                onCameraChanged={handleCameraChange}
                mapId="DEMO_MAP_ID"
                mapTypeId={mapTypeId}
                gestureHandling="greedy"
                internalUsageAttributionIds={[
                  'gmp_mcp_codeassist_v1_aistudio',
                  'gmp_git_agentskills_v1',
                ]}
                style={{ width: '100%', height: '100%' }}
              >
                {ARCHITECTURAL_GEO_SITES.map((site) => {
                  const isActive = selectedSite.id === site.id;
                  return (
                    <AdvancedMarker
                      key={site.id}
                      position={site.coordinates}
                      title={site.name}
                      onClick={() => handleFocusSite(site)}
                    >
                      <Pin
                        background={isActive ? '#10b981' : '#06b6d4'}
                        borderColor={isActive ? '#ecfdf5' : '#083344'}
                        glyphColor="#020617"
                        scale={isActive ? 1.35 : 1.05}
                      />
                    </AdvancedMarker>
                  );
                })}

                {infoWindowOpen && selectedSite && (
                  <InfoWindow
                    position={selectedSite.coordinates}
                    pixelOffset={[0, -38]}
                    maxWidth={280}
                    onCloseClick={() => setInfoWindowOpen(false)}
                  >
                    <div className="text-slate-900 p-1 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={selectedSite.thumbnailUrl}
                          alt={selectedSite.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded object-cover border border-slate-300 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-950 leading-snug">
                            {selectedSite.name}
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono">
                            {selectedSite.city} · {selectedSite.heightMeters}
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-snug">
                        {selectedSite.description}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSyncSiteWith3DViewport(selectedSite)}
                        className="w-full py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 font-semibold rounded text-[11px] flex items-center justify-center gap-1"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Otwórz Hologram 3D na Stole AR</span>
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          </div>
        </div>
      </div>
    </section>
  );
};
