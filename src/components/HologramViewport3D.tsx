import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Bot,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ARConfigState, ArchitecturalSceneId } from '../types/arStudio';
import { ARCHITECTURAL_SCENES, HOLOGRAM_PALETTES } from '../data/arStudioData';
import { exportGroupToOBJ, exportGroupToSTL, exportGroupToPLY } from '../utils/exporters';

interface HologramViewport3DProps {
  config: ARConfigState;
  onUpdateConfig: (partial: Partial<ARConfigState>) => void;
  onCaptureScreenshot: (dataUrl: string, sceneName: string) => void;
  onExportMessage: (msg: string) => void;
}

const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyColor = new THREE.Color();

function createBeveledTowerGeometry(
  width: number,
  depth: number,
  height: number,
  bevel = 0.04
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geom.rotateX(-Math.PI / 2);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds composite 8-12 part procedural architectural building groups for each scene
 * so both the 3D viewport and the .OBJ / .STL CAD exporters have full 3D mesh geometry.
 */
export function buildArchitecturalSceneGroup(
  sceneId: ArchitecturalSceneId,
  primaryHex: string,
  secondaryHex: string,
  wireframeEnabled: boolean,
  heightMult = 1.0
): THREE.Group {
  const group = new THREE.Group();
  group.name = `HoloScene_${sceneId}`;

  const primaryColor = new THREE.Color(primaryHex);
  const secondaryColor = new THREE.Color(secondaryHex);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: primaryColor,
    emissive: primaryColor,
    emissiveIntensity: 0.45,
    roughness: 0.12,
    metalness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.78,
    wireframe: wireframeEnabled,
  });

  const coreMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    emissive: secondaryColor,
    emissiveIntensity: 0.55,
    roughness: 0.45,
    metalness: 0.82,
    transparent: true,
    opacity: 0.9,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    emissive: primaryColor,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.9,
    wireframe: true,
  });

  const podiumMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#0F172A'),
    emissive: primaryColor,
    emissiveIntensity: 0.3,
    roughness: 0.65,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
  });

  const addPart = (
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    layerIndex: number,
    name: string,
    rotY = 0,
    shapeType: 'tower' | 'cylinder' | 'dome' | 'bridge' = 'tower'
  ) => {
    geom.computeBoundingBox();
    const bbox = geom.boundingBox;
    const size = new THREE.Vector3(0.6, 1.2, 0.6);
    if (bbox) {
      bbox.getSize(size);
    }

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.y = rotY;
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      baseY: pos[1],
      layerIndex,
      boxSize: [size.x, size.y, size.z],
      shapeType,
      partLabel: name.replace(/_/g, ' '),
    };
    group.add(mesh);

    if (!wireframeEnabled && layerIndex >= 1) {
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: layerIndex === 3 ? secondaryColor : primaryColor,
        transparent: true,
        opacity: 0.85,
      });
      const lineSeg = new THREE.LineSegments(edges, lineMat);
      mesh.add(lineSeg);
    }
  };

  // InstancedMesh (>20 repeated surrounding urban context blocks & LiDAR boundary markers)
  const instCount = 36;
  const instBlockGeom = new THREE.BoxGeometry(0.18, 0.28, 0.18);
  instBlockGeom.translate(0, 0.14, 0);
  const instMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: primaryColor,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.6,
    transparent: true,
    opacity: 0.72,
  });
  const cityInstanced = new THREE.InstancedMesh(instBlockGeom, instMat, instCount);
  cityInstanced.name = 'Urban_Context_Instanced';
  cityInstanced.userData = { baseY: 0, layerIndex: 0 };

  for (let i = 0; i < instCount; i++) {
    const angle = (i / instCount) * Math.PI * 2;
    const radius = 1.75 + (i % 3) * 0.26;
    _dummyPos.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const sXZ = 0.85 + (i % 5) * 0.08;
    const sY = (0.55 + ((i * 7) % 11) * 0.16) * heightMult;
    _dummyScale.set(sXZ, sY, sXZ);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    cityInstanced.setMatrixAt(i, _dummyMatrix);

    _dummyColor
      .copy(i % 4 === 0 ? secondaryColor : primaryColor)
      .multiplyScalar(0.8 + (i % 3) * 0.12);
    cityInstanced.setColorAt(i, _dummyColor);
  }
  cityInstanced.instanceMatrix.needsUpdate = true;
  if (cityInstanced.instanceColor) cityInstanced.instanceColor.needsUpdate = true;
  cityInstanced.computeBoundingSphere();
  group.add(cityInstanced);

  const hm = heightMult;

  if (sceneId === 'skyline_financial') {
    const podiumCyl = new THREE.CylinderGeometry(2.3, 2.48, 0.14, 36);
    podiumCyl.translate(0, 0.07, 0);
    addPart(podiumCyl, podiumMat, [0, 0, 0], 0, 'Podium_Base', 0, 'cylinder');
    addPart(
      createBeveledTowerGeometry(2.6, 1.8, 0.22, 0.03),
      podiumMat,
      [0, 0.08, 0],
      0,
      'Atrium_Concourse'
    );

    // Layer 1: Internal Structural Cores
    addPart(
      createBeveledTowerGeometry(0.46, 0.46, 3.2 * hm, 0.02),
      coreMat,
      [0, 0.12, 0],
      1,
      'Rdzeń_Główny_342m'
    );
    addPart(
      createBeveledTowerGeometry(0.34, 0.34, 2.15 * hm, 0.02),
      coreMat,
      [-1.05, 0.12, 0.35],
      1,
      'Rdzeń_Zachodni'
    );
    addPart(
      createBeveledTowerGeometry(0.34, 0.34, 2.4 * hm, 0.02),
      coreMat,
      [1.05, 0.12, -0.25],
      1,
      'Rdzeń_Wschodni'
    );

    // Layer 2: Beveled Curtain Wall Facades & Setback Tiers
    addPart(
      createBeveledTowerGeometry(0.88, 0.88, 2.4 * hm, 0.05),
      glassMat,
      [0, 0.12, 0],
      2,
      'Wieża_Centralna_T1'
    );
    addPart(
      createBeveledTowerGeometry(0.66, 0.66, 1.3 * hm, 0.04),
      glassMat,
      [0, 2.42 * hm, 0],
      2,
      'Głowica_Diagrid_T1',
      Math.PI / 4
    );
    addPart(
      createBeveledTowerGeometry(0.66, 0.66, 2.05 * hm, 0.04),
      glassMat,
      [-1.05, 0.12, 0.35],
      2,
      'Wieża_Finansowa_W2'
    );
    addPart(
      createBeveledTowerGeometry(0.68, 0.68, 2.3 * hm, 0.04),
      glassMat,
      [1.05, 0.12, -0.25],
      2,
      'Wieża_Finansowa_E3'
    );
    addPart(
      createBeveledTowerGeometry(0.54, 0.54, 1.48 * hm, 0.03),
      glassMat,
      [0.78, 0.12, 0.82],
      2,
      'Wieża_Południowa_S4'
    );
    addPart(
      createBeveledTowerGeometry(0.5, 0.5, 1.32 * hm, 0.03),
      glassMat,
      [-0.82, 0.12, -0.72],
      2,
      'Wieża_Północna_N5'
    );

    // Layer 3: Skybridges & Spire
    addPart(
      createBeveledTowerGeometry(1.05, 0.24, 0.16, 0.02),
      coreMat,
      [-0.52, 1.55 * hm, 0.18],
      3,
      'Skybridge_Zachód',
      0,
      'bridge'
    );
    addPart(
      createBeveledTowerGeometry(1.05, 0.24, 0.16, 0.02),
      coreMat,
      [0.52, 1.78 * hm, -0.12],
      3,
      'Skybridge_Wschód',
      0,
      'bridge'
    );

    const lathePoints = [
      new THREE.Vector2(0.36, 0),
      new THREE.Vector2(0.24, 0.3 * hm),
      new THREE.Vector2(0.1, 0.7 * hm),
      new THREE.Vector2(0.02, 1.35 * hm),
    ];
    addPart(
      new THREE.LatheGeometry(lathePoints, 16),
      frameMat,
      [0, 3.68 * hm, 0],
      3,
      'Iglica_Telekomunikacyjna',
      0,
      'cylinder'
    );
  } else if (sceneId === 'eco_atrium') {
    const baseCyl = new THREE.CylinderGeometry(2.45, 2.6, 0.16, 40);
    baseCyl.translate(0, 0.08, 0);
    addPart(baseCyl, podiumMat, [0, 0, 0], 0, 'Baza_Kampusu', 0, 'cylinder');

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      addPart(
        createBeveledTowerGeometry(0.52, 0.52, 1.9 * hm, 0.04),
        coreMat,
        [Math.cos(angle) * 1.15, 0.12, Math.sin(angle) * 1.15],
        1,
        `Trzon_Bioklimatyczny_${i + 1}`
      );
    }

    addPart(
      createBeveledTowerGeometry(1.85, 1.85, 0.55 * hm, 0.06),
      glassMat,
      [0, 0.45 * hm, 0],
      2,
      'Taras_Dolny_Atrium'
    );
    addPart(
      createBeveledTowerGeometry(1.45, 1.45, 0.55 * hm, 0.05),
      glassMat,
      [0, 1.12 * hm, 0],
      2,
      'Taras_Środkowy_Ogrody'
    );
    addPart(
      new THREE.SphereGeometry(0.92, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      glassMat,
      [0, 0.16, 0],
      2,
      'Kopuła_Geodezyjna_Bio',
      0,
      'dome'
    );

    addPart(
      createBeveledTowerGeometry(1.1, 1.1, 0.35 * hm, 0.04),
      frameMat,
      [0, 1.75 * hm, 0],
      3,
      'Korona_Solarna_PV'
    );
    addPart(
      createBeveledTowerGeometry(2.35, 0.28, 0.14, 0.02),
      coreMat,
      [0, 1.25 * hm, 0],
      3,
      'Pasaż_Powietrzny_NS',
      0,
      'bridge'
    );
    addPart(
      createBeveledTowerGeometry(0.28, 2.35, 0.14, 0.02),
      coreMat,
      [0, 1.25 * hm, 0],
      3,
      'Pasaż_Powietrzny_EW',
      0,
      'bridge'
    );
  } else if (sceneId === 'crystal_stacked_prism') {
    // 04. Makieta Warstwowa "Crystal Prism LED" (inspired by glass1.png, glass2.png, 50 Rise Tower)
    addPart(
      createBeveledTowerGeometry(2.6, 1.9, 0.14, 0.03),
      podiumMat,
      [0, 0, 0],
      0,
      'Czarny_Postument_Gabloty'
    );
    // Warm LED illuminated vertical cores
    addPart(
      createBeveledTowerGeometry(0.32, 0.32, 2.55 * hm, 0.02),
      coreMat,
      [-0.38, 0.12, -0.15],
      1,
      'Kolumna_LED_Bursztyn_W1'
    );
    addPart(
      createBeveledTowerGeometry(0.32, 0.32, 2.85 * hm, 0.02),
      coreMat,
      [0.38, 0.12, 0.15],
      1,
      'Kolumna_LED_Bursztyn_E2'
    );
    // Cantilevered horizontal optical glass slabs (8 stacked tiers with shifts)
    for (let s = 0; s < 8; s++) {
      const slabY = (0.24 + s * 0.32) * hm;
      const offsetX = ((s % 3) - 1) * 0.16;
      const offsetZ = (((s + 1) % 3) - 1) * 0.12;
      const wSlab = 1.65 - s * 0.06;
      const dSlab = 1.25 - s * 0.04;
      addPart(
        createBeveledTowerGeometry(wSlab, dSlab, 0.15 * hm, 0.025),
        glassMat,
        [offsetX, slabY, offsetZ],
        s < 5 ? 2 : 3,
        `Tafla_Szkła_Optycznego_P0${s + 1}`
      );
    }
    addPart(
      createBeveledTowerGeometry(0.95, 0.75, 0.24 * hm, 0.03),
      frameMat,
      [0.12, 2.84 * hm, 0],
      3,
      'Świetlik_Pryzmatyczny_Korony'
    );
  } else if (sceneId === 'voronoi_bionic_spire') {
    // 05. Wieża Bioniczna "Voronoi Helix Spire" (inspired by The Torch 325m, Voronoi cellular towers)
    const voronoiBase = new THREE.CylinderGeometry(2.1, 2.35, 0.16, 32);
    voronoiBase.translate(0, 0.08, 0);
    addPart(voronoiBase, podiumMat, [0, 0, 0], 0, 'Baza_Korzeniowa_Voronoi', 0, 'cylinder');

    // Twisted Helical Core & 7 Rotating Bionic Tiers
    addPart(
      new THREE.CylinderGeometry(0.34, 0.48, 3.3 * hm, 20),
      coreMat,
      [0, 0.14, 0],
      1,
      'Rdzeń_Helikalny_Torch_325m',
      0,
      'cylinder'
    );
    for (let t = 0; t < 7; t++) {
      const tierY = (0.18 + t * 0.44) * hm;
      const scaleR = 1.18 - t * 0.08;
      const twistRot = (t * Math.PI) / 9;
      addPart(
        createBeveledTowerGeometry(scaleR, scaleR * 0.86, 0.38 * hm, 0.04),
        t % 2 === 0 ? glassMat : frameMat,
        [Math.sin(twistRot) * 0.08, tierY, Math.cos(twistRot) * 0.08],
        t < 5 ? 2 : 3,
        `Segment_Voronoi_Helix_0${t + 1}`,
        twistRot
      );
    }
    // Crown observation spiral ring
    addPart(
      new THREE.SphereGeometry(0.56, 20, 16),
      glassMat,
      [0, 3.35 * hm, 0],
      3,
      'Kopuła_Obserwacyjna_Torch',
      0,
      'dome'
    );
    addPart(
      createBeveledTowerGeometry(0.14, 0.14, 0.95 * hm, 0.01),
      frameMat,
      [0, 3.65 * hm, 0],
      3,
      'Iglica_Bioniczna_325m'
    );
  } else if (sceneId === 'kinetic_calatrava_wing') {
    // 06. Rzeźba Kinetyczna "Aerodynamic Wing" (inspired by -0.png, 67243a334ef658da6dda9b7adeabd8e0.jpg)
    const pedestal = new THREE.CylinderGeometry(1.35, 1.5, 0.12, 36);
    pedestal.translate(0, 0.06, 0);
    addPart(pedestal, podiumMat, [0, 0, 0], 0, 'Dysk_Bazowy_Tytan', 0, 'cylinder');

    // Sweeping curved spine base
    addPart(
      createBeveledTowerGeometry(0.55, 0.36, 0.95 * hm, 0.04),
      coreMat,
      [0.45, 0.12, 0],
      1,
      'Kręgosłup_Nośny_Skrzydła',
      -0.25
    );

    // 10 Fanning Aerodynamic Titanium Ribs following a logarithmic spiral curve
    for (let r = 0; r < 10; r++) {
      const progress = r / 9;
      const ribY = (0.35 + progress * 2.75) * hm;
      const ribX = 0.35 - Math.sin(progress * Math.PI * 0.85) * 0.65;
      const ribZ = (progress - 0.5) * 0.42;
      const ribLength = (1.35 + Math.sin(progress * Math.PI) * 0.95) * hm;
      addPart(
        createBeveledTowerGeometry(ribLength, 0.12, 0.18 * hm, 0.02),
        r % 3 === 0 ? coreMat : glassMat,
        [ribX, ribY, ribZ],
        r < 7 ? 2 : 3,
        `Pióro_Kinetyczne_Tytan_0${r + 1}`,
        progress * 0.65 - 0.3,
        'bridge'
      );
    }
  } else if (sceneId === 'hydro_aqua_sculpture') {
    // 07. Hydro-Rzeźba "Liquid Crystal Splash" (inspired by 0.jpg, 97a6d95b, 923f4fd5)
    const glassVessel = new THREE.CylinderGeometry(1.45, 1.32, 0.85 * hm, 36);
    glassVessel.translate(0, 0.42 * hm, 0);
    addPart(
      glassVessel,
      glassMat,
      [0, 0, 0],
      0,
      'Szklane_Naczynie_Krystaliczne',
      0,
      'cylinder'
    );

    // Rising Fluid Vortex Torso & Crest Waves
    addPart(
      createBeveledTowerGeometry(0.68, 0.58, 1.65 * hm, 0.06),
      glassMat,
      [0, 0.72 * hm, 0],
      1,
      'Wir_Wodny_Rdzeń_Hydro'
    );
    addPart(
      createBeveledTowerGeometry(1.55, 0.32, 0.38 * hm, 0.04),
      coreMat,
      [-0.45, 1.95 * hm, 0.15],
      2,
      'Lewe_Ramię_Rozbryzgu',
      0.35,
      'bridge'
    );
    addPart(
      createBeveledTowerGeometry(1.45, 0.32, 0.36 * hm, 0.04),
      coreMat,
      [0.48, 1.75 * hm, -0.15],
      2,
      'Prawe_Ramię_Fali',
      -0.35,
      'bridge'
    );
    addPart(
      new THREE.SphereGeometry(0.42, 24, 18),
      glassMat,
      [0.05, 2.48 * hm, 0],
      2,
      'Głowica_Wodna_Refrakcja',
      0,
      'dome'
    );
    // Suspended 3D Water Droplets in mid-air
    const droplets: Array<[number, number, number, number, string]> = [
      [1.05, 2.65 * hm, 0.25, 0.34, 'Kropla_Sferyczna_Główna'],
      [-0.95, 2.45 * hm, -0.2, 0.22, 'Kropla_Zawieszona_W1'],
      [0.72, 1.35 * hm, 0.55, 0.18, 'Kropla_Krystaliczna_E2'],
      [-0.68, 1.45 * hm, -0.48, 0.19, 'Kropla_Krystaliczna_N3'],
      [0.15, 3.12 * hm, 0.1, 0.24, 'Korona_Kropli_Zenith'],
    ];
    droplets.forEach(([dx, dy, dz, rDrop, dName]) => {
      addPart(
        new THREE.SphereGeometry(rDrop, 18, 14),
        glassMat,
        [dx, dy, dz],
        3,
        dName,
        0,
        'dome'
      );
    });
  } else {
    // aero_hub
    addPart(
      createBeveledTowerGeometry(3.4, 2.1, 0.18, 0.03),
      podiumMat,
      [0, 0, 0],
      0,
      'Płyta_Peronowa_KDP'
    );
    addPart(
      createBeveledTowerGeometry(2.9, 0.38, 0.65 * hm, 0.03),
      coreMat,
      [0, 0.16, -0.65],
      1,
      'Nawa_Północna_Terminalu'
    );
    addPart(
      createBeveledTowerGeometry(2.9, 0.38, 0.65 * hm, 0.03),
      coreMat,
      [0, 0.16, 0.65],
      1,
      'Nawa_Południowa_Terminalu'
    );
    addPart(
      createBeveledTowerGeometry(0.46, 0.46, 2.85 * hm, 0.04),
      coreMat,
      [1.35, 0.14, 0],
      1,
      'Wieża_Kontroli_Lotów_ATC'
    );
    addPart(
      createBeveledTowerGeometry(2.6, 1.35, 1.15 * hm, 0.06),
      glassMat,
      [0, 0.22, 0],
      2,
      'Hala_Główna_Odpraw'
    );
    addPart(
      createBeveledTowerGeometry(3.15, 1.75, 0.22 * hm, 0.04),
      frameMat,
      [0, 1.45 * hm, 0],
      3,
      'Dach_Kratownicowy_Wave'
    );
    addPart(
      createBeveledTowerGeometry(0.76, 0.76, 0.42 * hm, 0.04),
      glassMat,
      [1.35, 2.95 * hm, 0],
      3,
      'Kopuła_Radarowa_ATC'
    );
  }

  return group;
}

/**
 * High-Precision, Zero-Fail 3D Holographic Architectural & Spatial Agent Renderer.
 * Renders crystal-clear 3D buildings with floor slabs, diagrids, glowing cores, tabletop world map,
 * LiDAR surface grid, window particles, and live 3D Autonomous AI Agents moving on a 3D NavMesh!
 */
function startHologram3DEngine(
  container: HTMLDivElement,
  configRef: React.MutableRefObject<ARConfigState>,
  pointerStateRef: React.MutableRefObject<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
    parallaxX: number;
    parallaxY: number;
    cameraOrbitAngle: number;
    cameraElevation: number;
    transitionScale: number;
  }>,
  buildingGroupRef: React.MutableRefObject<THREE.Group | null>,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'w-full h-full block';
  container.innerHTML = '';
  container.appendChild(canvas);
  canvasRef.current = canvas;

  const ctx = canvas.getContext('2d')!;
  let frameId = 0;
  let isDisposed = false;

  // Atmospheric & Window Particles
  const particles = Array.from({ length: 160 }, (_, i) => ({
    x: (Math.random() - 0.5) * 9,
    y: Math.random() * 4.2,
    z: i < 100 ? -2.4 - Math.random() * 1.6 : (Math.random() - 0.5) * 3.2,
    speed: 0.25 + (i % 5) * 0.09,
    isGold: i < 100,
  }));

  // 36 Urban Context Blocks around the main complex (matches InstancedMesh)
  const urbanContextBlocks = Array.from({ length: 32 }, (_, i) => {
    const angle = (i / 32) * Math.PI * 2;
    const radius = 1.82 + (i % 3) * 0.28;
    return {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      w: 0.11 + (i % 3) * 0.03,
      h: 0.22 + ((i * 7) % 9) * 0.08,
      isSecondary: i % 4 === 0,
    };
  });

  // Autonomous Spatial AI Agents Definitions
  const agentCatalog = [
    { id: 'AG-01', role: 'LiDAR Depth Scanner', color: '#38BDF8', phaseOffset: 0 },
    { id: 'AG-02', role: 'BIM Structure Inspector', color: '#F59E0B', phaseOffset: 1.57 },
    { id: 'AG-03', role: 'NavMesh Path Planner', color: '#10B981', phaseOffset: 3.14 },
    { id: 'AG-04', role: 'HDR Light Probe', color: '#A855F7', phaseOffset: 4.71 },
    { id: 'AG-05', role: 'Occlusion Raycaster', color: '#EC4899', phaseOffset: 0.85 },
    { id: 'AG-06', role: 'CAD Mesh Serializer', color: '#E2E8F0', phaseOffset: 2.35 },
  ];

  const resize = () => {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(rect.width || container.clientWidth || 960, 320);
    const h = Math.max(rect.height || container.clientHeight || 620, 320);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  if (resizeObserver) resizeObserver.observe(container);
  window.addEventListener('resize', resize);

  let lastTime = performance.now();
  let accumTime = 0;

  const renderFrame = (now: number) => {
    if (isDisposed) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    accumTime += dt;

    const cfg = configRef.current;
    const pState = pointerStateRef.current;
    const pal = HOLOGRAM_PALETTES[cfg.uiSettings.palette];

    pState.transitionScale = THREE.MathUtils.damp(
      pState.transitionScale,
      cfg.modelScale,
      6.5,
      dt
    );

    if (cfg.autoRotate && !pState.isDragging && buildingGroupRef.current) {
      buildingGroupRef.current.rotation.y += dt * 0.25;
    } else if (buildingGroupRef.current) {
      buildingGroupRef.current.rotation.y = THREE.MathUtils.damp(
        buildingGroupRef.current.rotation.y,
        THREE.MathUtils.degToRad(cfg.modelRotationY),
        8,
        dt
      );
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const horizonShift = (cfg.horizonOffsetY || 0) * h;
    const cy = h * 0.65 + horizonShift;

    // Deep Parallax Multi-Layer Offsets (Foreground, Midground, Distant Landscape)
    const droneDriftX = cfg.droneFlightActive ? Math.sin(accumTime * 0.38) * 26 : 0;
    const droneDriftY = cfg.droneFlightActive ? Math.cos(accumTime * 0.29) * 11 : 0;
    const px = pState.parallaxX * cfg.parallaxIntensity * 44 + droneDriftX;
    const py = pState.parallaxY * cfg.parallaxIntensity * 24 + droneDriftY;

    const landscape = cfg.droneLandscape || 'alpine_peaks';

    // 1. Virtual Drone Flight Landscape Backdrop ("Space to Luksus")
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (landscape === 'cosmic_orbital') {
      bgGrad.addColorStop(0, '#02040A');
      bgGrad.addColorStop(0.38, '#090D24');
      bgGrad.addColorStop(0.68, '#111836');
      bgGrad.addColorStop(1, '#040711');
    } else if (landscape === 'ocean_wellness') {
      bgGrad.addColorStop(0, '#071929');
      bgGrad.addColorStop(0.45, '#0F2E47');
      bgGrad.addColorStop(0.65, '#0A2239');
      bgGrad.addColorStop(1, '#04101C');
    } else if (landscape === 'alpine_peaks') {
      bgGrad.addColorStop(0, '#040B16');
      bgGrad.addColorStop(0.42, '#0D1F33');
      bgGrad.addColorStop(0.64, '#091526');
      bgGrad.addColorStop(1, '#040811');
    } else {
      bgGrad.addColorStop(0, '#050912');
      bgGrad.addColorStop(0.42, '#0B1324');
      bgGrad.addColorStop(0.62, '#08101E');
      bgGrad.addColorStop(1, '#04070D');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Environmental Lighting & Nebula / Sun Glow
    if (cfg.environmentalLighting) {
      const tNorm = (cfg.lightTemperatureK - 2800) / (6500 - 2800);
      const glowColor =
        landscape === 'cosmic_orbital'
          ? 'rgba(139, 92, 246, 0.26)'
          : tNorm < 0.45
          ? 'rgba(245, 158, 11, 0.24)'
          : 'rgba(56, 189, 248, 0.22)';
      const sunGrad = ctx.createRadialGradient(
        cx - px * 0.35,
        h * 0.32 - py * 0.25,
        18,
        cx - px * 0.35,
        h * 0.32 - py * 0.25,
        w * 0.62
      );
      sunGrad.addColorStop(0, glowColor);
      sunGrad.addColorStop(0.55, 'rgba(6, 182, 212, 0.09)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h * 0.75);
    }

    // 2B. Deep-Parallax Drone Vista Geometry (Mountains, Cosmic Rings, Ocean Waves, or Skyline)
    ctx.save();
    if (landscape === 'alpine_peaks') {
      // Distant Mountain Range Layer 1 (Deepest Parallax)
      ctx.fillStyle = 'rgba(15, 32, 56, 0.72)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.52);
      for (let mx = -120; mx <= w + 120; mx += 65) {
        const peakH =
          65 +
          Math.sin(mx * 0.014 + 1.2) * 48 +
          Math.cos(mx * 0.029) * 32;
        ctx.lineTo(mx - px * 0.18, h * 0.48 - peakH - py * 0.12);
      }
      ctx.lineTo(w, h * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mid-Distance Alpine Ridges with Wireframe Topographic Contours (Layer 2 Parallax)
      ctx.fillStyle = 'rgba(9, 20, 38, 0.84)';
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.38)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.56);
      for (let mx = -100; mx <= w + 100; mx += 48) {
        const peakH =
          38 +
          Math.cos(mx * 0.019 + 0.5) * 36 +
          Math.sin(mx * 0.037) * 22;
        ctx.lineTo(mx - px * 0.36, h * 0.53 - peakH - py * 0.22);
      }
      ctx.lineTo(w, h * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (landscape === 'cosmic_orbital') {
      // Deep Space Starfield & Orbital Horizon Curve
      for (let s = 0; s < 55; s++) {
        const sx = ((s * 97) % w) - px * (0.08 + (s % 3) * 0.06);
        const sy = ((s * 53) % (h * 0.52)) - py * 0.1;
        ctx.fillStyle = s % 5 === 0 ? '#F59E0B' : '#E2E8F0';
        ctx.globalAlpha = 0.35 + ((s * 13) % 50) / 100;
        ctx.beginPath();
        ctx.arc((sx + w) % w, (sy + h * 0.52) % (h * 0.52), s % 4 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Planetary Orbital Arc
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx - px * 0.2, h * 1.42 - py * 0.15, h * 0.98, Math.PI * 1.18, Math.PI * 1.82);
      ctx.stroke();
    } else if (landscape === 'ocean_wellness') {
      // Calm Zen Ocean Horizon & Shimmering Water Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1;
      for (let wl = 0; wl < 9; wl++) {
        const wy = h * 0.43 + wl * 11 - py * 0.15;
        ctx.beginPath();
        ctx.moveTo(w * 0.1, wy);
        ctx.lineTo(w * 0.9, wy);
        ctx.stroke();
      }
    } else {
      // Metropolis Dawn / Executive Skyline Silhouettes
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      for (let s = -9; s <= 9; s++) {
        const bw = 26 + ((Math.abs(s) * 13) % 20);
        const bh = 38 + Math.abs(Math.sin(s * 2.1)) * 88;
        ctx.fillRect(cx + s * 56 - px * 0.28, h * 0.46 - bh - py * 0.15, bw, bh);
      }
    }
    ctx.restore();

    // 3D -> 2D Wide-Perspective Projection Helper (Responsive to perspectiveFovDeg 28°..85°)
    const fovDeg = cfg.perspectiveFovDeg || 62;
    const fovFactor = (fovDeg - 28) / (85 - 28); // 0 (Telephoto) to 1 (Ultra-Wide Perspective)
    const rotY = buildingGroupRef.current ? buildingGroupRef.current.rotation.y : 0.45;
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const baseScale =
      pState.transitionScale * Math.min(w, h) * (0.145 + (1 - fovFactor) * 0.035);
    const tilt = THREE.MathUtils.clamp(
      (pState.cameraElevation - 1.2) * 0.22 + (cfg.gyroPitchDeg || 0) * 0.005,
      0.18,
      0.56
    );
    const cameraDist = 6.6 - fovFactor * 1.85;
    const focalLen = 5.8 - fovFactor * 1.15;

    const project3D = (x: number, y: number, z: number) => {
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;
      const depth = cameraDist + rz * (0.42 + fovFactor * 0.35);
      const persp = focalLen / Math.max(1.4, depth);
      return {
        sx: cx + rx * baseScale * persp + px * (0.65 + persp * 0.35),
        sy: cy - y * baseScale * persp + rz * baseScale * tilt * persp + py * 0.75,
        depth,
        persp,
      };
    };

    // 3. Floor Plane Detection Grid (PlaneClassification.Floor)
    if (cfg.uiSettings.showPlaneGrid && cfg.planeDetectionMode !== 'table_only') {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
      ctx.lineWidth = 1;
      for (let fg = -4.2; fg <= 4.2; fg += 0.85) {
        const fp1 = project3D(fg, -0.85, -3.0);
        const fp2 = project3D(fg, -0.85, 3.0);
        ctx.beginPath();
        ctx.moveTo(fp1.sx, fp1.sy);
        ctx.lineTo(fp2.sx, fp2.sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Holographic Craftbench / AR Tabletop Surface Plane
    ctx.save();
    const tCorners = [
      project3D(-3.6, 0, -2.25),
      project3D(3.6, 0, -2.25),
      project3D(3.6, 0, 2.25),
      project3D(-3.6, 0, 2.25),
    ];
    ctx.fillStyle = 'rgba(7, 13, 25, 0.84)';
    ctx.strokeStyle = pal.primaryHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tCorners[0].sx, tCorners[0].sy);
    tCorners.slice(1).forEach((c) => ctx.lineTo(c.sx, c.sy));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    // Tabletop LiDAR & Perspective Grid
    ctx.strokeStyle = pal.primaryHex;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let g = -3.2; g <= 3.2; g += 0.4) {
      const p1 = project3D(g, 0, -2.1);
      const p2 = project3D(g, 0, 2.1);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    for (let gz = -2.0; gz <= 2.0; gz += 0.4) {
      const p3 = project3D(-3.2, 0, gz);
      const p4 = project3D(3.2, 0, gz);
      ctx.beginPath();
      ctx.moveTo(p3.sx, p3.sy);
      ctx.lineTo(p4.sx, p4.sy);
      ctx.stroke();
    }

    // Glowing Concentric Radar & AR Anchor Rings on Tabletop
    [0.95, 1.6, 2.35].forEach((r, idx) => {
      ctx.strokeStyle = idx % 2 === 0 ? pal.primaryHex : pal.secondaryHex;
      ctx.globalAlpha = 0.6 - idx * 0.12;
      ctx.lineWidth = idx === 0 ? 2.2 : 1.3;
      ctx.beginPath();
      for (let a = 0; a <= 64; a++) {
        const ang = (a / 64) * Math.PI * 2 + (idx === 1 ? accumTime * 0.18 : 0);
        const pt = project3D(Math.cos(ang) * r, 0.01, Math.sin(ang) * r);
        if (a === 0) ctx.moveTo(pt.sx, pt.sy);
        else ctx.lineTo(pt.sx, pt.sy);
      }
      ctx.stroke();
    });
    ctx.restore();

    // 5. Render Surrounding Urban Context Blocks (InstancedMesh Representation)
    urbanContextBlocks.forEach((ub) => {
      const bh = ub.h * (cfg.towerHeightMultiplier || 1.0);
      const b2 = project3D(ub.x + ub.w, 0, ub.z + ub.w);
      const b3 = project3D(ub.x - ub.w, 0, ub.z + ub.w);
      const t0 = project3D(ub.x - ub.w, bh, ub.z - ub.w);
      const t1 = project3D(ub.x + ub.w, bh, ub.z - ub.w);
      const t2 = project3D(ub.x + ub.w, bh, ub.z + ub.w);
      const t3 = project3D(ub.x - ub.w, bh, ub.z + ub.w);

      const col = ub.isSecondary ? pal.secondaryHex : pal.primaryHex;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(b3.sx, b3.sy);
      ctx.lineTo(b2.sx, b2.sy);
      ctx.lineTo(t2.sx, t2.sy);
      ctx.lineTo(t3.sx, t3.sy);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.48;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t0.sx, t0.sy);
      ctx.lineTo(t1.sx, t1.sy);
      ctx.lineTo(t2.sx, t2.sy);
      ctx.lineTo(t3.sx, t3.sy);
      ctx.closePath();
      ctx.stroke();
    });

    // 6. Render Main 3D Architectural Hologram Complex & Hobby Model-Gluing Stages
    if (buildingGroupRef.current) {
      const drawItems: Array<{
        orderIdx: number;
        depth: number;
        cx: number;
        cy: number;
        cz: number;
        wx: number;
        wy: number;
        wz: number;
        layerIndex: number;
        shapeType: string;
        label: string;
      }> = [];

      let meshCounter = 0;
      buildingGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.userData?.boxSize) {
          meshCounter++;
          const maxHobbyStep = cfg.hobbyAssemblyStep || 12;
          if (meshCounter > maxHobbyStep) return;

          const layerIdx = child.userData.layerIndex || 0;
          const baseY = child.userData.baseY || 0;
          const [bx, by, bz] = child.userData.boxSize;
          // If this is the active hobby assembly piece being glued, give it a gentle hover offset
          const isBeingGlued = meshCounter === maxHobbyStep && maxHobbyStep < 12;
          const glueHover = isBeingGlued ? 0.28 + Math.sin(accumTime * 5) * 0.08 : 0;
          const curY = baseY + layerIdx * cfg.explodedViewFactor * 0.65 + glueHover;
          const centerPt = project3D(child.position.x, curY + by * 0.5, child.position.z);
          drawItems.push({
            orderIdx: meshCounter,
            depth: centerPt.depth,
            cx: child.position.x,
            cy: curY,
            cz: child.position.z,
            wx: bx * 0.5,
            wy: by,
            wz: bz * 0.5,
            layerIndex: layerIdx,
            shapeType: child.userData.shapeType || 'tower',
            label: child.userData.partLabel || '',
          });
        }
      });

      drawItems.sort((a, b) => b.depth - a.depth);

      drawItems.forEach((item) => {
        const { cx: ix, cy: iy, cz: iz, wx, wy, wz, layerIndex, shapeType, orderIdx } = item;
        const c00 = project3D(ix - wx, iy, iz - wz);
        const c10 = project3D(ix + wx, iy, iz - wz);
        const c11 = project3D(ix + wx, iy, iz + wz);
        const c01 = project3D(ix - wx, iy, iz + wz);

        const t00 = project3D(ix - wx, iy + wy, iz - wz);
        const t10 = project3D(ix + wx, iy + wy, iz - wz);
        const t11 = project3D(ix + wx, iy + wy, iz + wz);
        const t01 = project3D(ix - wx, iy + wy, iz + wz);

        const isCoreOrCrown = layerIndex === 1 || layerIndex === 3;
        const strokeCol = isCoreOrCrown ? pal.secondaryHex : pal.primaryHex;

        ctx.save();
        ctx.strokeStyle = strokeCol;
        ctx.fillStyle = strokeCol;

        // Hobbyist CAD Assembly / Gluing Guide Connectors
        if (cfg.hobbyBlueprintConnectors && (cfg.explodedViewFactor > 0.05 || (cfg.hobbyAssemblyStep || 12) < 12)) {
          const baseAnchor = project3D(ix, 0, iz);
          const partBottom = project3D(ix, iy, iz);
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#F59E0B';
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(baseAnchor.sx, baseAnchor.sy);
          ctx.lineTo(partBottom.sx, partBottom.sy);
          ctx.stroke();
          ctx.restore();
        }

        // Holographic Shaded Faces
        if (!cfg.wireframeOverlay) {
          ctx.globalAlpha = layerIndex === 0 ? 0.35 : isCoreOrCrown ? 0.32 : 0.24;
          ctx.beginPath();
          ctx.moveTo(c01.sx, c01.sy);
          ctx.lineTo(c11.sx, c11.sy);
          ctx.lineTo(t11.sx, t11.sy);
          ctx.lineTo(t01.sx, t01.sy);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = layerIndex === 0 ? 0.28 : 0.18;
          ctx.beginPath();
          ctx.moveTo(c10.sx, c10.sy);
          ctx.lineTo(c11.sx, c11.sy);
          ctx.lineTo(t11.sx, t11.sy);
          ctx.lineTo(t10.sx, t10.sy);
          ctx.closePath();
          ctx.fill();

          ctx.globalAlpha = 0.38;
          ctx.beginPath();
          ctx.moveTo(t00.sx, t00.sy);
          ctx.lineTo(t10.sx, t10.sy);
          ctx.lineTo(t11.sx, t11.sy);
          ctx.lineTo(t01.sx, t01.sy);
          ctx.closePath();
          ctx.fill();
        }

        // Architectural Floor Plates
        if (wy > 0.45 && shapeType === 'tower') {
          ctx.globalAlpha = 0.38;
          ctx.lineWidth = 0.85;
          const floors = Math.min(12, Math.max(3, Math.floor(wy * 4.5)));
          for (let f = 1; f < floors; f++) {
            const fy = iy + (wy * f) / floors;
            const f00 = project3D(ix - wx, fy, iz - wz);
            const f10 = project3D(ix + wx, fy, iz - wz);
            const f11 = project3D(ix + wx, fy, iz + wz);
            const f01 = project3D(ix - wx, fy, iz + wz);
            ctx.beginPath();
            ctx.moveTo(f00.sx, f00.sy);
            ctx.lineTo(f10.sx, f10.sy);
            ctx.lineTo(f11.sx, f11.sy);
            ctx.lineTo(f01.sx, f01.sy);
            ctx.closePath();
            ctx.stroke();
          }
        }

        // Crisp Glowing Structural Wireframe Edges
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = layerIndex === 2 ? 1.8 : 1.3;

        ctx.beginPath();
        ctx.moveTo(c00.sx, c00.sy);
        ctx.lineTo(c10.sx, c10.sy);
        ctx.lineTo(c11.sx, c11.sy);
        ctx.lineTo(c01.sx, c01.sy);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(t00.sx, t00.sy);
        ctx.lineTo(t10.sx, t10.sy);
        ctx.lineTo(t11.sx, t11.sy);
        ctx.lineTo(t01.sx, t01.sy);
        ctx.closePath();
        ctx.stroke();

        [
          [c00, t00],
          [c10, t10],
          [c11, t11],
          [c01, t01],
        ].forEach(([b, t]) => {
          ctx.beginPath();
          ctx.moveTo(b.sx, b.sy);
          ctx.lineTo(t.sx, t.sy);
          ctx.stroke();
        });

        if (layerIndex >= 2 && wy > 0.8) {
          ctx.globalAlpha = 0.42;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(c01.sx, c01.sy);
          ctx.lineTo(t11.sx, t11.sy);
          ctx.moveTo(c11.sx, c11.sy);
          ctx.lineTo(t01.sx, t01.sy);
          ctx.stroke();
        }

        // Show hobby assembly part tag if in step-by-step gluing mode
        if ((cfg.hobbyAssemblyStep || 12) < 12 && orderIdx === cfg.hobbyAssemblyStep) {
          ctx.fillStyle = '#F59E0B';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText(`KLEJENIE MODUŁU #0${orderIdx}: ${item.label}`, t01.sx - 20, t01.sy - 10);
        }
        ctx.restore();
      });
    }

    // 7. Render Autonomous 3D Spatial AI Agents & NavMesh Trajectories
    if (cfg.showSpatialAgents) {
      const count = Math.min(agentCatalog.length, Math.max(2, cfg.activeAgentsCount || 4));
      const hm = cfg.towerHeightMultiplier || 1.0;

      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#38BDF8';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      const navRadius = cfg.agentNavMode === 'facade_scan' ? 1.25 : 2.05;
      const navHeight =
        cfg.agentNavMode === 'floor_patrol'
          ? 0.08
          : cfg.agentNavMode === 'facade_scan'
          ? 1.45 * hm
          : 0.95 * hm;

      ctx.beginPath();
      for (let s = 0; s <= 48; s++) {
        const ang = (s / 48) * Math.PI * 2;
        const np = project3D(Math.cos(ang) * navRadius, navHeight, Math.sin(ang) * navRadius);
        if (s === 0) ctx.moveTo(np.sx, np.sy);
        else ctx.lineTo(np.sx, np.sy);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = 0; i < count; i++) {
        const ag = agentCatalog[i];
        const t = accumTime * 0.65 + ag.phaseOffset;

        let ax = Math.cos(t) * navRadius;
        let az = Math.sin(t) * navRadius;
        let ay = navHeight + Math.sin(accumTime * 2.2 + i) * 0.18;

        if (cfg.agentNavMode === 'facade_scan') {
          ay = (0.4 + ((Math.sin(t * 1.3) + 1) * 0.5) * 2.4) * hm;
        } else if (cfg.agentNavMode === 'floor_patrol') {
          ay = 0.08;
          ax = Math.cos(t * 0.8) * (1.5 + (i % 2) * 0.65);
          az = Math.sin(t * 0.8) * (1.2 + (i % 2) * 0.45);
        }

        const agentPt = project3D(ax, ay, az);
        const scanTargetY = cfg.agentNavMode === 'floor_patrol' ? 0 : ay * 0.65;
        const targetPt = project3D(0, scanTargetY, 0);

        const beamGrad = ctx.createLinearGradient(
          agentPt.sx,
          agentPt.sy,
          targetPt.sx,
          targetPt.sy
        );
        beamGrad.addColorStop(0, ag.color);
        beamGrad.addColorStop(1, 'rgba(6, 182, 212, 0.02)');
        ctx.strokeStyle = beamGrad;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.moveTo(agentPt.sx, agentPt.sy);
        ctx.lineTo(targetPt.sx, targetPt.sy);
        ctx.stroke();

        const groundPt = project3D(ax, 0, az);
        ctx.strokeStyle = ag.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(agentPt.sx, agentPt.sy);
        ctx.lineTo(groundPt.sx, groundPt.sy);
        ctx.stroke();

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = ag.color;
        ctx.beginPath();
        ctx.arc(agentPt.sx, agentPt.sy, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(agentPt.sx, agentPt.sy, 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(11, 15, 23, 0.78)';
        ctx.strokeStyle = ag.color;
        ctx.lineWidth = 1;
        const bx = agentPt.sx + 12;
        const by = agentPt.sy - 14;
        ctx.fillRect(bx, by, 136, 22);
        ctx.strokeRect(bx, by, 136, 22);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(`${ag.id}: ${ag.role.slice(0, 14)}`, bx + 5, by + 14);
      }
      ctx.restore();
    }

    // 8. Dynamic Window & Atmospheric Drone Particles
    if (cfg.windowParticlesIntensity > 0.02) {
      particles.forEach((p) => {
        p.y += dt * p.speed * cfg.windowParticlesIntensity;
        if (p.y > 4.2) p.y = 0.05;
        const pt = project3D(p.x * 0.55, p.y, p.z * 0.55);
        ctx.fillStyle = p.isGold ? '#F59E0B' : pal.primaryHex;
        ctx.globalAlpha = cfg.windowParticlesIntensity * 0.78;
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, p.isGold ? 2.2 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 9. Bounded Deep-Parallax Workspace Frame (Passe-partout Margin) & Composition Planning Tools
    const margin = cfg.workspaceMarginPx || 28;
    const fw = w - margin * 2;
    const fh = h - margin * 2;
    const compMode = cfg.compositionGrid || 'golden_ratio';

    ctx.save();
    // Outer Passe-Partout Optical Frame Border
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(margin, margin, fw, fh);

    // Corner Precision Calibration Brackets
    const bLen = 18;
    ctx.strokeStyle = pal.primaryHex;
    ctx.lineWidth = 2;
    [
      [margin, margin, 1, 1],
      [w - margin, margin, -1, 1],
      [margin, h - margin, 1, -1],
      [w - margin, h - margin, -1, -1],
    ].forEach(([bx, by, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(bx + dx * bLen, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + dy * bLen);
      ctx.stroke();
    });

    // Composition & Perspective Planning Guides inside the Bounded Workspace
    if (compMode === 'golden_ratio') {
      const phiX1 = margin + fw * 0.382;
      const phiX2 = margin + fw * 0.618;
      const phiY1 = margin + fh * 0.382;
      const phiY2 = margin + fh * 0.618;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.26)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(phiX1, margin);
      ctx.lineTo(phiX1, h - margin);
      ctx.moveTo(phiX2, margin);
      ctx.lineTo(phiX2, h - margin);
      ctx.moveTo(margin, phiY1);
      ctx.lineTo(w - margin, phiY1);
      ctx.moveTo(margin, phiY2);
      ctx.lineTo(w - margin, phiY2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (compMode === 'perspective_rays') {
      const vpX = cx + px * 0.35;
      const vpY = h * 0.44 + horizonShift + py * 0.25;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 1;
      // Horizon line
      ctx.beginPath();
      ctx.moveTo(margin, vpY);
      ctx.lineTo(w - margin, vpY);
      ctx.stroke();
      // Vanishing point perspective rays
      ctx.setLineDash([4, 6]);
      for (let r = 0; r < 12; r++) {
        const ang = (r / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(vpX + Math.cos(ang) * w * 0.7, vpY + Math.sin(ang) * h * 0.7);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(vpX, vpY, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (compMode === 'depth_planes') {
      // 3 Depth Planes (1. Plan / 2. Plan / 3. Plan Głębi)
      [
        { ratio: 0.14, label: '3. PLAN TŁA (KRAJOBRAZ DRONA — GŁĘBOKA PARALAKSA)', col: 'rgba(148,163,184,0.35)' },
        { ratio: 0.08, label: '2. PLAN ŚRODKOWY (BRYŁA ARCHITEKTONICZNA / WARSZTAT)', col: 'rgba(56,189,248,0.4)' },
      ].forEach((pl) => {
        const ox = margin + fw * pl.ratio;
        const oy = margin + fh * pl.ratio;
        ctx.strokeStyle = pl.col;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(ox, oy, fw * (1 - pl.ratio * 2), fh * (1 - pl.ratio * 2));
        ctx.setLineDash([]);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillText(pl.label, ox + 8, oy + 14);
      });
    } else if (compMode === 'rule_of_thirds') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(margin + (fw * i) / 3, margin);
        ctx.lineTo(margin + (fw * i) / 3, h - margin);
        ctx.moveTo(margin, margin + (fh * i) / 3);
        ctx.lineTo(w - margin, margin + (fh * i) / 3);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 10. Translucent Frosted-Glass Spatial Telemetry Panels Inside Workspace
    if (cfg.uiSettings.showFloatingPanels && w > 680) {
      ctx.save();
      const panels = [
        {
          x: margin + 16 - px * 0.28,
          y: h * 0.2 - py * 0.22,
          title: 'PERSPEKTYWA I KOMPOZYCJA 3D',
          line1: `OGNISKOWA: ${fovDeg}° FOV · MARGINES: ${margin}px`,
          line2: `SIATKA: ${compMode.toUpperCase()} · DOF: ${Math.round((cfg.depthOfFieldIntensity || 0.7) * 100)}%`,
        },
        {
          x: w - margin - 236 - px * 0.28,
          y: h * 0.2 - py * 0.22,
          title: 'LOT DRONEM („SPACE TO LUKSUS”)',
          line1: `KRAJOBRAZ: ${landscape.toUpperCase()}`,
          line2: `PUŁAP: ${cfg.droneAltitudeM || 650}m · KLEJENIE: ${cfg.hobbyAssemblyStep || 12}/12`,
        },
      ];
      panels.forEach((fp) => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.fillRect(fp.x, fp.y, 220, 64);
        ctx.strokeRect(fp.x, fp.y, 220, 64);
        ctx.fillStyle = '#38BDF8';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillText(fp.title, fp.x + 10, fp.y + 18);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText(fp.line1, fp.x + 10, fp.y + 36);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(fp.line2, fp.x + 10, fp.y + 52);
      });
      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
    frameId = requestAnimationFrame(renderFrame);
  };

  frameId = requestAnimationFrame(renderFrame);

  return () => {
    isDisposed = true;
    cancelAnimationFrame(frameId);
    if (resizeObserver) resizeObserver.disconnect();
    window.removeEventListener('resize', resize);
  };
}

export const HologramViewport3D: React.FC<HologramViewport3DProps> = ({
  config,
  onUpdateConfig,
  onCaptureScreenshot,
  onExportMessage,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);

  const configRef = useRef<ARConfigState>(config);
  configRef.current = config;

  const pointerStateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    parallaxX: 0,
    parallaxY: 0,
    cameraOrbitAngle: 0.35,
    cameraElevation: 2.35,
    transitionScale: 0.01,
  });

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isFullscreenBleed, setIsFullscreenBleed] = useState(false);
  const [showReferenceComparison, setShowReferenceComparison] = useState(false);

  const activeSceneMeta =
    ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId) || ARCHITECTURAL_SCENES[0];
  const activePalette = HOLOGRAM_PALETTES[config.uiSettings.palette];

  // Mount High-Precision 3D Hologram & Spatial Agent Engine Once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    buildingGroupRef.current = buildArchitecturalSceneGroup(
      configRef.current.sceneId,
      activePalette.primaryHex,
      activePalette.secondaryHex,
      configRef.current.wireframeOverlay,
      configRef.current.towerHeightMultiplier || 1.0
    );

    return startHologram3DEngine(
      container,
      configRef,
      pointerStateRef,
      buildingGroupRef,
      canvasRef
    );
  }, []);

  // Rebuild 3D Mesh Group whenever sceneId, palette, wireframe, or towerHeightMultiplier changes
  useEffect(() => {
    const nextGroup = buildArchitecturalSceneGroup(
      config.sceneId,
      activePalette.primaryHex,
      activePalette.secondaryHex,
      config.wireframeOverlay,
      config.towerHeightMultiplier || 1.0
    );
    nextGroup.rotation.y = THREE.MathUtils.degToRad(config.modelRotationY);
    pointerStateRef.current.transitionScale = 0.25;
    buildingGroupRef.current = nextGroup;
  }, [
    config.sceneId,
    config.uiSettings.palette,
    config.wireframeOverlay,
    config.towerHeightMultiplier,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStateRef.current.isDragging = true;
    pointerStateRef.current.lastX = e.clientX;
    pointerStateRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const normY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    pointerStateRef.current.parallaxX = normX;
    pointerStateRef.current.parallaxY = normY;

    if (pointerStateRef.current.isDragging) {
      const dx = e.clientX - pointerStateRef.current.lastX;
      const dy = e.clientY - pointerStateRef.current.lastY;
      pointerStateRef.current.lastX = e.clientX;
      pointerStateRef.current.lastY = e.clientY;

      const nextRot = (config.modelRotationY + dx * 0.65) % 360;
      onUpdateConfig({ modelRotationY: Math.round(nextRot), autoRotate: false });

      pointerStateRef.current.cameraElevation = THREE.MathUtils.clamp(
        pointerStateRef.current.cameraElevation + dy * 0.01,
        0.65,
        4.2
      );
    }
  };

  const handlePointerUp = () => {
    pointerStateRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const scaleDelta = e.deltaY > 0 ? -0.08 : 0.08;
    const nextScale = THREE.MathUtils.clamp(
      Number((config.modelScale + scaleDelta).toFixed(2)),
      0.4,
      2.2
    );
    onUpdateConfig({ modelScale: nextScale });
  };

  const handleScreenshotCapture = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (!dataUrl) return;
    onCaptureScreenshot(dataUrl, config.customSceneTitle || activeSceneMeta.name);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `HoloArch_AR_${config.sceneId}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onExportMessage('Zrzut ekranu AR zapisany bezpośrednio do galerii urządzenia (.PNG)');
  };

  const handleExportOBJ = () => {
    if (!buildingGroupRef.current) return;
    const stats = exportGroupToOBJ(buildingGroupRef.current, `HoloArch_${config.sceneId}.obj`);
    onExportMessage(
      `Wyeksportowano model 3D do .OBJ (${stats.vertexCount} wierzchołków, ${stats.faceCount} ścian)`
    );
  };

  const handleExportSTL = () => {
    if (!buildingGroupRef.current) return;
    const stats = exportGroupToSTL(buildingGroupRef.current, `HoloArch_${config.sceneId}.stl`);
    onExportMessage(
      `Wyeksportowano bryłę do .STL (${stats.triangleCount} trójkątów gotowych do druku 3D / CAD)`
    );
  };

  const handleExportPLY = () => {
    if (!buildingGroupRef.current) return;
    const exportClone = buildingGroupRef.current.clone(true);
    exportClone.scale.setScalar(config.modelScale || 1.0);
    exportClone.rotation.y = THREE.MathUtils.degToRad(config.modelRotationY || 0);
    if (config.explodedViewFactor > 0.01) {
      exportClone.traverse((child) => {
        if (child instanceof THREE.Mesh && typeof child.userData?.layerIndex === 'number') {
          child.position.y += child.userData.layerIndex * config.explodedViewFactor * 0.55;
        }
      });
    }
    const stats = exportGroupToPLY(
      exportClone,
      `HoloArch_PointCloud_${config.sceneId}.ply`,
      config
    );
    onExportMessage(
      `Wyeksportowano chmurę punktów 3D do .PLY (${stats.pointCount.toLocaleString('pl-PL')} punktów z normalnymi i kolorami RGB)`
    );
  };

  return (
    <div
      className={
        isFullscreenBleed
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#070B12] select-none overflow-hidden'
          : 'relative w-full h-[620px] lg:h-[680px] rounded-xl overflow-hidden border border-slate-800 bg-[#070B12] select-none'
      }
    >
      {/* Dedicated Isolated 3D Canvas Mount */}
      <div
        ref={canvasMountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Optional Reference Image Split/Overlay Comparison */}
      {showReferenceComparison && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-black/75 p-6">
          <div className="max-w-3xl w-full bg-[#0B0F17] border border-slate-700 rounded-xl overflow-hidden shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Wizualizacja Referencyjna Stołu Holograficznego AR
                </h4>
                <p className="text-xs text-slate-400">
                  Wzorzec oświetlenia środowiskowego, mapy blatu, hologramu wysokościowców i paneli
                  przestrzennych
                </p>
              </div>
              <button
                onClick={() => setShowReferenceComparison(false)}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Zamknij podgląd
              </button>
            </div>
            <img
              src="/assets/aistudio/Dashboard_dex_eeffcbc7.jpg"
              alt="Referencyjny hologram architektoniczny na stole konferencyjnym"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[440px] object-cover"
            />
          </div>
        </div>
      )}

      {/* Minimal Top-Left Scene Spec Header (Translucent Frosted Glass) */}
      <div className="absolute top-6 left-6 right-6 z-10 flex flex-wrap items-start justify-between gap-4 pointer-events-none">
        <div className="bg-slate-950/55 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-2.5 pointer-events-auto max-w-md shadow-2xl">
          <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono tabular-nums">
            <span>FOV {config.perspectiveFovDeg || 62}°</span>
            <span aria-hidden="true">·</span>
            <span>Skala {config.modelScale.toFixed(2)}x</span>
            <span aria-hidden="true">·</span>
            <span>
              {Math.round(activeSceneMeta.realWorldHeightM * (config.towerHeightMultiplier || 1))} m
              wys.
            </span>
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
            {config.customSceneTitle || activeSceneMeta.name}
          </h2>
          {config.uiSettings.hudDensity === 'detailed' && (
            <p className="text-xs text-slate-300 mt-1 line-clamp-1">{activeSceneMeta.subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <button
            onClick={() => onUpdateConfig({ showSpatialAgents: !config.showSpatialAgents })}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border backdrop-blur-xl transition-colors whitespace-nowrap shrink-0 ${
              config.showSpatialAgents
                ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
                : 'bg-slate-950/55 border-white/15 text-slate-200'
            }`}
            title="Włącz lub wyłącz autonomicznych agentów AI poruszających się po siatce NavMesh 3D"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Agenci 3D: {config.showSpatialAgents ? 'AKTYWNI' : 'Wył.'}</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-950/55 backdrop-blur-xl border border-white/15 rounded-lg">
            {ARCHITECTURAL_SCENES.map((scene, idx) => (
              <button
                key={scene.id}
                onClick={() => onUpdateConfig({ sceneId: scene.id, customSceneTitle: undefined })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  config.sceneId === scene.id
                    ? 'bg-cyan-500 text-slate-950 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                Scena 0{idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowReferenceComparison((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-950/55 backdrop-blur-xl hover:bg-slate-900/80 text-slate-100 border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Porównaj z obrazem referencyjnym stołu AR"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Wzorzec AR</span>
          </button>

          <button
            onClick={() => setIsFullscreenBleed((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-950/55 backdrop-blur-xl hover:bg-slate-900/80 text-slate-100 border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
            title="Przełącz pełnoekranowy widok 100vw x 100vh"
          >
            {isFullscreenBleed ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Zamknij 100vh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>100vw × 100vh</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Translucent Glass <= 15% Viewport Footprint) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-6 z-10 w-[92%] max-w-[940px] transition-transform duration-200"
        style={{
          transform: dockCollapsed
            ? 'translate(-50%, calc(100% - 34px))'
            : 'translate(-50%, 0)',
        }}
      >
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setDockCollapsed((c) => !c)}
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-medium bg-slate-950/65 backdrop-blur-xl text-slate-200 hover:text-white border border-white/15 rounded-t-lg transition-colors whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pokaż szklany dok parametrów AR</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Ukryj dok HUD (Czysty Kadr Paralaksy)</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-950/60 backdrop-blur-xl border border-white/15 rounded-xl p-3.5 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    Skala (Pinch)
                  </span>
                  <span className="font-mono tabular-nums text-cyan-400">
                    {config.modelScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.05}
                  value={config.modelScale}
                  onChange={(e) => onUpdateConfig({ modelScale: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-amber-400" />
                    Warstwy 3D
                  </span>
                  <span className="font-mono tabular-nums text-amber-400">
                    {Math.round(config.explodedViewFactor * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.explodedViewFactor}
                  onChange={(e) =>
                    onUpdateConfig({ explodedViewFactor: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-cyan-400" />
                    Paralaksa 6DoF
                  </span>
                  <span className="font-mono tabular-nums text-cyan-400">
                    {Math.round(config.parallaxIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.parallaxIntensity}
                  onChange={(e) =>
                    onUpdateConfig({ parallaxIntensity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Cząsteczki okien
                  </span>
                  <span className="font-mono tabular-nums text-amber-400">
                    {Math.round(config.windowParticlesIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.windowParticlesIntensity}
                  onChange={(e) =>
                    onUpdateConfig({ windowParticlesIntensity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleScreenshotCapture}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Zapisz zrzut ekranu hologramu bezpośrednio do galerii urządzenia"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Zrzut do galerii</span>
              </button>

              <button
                onClick={handleExportOBJ}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Eksportuj siatkę budynku do formatu Wavefront .OBJ"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>.OBJ</span>
              </button>

              <button
                onClick={handleExportSTL}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Eksportuj bryłę architektoniczną do formatu druku 3D .STL"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>.STL</span>
              </button>

              <button
                onClick={handleExportPLY}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-medium bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0"
                title="Eksportuj aktualną siatkę 3D jako chmurę punktów w formacie inżynierskim .PLY (CloudCompare, MeshLab, Autodesk ReCap)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>.PLY</span>
              </button>

              <button
                onClick={() =>
                  onUpdateConfig({
                    modelScale: 1.0,
                    towerHeightMultiplier: 1.0,
                    modelRotationY: 25,
                    explodedViewFactor: 0,
                    autoRotate: true,
                  })
                }
                className="p-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors shrink-0"
                title="Resetuj pozycję i skalę modelu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
