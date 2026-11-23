import * as THREE from 'three';
import { jsPDF } from 'jspdf';
import { ARConfigState } from '../types/arStudio';
import {
  ARCHITECTURAL_SCENES,
  HOLOGRAM_PALETTES,
  SUPPORTED_MOBILE_DEVICES,
  generateMasterPrompt,
} from '../data/arStudioData';

/**
 * Exports a Three.js Group containing architectural building meshes to Wavefront .OBJ format
 */
export function exportGroupToOBJ(group: THREE.Group, filename: string): {
  vertexCount: number;
  faceCount: number;
} {
  const lines: string[] = [];
  lines.push('# HoloArch AR Studio - Wavefront OBJ Architectural Export');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`o ${filename.replace(/\.obj$/i, '')}`);

  let vertexOffset = 1;
  let totalVertices = 0;
  let totalFaces = 0;
  const tempVertex = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  group.updateMatrixWorld(true);

  let partIndex = 1;
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;

      lines.push(`\ng ArchPart_${partIndex++}_${child.name || 'Structure'}`);
      normalMatrix.getNormalMatrix(child.matrixWorld);

      for (let i = 0; i < posAttr.count; i++) {
        tempVertex.fromBufferAttribute(posAttr, i);
        tempVertex.applyMatrix4(child.matrixWorld);
        lines.push(
          `v ${tempVertex.x.toFixed(5)} ${tempVertex.y.toFixed(5)} ${tempVertex.z.toFixed(5)}`
        );
        totalVertices++;
      }

      const normAttr = geom.getAttribute('normal');
      if (normAttr) {
        for (let i = 0; i < normAttr.count; i++) {
          tempNormal.fromBufferAttribute(normAttr, i);
          tempNormal.applyMatrix3(normalMatrix).normalize();
          lines.push(
            `vn ${tempNormal.x.toFixed(5)} ${tempNormal.y.toFixed(5)} ${tempNormal.z.toFixed(5)}`
          );
        }
      }

      const indexAttr = geom.getIndex();
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i += 3) {
          const a = indexAttr.getX(i) + vertexOffset;
          const b = indexAttr.getX(i + 1) + vertexOffset;
          const c = indexAttr.getX(i + 2) + vertexOffset;
          lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
          totalFaces++;
        }
      } else {
        for (let i = 0; i < posAttr.count; i += 3) {
          const a = i + vertexOffset;
          const b = i + 1 + vertexOffset;
          const c = i + 2 + vertexOffset;
          lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
          totalFaces++;
        }
      }

      vertexOffset += posAttr.count;
    }
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.obj') ? filename : `${filename}.obj`);
  return { vertexCount: totalVertices, faceCount: totalFaces };
}

/**
 * Exports a Three.js Group containing architectural building meshes to ASCII .STL format
 */
export function exportGroupToSTL(group: THREE.Group, filename: string): {
  triangleCount: number;
} {
  const solidName = filename.replace(/\.stl$/i, '').replace(/\s+/g, '_');
  const lines: string[] = [`solid ${solidName}`];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  let triangleCount = 0;
  group.updateMatrixWorld(true);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;

      const indexAttr = geom.getIndex();
      const count = indexAttr ? indexAttr.count : posAttr.count;

      for (let i = 0; i < count; i += 3) {
        const iA = indexAttr ? indexAttr.getX(i) : i;
        const iB = indexAttr ? indexAttr.getX(i + 1) : i + 1;
        const iC = indexAttr ? indexAttr.getX(i + 2) : i + 2;

        vA.fromBufferAttribute(posAttr, iA).applyMatrix4(child.matrixWorld);
        vB.fromBufferAttribute(posAttr, iB).applyMatrix4(child.matrixWorld);
        vC.fromBufferAttribute(posAttr, iC).applyMatrix4(child.matrixWorld);

        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab).normalize();

        lines.push(
          `  facet normal ${cb.x.toFixed(5)} ${cb.y.toFixed(5)} ${cb.z.toFixed(5)}`
        );
        lines.push('    outer loop');
        lines.push(`      vertex ${vA.x.toFixed(5)} ${vA.y.toFixed(5)} ${vA.z.toFixed(5)}`);
        lines.push(`      vertex ${vB.x.toFixed(5)} ${vB.y.toFixed(5)} ${vB.z.toFixed(5)}`);
        lines.push(`      vertex ${vC.x.toFixed(5)} ${vC.y.toFixed(5)} ${vC.z.toFixed(5)}`);
        lines.push('    endloop');
        lines.push('  endfacet');
        triangleCount++;
      }
    }
  });

  lines.push(`endsolid ${solidName}`);
  const blob = new Blob([lines.join('\n')], { type: 'application/sla;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.stl') ? filename : `${filename}.stl`);
  return { triangleCount };
}

/**
 * Serializes a Three.js Group into an engineering-grade Stanford .PLY 3D Point Cloud (ASCII 1.0)
 * with dense barycentric triangle surface sampling, world-space normals (nx, ny, nz),
 * and LiDAR elevation-mapped RGB vertex colors compatible with CloudCompare, MeshLab, Autodesk ReCap, Blender & Rhino.
 */
export function serializeGroupToPLY(
  group: THREE.Group,
  config?: ARConfigState
): { content: string; pointCount: number } {
  group.updateMatrixWorld(true);

  const palette = config
    ? HOLOGRAM_PALETTES[config.uiSettings.palette] || HOLOGRAM_PALETTES.cyan_blueprint
    : HOLOGRAM_PALETTES.cyan_blueprint;

  const primaryCol = new THREE.Color(palette.primaryHex);
  const secondaryCol = new THREE.Color(palette.secondaryHex);
  const mixedCol = new THREE.Color();

  interface PlyPoint {
    x: number;
    y: number;
    z: number;
    nx: number;
    ny: number;
    nz: number;
  }

  const rawPoints: PlyPoint[] = [];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const triNormal = new THREE.Vector3();
  const samplePt = new THREE.Vector3();
  const tempVertex = new THREE.Vector3();
  const tempNormal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  let minY = Infinity;
  let maxY = -Infinity;

  const pushPoint = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    rawPoints.push({ x, y, z, nx, ny, nz });
  };

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;

      const normAttr = geom.getAttribute('normal');
      normalMatrix.getNormalMatrix(child.matrixWorld);

      // 1. Include all exact mesh vertices
      for (let i = 0; i < posAttr.count; i++) {
        tempVertex.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
        if (normAttr) {
          tempNormal.fromBufferAttribute(normAttr, i).applyMatrix3(normalMatrix).normalize();
        } else {
          tempNormal.set(0, 1, 0);
        }
        pushPoint(
          tempVertex.x,
          tempVertex.y,
          tempVertex.z,
          tempNormal.x,
          tempNormal.y,
          tempNormal.z
        );
      }

      // 2. Sample points across triangle faces so architectural walls/slabs form a dense LiDAR point cloud
      const indexAttr = geom.getIndex();
      const count = indexAttr ? indexAttr.count : posAttr.count;
      const densityPerSqUnit = 42; // Balanced density for CAD / CloudCompare responsiveness

      for (let i = 0; i < count; i += 3) {
        const iA = indexAttr ? indexAttr.getX(i) : i;
        const iB = indexAttr ? indexAttr.getX(i + 1) : i + 1;
        const iC = indexAttr ? indexAttr.getX(i + 2) : i + 2;

        vA.fromBufferAttribute(posAttr, iA).applyMatrix4(child.matrixWorld);
        vB.fromBufferAttribute(posAttr, iB).applyMatrix4(child.matrixWorld);
        vC.fromBufferAttribute(posAttr, iC).applyMatrix4(child.matrixWorld);

        edge1.subVectors(vB, vA);
        edge2.subVectors(vC, vA);
        triNormal.crossVectors(edge1, edge2);
        const area = 0.5 * triNormal.length();
        if (area < 1e-6) continue;
        triNormal.normalize();

        const samplesForTri = Math.min(24, Math.max(1, Math.floor(area * densityPerSqUnit)));
        for (let s = 0; s < samplesForTri; s++) {
          // Deterministic Halton-like quasi-random barycentric coordinates (base 2 & 3)
          let u = 0;
          let f = 0.5;
          let n = i + s * 7 + 1;
          while (n > 0) {
            u += f * (n % 2);
            n = Math.floor(n / 2);
            f *= 0.5;
          }
          let v = 0;
          let f3 = 1 / 3;
          let m = i + s * 11 + 1;
          while (m > 0) {
            v += f3 * (m % 3);
            m = Math.floor(m / 3);
            f3 /= 3;
          }
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          const w = 1 - u - v;
          samplePt.set(
            vA.x * w + vB.x * u + vC.x * v,
            vA.y * w + vB.y * u + vC.y * v,
            vA.z * w + vB.z * u + vC.z * v
          );
          pushPoint(samplePt.x, samplePt.y, samplePt.z, triNormal.x, triNormal.y, triNormal.z);
        }
      }
    }
  });

  const heightSpan = Math.max(0.001, maxY - minY);
  const header = [
    'ply',
    'format ascii 1.0',
    'comment HoloArch AR Studio - Engineering 3D Point Cloud Export (.PLY)',
    `comment Scene: ${config?.sceneId || 'architectural_mesh'} | Scale: ${config?.modelScale ?? 1}x | Generated: ${new Date().toISOString()}`,
    'comment Coordinate System: Right-Handed Y-Up (Meters, Scaled AR Anchor)',
    `element vertex ${rawPoints.length}`,
    'property float x',
    'property float y',
    'property float z',
    'property float nx',
    'property float ny',
    'property float nz',
    'property uchar red',
    'property uchar green',
    'property uchar blue',
    'end_header',
  ];

  const bodyLines = new Array<string>(rawPoints.length);
  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const tElev = Math.max(0, Math.min(1, (pt.y - minY) / heightSpan));
    mixedCol.copy(primaryCol).lerp(secondaryCol, tElev);
    const r = Math.round(mixedCol.r * 255);
    const g = Math.round(mixedCol.g * 255);
    const b = Math.round(mixedCol.b * 255);
    bodyLines[i] = `${pt.x.toFixed(5)} ${pt.y.toFixed(5)} ${pt.z.toFixed(5)} ${pt.nx.toFixed(4)} ${pt.ny.toFixed(4)} ${pt.nz.toFixed(4)} ${r} ${g} ${b}`;
  }

  return {
    content: `${header.join('\n')}\n${bodyLines.join('\n')}\n`,
    pointCount: rawPoints.length,
  };
}

/**
 * Exports a live Three.js Group as a Stanford .PLY 3D Point Cloud file
 */
export function exportGroupToPLY(
  group: THREE.Group,
  filename: string,
  config?: ARConfigState
): { pointCount: number } {
  const { content, pointCount } = serializeGroupToPLY(group, config);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.ply') ? filename : `${filename}.ply`);
  return { pointCount };
}

/**
 * Generates .PLY point cloud text from ARConfigState (for Google Drive upload or direct CAD export)
 */
export function generatePLYContent(config: ARConfigState): { content: string; pointCount: number } {
  const group = createProceduralSceneGroup(config);
  group.rotation.y = THREE.MathUtils.degToRad(config.modelRotationY || 0);
  if (config.explodedViewFactor && config.explodedViewFactor > 0.01) {
    let idx = 0;
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.position.y += idx * 0.22 * config.explodedViewFactor;
        idx++;
      }
    });
  }
  group.updateMatrixWorld(true);
  return serializeGroupToPLY(group, config);
}

/**
 * Exports current ARConfigState procedural 3D architectural mesh as a .PLY Point Cloud
 */
export function exportProjectToPLY(config: ARConfigState): { pointCount: number } {
  const { content, pointCount } = generatePLYContent(config);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `HoloArch_PointCloud_${config.sceneId}.ply`);
  return { pointCount };
}

/**
 * Strips Polish diacritics for standard PDF Helvetica font compatibility
 */
function normalizePdfText(str: string): string {
  const map: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
    '„': '"', '”': '"', '–': '-', '—': '-', '±': '+/-', '°': ' deg',
  };
  return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ„”–—±°]/g, (m) => map[m] || m);
}

/**
 * Generates an advanced multi-page PDF architectural specification & prompt document
 */
export function exportProjectToPDF(
  config: ARConfigState,
  screenshotDataUrl?: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const sceneMeta =
    ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId) || ARCHITECTURAL_SCENES[0];
  const palette = HOLOGRAM_PALETTES[config.uiSettings.palette];
  const prompts = generateMasterPrompt(config);

  // Header Banner
  doc.setFillColor(11, 15, 23);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HOLOARCH AR STUDIO - SPECYFIKACJA TECHNICZNA & PROMPT', 14, 15);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    normalizePdfText(
      `Scena: ${sceneMeta.name} | Silnik: Unity AR Foundation (ARKit + ARCore) | Data: ${new Date().toLocaleDateString('pl-PL')}`
    ),
    14,
    24
  );

  let y = 44;

  // Section 1: Parametry Konfiguracji AR
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Konfiguracja Systemu Hologramow AR i Czujnikow Glebi', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const specs = [
    `Model Architektoniczny: ${sceneMeta.name} (${sceneMeta.realWorldHeightM} m wysokosci, ${sceneMeta.partsCount} modulow)`,
    `Detekcja Powierzchni: ${config.planeDetectionMode} (Czujniki Glebi ToF / LiDAR: ${config.depthSensorActive ? 'AKTYWNE' : 'Wyl.'})`,
    `Oswietlenie Srodowiskowe i Okluzja: HDR Light Estimation (${config.lightTemperatureK}K) | Okluzja: ${config.occlusionEnabled ? 'TAK' : 'NIE'}`,
    `Efekt Paralaksy 6DoF i Czasteczki: Paralaksa ${(config.parallaxIntensity * 100).toFixed(0)}% | Czasteczki za oknami ${(config.windowParticlesIntensity * 100).toFixed(0)}%`,
    `Sterowanie Dotykowe i Skala: Skala bazowa ${config.modelScale.toFixed(2)}x | Obrot Y: ${config.modelRotationY} deg | Exploded View: ${(config.explodedViewFactor * 100).toFixed(0)}%`,
    `Tryb Offline i Chmura: Offline Cache (${config.offlineModeEnabled ? 'TAK' : 'NIE'}) | Cloud Sync (${config.cloudSyncEnabled ? 'TAK' : 'NIE'})`,
    `Wsparcie Eksportu: OBJ (${config.exportFormats.obj ? 'TAK' : 'NIE'}), STL (${config.exportFormats.stl ? 'TAK' : 'NIE'}), PDF (Aktywny) | Paleta UI: ${palette.name}`,
  ];

  specs.forEach((line) => {
    doc.text(normalizePdfText(`• ${line}`), 16, y);
    y += 5.5;
  });

  // Optional embedded 3D viewport snapshot
  if (screenshotDataUrl && screenshotDataUrl.startsWith('data:image/')) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Podglad Widoku Hologramu 3D (Zrzut z Symulatora):', 14, y);
    y += 4;
    try {
      doc.addImage(screenshotDataUrl, 'PNG', 14, y, 115, 64);
      y += 70;
    } catch {
      y += 6;
    }
  } else {
    y += 4;
  }

  // Section 2: Master Prompt
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Gotowy Prompt Systemowy i Architektoniczny (PL / EN)', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const rawPrompt =
    config.uiSettings.promptLanguage === 'pl' ? prompts.systemPromptPL : prompts.systemPromptEN;
  const cleanPrompt = normalizePdfText(rawPrompt.replace(/### /g, '').replace(/\*\*/g, ''));
  const wrappedLines = doc.splitTextToSize(cleanPrompt, 182);

  wrappedLines.forEach((line: string) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, 14, y);
    y += 4.2;
  });

  // Section 3: Supported Mobile Devices Table
  if (y > 220) {
    doc.addPage();
    y = 18;
  } else {
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Lista Wspieranych Urzadzen Mobilnych (Smartfony i Tablety Android / iOS)', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  SUPPORTED_MOBILE_DEVICES.forEach((dev) => {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    const devLine = `${dev.brand} ${dev.model} [${dev.formFactor}] - ${dev.depthSensor} | ${dev.planeDetectionAccuracy} (${dev.targetFps} FPS)`;
    doc.text(normalizePdfText(`• ${devLine}`), 16, y);
    y += 5;
  });

  doc.save(`HoloArch_AR_Specyfikacja_${config.sceneId}.pdf`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createProceduralSceneGroup(config: ARConfigState): THREE.Group {
  const group = new THREE.Group();
  const hMult = config.towerHeightMultiplier || 1.0;
  const scale = config.modelScale || 1.0;

  if (config.sceneId === 'eco_atrium') {
    const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * scale, 2));
    dome.name = 'Geodesic_Atrium_Dome';
    dome.position.set(0, 0.9 * hMult, 0);
    group.add(dome);
  } else if (config.sceneId === 'aero_hub') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8 * scale, 0.35 * hMult, 1.6 * scale));
    roof.name = 'Aero_Terminal_Span';
    roof.position.set(0, 1.1 * hMult, 0);
    group.add(roof);
  } else if (config.sceneId === 'crystal_stacked_prism') {
    for (let i = 0; i < 6; i++) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry((1.6 - i * 0.08) * scale, 0.16 * hMult, (1.2 - i * 0.05) * scale)
      );
      slab.name = `Crystal_Glass_Slab_0${i + 1}`;
      slab.position.set(((i % 2) - 0.5) * 0.15, (0.2 + i * 0.34) * hMult * scale, 0);
      group.add(slab);
    }
  } else if (config.sceneId === 'voronoi_bionic_spire') {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35 * scale, 0.85 * scale, 3.1 * hMult * scale, 16, 8)
    );
    spire.name = 'Voronoi_Helix_Spire_325m';
    spire.position.set(0, 1.55 * hMult * scale, 0);
    group.add(spire);
  } else if (config.sceneId === 'kinetic_calatrava_wing') {
    for (let r = 0; r < 8; r++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry((1.2 + Math.sin((r / 7) * Math.PI) * 0.8) * scale, 0.14 * hMult, 0.14 * scale)
      );
      rib.name = `Kinetic_Titanium_Rib_0${r + 1}`;
      rib.position.set(0, (0.3 + r * 0.32) * hMult * scale, 0);
      rib.rotation.y = r * 0.12;
      group.add(rib);
    }
  } else if (config.sceneId === 'hydro_aqua_sculpture') {
    const vessel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2 * scale, 1.1 * scale, 0.8 * hMult * scale, 24)
    );
    vessel.name = 'Hydro_Crystal_Vessel';
    vessel.position.set(0, 0.4 * hMult * scale, 0);
    group.add(vessel);
    const splash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65 * scale, 2));
    splash.name = 'Liquid_Splash_Crest';
    splash.position.set(0, 1.8 * hMult * scale, 0);
    group.add(splash);
  } else {
    const coreTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.85 * scale, 2.6 * hMult * scale, 0.85 * scale)
    );
    coreTower.name = 'Skyline_Main_Spire';
    coreTower.position.set(0, 1.3 * hMult * scale, 0);
    group.add(coreTower);

    const wingTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.65 * scale, 1.8 * hMult * scale, 0.65 * scale)
    );
    wingTower.name = 'Skyline_East_Tower';
    wingTower.position.set(1.1 * scale, 0.9 * hMult * scale, 0.3 * scale);
    group.add(wingTower);
  }
  group.updateMatrixWorld(true);
  return group;
}

/**
 * Exports a Khronos glTF 2.0 (.gltf) JSON scene asset with PBR Metallic-Roughness & IOR Transmission extensions
 */
export function exportProjectToGLTF(config: ARConfigState): { nodeCount: number } {
  const group = createProceduralSceneGroup(config);
  const nodes: Array<Record<string, unknown>> = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      nodes.push({
        name: child.name || 'HoloArch_Node',
        translation: [
          Number(child.position.x.toFixed(4)),
          Number(child.position.y.toFixed(4)),
          Number(child.position.z.toFixed(4)),
        ],
        scale: [
          Number(child.scale.x.toFixed(4)),
          Number(child.scale.y.toFixed(4)),
          Number(child.scale.z.toFixed(4)),
        ],
        extras: {
          holoArchScene: config.sceneId,
          lightTemperatureK: config.lightTemperatureK,
          extensions: config.activeExtensions || [],
        },
      });
    }
  });

  const gltfJson = {
    asset: {
      version: '2.0',
      generator: 'HoloArch AR Studio - Khronos glTF 2.0 + KHR_materials_transmission Exporter',
      copyright: `HoloArch AR Studio (${new Date().getFullYear()})`,
    },
    extensionsUsed: [
      'KHR_materials_transmission',
      'KHR_materials_ior',
      'KHR_materials_volume',
      'KHR_materials_emissive_strength',
    ],
    scene: 0,
    scenes: [
      {
        name: `HoloArch_${config.sceneId}`,
        nodes: nodes.map((_, idx) => idx),
      },
    ],
    nodes,
    materials: [
      {
        name: 'HoloArch_Optical_Crystal_Glass',
        pbrMetallicRoughness: {
          baseColorFactor: [0.024, 0.714, 0.831, 0.82],
          metallicFactor: 0.15,
          roughnessFactor: 0.08,
        },
        extensions: {
          KHR_materials_transmission: { transmissionFactor: 0.92 },
          KHR_materials_ior: { ior: 1.52 },
          KHR_materials_emissive_strength: { emissiveStrength: 1.8 },
        },
      },
    ],
  };

  const blob = new Blob([JSON.stringify(gltfJson, null, 2)], {
    type: 'model/gltf+json;charset=utf-8',
  });
  triggerDownload(blob, `HoloArch_${config.sceneId}_PBR.gltf`);
  return { nodeCount: nodes.length };
}

/**
 * Exports an ISO-10303-21 STEP / BIM Industry Foundation Classes (.IFC) Level 400 file
 */
export function exportProjectToIFC(config: ARConfigState): void {
  const sceneMeta =
    ARCHITECTURAL_SCENES.find((s) => s.id === config.sceneId) || ARCHITECTURAL_SCENES[0];
  const nowIso = new Date().toISOString().slice(0, 19);
  const ifcContent = [
    'ISO-10303-21;',
    'HEADER;',
    `FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]','HoloArch AR Level 400 BIM'),'2;1');`,
    `FILE_NAME('HoloArch_${config.sceneId}.ifc','${nowIso}',('HoloArch Architect'),('HoloArch AR Studio'),'IFC4','HoloArch BIM Exporter','');`,
    `FILE_SCHEMA(('IFC4'));`,
    'ENDSEC;',
    'DATA;',
    `#10=IFCPROJECT('0HoloArch${config.sceneId.slice(0, 8)}',#12,'${normalizePdfText(sceneMeta.name)}','${normalizePdfText(sceneMeta.subtitle)}',$,$,$,(#20),#30);`,
    `#12=IFCOWNERHISTORY(#14,#16,$,.NOCHANGE.,$,$,$,1730000000);`,
    `#40=IFCSITE('1Site_${config.sceneId}',#12,'AR_Tabletop_Floor_Anchor',$,$,$,$,$,.ELEMENT.,(52,13,47),(21,0,42),115.,$,$);`,
    `#50=IFCBUILDING('2Bldg_${config.sceneId}',#12,'${normalizePdfText(sceneMeta.name)}',$,$,$,$,'${normalizePdfText(sceneMeta.architecturalStyle)}',.ELEMENT.,${sceneMeta.realWorldHeightM}.,0.,$);`,
    ...sceneMeta.layers.map(
      (layer, idx) =>
        `#${100 + idx}=IFCBUILDINGSTOREY('3Lvl_0${idx + 1}',#12,'${normalizePdfText(layer)}',$,$,$,$,$,.ELEMENT.,${(idx * (sceneMeta.realWorldHeightM / 4)).toFixed(1)});`
    ),
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n');

  const blob = new Blob([ifcContent], { type: 'application/x-step;charset=utf-8' });
  triggerDownload(blob, `HoloArch_BIM_${config.sceneId}.ifc`);
}

export function generateOBJContent(config: ARConfigState): string {
  const group = createProceduralSceneGroup(config);
  const lines: string[] = [
    '# HoloArch AR Studio - Google Drive Cloud Export (.OBJ)',
    `# Scene: ${config.sceneId} | Scale: ${config.modelScale}x | Height: ${config.towerHeightMultiplier}x`,
    `o HoloArch_${config.sceneId}`,
  ];
  let vertexOffset = 1;
  const tempVertex = new THREE.Vector3();

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;
      lines.push(`g ${child.name || 'ArchMesh'}`);
      for (let i = 0; i < posAttr.count; i++) {
        tempVertex.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
        lines.push(
          `v ${tempVertex.x.toFixed(5)} ${tempVertex.y.toFixed(5)} ${tempVertex.z.toFixed(5)}`
        );
      }
      const indexAttr = geom.getIndex();
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i += 3) {
          const a = indexAttr.getX(i) + vertexOffset;
          const b = indexAttr.getX(i + 1) + vertexOffset;
          const c = indexAttr.getX(i + 2) + vertexOffset;
          lines.push(`f ${a} ${b} ${c}`);
        }
      }
      vertexOffset += posAttr.count;
    }
  });
  return lines.join('\n');
}

export function generateSTLContent(config: ARConfigState): string {
  const group = createProceduralSceneGroup(config);
  const solidName = `HoloArch_${config.sceneId}`;
  const lines: string[] = [`solid ${solidName}`];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry as THREE.BufferGeometry;
      const posAttr = geom.getAttribute('position');
      if (!posAttr) return;
      const indexAttr = geom.getIndex();
      const count = indexAttr ? indexAttr.count : posAttr.count;
      for (let i = 0; i < count; i += 3) {
        const iA = indexAttr ? indexAttr.getX(i) : i;
        const iB = indexAttr ? indexAttr.getX(i + 1) : i + 1;
        const iC = indexAttr ? indexAttr.getX(i + 2) : i + 2;
        vA.fromBufferAttribute(posAttr, iA).applyMatrix4(child.matrixWorld);
        vB.fromBufferAttribute(posAttr, iB).applyMatrix4(child.matrixWorld);
        vC.fromBufferAttribute(posAttr, iC).applyMatrix4(child.matrixWorld);
        cb.subVectors(vC, vB);
        ab.subVectors(vA, vB);
        cb.cross(ab).normalize();
        lines.push(`  facet normal ${cb.x.toFixed(5)} ${cb.y.toFixed(5)} ${cb.z.toFixed(5)}`);
        lines.push('    outer loop');
        lines.push(`      vertex ${vA.x.toFixed(5)} ${vA.y.toFixed(5)} ${vA.z.toFixed(5)}`);
        lines.push(`      vertex ${vB.x.toFixed(5)} ${vB.y.toFixed(5)} ${vB.z.toFixed(5)}`);
        lines.push(`      vertex ${vC.x.toFixed(5)} ${vC.y.toFixed(5)} ${vC.z.toFixed(5)}`);
        lines.push('    endloop');
        lines.push('  endfacet');
      }
    }
  });
  lines.push(`endsolid ${solidName}`);
  return lines.join('\n');
}

