import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Volume2, VolumeX, X } from 'lucide-react';

interface HoloDroneGame3DProps {
  onCloseGame: () => void;
  onSyncEarnedScoreToStudio?: (calibratedNodes: number) => void;
}

type GameLifecycleState = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

interface ScorePopup {
  id: number;
  text: string;
  x: number;
  y: number;
}

const TOTAL_TARGET_NODES = 12;
const MISSION_TIME_LIMIT = 90;

export const HoloDroneGame3D: React.FC<HoloDroneGame3DProps> = ({
  onCloseGame,
  onSyncEarnedScoreToStudio,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameLifecycleState>('title');
  const [score, setScore] = useState<number>(0);
  const [calibratedNodes, setCalibratedNodes] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(MISSION_TIME_LIMIT);
  const [droneShield, setDroneShield] = useState<number>(100);
  const [boostEnergy, setBoostEnergy] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [popups, setPopups] = useState<ScorePopup[]>([]);

  const gameStateRef = useRef<GameLifecycleState>('title');
  const isMutedRef = useRef<boolean>(false);
  const keysRef = useRef<Record<string, boolean>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hitstopTimerRef = useRef<number>(0);
  const cameraShakeRef = useRef<number>(0);
  const dronePosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 6, 18));
  const droneVelRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const nodeActiveFlagsRef = useRef<boolean[]>(new Array(TOTAL_TARGET_NODES).fill(true));
  const pulseTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Procedural Web Audio Synthesizer for tactile feedback
  const playSynthSound = useCallback(
    (type: 'collect' | 'pulse' | 'hit' | 'victory' | 'start') => {
      if (isMutedRef.current) return;
      try {
        if (!audioCtxRef.current) {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'collect') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.16);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === 'pulse') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(240, now);
          osc.frequency.exponentialRampToValueAtTime(680, now + 0.14);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (type === 'victory') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(554.37, now + 0.1);
          osc.frequency.setValueAtTime(659.25, now + 0.2);
          osc.frequency.setValueAtTime(880, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc.start(now);
          osc.stop(now + 0.55);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
          gain.gain.setValueAtTime(0.14, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      } catch {
        // Ignore audio errors
      }
    },
    []
  );

  const startNewMission = useCallback(() => {
    dronePosRef.current.set(0, 6, 18);
    droneVelRef.current.set(0, 0, 0);
    nodeActiveFlagsRef.current = new Array(TOTAL_TARGET_NODES).fill(true);
    setScore(0);
    setCalibratedNodes(0);
    setTimeLeft(MISSION_TIME_LIMIT);
    setDroneShield(100);
    setBoostEnergy(100);
    setGameState('playing');
    playSynthSound('start');
  }, [playSynthSound]);

  // Keyboard bindings (Enter/Space on Title, Esc for Pause, WASD/Arrows in flight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (gameStateRef.current === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        startNewMission();
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
      }

      if (gameStateRef.current === 'playing' && e.code === 'Space') {
        e.preventDefault();
        pulseTriggerRef.current = true;
        playSynthSound('pulse');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startNewMission, playSynthSound]);

  // Mission countdown timer while playing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [gameState]);

  // Three.js WebGL Scene Setup, Composite Models & 60fps Game Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050912);
    scene.fog = new THREE.FogExp2(0x050912, 0.014);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 250);
    camera.position.set(0, 10, 26);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio PBR IBL Environment via PMREMGenerator + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // 3-Point Lighting + Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(22, 38, 18);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0xf59e0b, 3.0, 55);
    rimLight.position.set(-18, 16, -15);
    scene.add(rimLight);

    // Architectural Grid Platform
    const gridHelper = new THREE.GridHelper(90, 45, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Composite Architectural Towers (Multi-Part THREE.Group)
    const cityGroup = new THREE.Group();
    const towerCoords = [
      { x: -12, z: -8, h: 16, r: 2.4 },
      { x: 0, z: -12, h: 22, r: 2.8 },
      { x: 12, z: -8, h: 15, r: 2.3 },
      { x: -16, z: 6, h: 12, r: 2.1 },
      { x: 16, z: 6, h: 13, r: 2.1 },
      { x: 0, z: 2, h: 10, r: 2.2 },
    ];

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      metalness: 0.15,
      roughness: 0.12,
      transmission: 0.65,
      thickness: 1.2,
      ior: 1.5,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.9,
      metalness: 0.6,
      roughness: 0.2,
    });

    towerCoords.forEach((tc) => {
      const tower = new THREE.Group();
      tower.position.set(tc.x, 0, tc.z);

      const podium = new THREE.Mesh(
        new THREE.CylinderGeometry(tc.r * 1.25, tc.r * 1.35, 1.5, 8),
        coreMat
      );
      podium.position.y = 0.75;
      podium.castShadow = true;
      podium.receiveShadow = true;
      tower.add(podium);

      const coreShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(tc.r * 0.55, tc.r * 0.55, tc.h, 12),
        coreMat
      );
      coreShaft.position.y = tc.h / 2 + 1;
      tower.add(coreShaft);

      const facadeShell = new THREE.Mesh(
        new THREE.CylinderGeometry(tc.r * 0.9, tc.r, tc.h, 8),
        glassMat
      );
      facadeShell.position.y = tc.h / 2 + 1;
      facadeShell.castShadow = true;
      tower.add(facadeShell);

      for (let y = 3; y < tc.h; y += 3.2) {
        const slabRing = new THREE.Mesh(
          new THREE.TorusGeometry(tc.r * 0.96, 0.07, 8, 24),
          ringMat
        );
        slabRing.rotation.x = Math.PI / 2;
        slabRing.position.y = y;
        tower.add(slabRing);
      }

      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.5, 8), ringMat);
      spire.position.y = tc.h + 2.75;
      tower.add(spire);

      cityGroup.add(tower);
    });
    scene.add(cityGroup);

    // InstancedMesh for 48 Floating Atmospheric LiDAR Voxels (>20 identical items requirement)
    const voxelCount = 48;
    const voxelGeo = new THREE.OctahedronGeometry(0.22, 0);
    const voxelMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.8,
    });
    const voxelInstanced = new THREE.InstancedMesh(voxelGeo, voxelMat, voxelCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < voxelCount; i++) {
      const angle = (i / voxelCount) * Math.PI * 2;
      const rad = 18 + (i % 5) * 4;
      dummy.position.set(Math.cos(angle) * rad, 3 + (i % 8) * 2.4, Math.sin(angle) * rad);
      dummy.updateMatrix();
      voxelInstanced.setMatrixAt(i, dummy.matrix);
    }
    scene.add(voxelInstanced);

    // 12 Collectible LiDAR Calibration Nodes around the towers
    const nodePositions: THREE.Vector3[] = [
      new THREE.Vector3(-12, 10, -4),
      new THREE.Vector3(-12, 18, -8),
      new THREE.Vector3(0, 14, -7),
      new THREE.Vector3(0, 24, -12),
      new THREE.Vector3(12, 10, -4),
      new THREE.Vector3(12, 17, -8),
      new THREE.Vector3(-16, 9, 6),
      new THREE.Vector3(16, 10, 6),
      new THREE.Vector3(0, 12, 2),
      new THREE.Vector3(-7, 7, 10),
      new THREE.Vector3(7, 7, 10),
      new THREE.Vector3(0, 16, -2),
    ];

    const nodesGroup = new THREE.Group();
    const nodeMeshes: THREE.Group[] = [];
    const nodeCoreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.4,
      metalness: 0.4,
      roughness: 0.15,
    });
    const nodeHaloMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
    });

    nodePositions.forEach((pos) => {
      const nGroup = new THREE.Group();
      nGroup.position.copy(pos);

      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.75, 0), nodeCoreMat);
      nGroup.add(core);

      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 24), nodeHaloMat);
      nGroup.add(halo);

      nodesGroup.add(nGroup);
      nodeMeshes.push(nGroup);
    });
    scene.add(nodesGroup);

    // Composite 8-Part Player Quadcopter LiDAR Drone (THREE.Group)
    const droneGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.75,
      roughness: 0.2,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.35, 1.6), bodyMat);
    droneGroup.add(chassis);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), glassMat);
    canopy.scale.set(1, 0.55, 1.3);
    canopy.position.y = 0.22;
    droneGroup.add(canopy);

    const lidarTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.35, 12), accentMat);
    lidarTurret.position.set(0, -0.3, 0.3);
    droneGroup.add(lidarTurret);

    // Expandable Laser Scan Ring under Drone
    const scanPulseGeo = new THREE.RingGeometry(0.5, 0.85, 32);
    const scanPulseMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
    });
    const scanPulseMesh = new THREE.Mesh(scanPulseGeo, scanPulseMat);
    scanPulseMesh.rotation.x = Math.PI / 2;
    scanPulseMesh.position.y = -0.35;
    droneGroup.add(scanPulseMesh);

    const rotors: THREE.Mesh[] = [];
    const armOffsets = [
      [-0.95, 0.1, -0.95],
      [0.95, 0.1, -0.95],
      [-0.95, 0.1, 0.95],
      [0.95, 0.1, 0.95],
    ];
    armOffsets.forEach(([ax, ay, az]) => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 8), bodyMat);
      arm.position.set(ax * 0.5, 0, az * 0.5);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = Math.atan2(az, ax);
      droneGroup.add(arm);

      const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), accentMat);
      rotor.position.set(ax, ay + 0.08, az);
      droneGroup.add(rotor);
      rotors.push(rotor);
    });

    droneGroup.position.copy(dronePosRef.current);
    scene.add(droneGroup);

    // Resize listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 60fps Animation & Physics Loop with Clamped Delta-Time
    const clock = new THREE.Clock();
    let animId = 0;
    let pulseScale = 1;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Spin drone rotors
      rotors.forEach((r, idx) => {
        r.rotation.y += (idx % 2 === 0 ? 1 : -1) * dt * 28;
      });

      // Animate collectible nodes
      nodeMeshes.forEach((nMesh, idx) => {
        const isAlive = nodeActiveFlagsRef.current[idx];
        nMesh.visible = isAlive;
        if (isAlive) {
          nMesh.rotation.y += dt * 1.8;
          nMesh.children[1].rotation.x += dt * 2.4;
          nMesh.position.y = nodePositions[idx].y + Math.sin(elapsed * 2.5 + idx) * 0.35;
        }
      });

      if (gameStateRef.current === 'playing') {
        if (hitstopTimerRef.current > 0) {
          hitstopTimerRef.current -= dt;
        } else {
          const keys = keysRef.current;
          const isBoosting = keys['ShiftLeft'] || keys['ShiftRight'];
          const speed = isBoosting ? 22 : 14;

          if (isBoosting) {
            setBoostEnergy((prev) => Math.max(0, prev - dt * 24));
          } else {
            setBoostEnergy((prev) => Math.min(100, prev + dt * 12));
          }

          const moveX =
            (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
            (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);
          const moveZ =
            (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) -
            (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0);
          const moveY = (keys['KeyE'] ? 1 : 0) - (keys['KeyQ'] ? 1 : 0);

          droneVelRef.current.x = THREE.MathUtils.lerp(
            droneVelRef.current.x,
            moveX * speed,
            dt * 6
          );
          droneVelRef.current.z = THREE.MathUtils.lerp(
            droneVelRef.current.z,
            moveZ * speed,
            dt * 6
          );
          droneVelRef.current.y = THREE.MathUtils.lerp(
            droneVelRef.current.y,
            moveY * 10,
            dt * 6
          );

          dronePosRef.current.addScaledVector(droneVelRef.current, dt);
          dronePosRef.current.x = THREE.MathUtils.clamp(dronePosRef.current.x, -28, 28);
          dronePosRef.current.z = THREE.MathUtils.clamp(dronePosRef.current.z, -28, 28);
          dronePosRef.current.y = THREE.MathUtils.clamp(dronePosRef.current.y, 2.5, 28);

          droneGroup.position.copy(dronePosRef.current);
          droneGroup.rotation.z = THREE.MathUtils.lerp(
            droneGroup.rotation.z,
            -moveX * 0.32,
            dt * 8
          );
          droneGroup.rotation.x = THREE.MathUtils.lerp(
            droneGroup.rotation.x,
            moveZ * 0.28,
            dt * 8
          );

          // Handle LiDAR Pulse Ring animation
          if (pulseTriggerRef.current) {
            pulseScale = 1;
            scanPulseMat.opacity = 0.9;
            pulseTriggerRef.current = false;
          }
          if (scanPulseMat.opacity > 0.01) {
            pulseScale += dt * 14;
            scanPulseMesh.scale.set(pulseScale, pulseScale, 1);
            scanPulseMat.opacity = Math.max(0, scanPulseMat.opacity - dt * 1.8);
          }

          // Check node calibration proximity
          const captureRadius = scanPulseMat.opacity > 0.2 ? 5.5 : 2.8;
          nodePositions.forEach((nPos, idx) => {
            if (!nodeActiveFlagsRef.current[idx]) return;
            const dist = dronePosRef.current.distanceTo(nPos);
            if (dist < captureRadius) {
              nodeActiveFlagsRef.current[idx] = false;
              hitstopTimerRef.current = 0.045;
              cameraShakeRef.current = 0.35;
              playSynthSound('collect');

              const nextCalibrated = nodeActiveFlagsRef.current.filter((v) => !v).length;
              setCalibratedNodes(nextCalibrated);
              setScore((prev) => prev + 250);

              const popupId = Date.now() + idx;
              setPopups((prev) => [
                ...prev,
                {
                  id: popupId,
                  text: '+250 PKT · WĘZEŁ LIDAR SKALIBROWANY',
                  x: 42 + (idx % 3) * 8,
                  y: 38,
                },
              ]);
              window.setTimeout(() => {
                setPopups((prev) => prev.filter((p) => p.id !== popupId));
              }, 1100);

              if (nextCalibrated >= TOTAL_TARGET_NODES) {
                playSynthSound('victory');
                setGameState('victory');
                if (onSyncEarnedScoreToStudio) {
                  onSyncEarnedScoreToStudio(nextCalibrated);
                }
              }
            }
          });

          // Check tower collision
          towerCoords.forEach((tc) => {
            const dx = dronePosRef.current.x - tc.x;
            const dz = dronePosRef.current.z - tc.z;
            const horizDist = Math.hypot(dx, dz);
            if (horizDist < tc.r + 0.85 && dronePosRef.current.y < tc.h + 1.5) {
              const pushAngle = Math.atan2(dz, dx);
              dronePosRef.current.x = tc.x + Math.cos(pushAngle) * (tc.r + 1.2);
              dronePosRef.current.z = tc.z + Math.sin(pushAngle) * (tc.r + 1.2);
              cameraShakeRef.current = 0.55;
              playSynthSound('hit');
              setDroneShield((prev) => {
                const next = Math.max(0, prev - 15);
                if (next <= 0) {
                  setGameState('gameover');
                }
                return next;
              });
            }
          });
        }

        // Smooth damped Chase Camera with optional Shake
        const targetCamPos = new THREE.Vector3(
          dronePosRef.current.x * 0.75,
          dronePosRef.current.y + 4.5,
          dronePosRef.current.z + 11.5
        );
        camera.position.lerp(targetCamPos, 1 - Math.exp(-6 * dt));

        if (cameraShakeRef.current > 0.01) {
          camera.position.x += (Math.random() - 0.5) * cameraShakeRef.current;
          camera.position.y += (Math.random() - 0.5) * cameraShakeRef.current;
          cameraShakeRef.current = Math.max(0, cameraShakeRef.current - dt * 2.2);
        }

        camera.lookAt(
          dronePosRef.current.x,
          dronePosRef.current.y - 0.5,
          dronePosRef.current.z - 4
        );
      } else {
        // Cinematic orbital camera on Title / Pause / Victory screens
        const camAngle = elapsed * 0.22;
        camera.position.set(Math.sin(camAngle) * 26, 15, Math.cos(camAngle) * 26);
        camera.lookAt(0, 8, -4);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [onSyncEarnedScoreToStudio, playSynthSound]);

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#050912] select-none">
      {/* Full-Viewport 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating Score Popups */}
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
        {popups.map((p) => (
          <div
            key={p.id}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-mono text-xs font-bold shadow-xl animate-bounce"
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* Edge-Pinned Top Telemetry Bar (<= 10% footprint, NO backdrop-filter over WebGL) */}
      <div className="fixed top-4 left-4 right-4 z-30 flex items-center justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4 px-4 py-2 rounded-lg bg-[#090D16]/90 border border-slate-800 text-xs font-mono tabular-nums">
          <div>
            <span className="text-slate-400 mr-1.5">WĘZŁY LIDAR:</span>
            <span className="text-emerald-400 font-bold">
              {calibratedNodes} / {TOTAL_TARGET_NODES}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400 mr-1.5">PUNKTY:</span>
            <span className="text-cyan-300 font-bold">{score}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400 mr-1.5">CZAS:</span>
            <span className={timeLeft <= 15 ? 'text-rose-400 font-bold' : 'text-amber-300'}>
              {timeLeft}s
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400 mr-1.5">OSŁONA:</span>
            <span className="text-cyan-400">{Math.round(droneShield)}%</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="p-2 rounded-lg bg-[#090D16]/90 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Włącz dźwięk syntezatora' : 'Wycisz dźwięk'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          {gameState === 'playing' && (
            <button
              type="button"
              onClick={() => setGameState('paused')}
              className="px-3 py-2 rounded-lg bg-[#090D16]/90 border border-slate-800 text-xs font-mono text-slate-200 hover:border-cyan-400 transition-colors"
            >
              Pauza (Esc)
            </button>
          )}
          <button
            type="button"
            onClick={onCloseGame}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#090D16]/90 border border-slate-700 hover:border-rose-400 text-xs font-semibold text-slate-200 transition-colors"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Wróć do Studia AR</span>
          </button>
        </div>
      </div>

      {/* Bottom Flight Altitude Controls during Gameplay */}
      {gameState === 'playing' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-4 py-2 rounded-lg bg-[#090D16]/90 border border-slate-800 text-xs font-mono text-slate-300">
          <span>WASD / Strzałki: Lot poziomy</span>
          <span className="text-slate-600">·</span>
          <span>Q / E: Pułap góra/dół</span>
          <span className="text-slate-600">·</span>
          <span>Spacja: Impuls Skanera LiDAR</span>
          <span className="text-slate-600">·</span>
          <span>Shift: Dopalacz ({Math.round(boostEnergy)}%)</span>
        </div>
      )}

      {/* =====================================================================
          STATE 1: TITLE SCREEN OVERLAY OVER LIVE 3D CANVAS
         ===================================================================== */}
      {gameState === 'title' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#050912]/70">
          <div className="max-w-lg w-full bg-[#090D16] border border-cyan-500/40 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            {/* Bespoke Inline SVG Title Lockup */}
            <div className="flex flex-col items-center space-y-3">
              <svg
                viewBox="0 0 120 72"
                className="w-24 h-14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="60,6 110,36 60,66 10,36"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  fill="rgba(6,182,212,0.12)"
                />
                <polygon
                  points="60,16 94,36 60,56 26,36"
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                <circle cx="60" cy="36" r="7" fill="#10B981" />
              </svg>
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">
                Symulator Lotu i Kalibracji Przestrzennej 3D
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white font-display tracking-tight">
                HOLO-DRONE LIDAR MISSION
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                Przeleć dronem pomiarowym pomiędzy iluminowanymi wieżowcami 3D i skalibruj wszystkie{' '}
                <strong>{TOTAL_TARGET_NODES} szmaragdowych węzłów LiDAR</strong> przed upływem czasu.
              </p>
            </div>

            <button
              type="button"
              onClick={startNewMission}
              className="w-full py-3.5 px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-colors shadow-lg"
            >
              Rozpocznij Lot Kalibracyjny (Enter / Spacja)
            </button>

            <p className="text-xs font-mono text-slate-400">
              WASD Lot · Q/E Pułap · Spacja Impuls Skanera · Shift Dopalacz · Esc Pauza
            </p>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATE 2: PAUSE / VICTORY / GAME OVER MODAL
         ===================================================================== */}
      {(gameState === 'paused' || gameState === 'victory' || gameState === 'gameover') && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#050912]/80">
          <div className="max-w-md w-full bg-[#090D16] border border-slate-700 rounded-2xl p-7 text-center space-y-5 shadow-2xl">
            <h2 className="text-2xl font-bold text-white font-display">
              {gameState === 'victory'
                ? 'Misja LiDAR Zakończona Sukcesem!'
                : gameState === 'gameover'
                ? 'Misja Przerwana'
                : 'Misja Wstrzymana (Pauza)'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300">
              {gameState === 'victory'
                ? `Skalibrowano wszystkie ${TOTAL_TARGET_NODES} węzłów architektonicznych 3D z wynikiem ${score} pkt.`
                : gameState === 'gameover'
                ? `Skalibrowano ${calibratedNodes} z ${TOTAL_TARGET_NODES} węzłów LiDAR. Spróbuj ponownie!`
                : 'Lot drona pomiarowego został zatrzymany.'}
            </p>

            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <div>
                <div className="text-slate-400">Węzły</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {calibratedNodes}/{TOTAL_TARGET_NODES}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Wynik</div>
                <div className="text-cyan-300 font-bold text-sm">{score}</div>
              </div>
              <div>
                <div className="text-slate-400">Pozostały czas</div>
                <div className="text-amber-300 font-bold text-sm">{timeLeft}s</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {gameState === 'paused' && (
                <button
                  type="button"
                  onClick={() => setGameState('playing')}
                  className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                >
                  Wznów Lot (Esc)
                </button>
              )}
              <button
                type="button"
                onClick={startNewMission}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
              >
                Nowa Misja 3D
              </button>
              <button
                type="button"
                onClick={onCloseGame}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                Wróć do Studia AR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
