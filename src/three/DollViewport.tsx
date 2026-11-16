import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BACKGROUNDS } from '../data/catalog';
import type {
  BodyConfig,
  CameraPresetId,
  FacialIdentityParams,
  LookCustomization,
} from '../types/studio';
import { createDollRig, type DollRigController } from './characterRig';

export interface DollViewportHandle {
  captureScreenshot: () => string | null;
  zoomBy: (factor: number) => void;
}

interface DollViewportProps {
  identity: FacialIdentityParams;
  body: BodyConfig;
  look: LookCustomization;
  cameraPreset: CameraPresetId;
  className?: string;
}

const CAMERA_PRESETS: Record<CameraPresetId, { pos: [number, number, number]; target: [number, number, number] }> = {
  full_body: { pos: [0, 1.00, 3.18], target: [0, 0.84, 0] },
  portrait: { pos: [0, 1.50, 0.96], target: [0, 1.48, 0] },
  side_profile: { pos: [2.1, 1.22, 0.25], target: [0, 1.12, 0] },
  back_view: { pos: [0, 1.12, -2.85], target: [0, 0.88, 0] },
  manicure: { pos: [-0.42, 0.88, 0.65], target: [-0.22, 0.82, 0.04] },
  shoes: { pos: [0.38, 0.26, 0.92], target: [0, 0.14, 0.04] },
};

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const DollViewport = forwardRef<DollViewportHandle, DollViewportProps>(function DollViewport(
  { identity, body, look, cameraPreset, className = '' },
  ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const propsRef = useRef({ identity, body, look, cameraPreset });
  propsRef.current = { identity, body, look, cameraPreset };

  const rigRef = useRef<DollRigController | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const lightsRef = useRef<{
    key: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    rim: THREE.DirectionalLight;
    hemi: THREE.HemisphereLight;
    pedestalMat: THREE.MeshStandardMaterial;
    floorMat: THREE.MeshStandardMaterial;
  } | null>(null);
  const activeCameraPresetRef = useRef<CameraPresetId | null>(cameraPreset);
  const isTransitioningRef = useRef<boolean>(false);
  const backdropTexturesRef = useRef<Map<string, THREE.Texture>>(new Map());

  useEffect(() => {
    activeCameraPresetRef.current = cameraPreset;
    isTransitioningRef.current = true;
  }, [cameraPreset]);

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!renderer || !scene || !camera) return null;
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },
    zoomBy: (factor: number) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      isTransitioningRef.current = false;
      const offset = camera.position.clone().sub(controls.target);
      offset.multiplyScalar(factor);
      const len = offset.length();
      if (len >= 0.55 && len <= 4.5) {
        camera.position.copy(controls.target).add(offset);
        controls.update();
      }
    },
  }));

  // Mount WebGLRenderer & Scene ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 640;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F7EEF2');
    scene.fog = new THREE.Fog('#F7EEF2', 5.5, 13);
    sceneRef.current = scene;

    // Mandatory Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    const initialCam = CAMERA_PRESETS[propsRef.current.cameraPreset];
    camera.position.set(...initialCam.pos);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialCam.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.55;
    controls.maxDistance = 4.6;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });
    controls.update();
    controlsRef.current = controls;

    // 3-Point Studio Lighting Rig (warm cinematic bounce, 3/4 sculpt key light)
    const hemi = new THREE.HemisphereLight('#FFF5F0', '#C49E98', 0.62);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF0E0', 1.15);
    key.position.set(2.8, 3.3, 2.4);
    key.castShadow = !isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 10;
    key.shadow.camera.left = -1.8;
    key.shadow.camera.right = 1.8;
    key.shadow.camera.top = 2.4;
    key.shadow.camera.bottom = -0.6;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    scene.add(key);

    const fill = new THREE.DirectionalLight('#E8DEFA', 0.50);
    fill.position.set(-2.8, 1.9, 1.8);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#FFE2EC', 0.85);
    rim.position.set(0.2, 2.5, -2.8);
    scene.add(rim);

    // Stage Floor & Couture Pedestal
    const floorMat = new THREE.MeshStandardMaterial({ color: '#EFE2E7', roughness: 0.78, metalness: 0.02 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 48), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    scene.add(floor);

    const pedestalMat = new THREE.MeshPhysicalMaterial({
      color: '#FCF7F9',
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.4,
    });
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.04, 48), pedestalMat);
    pedestal.position.y = -0.02;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const goldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.008, 12, 48),
      new THREE.MeshStandardMaterial({ color: '#C49A6C', metalness: 0.9, roughness: 0.2 }),
    );
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = 0.0;
    scene.add(goldRing);

    // Soft radial contact shadow disc directly beneath the doll
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(35, 25, 36, 0.36)');
    sGrad.addColorStop(1, 'rgba(35, 25, 36, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);
    const contactTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 32),
      new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.004;
    scene.add(contactShadow);

    lightsRef.current = { key, fill, rim, hemi, pedestalMat, floorMat };

    // Create & mount 3D Character Rig
    const rig = createDollRig();
    scene.add(rig.root);
    rigRef.current = rig;
    rig.updateAppearance(propsRef.current.identity, propsRef.current.body, propsRef.current.look);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
      }
    });
    resizeObserver.observe(container);

    // Paced animation loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      let polls = 0;
      const poll = () => {
        if (disposed) return;
        polls += 1;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && polls < 25) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Update camera preset damping if transitioning
      if (isTransitioningRef.current && activeCameraPresetRef.current) {
        const targetCfg = CAMERA_PRESETS[activeCameraPresetRef.current];
        _targetPos.set(...targetCfg.pos);
        _targetLook.set(...targetCfg.target);
        const lambda = 7.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, lambda, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, lambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, lambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, lambda, delta);
        if (camera.position.distanceTo(_targetPos) < 0.01) {
          isTransitioningRef.current = false;
        }
      }

      controls.update();
      rig.updateAnimation(elapsed, delta, propsRef.current.look);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      controls.dispose();
      rig.dispose();
      backdropTexturesRef.current.forEach((t) => t.dispose());
      backdropTexturesRef.current.clear();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync character appearance, background & lighting without tearing down canvas
  useEffect(() => {
    const rig = rigRef.current;
    const scene = sceneRef.current;
    const lights = lightsRef.current;
    if (!rig || !scene || !lights) return;

    rig.updateAppearance(identity, body, look);

    const bgCfg = BACKGROUNDS.find((b) => b.id === look.background) ?? BACKGROUNDS[0];
    lights.floorMat.color.set(bgCfg.floorHex);
    scene.fog = new THREE.Fog(bgCfg.fogHex, 5.5, 13);

    if (bgCfg.imageUrl) {
      const cached = backdropTexturesRef.current.get(bgCfg.imageUrl);
      if (cached) {
        scene.background = cached;
      } else {
        const loader = new THREE.TextureLoader();
        loader.load(
          bgCfg.imageUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            backdropTexturesRef.current.set(bgCfg.imageUrl!, tex);
            if (propsRef.current.look.background === bgCfg.id && sceneRef.current) {
              sceneRef.current.background = tex;
            }
          },
          undefined,
          () => {
            if (sceneRef.current) sceneRef.current.background = new THREE.Color(bgCfg.wallHex);
          },
        );
      }
    } else {
      scene.background = new THREE.Color(bgCfg.wallHex);
    }

    // Lighting Presets
    const mult = look.lightingIntensity;
    if (look.lighting === 'golden_hour') {
      lights.key.color.set('#FFD4A3');
      lights.key.intensity = 1.75 * mult;
      lights.fill.color.set('#F5D8E8');
      lights.rim.color.set('#FFB685');
    } else if (look.lighting === 'runway_spot') {
      lights.key.color.set('#FFFFFF');
      lights.key.intensity = 2.0 * mult;
      lights.fill.color.set('#C9C4F8');
      lights.rim.color.set('#FFFFFF');
    } else if (look.lighting === 'candlelight') {
      lights.key.color.set('#FFBE8A');
      lights.key.intensity = 1.35 * mult;
      lights.fill.color.set('#B498B8');
      lights.rim.color.set('#FF9C6E');
    } else {
      lights.key.color.set('#FFF2E4');
      lights.key.intensity = 1.25 * mult;
      lights.fill.color.set('#ECE4FA');
      lights.rim.color.set('#FFE5EE');
    }

    if (cameraRef.current && rendererRef.current) {
      rendererRef.current.render(scene, cameraRef.current);
    }
  }, [identity, body, look]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={mountRef} data-testid="doll-webgl-canvas" className="w-full h-full cursor-grab active:cursor-grabbing" />
      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F7EEF2] text-[#231924] p-6 text-center">
          <p className="font-display text-2xl font-semibold">3D Studio Paused</p>
          <p className="text-sm text-[#5C4B57] mt-1">Restoring WebGL rendering context...</p>
        </div>
      )}
    </div>
  );
});
