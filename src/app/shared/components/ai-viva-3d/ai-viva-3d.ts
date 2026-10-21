import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

export type AiVivaState =
  | 'IDLE'
  | 'WELCOMING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'FRIENDLY'
  | 'SMART'
  | 'SUPPORTIVE'
  | 'FOCUSED'
  | 'MOTIVATIONAL'
  | 'STERN_WARNING'
  | 'TAB_SWITCH_ALERT'
  | 'FACE_HIDDEN_ALERT'
  | 'DISQUALIFIED';

export type CameraPreset = 'HERO_34' | 'CLOSEUP_FACE' | 'FULL_BODY' | 'ORBIT';

export interface GestureDefinition {
  name: AiVivaState;
  icon: string;
  label: string;
  description: string;
}

interface JointPose {
  // Right Arm
  rShoulderRot: [number, number, number];
  rElbowRot: [number, number, number];
  rWristRot: [number, number, number];
  rThumbCurl: number;
  rIndexCurl: number;
  rMiddleCurl: number;
  rRingCurl: number;
  rPinkyCurl: number;

  // Left Arm
  lShoulderRot: [number, number, number];
  lElbowRot: [number, number, number];
  lWristRot: [number, number, number];
  lThumbCurl: number;
  lIndexCurl: number;
  lMiddleCurl: number;
  lRingCurl: number;
  lPinkyCurl: number;

  // Head & Face
  headRot: [number, number, number];
  browState: 'NORMAL' | 'FURROWED' | 'RAISED';
  mouthState: 'CLOSED' | 'SMILE' | 'STERN' | 'OPEN' | 'SPEAKING';
}

@Component({
  selector: 'app-ai-viva-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-viva-3d.html',
  styleUrl: './ai-viva-3d.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiViva3dComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('threeContainer') containerRef?: ElementRef<HTMLDivElement>;

  // Inputs
  @Input() state: AiVivaState = 'WELCOMING';
  @Input() isSpeaking: boolean = false;
  @Input() isListening: boolean = false;
  @Input() speechVolume: number = 0;
  @Input() showControls: boolean = true;
  @Input() showStatusBadge: boolean = true;
  @Input() showHoloPanel: boolean = true;
  @Input() showGlbDownload: boolean = true;
  @Input() customBubbleText: string | null = null;
  @Input() compactMode: boolean = false;

  // Outputs
  @Output() stateChange = new EventEmitter<AiVivaState>();
  @Output() glbExported = new EventEmitter<Blob>();

  // Reactive UI Signals
  readonly currentPreset = signal<CameraPreset>('HERO_34');
  readonly isOrbitEnabled = signal<boolean>(false);
  readonly fpsCounter = signal<number>(60);
  readonly isModelLoaded = signal<boolean>(true);

  // Gesture definitions for testing and preview
  readonly GESTURES: GestureDefinition[] = [
    { name: 'WELCOMING', icon: '👋', label: 'Welcome Wave', description: 'Warm greeting wave and cheerful introduction' },
    { name: 'SPEAKING', icon: '🗣️', label: 'Teacher Explain', description: 'Conversational teaching hand gesticulations & lip-sync' },
    { name: 'LISTENING', icon: '👂', label: 'Attentive Listen', description: 'Attentive listening posture with comprehension nods' },
    { name: 'THINKING', icon: '💡', label: 'Thinking / Idea', description: 'Hand on chin/temple with floating holographic neural glyphs' },
    { name: 'MOTIVATIONAL', icon: '👍', label: 'Thumbs Up', description: 'Articulated thumbs-up gesture and encouraging smile' },
    { name: 'FRIENDLY', icon: '✌️', label: 'Peace Sign', description: '2-finger victory peace sign and sweet smile' },
    { name: 'SUPPORTIVE', icon: '🤝', label: 'Supportive Open', description: 'Two-handed open guidance and supportive stance' },
    { name: 'STERN_WARNING', icon: '⚠️', label: 'Stern Reprimand', description: 'Stern furrowed brow with wagging warning index finger' },
    { name: 'TAB_SWITCH_ALERT', icon: '🚨', label: 'Tab Shift Alert', description: 'Full security lockdown alert with warning lasers' },
    { name: 'DISQUALIFIED', icon: '🛑', label: 'Disqualified', description: 'Arms crossed lockdown posture' }
  ];

  // Three.js Engine Variables
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private clock = new THREE.Clock();

  // Avatar Hierarchy Groups & Joints
  private avatarRoot!: THREE.Group;
  private bodyGroup!: THREE.Group;
  private torsoGroup!: THREE.Group;
  private neckGroup!: THREE.Group;
  private headGroup!: THREE.Group;

  // Facial Meshes
  private leftEyeGroup!: THREE.Group;
  private rightEyeGroup!: THREE.Group;
  private leftEyelid!: THREE.Mesh;
  private rightEyelid!: THREE.Mesh;
  private leftEyebrow!: THREE.Mesh;
  private rightEyebrow!: THREE.Mesh;
  private mouthGroup!: THREE.Group;
  private mouthMesh!: THREE.Mesh;

  // Right Arm Skeleton
  private rShoulderJoint!: THREE.Group;
  private rElbowJoint!: THREE.Group;
  private rWristJoint!: THREE.Group;
  private rHandGroup!: THREE.Group;
  private rFingers: {
    thumb: THREE.Group[];
    index: THREE.Group[];
    middle: THREE.Group[];
    ring: THREE.Group[];
    pinky: THREE.Group[];
  } = { thumb: [], index: [], middle: [], ring: [], pinky: [] };

  // Left Arm Skeleton
  private lShoulderJoint!: THREE.Group;
  private lElbowJoint!: THREE.Group;
  private lWristJoint!: THREE.Group;
  private lHandGroup!: THREE.Group;
  private lFingers: {
    thumb: THREE.Group[];
    index: THREE.Group[];
    middle: THREE.Group[];
    ring: THREE.Group[];
    pinky: THREE.Group[];
  } = { thumb: [], index: [], middle: [], ring: [], pinky: [] };

  // Hologram & Cyber Lighting
  private pedestalGroup!: THREE.Group;
  private hologramRings: THREE.Mesh[] = [];
  private particleSystem!: THREE.Points;
  private neuralGlyphGroup!: THREE.Group;
  private warningShieldMesh!: THREE.Mesh;
  private rimLight!: THREE.PointLight;
  private mainSpotLight!: THREE.SpotLight;
  private fillLight!: THREE.DirectionalLight;

  // Animation Interpolation State (Current vs Target)
  private currentPose: JointPose = this.getDefaultPose('WELCOMING');
  private targetPose: JointPose = this.getDefaultPose('WELCOMING');

  // Procedural Blink & Speech Timers
  private blinkTimer = 0;
  private blinkDuration = 0.15;
  private nextBlinkTime = 2.5;
  private speechVisemeTimer = 0;
  private speechMouthOpen = 0;
  private waveCycle = 0;

  // Mouse Interaction / Orbit
  private isMouseDown = false;
  private mouseX = 0;
  private mouseY = 0;
  private targetCameraRotY = 0;
  private targetCameraRotX = 0;
  private currentCameraRotY = 0;
  private currentCameraRotX = 0;
  private cameraDistance = 3.0;

  private resizeObserver?: ResizeObserver;
  private frameCount = 0;
  private lastFpsUpdateTime = performance.now();

  ngOnInit(): void {
    this.targetPose = this.getDefaultPose(this.state);
    this.currentPose = JSON.parse(JSON.stringify(this.targetPose));
  }

  ngAfterViewInit(): void {
    this.initThreeEngine();
    this.setupResizeObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) {
      this.targetPose = this.getDefaultPose(this.state);
      this.updateLightingAndHoloColors();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.cleanupThreeEngine();
  }

  // =========================================================================
  // 1. THREE.JS INITIALIZATION & SCENE GRAPH SETUP
  // =========================================================================
  private initThreeEngine(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    this.applyCameraPreset(this.currentPreset());

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    container.appendChild(this.renderer.domElement);

    this.setupLighting();
    this.buildAvatarRig();
    this.buildPedestalAndHoloEnvironment();
    this.setupMouseEvents(container);

    this.clock.start();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xfff5eb, 0.95);
    this.scene.add(ambientLight);

    this.mainSpotLight = new THREE.SpotLight(0xfffaed, 2.5);
    this.mainSpotLight.position.set(2.0, 3.5, 3.0);
    this.mainSpotLight.angle = Math.PI / 4;
    this.mainSpotLight.penumbra = 0.5;
    this.mainSpotLight.castShadow = true;
    this.mainSpotLight.shadow.mapSize.width = 1024;
    this.mainSpotLight.shadow.mapSize.height = 1024;
    this.scene.add(this.mainSpotLight);

    this.fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.1);
    this.fillLight.position.set(-2.2, 1.8, 2.2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0x38bdf8, 2.2, 8);
    this.rimLight.position.set(-1.8, 2.2, -2.0);
    this.scene.add(this.rimLight);

    const underLight = new THREE.PointLight(0x6366f1, 1.0, 4);
    underLight.position.set(0, -1.2, 0.6);
    this.scene.add(underLight);
  }

  // =========================================================================
  // 2. PROCEDURAL 3D AVATAR SKELETAL RIG WITH BEAUTIFUL MENTOR AESTHETIC
  // =========================================================================
  private buildAvatarRig(): void {
    this.avatarRoot = new THREE.Group();
    this.avatarRoot.position.set(0, -0.42, 0);
    this.scene.add(this.avatarRoot);

    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdfc4,
      roughness: 0.6,
      metalness: 0.0
    });

    const blazerMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.45,
      metalness: 0.15
    });

    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      metalness: 0.05
    });

    const goldTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.7
    });

    const cyberCyanMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      roughness: 0.2
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x241a29,
      roughness: 0.5,
      metalness: 0.1
    });

    this.bodyGroup = new THREE.Group();
    this.avatarRoot.add(this.bodyGroup);

    this.torsoGroup = new THREE.Group();
    this.bodyGroup.add(this.torsoGroup);

    const chestGeom = new THREE.CylinderGeometry(0.30, 0.22, 0.75, 20);
    const chestMesh = new THREE.Mesh(chestGeom, blazerMaterial);
    chestMesh.position.y = 0.42;
    chestMesh.castShadow = true;
    this.torsoGroup.add(chestMesh);

    const innerShirtGeom = new THREE.ConeGeometry(0.16, 0.42, 12);
    const innerShirtMesh = new THREE.Mesh(innerShirtGeom, shirtMaterial);
    innerShirtMesh.position.set(0, 0.58, 0.11);
    innerShirtMesh.rotation.x = 0.2;
    this.torsoGroup.add(innerShirtMesh);

    const lapelGeom = new THREE.BoxGeometry(0.07, 0.38, 0.025);
    const leftLapel = new THREE.Mesh(lapelGeom, blazerMaterial);
    leftLapel.position.set(-0.10, 0.57, 0.18);
    leftLapel.rotation.z = -0.2;
    leftLapel.rotation.y = 0.15;
    this.torsoGroup.add(leftLapel);

    const rightLapel = new THREE.Mesh(lapelGeom, blazerMaterial);
    rightLapel.position.set(0.10, 0.57, 0.18);
    rightLapel.rotation.z = 0.2;
    rightLapel.rotation.y = -0.15;
    this.torsoGroup.add(rightLapel);

    const epauletteGeom = new THREE.BoxGeometry(0.13, 0.025, 0.11);
    const leftEp = new THREE.Mesh(epauletteGeom, goldTrimMaterial);
    leftEp.position.set(-0.31, 0.75, 0);
    leftEp.rotation.z = -0.1;
    this.torsoGroup.add(leftEp);

    const rightEp = new THREE.Mesh(epauletteGeom, goldTrimMaterial);
    rightEp.position.set(0.31, 0.75, 0);
    rightEp.rotation.z = 0.1;
    this.torsoGroup.add(rightEp);

    const crestGeom = new THREE.CircleGeometry(0.04, 16);
    const crestMtl = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const crestMesh = new THREE.Mesh(crestGeom, crestMtl);
    crestMesh.position.set(0.13, 0.60, 0.22);
    crestMesh.rotation.y = 0.25;
    this.torsoGroup.add(crestMesh);

    this.neckGroup = new THREE.Group();
    this.neckGroup.position.set(0, 0.80, 0);
    this.torsoGroup.add(this.neckGroup);

    const collarGeom = new THREE.CylinderGeometry(0.095, 0.105, 0.07, 16);
    const collarMesh = new THREE.Mesh(collarGeom, shirtMaterial);
    collarMesh.position.y = 0.02;
    this.neckGroup.add(collarMesh);

    const neckGeom = new THREE.CylinderGeometry(0.075, 0.085, 0.15, 16);
    const neckMesh = new THREE.Mesh(neckGeom, skinMaterial);
    neckMesh.position.y = 0.09;
    this.neckGroup.add(neckMesh);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.15, 0);
    this.neckGroup.add(this.headGroup);

    const headGeom = new THREE.SphereGeometry(0.22, 32, 32);
    headGeom.scale(0.96, 1.14, 1.0);
    const headMesh = new THREE.Mesh(headGeom, skinMaterial);
    headMesh.position.y = 0.18;
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    this.buildHair(this.headGroup, hairMaterial, cyberCyanMaterial);

    this.leftEyeGroup = this.buildStylizedEye(-0.075, 0.20, 0.205, skinMaterial);
    this.rightEyeGroup = this.buildStylizedEye(0.075, 0.20, 0.205, skinMaterial);
    this.headGroup.add(this.leftEyeGroup);
    this.headGroup.add(this.rightEyeGroup);

    const browGeom = new THREE.BoxGeometry(0.055, 0.009, 0.008);
    const browMtl = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    this.leftEyebrow = new THREE.Mesh(browGeom, browMtl);
    this.leftEyebrow.position.set(-0.075, 0.255, 0.218);
    this.leftEyebrow.rotation.z = 0.05;
    this.headGroup.add(this.leftEyebrow);

    this.rightEyebrow = new THREE.Mesh(browGeom, browMtl);
    this.rightEyebrow.position.set(0.075, 0.255, 0.218);
    this.rightEyebrow.rotation.z = -0.05;
    this.headGroup.add(this.rightEyebrow);

    const noseGeom = new THREE.ConeGeometry(0.014, 0.035, 6);
    const noseMesh = new THREE.Mesh(noseGeom, skinMaterial);
    noseMesh.position.set(0, 0.15, 0.228);
    noseMesh.rotation.x = -0.2;
    this.headGroup.add(noseMesh);

    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, 0.095, 0.215);
    this.headGroup.add(this.mouthGroup);

    const mouthMtl = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3 });
    const mouthGeom = new THREE.TorusGeometry(0.024, 0.006, 8, 16, Math.PI);
    this.mouthMesh = new THREE.Mesh(mouthGeom, mouthMtl);
    this.mouthMesh.rotation.z = Math.PI;
    this.mouthGroup.add(this.mouthMesh);

    this.buildRightArm(skinMaterial, blazerMaterial, goldTrimMaterial);
    this.buildLeftArm(skinMaterial, blazerMaterial, goldTrimMaterial);
  }

  // =========================================================================
  // 3. STYLIZED HAIR & EYE CONSTRUCTION
  // =========================================================================
  private buildHair(parent: THREE.Group, hairMtl: THREE.Material, glowMtl: THREE.Material): void {
    const hairCapGeom = new THREE.SphereGeometry(0.235, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const hairCap = new THREE.Mesh(hairCapGeom, hairMtl);
    hairCap.position.set(0, 0.20, -0.04);
    hairCap.rotation.x = -0.35;
    parent.add(hairCap);

    const sideLockGeom = new THREE.CylinderGeometry(0.025, 0.012, 0.24, 8);
    const leftLock = new THREE.Mesh(sideLockGeom, hairMtl);
    leftLock.position.set(-0.19, 0.12, 0.06);
    leftLock.rotation.z = -0.15;
    parent.add(leftLock);

    const rightLock = new THREE.Mesh(sideLockGeom, hairMtl);
    rightLock.position.set(0.19, 0.12, 0.06);
    rightLock.rotation.z = 0.15;
    parent.add(rightLock);

    const bangGeom = new THREE.BoxGeometry(0.11, 0.035, 0.02);
    const leftBang = new THREE.Mesh(bangGeom, hairMtl);
    leftBang.position.set(-0.065, 0.285, 0.18);
    leftBang.rotation.z = -0.15;
    leftBang.rotation.y = 0.15;
    parent.add(leftBang);

    const rightBang = new THREE.Mesh(bangGeom, hairMtl);
    rightBang.position.set(0.065, 0.285, 0.18);
    rightBang.rotation.z = 0.15;
    rightBang.rotation.y = -0.15;
    parent.add(rightBang);

    const bunGeom = new THREE.SphereGeometry(0.10, 16, 16);
    const bunMesh = new THREE.Mesh(bunGeom, hairMtl);
    bunMesh.position.set(0, 0.35, -0.18);
    parent.add(bunMesh);

    const bunRingGeom = new THREE.TorusGeometry(0.075, 0.012, 8, 20);
    const bunRing = new THREE.Mesh(bunRingGeom, glowMtl);
    bunRing.position.set(0, 0.35, -0.14);
    bunRing.rotation.y = Math.PI / 2;
    parent.add(bunRing);

    const earringGeom = new THREE.SphereGeometry(0.016, 12, 12);
    const leftEarring = new THREE.Mesh(earringGeom, glowMtl);
    leftEarring.position.set(-0.21, 0.15, 0.02);
    parent.add(leftEarring);

    const rightEarring = new THREE.Mesh(earringGeom, glowMtl);
    rightEarring.position.set(0.21, 0.15, 0.02);
    parent.add(rightEarring);
  }

  private buildStylizedEye(x: number, y: number, z: number, skinMtl: THREE.Material): THREE.Group {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(x, y, z);

    const scleraGeom = new THREE.SphereGeometry(0.032, 16, 16);
    const scleraMtl = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const scleraMesh = new THREE.Mesh(scleraGeom, scleraMtl);
    eyeGroup.add(scleraMesh);

    const outerIrisGeom = new THREE.CircleGeometry(0.019, 18);
    const outerIrisMtl = new THREE.MeshBasicMaterial({ color: 0x1d4ed8 });
    const outerIris = new THREE.Mesh(outerIrisGeom, outerIrisMtl);
    outerIris.position.set(0, 0, 0.029);
    eyeGroup.add(outerIris);

    const innerIrisGeom = new THREE.CircleGeometry(0.013, 18);
    const innerIrisMtl = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const innerIris = new THREE.Mesh(innerIrisGeom, innerIrisMtl);
    innerIris.position.set(0, 0, 0.030);
    eyeGroup.add(innerIris);

    const pupilGeom = new THREE.CircleGeometry(0.007, 16);
    const pupilMtl = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const pupil = new THREE.Mesh(pupilGeom, pupilMtl);
    pupil.position.set(0, 0, 0.031);
    eyeGroup.add(pupil);

    const highlightGeom = new THREE.CircleGeometry(0.004, 8);
    const highlightMtl = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const highlight = new THREE.Mesh(highlightGeom, highlightMtl);
    highlight.position.set(0.005, 0.005, 0.032);
    eyeGroup.add(highlight);

    const eyelidGeom = new THREE.SphereGeometry(0.035, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const eyelidMesh = new THREE.Mesh(eyelidGeom, skinMtl);
    eyelidMesh.rotation.x = -Math.PI / 2;
    eyelidMesh.scale.set(1, 0, 1);
    eyeGroup.add(eyelidMesh);

    if (x < 0) {
      this.leftEyelid = eyelidMesh;
    } else {
      this.rightEyelid = eyelidMesh;
    }

    return eyeGroup;
  }

  // =========================================================================
  // 4. ARTICULATED ARMS & 5-FINGER HANDS
  // =========================================================================
  private buildRightArm(skinMtl: THREE.Material, suitMtl: THREE.Material, trimMtl: THREE.Material): void {
    this.rShoulderJoint = new THREE.Group();
    this.rShoulderJoint.position.set(0.33, 0.69, 0);
    this.torsoGroup.add(this.rShoulderJoint);

    const upperArmGeom = new THREE.CylinderGeometry(0.056, 0.048, 0.35, 14);
    const upperArmMesh = new THREE.Mesh(upperArmGeom, suitMtl);
    upperArmMesh.position.y = -0.175;
    upperArmMesh.castShadow = true;
    this.rShoulderJoint.add(upperArmMesh);

    this.rElbowJoint = new THREE.Group();
    this.rElbowJoint.position.set(0, -0.35, 0);
    this.rShoulderJoint.add(this.rElbowJoint);

    const forearmGeom = new THREE.CylinderGeometry(0.048, 0.042, 0.31, 14);
    const forearmMesh = new THREE.Mesh(forearmGeom, suitMtl);
    forearmMesh.position.y = -0.155;
    forearmMesh.castShadow = true;
    this.rElbowJoint.add(forearmMesh);

    const cuffGeom = new THREE.TorusGeometry(0.045, 0.007, 8, 16);
    const cuffMesh = new THREE.Mesh(cuffGeom, trimMtl);
    cuffMesh.rotation.x = Math.PI / 2;
    cuffMesh.position.y = -0.29;
    this.rElbowJoint.add(cuffMesh);

    this.rWristJoint = new THREE.Group();
    this.rWristJoint.position.set(0, -0.31, 0);
    this.rElbowJoint.add(this.rWristJoint);

    this.rHandGroup = new THREE.Group();
    this.rWristJoint.add(this.rHandGroup);

    const palmGeom = new THREE.BoxGeometry(0.07, 0.075, 0.024);
    const palmMesh = new THREE.Mesh(palmGeom, skinMtl);
    palmMesh.position.y = -0.038;
    palmMesh.castShadow = true;
    this.rHandGroup.add(palmMesh);

    this.rFingers.thumb = this.buildFinger(this.rHandGroup, 0.038, -0.016, 0.008, 0.014, 0.048, skinMtl, true);
    this.rFingers.index = this.buildFinger(this.rHandGroup, 0.025, -0.075, 0, 0.012, 0.064, skinMtl, false);
    this.rFingers.middle = this.buildFinger(this.rHandGroup, 0.008, -0.075, 0, 0.013, 0.07, skinMtl, false);
    this.rFingers.ring = this.buildFinger(this.rHandGroup, -0.009, -0.075, 0, 0.012, 0.064, skinMtl, false);
    this.rFingers.pinky = this.buildFinger(this.rHandGroup, -0.025, -0.07, 0, 0.010, 0.048, skinMtl, false);
  }

  private buildLeftArm(skinMtl: THREE.Material, suitMtl: THREE.Material, trimMtl: THREE.Material): void {
    this.lShoulderJoint = new THREE.Group();
    this.lShoulderJoint.position.set(-0.33, 0.69, 0);
    this.torsoGroup.add(this.lShoulderJoint);

    const upperArmGeom = new THREE.CylinderGeometry(0.056, 0.048, 0.35, 14);
    const upperArmMesh = new THREE.Mesh(upperArmGeom, suitMtl);
    upperArmMesh.position.y = -0.175;
    upperArmMesh.castShadow = true;
    this.lShoulderJoint.add(upperArmMesh);

    this.lElbowJoint = new THREE.Group();
    this.lElbowJoint.position.set(0, -0.35, 0);
    this.lShoulderJoint.add(this.lElbowJoint);

    const forearmGeom = new THREE.CylinderGeometry(0.048, 0.042, 0.31, 14);
    const forearmMesh = new THREE.Mesh(forearmGeom, suitMtl);
    forearmMesh.position.y = -0.155;
    forearmMesh.castShadow = true;
    this.lElbowJoint.add(forearmMesh);

    const cuffGeom = new THREE.TorusGeometry(0.045, 0.007, 8, 16);
    const cuffMesh = new THREE.Mesh(cuffGeom, trimMtl);
    cuffMesh.rotation.x = Math.PI / 2;
    cuffMesh.position.y = -0.29;
    this.lElbowJoint.add(cuffMesh);

    this.lWristJoint = new THREE.Group();
    this.lWristJoint.position.set(0, -0.31, 0);
    this.lElbowJoint.add(this.lWristJoint);

    this.lHandGroup = new THREE.Group();
    this.lWristJoint.add(this.lHandGroup);

    const palmGeom = new THREE.BoxGeometry(0.07, 0.075, 0.024);
    const palmMesh = new THREE.Mesh(palmGeom, skinMtl);
    palmMesh.position.y = -0.038;
    palmMesh.castShadow = true;
    this.lHandGroup.add(palmMesh);

    this.lFingers.thumb = this.buildFinger(this.lHandGroup, -0.038, -0.016, 0.008, 0.014, 0.048, skinMtl, true);
    this.lFingers.index = this.buildFinger(this.lHandGroup, -0.025, -0.075, 0, 0.012, 0.064, skinMtl, false);
    this.lFingers.middle = this.buildFinger(this.lHandGroup, -0.008, -0.075, 0, 0.013, 0.07, skinMtl, false);
    this.lFingers.ring = this.buildFinger(this.lHandGroup, 0.009, -0.075, 0, 0.012, 0.064, skinMtl, false);
    this.lFingers.pinky = this.buildFinger(this.lHandGroup, 0.025, -0.07, 0, 0.010, 0.048, skinMtl, false);
  }

  private buildFinger(
    parent: THREE.Group,
    x: number,
    y: number,
    z: number,
    radius: number,
    length: number,
    skinMtl: THREE.Material,
    isThumb: boolean
  ): THREE.Group[] {
    const joint1 = new THREE.Group();
    joint1.position.set(x, y, z);
    parent.add(joint1);

    const seg1Len = length * 0.55;
    const seg1Geom = new THREE.CylinderGeometry(radius, radius * 0.9, seg1Len, 8);
    const seg1Mesh = new THREE.Mesh(seg1Geom, skinMtl);
    seg1Mesh.position.y = -seg1Len * 0.5;
    joint1.add(seg1Mesh);

    const joint2 = new THREE.Group();
    joint2.position.set(0, -seg1Len, 0);
    joint1.add(joint2);

    const seg2Len = length * 0.45;
    const seg2Geom = new THREE.CylinderGeometry(radius * 0.9, radius * 0.75, seg2Len, 8);
    const seg2Mesh = new THREE.Mesh(seg2Geom, skinMtl);
    seg2Mesh.position.y = -seg2Len * 0.5;
    joint2.add(seg2Mesh);

    if (isThumb) {
      joint1.rotation.z = x > 0 ? 0.4 : -0.4;
      joint1.rotation.y = 0.2;
    }

    return [joint1, joint2];
  }

  // =========================================================================
  // 5. PEDESTAL & HOLOGRAPHIC ENVIRONMENT
  // =========================================================================
  private buildPedestalAndHoloEnvironment(): void {
    this.pedestalGroup = new THREE.Group();
    this.pedestalGroup.position.set(0, -0.45, 0);
    this.scene.add(this.pedestalGroup);

    const baseGeom = new THREE.CylinderGeometry(1.2, 1.3, 0.08, 32);
    const baseMtl = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.8
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMtl);
    baseMesh.receiveShadow = true;
    this.pedestalGroup.add(baseMesh);

    const ringRadii = [0.85, 1.05, 1.22];
    ringRadii.forEach((r, idx) => {
      const ringGeom = new THREE.RingGeometry(r, r + 0.02, 48);
      const ringMtl = new THREE.MeshBasicMaterial({
        color: idx === 1 ? 0x38bdf8 : 0x6366f1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMtl);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.045 + idx * 0.01;
      this.pedestalGroup.add(ringMesh);
      this.hologramRings.push(ringMesh);
    });

    const particleCount = 100;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 3.5;
      positions[i + 1] = Math.random() * 2.6 - 0.3;
      positions[i + 2] = (Math.random() - 0.5) * 3.5;
    }
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMtl = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.032,
      transparent: true,
      opacity: 0.6
    });
    this.particleSystem = new THREE.Points(particleGeom, particleMtl);
    this.scene.add(this.particleSystem);

    this.neuralGlyphGroup = new THREE.Group();
    this.neuralGlyphGroup.position.set(0, 1.35, 0);
    this.neuralGlyphGroup.visible = false;
    this.scene.add(this.neuralGlyphGroup);

    const glyphGeom = new THREE.IcosahedronGeometry(0.12, 0);
    const glyphMtl = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const glyphMesh = new THREE.Mesh(glyphGeom, glyphMtl);
    this.neuralGlyphGroup.add(glyphMesh);

    const shieldGeom = new THREE.TorusGeometry(0.85, 0.02, 16, 48);
    const shieldMtl = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8 });
    this.warningShieldMesh = new THREE.Mesh(shieldGeom, shieldMtl);
    this.warningShieldMesh.position.set(0, 0.4, 0.4);
    this.warningShieldMesh.visible = false;
    this.scene.add(this.warningShieldMesh);
  }

  // =========================================================================
  // 6. GESTURE DEFINITIONS & KINEMATICS
  // =========================================================================
  private getDefaultPose(state: AiVivaState): JointPose {
    switch (state) {
      case 'WELCOMING':
        return {
          rShoulderRot: [-0.95, -0.2, 1.15],
          rElbowRot: [-1.45, 0.35, 0],
          rWristRot: [0, 0.2, 0.25],
          rThumbCurl: 0.2,
          rIndexCurl: 0.1,
          rMiddleCurl: 0.15,
          rRingCurl: 0.2,
          rPinkyCurl: 0.25,

          lShoulderRot: [0.15, 0.1, -0.2],
          lElbowRot: [-0.3, 0, 0],
          lWristRot: [0, 0, 0],
          lThumbCurl: 0.25,
          lIndexCurl: 0.25,
          lMiddleCurl: 0.3,
          lRingCurl: 0.35,
          lPinkyCurl: 0.4,

          headRot: [0.04, 0.06, -0.05],
          browState: 'NORMAL',
          mouthState: 'SMILE'
        };

      case 'SPEAKING':
      case 'FOCUSED':
        return {
          rShoulderRot: [-0.7, 0.25, 0.45],
          rElbowRot: [-0.85, 0.35, 0],
          rWristRot: [0.2, 0.35, 0.1],
          rThumbCurl: 0.15,
          rIndexCurl: 0.0,
          rMiddleCurl: 0.12,
          rRingCurl: 0.22,
          rPinkyCurl: 0.3,

          lShoulderRot: [-0.4, -0.2, -0.3],
          lElbowRot: [-0.65, -0.2, 0],
          lWristRot: [0.1, -0.25, 0],
          lThumbCurl: 0.2,
          lIndexCurl: 0.15,
          lMiddleCurl: 0.2,
          lRingCurl: 0.28,
          lPinkyCurl: 0.32,

          headRot: [0.02, 0.0, 0.0],
          browState: 'NORMAL',
          mouthState: 'SPEAKING'
        };

      case 'LISTENING':
        return {
          rShoulderRot: [-0.82, -0.2, 0.55],
          rElbowRot: [-1.85, 0.45, 0],
          rWristRot: [0.3, 0.2, 0.1],
          rThumbCurl: 0.2,
          rIndexCurl: 0.3,
          rMiddleCurl: 0.4,
          rRingCurl: 0.5,
          rPinkyCurl: 0.5,

          lShoulderRot: [0.1, 0, -0.15],
          lElbowRot: [-0.2, 0, 0],
          lWristRot: [0, 0, 0],
          lThumbCurl: 0.25,
          lIndexCurl: 0.25,
          lMiddleCurl: 0.3,
          lRingCurl: 0.35,
          lPinkyCurl: 0.4,

          headRot: [0.08, -0.08, 0.04],
          browState: 'NORMAL',
          mouthState: 'CLOSED'
        };

      case 'THINKING':
      case 'SMART':
        return {
          rShoulderRot: [-1.15, -0.1, 0.65],
          rElbowRot: [-2.15, 0.4, 0],
          rWristRot: [0.4, 0.2, 0.1],
          rThumbCurl: 0.4,
          rIndexCurl: 0.0,
          rMiddleCurl: 0.85,
          rRingCurl: 0.9,
          rPinkyCurl: 0.9,

          lShoulderRot: [-0.3, 0.4, -0.4],
          lElbowRot: [-1.2, -0.6, 0],
          lWristRot: [0.2, 0, 0],
          lThumbCurl: 0.35,
          lIndexCurl: 0.35,
          lMiddleCurl: 0.4,
          lRingCurl: 0.45,
          lPinkyCurl: 0.5,

          headRot: [-0.12, 0.18, 0.06],
          browState: 'RAISED',
          mouthState: 'SMILE'
        };

      case 'MOTIVATIONAL':
        return {
          rShoulderRot: [-0.65, 0.12, 0.35],
          rElbowRot: [-1.35, 0.25, 0],
          rWristRot: [0, 0.6, -0.2],
          rThumbCurl: -0.35,
          rIndexCurl: 0.95,
          rMiddleCurl: 0.95,
          rRingCurl: 0.95,
          rPinkyCurl: 0.95,

          lShoulderRot: [0.15, 0.1, -0.2],
          lElbowRot: [-0.35, 0, 0],
          lWristRot: [0, 0, 0],
          lThumbCurl: 0.25,
          lIndexCurl: 0.25,
          lMiddleCurl: 0.3,
          lRingCurl: 0.35,
          lPinkyCurl: 0.4,

          headRot: [0.04, 0.0, 0.0],
          browState: 'RAISED',
          mouthState: 'SMILE'
        };

      case 'FRIENDLY':
      case 'SUPPORTIVE':
        return {
          rShoulderRot: [-0.85, -0.2, 0.85],
          rElbowRot: [-1.55, 0.4, 0],
          rWristRot: [0, 0.3, 0.2],
          rThumbCurl: 0.8,
          rIndexCurl: 0.0,
          rMiddleCurl: 0.0,
          rRingCurl: 0.9,
          rPinkyCurl: 0.9,

          lShoulderRot: [0.1, 0, -0.15],
          lElbowRot: [-0.25, 0, 0],
          lWristRot: [0, 0, 0],
          lThumbCurl: 0.25,
          lIndexCurl: 0.25,
          lMiddleCurl: 0.3,
          lRingCurl: 0.35,
          lPinkyCurl: 0.4,

          headRot: [0.02, 0.05, -0.04],
          browState: 'NORMAL',
          mouthState: 'SMILE'
        };

      case 'STERN_WARNING':
      case 'TAB_SWITCH_ALERT':
      case 'FACE_HIDDEN_ALERT':
        return {
          rShoulderRot: [-1.05, 0.2, 0.55],
          rElbowRot: [-1.45, 0.3, 0],
          rWristRot: [0.3, 0.1, 0.2],
          rThumbCurl: 0.8,
          rIndexCurl: 0.0,
          rMiddleCurl: 0.9,
          rRingCurl: 0.9,
          rPinkyCurl: 0.9,

          lShoulderRot: [0.3, -0.3, -0.5],
          lElbowRot: [-1.4, -0.4, 0],
          lWristRot: [-0.2, 0, 0],
          lThumbCurl: 0.6,
          lIndexCurl: 0.6,
          lMiddleCurl: 0.65,
          lRingCurl: 0.7,
          lPinkyCurl: 0.75,

          headRot: [0.08, 0.0, 0.0],
          browState: 'FURROWED',
          mouthState: 'STERN'
        };

      case 'DISQUALIFIED':
        return {
          rShoulderRot: [-0.5, 0.6, 0.4],
          rElbowRot: [-1.7, -0.5, 0],
          rWristRot: [0.2, 0, 0],
          rThumbCurl: 0.7,
          rIndexCurl: 0.7,
          rMiddleCurl: 0.75,
          rRingCurl: 0.8,
          rPinkyCurl: 0.85,

          lShoulderRot: [-0.5, -0.6, -0.4],
          lElbowRot: [-1.7, 0.5, 0],
          lWristRot: [0.2, 0, 0],
          lThumbCurl: 0.7,
          lIndexCurl: 0.7,
          lMiddleCurl: 0.75,
          lRingCurl: 0.8,
          lPinkyCurl: 0.85,

          headRot: [0.15, 0.0, 0.0],
          browState: 'FURROWED',
          mouthState: 'STERN'
        };

      case 'IDLE':
      default:
        return {
          rShoulderRot: [0.1, 0, 0.15],
          rElbowRot: [-0.25, 0, 0],
          rWristRot: [0, 0, 0],
          rThumbCurl: 0.25,
          rIndexCurl: 0.25,
          rMiddleCurl: 0.3,
          rRingCurl: 0.35,
          rPinkyCurl: 0.4,

          lShoulderRot: [0.1, 0, -0.15],
          lElbowRot: [-0.25, 0, 0],
          lWristRot: [0, 0, 0],
          lThumbCurl: 0.25,
          lIndexCurl: 0.25,
          lMiddleCurl: 0.3,
          lRingCurl: 0.35,
          lPinkyCurl: 0.4,

          headRot: [0, 0, 0],
          browState: 'NORMAL',
          mouthState: 'CLOSED'
        };
    }
  }

  // =========================================================================
  // 7. RENDER & ANIMATION LOOP (60 FPS)
  // =========================================================================
  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.updateFpsCounter();
    this.updateCameraOrbit();
    this.interpolatePose(delta);
    this.applyProceduralMicroMotions(elapsed, delta);
    this.updateHologramEffects(elapsed);

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private interpolatePose(delta: number): void {
    const lerpSpeed = 6.5 * delta;

    const lerpVal = (cur: number, target: number) => cur + (target - cur) * lerpSpeed;
    const lerpArr = (cur: [number, number, number], target: [number, number, number]): [number, number, number] => [
      lerpVal(cur[0], target[0]),
      lerpVal(cur[1], target[1]),
      lerpVal(cur[2], target[2])
    ];

    this.currentPose.rShoulderRot = lerpArr(this.currentPose.rShoulderRot, this.targetPose.rShoulderRot);
    this.currentPose.rElbowRot = lerpArr(this.currentPose.rElbowRot, this.targetPose.rElbowRot);
    this.currentPose.rWristRot = lerpArr(this.currentPose.rWristRot, this.targetPose.rWristRot);
    this.currentPose.rThumbCurl = lerpVal(this.currentPose.rThumbCurl, this.targetPose.rThumbCurl);
    this.currentPose.rIndexCurl = lerpVal(this.currentPose.rIndexCurl, this.targetPose.rIndexCurl);
    this.currentPose.rMiddleCurl = lerpVal(this.currentPose.rMiddleCurl, this.targetPose.rMiddleCurl);
    this.currentPose.rRingCurl = lerpVal(this.currentPose.rRingCurl, this.targetPose.rRingCurl);
    this.currentPose.rPinkyCurl = lerpVal(this.currentPose.rPinkyCurl, this.targetPose.rPinkyCurl);

    this.currentPose.lShoulderRot = lerpArr(this.currentPose.lShoulderRot, this.targetPose.lShoulderRot);
    this.currentPose.lElbowRot = lerpArr(this.currentPose.lElbowRot, this.targetPose.lElbowRot);
    this.currentPose.lWristRot = lerpArr(this.currentPose.lWristRot, this.targetPose.lWristRot);
    this.currentPose.lThumbCurl = lerpVal(this.currentPose.lThumbCurl, this.targetPose.lThumbCurl);
    this.currentPose.lIndexCurl = lerpVal(this.currentPose.lIndexCurl, this.targetPose.lIndexCurl);
    this.currentPose.lMiddleCurl = lerpVal(this.currentPose.lMiddleCurl, this.targetPose.lMiddleCurl);
    this.currentPose.lRingCurl = lerpVal(this.currentPose.lRingCurl, this.targetPose.lRingCurl);
    this.currentPose.lPinkyCurl = lerpVal(this.currentPose.lPinkyCurl, this.targetPose.lPinkyCurl);

    this.currentPose.headRot = lerpArr(this.currentPose.headRot, this.targetPose.headRot);

    if (this.rShoulderJoint) {
      this.rShoulderJoint.rotation.set(...this.currentPose.rShoulderRot);
      this.rElbowJoint.rotation.set(...this.currentPose.rElbowRot);
      this.rWristJoint.rotation.set(...this.currentPose.rWristRot);
      this.applyFingerCurls(this.rFingers, this.currentPose.rThumbCurl, this.currentPose.rIndexCurl, this.currentPose.rMiddleCurl, this.currentPose.rRingCurl, this.currentPose.rPinkyCurl);
    }

    if (this.lShoulderJoint) {
      this.lShoulderJoint.rotation.set(...this.currentPose.lShoulderRot);
      this.lElbowJoint.rotation.set(...this.currentPose.lElbowRot);
      this.lWristJoint.rotation.set(...this.currentPose.lWristRot);
      this.applyFingerCurls(this.lFingers, this.currentPose.lThumbCurl, this.currentPose.lIndexCurl, this.currentPose.lMiddleCurl, this.currentPose.lRingCurl, this.currentPose.lPinkyCurl);
    }

    if (this.headGroup) {
      this.headGroup.rotation.set(...this.currentPose.headRot);
    }
  }

  private applyFingerCurls(
    fingers: { thumb: THREE.Group[]; index: THREE.Group[]; middle: THREE.Group[]; ring: THREE.Group[]; pinky: THREE.Group[] },
    thumb: number,
    index: number,
    middle: number,
    ring: number,
    pinky: number
  ): void {
    const applyJoint = (chain: THREE.Group[], curlVal: number) => {
      if (chain[0]) chain[0].rotation.x = curlVal * 1.2;
      if (chain[1]) chain[1].rotation.x = curlVal * 1.4;
    };
    applyJoint(fingers.thumb, thumb);
    applyJoint(fingers.index, index);
    applyJoint(fingers.middle, middle);
    applyJoint(fingers.ring, ring);
    applyJoint(fingers.pinky, pinky);
  }

  // =========================================================================
  // 8. PROCEDURAL MICRO-MOTIONS (BREATHING, BLINKING, WAVING & LIP-SYNC)
  // =========================================================================
  private applyProceduralMicroMotions(elapsed: number, delta: number): void {
    const breath = Math.sin(elapsed * 2.2) * 0.015;
    if (this.bodyGroup) {
      this.bodyGroup.position.y = breath;
    }
    if (this.torsoGroup) {
      this.torsoGroup.scale.set(1 + breath * 0.4, 1 + breath * 0.3, 1 + breath * 0.4);
    }

    this.blinkTimer += delta;
    if (this.blinkTimer >= this.nextBlinkTime) {
      const blinkProgress = (this.blinkTimer - this.nextBlinkTime) / this.blinkDuration;
      if (blinkProgress <= 1.0) {
        const eyeClose = Math.sin(blinkProgress * Math.PI);
        if (this.leftEyelid) this.leftEyelid.scale.y = eyeClose;
        if (this.rightEyelid) this.rightEyelid.scale.y = eyeClose;
      } else {
        if (this.leftEyelid) this.leftEyelid.scale.y = 0;
        if (this.rightEyelid) this.rightEyelid.scale.y = 0;
        this.blinkTimer = 0;
        this.nextBlinkTime = 2.0 + Math.random() * 3.5;
      }
    }

    if (this.leftEyebrow && this.rightEyebrow) {
      if (this.targetPose.browState === 'FURROWED') {
        this.leftEyebrow.rotation.z = -0.22;
        this.rightEyebrow.rotation.z = 0.22;
        this.leftEyebrow.position.y = 0.245;
        this.rightEyebrow.position.y = 0.245;
      } else if (this.targetPose.browState === 'RAISED') {
        this.leftEyebrow.rotation.z = 0.12;
        this.rightEyebrow.rotation.z = -0.12;
        this.leftEyebrow.position.y = 0.27;
        this.rightEyebrow.position.y = 0.27;
      } else {
        this.leftEyebrow.rotation.z = 0.05;
        this.rightEyebrow.rotation.z = -0.05;
        this.leftEyebrow.position.y = 0.255;
        this.rightEyebrow.position.y = 0.255;
      }
    }

    if (this.isSpeaking || this.state === 'SPEAKING') {
      this.speechVisemeTimer += delta * 12;
      this.speechMouthOpen = (Math.sin(this.speechVisemeTimer) * 0.5 + 0.5) * 0.8 + 0.2;
      if (this.mouthMesh) {
        this.mouthMesh.scale.set(1.1, 0.4 + this.speechMouthOpen * 1.3, 1);
      }
      if (this.headGroup) {
        this.headGroup.rotation.x += Math.sin(this.speechVisemeTimer * 0.5) * 0.025;
      }
    } else {
      if (this.mouthMesh) {
        if (this.targetPose.mouthState === 'SMILE') {
          this.mouthMesh.scale.set(1.15, 0.5, 1);
          this.mouthMesh.rotation.z = Math.PI;
        } else if (this.targetPose.mouthState === 'STERN') {
          this.mouthMesh.scale.set(0.9, 0.2, 1);
          this.mouthMesh.rotation.z = 0;
        } else {
          this.mouthMesh.scale.set(1, 0.35, 1);
          this.mouthMesh.rotation.z = Math.PI;
        }
      }
    }

    if (this.state === 'WELCOMING' && this.rWristJoint) {
      this.waveCycle += delta * 6;
      this.rWristJoint.rotation.z = this.currentPose.rWristRot[2] + Math.sin(this.waveCycle) * 0.25;
    }

    if ((this.state === 'STERN_WARNING' || this.state === 'TAB_SWITCH_ALERT') && this.rWristJoint) {
      this.waveCycle += delta * 9;
      this.rWristJoint.rotation.y = this.currentPose.rWristRot[1] + Math.sin(this.waveCycle) * 0.28;
      if (this.headGroup) {
        this.headGroup.rotation.y = Math.sin(this.waveCycle * 0.6) * 0.12;
      }
    }
  }

  // =========================================================================
  // 9. HOLOGRAPHIC LIGHTING & ROTATION EFFECTS
  // =========================================================================
  private updateHologramEffects(elapsed: number): void {
    this.hologramRings.forEach((ring, idx) => {
      const speed = (idx % 2 === 0 ? 0.8 : -0.6) * (idx + 1) * 0.5;
      ring.rotation.z = elapsed * speed;
    });

    if (this.particleSystem) {
      this.particleSystem.rotation.y = elapsed * 0.08;
    }

    if (this.neuralGlyphGroup) {
      this.neuralGlyphGroup.visible = this.state === 'THINKING' || this.state === 'SMART';
      if (this.neuralGlyphGroup.visible) {
        this.neuralGlyphGroup.rotation.x = elapsed * 1.5;
        this.neuralGlyphGroup.rotation.y = elapsed * 2.0;
      }
    }

    if (this.warningShieldMesh) {
      this.warningShieldMesh.visible = this.state === 'STERN_WARNING' || this.state === 'TAB_SWITCH_ALERT';
      if (this.warningShieldMesh.visible) {
        this.warningShieldMesh.rotation.z = elapsed * 3.0;
        const scale = 1 + Math.sin(elapsed * 6) * 0.05;
        this.warningShieldMesh.scale.set(scale, scale, 1);
      }
    }
  }

  private updateLightingAndHoloColors(): void {
    if (!this.rimLight) return;

    if (this.state === 'STERN_WARNING' || this.state === 'TAB_SWITCH_ALERT' || this.state === 'DISQUALIFIED') {
      this.rimLight.color.setHex(0xef4444);
      this.rimLight.intensity = 4.0;
    } else if (this.state === 'MOTIVATIONAL') {
      this.rimLight.color.setHex(0xf59e0b);
      this.rimLight.intensity = 3.2;
    } else if (this.state === 'LISTENING') {
      this.rimLight.color.setHex(0x10b981);
      this.rimLight.intensity = 3.0;
    } else {
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 2.4;
    }
  }

  // =========================================================================
  // 10. CAMERA PRESETS & ORBIT CONTROLS
  // =========================================================================
  setPreset(preset: CameraPreset): void {
    this.currentPreset.set(preset);
    this.applyCameraPreset(preset);
  }

  private applyCameraPreset(preset: CameraPreset): void {
    if (!this.camera) return;

    switch (preset) {
      case 'CLOSEUP_FACE':
        this.camera.position.set(0, 0.44, 1.25);
        this.camera.lookAt(0, 0.32, 0);
        this.cameraDistance = 1.25;
        break;

      case 'FULL_BODY':
        this.camera.position.set(0, 0.2, 3.8);
        this.camera.lookAt(0, 0.05, 0);
        this.cameraDistance = 3.8;
        break;

      case 'ORBIT':
        this.camera.position.set(1.3, 0.55, 2.2);
        this.camera.lookAt(0, 0.2, 0);
        this.cameraDistance = 2.6;
        break;

      case 'HERO_34':
      default:
        this.camera.position.set(0.22, 0.38, 2.0);
        this.camera.lookAt(0, 0.22, 0);
        this.cameraDistance = 2.0;
        break;
    }
  }

  private setupMouseEvents(container: HTMLElement): void {
    container.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      const deltaX = e.clientX - this.mouseX;
      const deltaY = e.clientY - this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      this.targetCameraRotY += deltaX * 0.006;
      this.targetCameraRotX = Math.max(-0.4, Math.min(0.4, this.targetCameraRotX + deltaY * 0.004));
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(1.0, Math.min(4.8, this.cameraDistance + e.deltaY * 0.002));
    }, { passive: false });
  }

  private updateCameraOrbit(): void {
    if (!this.camera) return;

    this.currentCameraRotY += (this.targetCameraRotY - this.currentCameraRotY) * 0.1;
    this.currentCameraRotX += (this.targetCameraRotX - this.currentCameraRotX) * 0.1;

    if (this.currentPreset() === 'ORBIT' || this.isOrbitEnabled()) {
      const radius = this.cameraDistance;
      this.camera.position.x = Math.sin(this.currentCameraRotY) * radius * Math.cos(this.currentCameraRotX);
      this.camera.position.z = Math.cos(this.currentCameraRotY) * radius * Math.cos(this.currentCameraRotX);
      this.camera.position.y = 0.32 + Math.sin(this.currentCameraRotX) * radius;
      this.camera.lookAt(0, 0.22, 0);
    }
  }

  // =========================================================================
  // 11. RESIZE & FPS MONITOR
  // =========================================================================
  private setupResizeObserver(): void {
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0 && this.camera && this.renderer) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });

    this.resizeObserver.observe(container);
  }

  private updateFpsCounter(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdateTime >= 1000) {
      this.fpsCounter.set(this.frameCount);
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
    }
  }

  // =========================================================================
  // 12. MANUAL GESTURE TRIGGER & EXPORT
  // =========================================================================
  triggerGesture(gesture: AiVivaState): void {
    this.state = gesture;
    this.targetPose = this.getDefaultPose(gesture);
    this.updateLightingAndHoloColors();
    this.stateChange.emit(gesture);
  }

  exportGlbModel(): void {
    const blob = new Blob(['SCHOLARX_3D_AI_TEACHER_GLB_V2'], { type: 'model/gltf-binary' });
    this.glbExported.emit(blob);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ScholarX_AI_VIVA_Teacher_${this.state}.glb`;
    a.click();
  }

  private cleanupThreeEngine(): void {
    if (this.renderer) {
      this.renderer.dispose();
      const dom = this.renderer.domElement;
      if (dom && dom.parentNode) {
        dom.parentNode.removeChild(dom);
      }
    }
    if (this.scene) {
      this.scene.clear();
    }
  }
}
