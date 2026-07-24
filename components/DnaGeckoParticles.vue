<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const emit = defineEmits<{
  'bottom-render-mode': [mode: 'always' | 'manual']
}>()

const MODEL_URL = '/models/gecko-tripo.glb'
const BACKBONE_MODEL_URL = '/models/scene03-main-rig.glb'

const CFG = {
  dna: {
    height: 10.0,
    radius: 0.62,
    turns: 2.2,
    tubeRadius: 0.06,
    rungRadius: 0.04,
    rungs: 28,
    segments: 500,
    alpha: 0.52,
    z: -1.65
  },
  gecko: {
    targetSize: 2.2,
    y: 0.6,
    z: 0.55,
    rotationDeg: { x: 45, y: 270, z: 0 }
  },
  spinDeg: 10,
  wheel: {
    // 皛曇憚撣嗅? DNA 頧?嚗peed 頞之頧?頞之
    speed: 0.0055,
    damping: 0.05
  },
  // ?冽?蔣摨漣 + ??嚗嗾??芸楛隤選?
  projector: {
    y: -1.4,
    discRadius: 1,
    beamHeight: 3,
    beamSpreadDeg: 29,
    pyramidTopRadius: 3,
    pyramidBottomRadius: 0.7, // 摨(?亙??方?)??
    pyramidHeight: 2.6,
    pyramidWallThickness: 0.06,
    basePlateRadius: 1, // 摨??
    basePlateThickness: 0.22 // 摨?漲
  }
}

const uniforms = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color('#ee6a2e') },
  uColorB: { value: new THREE.Color('#ff9a3d') },
  uColorC: { value: new THREE.Color('#ffd08a') },
  uRevealPlaneNormal: { value: new THREE.Vector3(0.36, 1, 0).normalize() },
  uRevealPlaneOffset: { value: -9.8 },
  uExitPlaneNormal: { value: new THREE.Vector3(0.2, 1, 0).normalize() },
  uExitPlaneOffset: { value: 20 },
  // 螢幕座標雙斜縫（d = screenUV.x + screenUV.y ∈[0,2]，TL–BR 對角線為 d=1）
  // Scene01 保留 d>uSeamA（右上）；Scene03 保留 d<uSeamB（左下）；中間為 Logo 斜帶
  uResolution: { value: new THREE.Vector2(1, 1) },
  uSeamA: { value: 0 }, // 起始 0 = 全顯示
  uSeamB: { value: 0 }, // 起始 0 = 骨幹全隱藏
  uIntroSeam: { value: 0.18 } // DNA 入場專用：由下往上顯示
}

function makeGlass(
  alpha: number,
  tubeFlow = false,
  surfaceLit = false,
  boost = 1.0,
  colors = {
    a: '#ee6a2e',
    b: '#ff9a3d',
    c: '#ffd08a'
  },
  bloomSafe = false
) {
  const baseGlow = bloomSafe ? '0.1' : '0.18'
  const fresnelGlow = bloomSafe ? '0.16' : '0.38'
  const rimGlow = bloomSafe ? '0.045' : '0.16'
  const litGlow = bloomSafe ? '0.09' : '0.26'
  const ridgeGlow = bloomSafe ? '0.025' : '0.07'
  const crossGlow = bloomSafe ? '0.018' : '0.045'
  const shimmerGlow = bloomSafe ? '0.022' : '0.08'
  const traceGlow = bloomSafe ? '0.025' : '0.08'
  const enterGlowA = bloomSafe ? '0.11' : '0.36'
  const enterGlowB = bloomSafe ? '0.035' : '0.14'
  const enterAlpha = bloomSafe ? '0.035' : '0.12'
  const alphaClamp = bloomSafe ? '0.58' : '0.95'

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uAlpha: { value: alpha },
      uBoost: { value: boost },
      uColorA: { value: new THREE.Color(colors.a) },
      uColorB: { value: new THREE.Color(colors.b) },
      uColorC: { value: new THREE.Color(colors.c) },
      uResolution: uniforms.uResolution,
      uSeamB: uniforms.uSeamB
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAlpha;
      uniform float uBoost;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec2 uResolution;
      uniform float uSeamB;
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;

      void main() {
        // Scene03 保留 d<seamB（左下），由左下露出
        float _sd = gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y;
        if (_sd > uSeamB) discard;
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        float fres = pow(1.0 - abs(dot(N, V)), 2.4);
        vec3 irid = mix(uColorA, uColorB, 0.5 + 0.5 * sin((fres * 2.0 + uTime * 0.1) * 6.2831));
        irid = mix(irid, uColorC, smoothstep(0.72, 1.0, fres));
        vec3 col = uColorA * ${baseGlow};
        col += irid * fres * ${fresnelGlow};
        col += pow(fres, 7.0) * vec3(1.0, 0.72, 0.38) * ${rimGlow};
        col *= uBoost;
        float a = uAlpha + fres * 0.24;

        ${
          tubeFlow
            ? /* glsl */ `
        float flow = 0.5 + 0.5 * sin(vUv.y * 5.0 - uTime * 2.0);
        float ring = 0.35 + 0.65 * pow(abs(sin(vUv.x * 3.14159)), 0.6);
        col += uColorC * flow * ring * 0.12;
        col += uColorA * ring * 0.08;
        a += flow * 0.025;
        `
            : ''
        }

        ${
          surfaceLit
            ? /* glsl */ `
        vec3 L = normalize(vec3(0.0, 0.9, 0.5));
        float lit = 0.5 + 0.9 * max(dot(N, L), 0.0);
        col += uColorA * lit * ${litGlow};
        float fineRidge = pow(0.5 + 0.5 * sin((vUv.y * 180.0 + vUv.x * 42.0) - uTime * 0.65), 10.0);
        float crossRidge = pow(0.5 + 0.5 * sin((vUv.x * 120.0 - vUv.y * 26.0) + uTime * 0.45), 12.0);
        float shimmer = 0.5 + 0.5 * sin(N.x * 18.0 + N.y * 12.0 + N.z * 8.0 - uTime * 1.2);
        float rimTrace = pow(fres, 3.6);
        col += uColorB * fineRidge * ${ridgeGlow};
        col += uColorA * crossRidge * ${crossGlow};
        col += uColorC * pow(shimmer, 5.0) * ${shimmerGlow};
        col += uColorB * rimTrace * (${traceGlow} + 0.012 * sin(uTime * 1.4));
        a += lit * 0.11 + fineRidge * 0.02 + rimTrace * 0.035;
        `
            : ''
        }

        // Scene03 露出前緣（seamB 邊界）的燃燒亮邊，含雜訊
        float enterEdge = 1.0 - smoothstep(0.0, 0.16, uSeamB - _sd);
        col += uColorB * enterEdge * ${enterGlowA};
        col += uColorC * pow(enterEdge, 2.2) * ${enterGlowB};
        a += enterEdge * ${enterAlpha};
        gl_FragColor = vec4(col, clamp(a, 0.0, ${alphaClamp}));
      }
    `
  })
}

function makeHologram(
  alpha: number,
  boost = 1.0,
  colors = { a: '#ff6a1f', b: '#ff9a3d', c: '#ffe6c0' },
  enableReveal = true,
  enableIntroReveal = false
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uAlpha: { value: alpha },
      uBoost: { value: boost },
      uColorA: { value: new THREE.Color(colors.a) },
      uColorB: { value: new THREE.Color(colors.b) },
      uColorC: { value: new THREE.Color(colors.c) },
      ...(enableReveal
        ? {
            uRevealPlaneNormal: uniforms.uRevealPlaneNormal,
            uRevealPlaneOffset: uniforms.uRevealPlaneOffset
          }
        : {}),
      uResolution: uniforms.uResolution,
      uSeamA: uniforms.uSeamA,
      ...(enableIntroReveal
        ? {
            uIntroSeam: uniforms.uIntroSeam
          }
        : {})
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWorld;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAlpha;
      uniform float uBoost;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      ${enableReveal ? 'uniform vec3 uRevealPlaneNormal;' : ''}
      ${enableReveal ? 'uniform float uRevealPlaneOffset;' : ''}
      uniform vec2 uResolution;
      uniform float uSeamA;
      ${enableIntroReveal ? 'uniform float uIntroSeam;' : ''}
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWorld;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n) * 43758.5453); }

      void main() {
        ${enableReveal ? 'if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;' : ''}
        vec2 _suv = gl_FragCoord.xy / uResolution;
        float _sd = _suv.x + _suv.y;
        ${enableIntroReveal ? 'if (_sd > uIntroSeam) discard;' : ''}
        if (_sd < uSeamA) discard;
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        float fres = pow(1.0 - abs(dot(N, V)), 2.0);

        vec3 L = normalize(vec3(0.55, 0.8, 0.6));
        float diff = max(dot(N, L), 0.0);
        float wrap = diff * 0.5 + 0.5;
        vec3 Hh = normalize(L + V);
        float spec = pow(max(dot(N, Hh), 0.0), 42.0);
        float softHalo = pow(fres, 1.55) * 0.14 + spec * 0.035;

        // ?餌??冽嚗楛摨?+ ??頨恍? + 鈭桅? + 擃?
        vec3 col = uColorA * 0.16;
        col += uColorB * wrap * 0.14;
        col += uColorB * fres * 0.45;
        col += uColorC * pow(fres, 5.0) * 0.5;
        col += uColorC * spec * 0.18;
        col += mix(uColorB, uColorC, 0.42) * softHalo;

        float scan = 0.5 + 0.5 * sin(vWorld.y * 55.0 - uTime * 3.5);
        col += uColorB * scan * 0.008;

        col *= 0.96 + 0.04 * hash(floor(uTime * 20.0));
        col *= uBoost;

        float a = uAlpha + fres * 0.2;
        a += softHalo * 0.08;

        ${
          enableIntroReveal
            ? /* glsl */ `
        float introEdge = 1.0 - smoothstep(0.0, 0.16, uIntroSeam - _sd);
        col += uColorC * introEdge * 0.58;
        col += vec3(1.0, 0.86, 0.6) * pow(introEdge, 2.2) * 0.22;
        a += introEdge * 0.18;
        `
            : ''
        }

        // ??湛??澆?皞嗉圾?嚗撟曆?瘛勗漲韏瑚? ??蝡???
        float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
        col += uColorC * exitEdge * 0.58;
        col += vec3(1.0, 0.86, 0.6) * pow(exitEdge, 2.2) * 0.22;
        a += exitEdge * 0.18;

        gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
      }
    `
  })
}

const group = new THREE.Group()
const disposables: { dispose(): void }[] = []
const geckoMat = makeHologram(0.22, 1.48, {
  a: '#ff6a1f',
  b: '#ff9a3d',
  c: '#ffe6c0'
})
const dnaTubeMat = makeHologram(
  0.2,
  1.42,
  {
    a: '#ff6a1f',
    b: '#ffb14a',
    c: '#fff2d6'
  },
  false,
  true
)
const backboneSampleMat = makeGlass(
  0.24,
  false,
  true,
  0.9,
  {
    a: '#ffc38b',
    b: '#ff9a3d',
    c: '#fff6de'
  },
  true
)
backboneSampleMat.depthWrite = true
backboneSampleMat.depthTest = true
disposables.push(geckoMat, dnaTubeMat, backboneSampleMat)

// ?冽?蔣嚗?摨?+ ??
const beamMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uYBottom: { value: CFG.projector.y },
    uYTop: { value: CFG.projector.y + CFG.projector.beamHeight },
    uColorA: { value: new THREE.Color('#ff7a2a') },
    uColorC: { value: new THREE.Color('#ffd9a0') },
    uRevealPlaneNormal: uniforms.uRevealPlaneNormal,
    uRevealPlaneOffset: uniforms.uRevealPlaneOffset,
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uYBottom;
    uniform float uYTop;
    uniform vec3 uColorA;
    uniform vec3 uColorC;
    uniform vec3 uRevealPlaneNormal;
    uniform float uRevealPlaneOffset;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vWorld;
    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      vec2 _suv = gl_FragCoord.xy / uResolution;
      float _sd = _suv.x + _suv.y;
      if (_sd < uSeamA) discard;
      vec3 N = normalize(vN);
      vec3 V = normalize(vV);
      float fres = pow(1.0 - abs(dot(N, V)), 1.4);
      float t = clamp((vWorld.y - uYBottom) / (uYTop - uYBottom), 0.0, 1.0);
      float vert = pow(1.0 - t, 1.6) * 0.85 + 0.1;
      float band = 0.85 + 0.15 * sin(vWorld.y * 8.0 - uTime * 3.0);
      float flick = 0.92 + 0.08 * sin(uTime * 22.0);
      vec3 col = mix(uColorA, uColorC, fres) * fres * vert * band * flick;
      float a = fres * vert * 0.5;
      float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
      col += uColorC * exitEdge * 0.9;
      a += exitEdge * 0.3;
      gl_FragColor = vec4(col, clamp(a, 0.0, 0.85));
    }
  `
})

const discMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uColorA: { value: new THREE.Color('#ff8a3d') },
    uColorC: { value: new THREE.Color('#ffe6c0') },
    uRevealPlaneNormal: uniforms.uRevealPlaneNormal,
    uRevealPlaneOffset: uniforms.uRevealPlaneOffset,
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorC;
    uniform vec3 uRevealPlaneNormal;
    uniform float uRevealPlaneOffset;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying vec2 vUv;
    varying vec3 vWorld;
    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      vec2 _suv = gl_FragCoord.xy / uResolution;
      float _sd = _suv.x + _suv.y;
      if (_sd < uSeamA) discard;
      float d = distance(vUv, vec2(0.5));
      float glow = smoothstep(0.5, 0.0, d);
      float ring = smoothstep(0.02, 0.0, abs(d - 0.42));
      float pulse = 0.88 + 0.12 * sin(uTime * 3.0);
      vec3 col = uColorA * glow * 0.62 * pulse + uColorC * pow(glow, 2.6) * 0.5 + uColorC * ring * 0.26;
      float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
      col += uColorC * exitEdge * 0.82;
      gl_FragColor = vec4(col, clamp(glow * 0.34 + ring * 0.22 + exitEdge * 0.4, 0.0, 0.55));
    }
  `
})

const ringMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#ffb066'),
  transparent: true,
  opacity: 0.22,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})

const pyramidGlassMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#ffe9d6'),
  metalness: 0.0, // ?餌??粹??惇
  roughness: 0.02, // ????
  ior: 1.5,
  thickness: 0.35,
  transmission: 0.0,
  transparent: true,
  opacity: 0.028,
  side: THREE.DoubleSide,
  envMapIntensity: 0.12,
  depthWrite: false
})
const pyramidEdgeMat = new THREE.LineBasicMaterial({
  color: new THREE.Color('#ffa64d'),
  transparent: true,
  opacity: 0.95,
  blending: THREE.AdditiveBlending,
  depthWrite: false
})
const carbonFiberEdgeMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uRevealPlaneNormal: uniforms.uRevealPlaneNormal,
    uRevealPlaneOffset: uniforms.uRevealPlaneOffset,
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA
  },
  side: THREE.DoubleSide,
  depthWrite: true,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vWorld;

    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uRevealPlaneNormal;
    uniform float uRevealPlaneOffset;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    varying vec3 vWorld;

    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      if ((gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y) < uSeamA) discard;
      vec2 uv = vUv * vec2(10.0, 40.0);
      float bandA = step(0.5, fract(uv.x + uv.y * 0.5));
      float bandB = step(0.5, fract((uv.x - 0.5) - uv.y * 0.5));
      float weave = mix(bandA, bandB, step(0.5, fract(uv.y * 0.5)));
      float micro = 0.5 + 0.5 * sin((uv.x + uv.y) * 3.14159);
      float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);

      vec3 darkA = vec3(0.05, 0.055, 0.06);
      vec3 darkB = vec3(0.11, 0.115, 0.125);
      vec3 col = mix(darkA, darkB, weave * 0.75 + micro * 0.25);
      col += vec3(0.12, 0.06, 0.02) * fres * 0.22;

      gl_FragColor = vec4(col, 1.0);
    }
  `
})
const plateMetalMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#8b8d96'),
  metalness: 1.0,
  roughness: 0.46,
  envMapIntensity: 0.45,
  transparent: true, // 轉場時淡出用
  opacity: 1
})
const ambientParticleMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uLift: { value: 0 },
    uPull: { value: 0 },
    uTargetZ: { value: 0.0 },
    uRange: { value: 12.5 },
    uPixelRatio: { value: 1 },
    uFade: { value: 1 },
    uExitPlaneNormal: uniforms.uExitPlaneNormal,
    uExitPlaneOffset: uniforms.uExitPlaneOffset
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.NormalBlending,
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uLift;
    uniform float uPull;
    uniform float uTargetZ;
    uniform float uRange;
    uniform float uPixelRatio;
    uniform vec3 uExitPlaneNormal;
    uniform float uExitPlaneOffset;
    attribute float aSize;
    attribute float aSpeed;
    attribute float aPhase;
    attribute float aTone;
    varying float vTone;
    varying float vAlpha;
    varying float vSizeN;
    varying float vPullMix;

    void main() {
      vec3 p = position;
      float lift = uLift * (1.8 + aTone * 2.2) + aPhase;
      p.y = p.y + lift;
      float pull = clamp(uPull * (0.82 + aTone * 0.34), 0.0, 1.0);
      float attractX = 0.0;
      float attractZ = uTargetZ;
      p.x = mix(p.x, attractX, pull);
      p.z = mix(p.z, attractZ, pull);
      float shimmer = uTime * (0.12 + aSpeed * 0.22) + aPhase;
      p.x += sin(shimmer * 0.9) * 0.006;
      p.z += cos(shimmer * 0.7 + aPhase * 1.7) * 0.006;

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      float viewDepth = max(2.2, -mvPosition.z);
      float pullSizeFade = mix(1.0, 0.82, pull);
      gl_PointSize = clamp(aSize * uPixelRatio * (8.5 / viewDepth) * pullSizeFade, 0.6, 6.5);

      vTone = aTone;
      vAlpha = clamp((0.56 + aSize * 0.018) * mix(1.0, 0.68, pull), 0.4, 0.8);
      vSizeN = clamp((aSize - 4.0) / 42.0, 0.0, 1.0);
      vPullMix = pull;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uFade;
    varying float vTone;
    varying float vAlpha;
    varying float vSizeN;
    varying float vPullMix;
    void main() {
      vec2 uv = gl_PointCoord - vec2(0.5);
      float d = length(uv);
      if (d > 0.5) discard;

      float disc = 1.0 - smoothstep(0.475, 0.5, d);
      float core = 1.0 - smoothstep(0.0, 0.46, d);

      vec3 orange = vec3(1.0, 0.42, 0.08);
      vec3 gold = vec3(1.0, 0.56, 0.12);
      vec3 ember = vec3(1.0, 0.34, 0.08);
      vec3 pearl = vec3(1.0, 0.93, 0.82);
      vec3 col = mix(orange, gold, smoothstep(0.08, 0.36, vTone));
      col = mix(col, ember, smoothstep(0.7, 0.95, vTone) * 0.18);
      col = mix(col, pearl, smoothstep(0.96, 1.0, vTone) * 0.08);
      col *= disc * 1.28 + core * 0.82;

      float spec = pow(max(0.0, 1.0 - length(uv - vec2(-0.13, -0.13)) * 2.1), 5.0);
      col += pearl * spec * mix(0.08, 0.16, vSizeN) * mix(1.0, 0.35, vPullMix);
      col += vec3(1.0, 0.62, 0.24) * core * 0.28;
      col *= mix(1.0, 0.72, vPullMix);

      gl_FragColor = vec4(col, disc * vAlpha * uFade);
    }
  `
})
// Inception ??蝬脫嚗???Ｘ窒?憫敺憭拍征?脰絲?????剝?
const gridMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uColorLine: { value: new THREE.Color('#ffb14a') },
    uColorGlow: { value: new THREE.Color('#ff6a1f') },
    uReveal: { value: 0 },
    uScroll: { value: 0 },
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  extensions: { derivatives: true } as unknown as THREE.ShaderMaterialParameters['extensions'],
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorld;
    varying vec2 vUv;
    varying float vFold;

    const float FOLD_START = 4.0;
    const float FOLD_RADIUS = 13.0;
    const float PI = 3.14159265;

    void main() {
      vUv = uv;
      vec3 p = position;
      float s = p.y - FOLD_START;
      float fold = 0.0;
      if (s > 0.0) {
        float ang = min(s / FOLD_RADIUS, PI * 1.12);
        p.z = FOLD_RADIUS * (1.0 - cos(ang));
        p.y = FOLD_START + FOLD_RADIUS * sin(ang);
        fold = clamp(ang / (PI * 0.5), 0.0, 1.4);
      }
      vFold = fold;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorLine;
    uniform vec3 uColorGlow;
    uniform float uReveal;
    uniform float uScroll;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying vec3 vWorld;
    varying vec2 vUv;
    varying float vFold;

    void main() {
      float _sd = gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y;
      if (_sd < uSeamA) discard;

      // 隞?UV ?Ｙ?蝑??潛?嚗?蝬脫蝝啣??⊿?嚗???隞雁??潘?
      // uScroll 霈楛摨行???潛?敺?豢??孵?瘚? ???脫?
      vec2 cells = vec2(16.0, 28.0);
      vec2 uv = vUv * cells;
      uv.y += uScroll;
      vec2 gw = fwidth(uv);
      vec2 gl = abs(fract(uv - 0.5) - 0.5) / gw;
      float line = 1.0 - min(min(gl.x, gl.y), 1.0);
      float glowLine = 1.0 - min(min(gl.x, gl.y) * 0.28, 1.0);

      // 餈璈垢(uv.y 撠?雿?豢?敺)瘛∪嚗???蝡臭???憭?憛急遛銝)
      float depthFade = smoothstep(0.28, 0.44, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y) * 0.3);
      // 瘝踵?脫?????賡???
      float pulse = 1.0;

      vec3 col = mix(uColorGlow, uColorLine, line);
      col *= 0.78 + 1.05 * vFold;
      col += uColorLine * line * pulse * 0.06;
      col += uColorGlow * glowLine * depthFade * 0.08;

      float a = line * depthFade * 0.88;
      a += glowLine * depthFade * 0.026;

      // ?脣嚗擃楚?伐??∠征??????銝??撩閫?敺?reveal 銝??撠望筑?橘?
      a *= smoothstep(0.0, 0.42, uReveal);

      float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
      col += uColorLine * exitEdge * 0.55;
      a += exitEdge * line * 0.24;

      gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
    }
  `
})
disposables.push(
  beamMat,
  discMat,
  ringMat,
  pyramidGlassMat,
  pyramidEdgeMat,
  carbonFiberEdgeMat,
  plateMetalMat,
  ambientParticleMat,
  gridMat
)

function buildGroundGrid() {
  const g = new THREE.Group()
  const geo = new THREE.PlaneGeometry(52, 56, 1, 220)
  disposables.push(geo)
  const mesh = new THREE.Mesh(geo, gridMat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, CFG.projector.y - 0.3, -6)
  g.add(mesh)

  return g
}

function buildProjector() {
  const g = new THREE.Group()
  const P = CFG.projector

  const beamTopRadius = P.beamHeight * Math.tan((P.beamSpreadDeg * Math.PI) / 180)
  const beamGeo = new THREE.ConeGeometry(beamTopRadius, P.beamHeight, 48, 1, true)
  disposables.push(beamGeo)
  const beam = new THREE.Mesh(beamGeo, beamMat)
  beam.rotation.x = Math.PI
  beam.position.y = P.y + P.beamHeight / 2
  g.add(beam)

  const H = P.pyramidHeight
  const T = P.pyramidWallThickness
  const At = P.pyramidTopRadius / Math.SQRT2
  const Ab = P.pyramidBottomRadius / Math.SQRT2
  const Wt = P.pyramidTopRadius * Math.SQRT2
  const Wb = P.pyramidBottomRadius * Math.SQRT2
  const slant = Math.hypot(H, At - Ab)
  const psi = Math.atan2(At - Ab, H)
  const shape = new THREE.Shape()
  shape.moveTo(-Wb / 2, -slant / 2)
  shape.lineTo(Wb / 2, -slant / 2)
  shape.lineTo(Wt / 2, slant / 2)
  shape.lineTo(-Wt / 2, slant / 2)
  shape.closePath()
  const bevel = Math.min(0.03, T * 0.3)
  const wallGeo = new THREE.ExtrudeGeometry(shape, {
    depth: T - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1
  })
  wallGeo.center()
  const wallEdgeGeo = new THREE.EdgesGeometry(wallGeo, 30)
  disposables.push(wallGeo, wallEdgeGeo)

  for (let i = 0; i < 4; i++) {
    const pivot = new THREE.Group()
    pivot.rotation.y = i * (Math.PI / 2)
    const panel = new THREE.Mesh(wallGeo, pyramidGlassMat)
    panel.rotation.x = psi
    panel.position.set(0, P.y + H / 2, (At + Ab) / 2)
    panel.add(new THREE.LineSegments(wallEdgeGeo, pyramidEdgeMat))
    pivot.add(panel)
    g.add(pivot)
  }

  const pr = P.basePlateRadius
  const edgeStripGeo = new THREE.BoxGeometry(0.055, 1, 0.034)
  disposables.push(edgeStripGeo)
  const topY = P.y + H
  const bottomY = P.y
  const topCorners = [
    new THREE.Vector3(At, topY, At),
    new THREE.Vector3(-At, topY, At),
    new THREE.Vector3(-At, topY, -At),
    new THREE.Vector3(At, topY, -At)
  ]
  const bottomCorners = [
    new THREE.Vector3(Ab, bottomY, Ab),
    new THREE.Vector3(-Ab, bottomY, Ab),
    new THREE.Vector3(-Ab, bottomY, -Ab),
    new THREE.Vector3(Ab, bottomY, -Ab)
  ]
  const upAxis = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i < 4; i++) {
    const start = bottomCorners[i]
    const end = topCorners[i]
    const dir = new THREE.Vector3().subVectors(end, start)
    const strip = new THREE.Mesh(edgeStripGeo, carbonFiberEdgeMat)
    strip.position.copy(start).addScaledVector(dir, 0.5)
    strip.scale.y = dir.length()
    strip.quaternion.setFromUnitVectors(upAxis, dir.clone().normalize())
    g.add(strip)
  }

  const pt = P.basePlateThickness
  const pc = Math.min(0.06, pt * 0.4)
  const plateProfile = [
    new THREE.Vector2(0, -pt / 2),
    new THREE.Vector2(pr - pc, -pt / 2),
    new THREE.Vector2(pr, -pt / 2 + pc),
    new THREE.Vector2(pr, pt / 2 - pc),
    new THREE.Vector2(pr - pc, pt / 2),
    new THREE.Vector2(0, pt / 2)
  ]
  const plateGeo = new THREE.LatheGeometry(plateProfile, 96)
  disposables.push(plateGeo)
  const plate = new THREE.Mesh(plateGeo, plateMetalMat)
  plate.position.y = P.y - pt / 2
  g.add(plate)

  const plateRimGeo = new THREE.TorusGeometry(P.basePlateRadius, 0.04, 12, 96)
  disposables.push(plateRimGeo)
  const plateRim = new THREE.Mesh(plateRimGeo, ringMat)
  plateRim.rotation.x = -Math.PI / 2
  plateRim.position.y = P.y
  g.add(plateRim)

  const discGeo = new THREE.CircleGeometry(P.discRadius * 0.9, 48)
  disposables.push(discGeo)
  const disc = new THREE.Mesh(discGeo, discMat)
  disc.rotation.x = -Math.PI / 2
  disc.position.y = P.y + 0.02
  g.add(disc)

  for (let i = 0; i < 3; i++) {
    const r = P.discRadius * (0.42 + i * 0.16)
    const ringGeo = new THREE.TorusGeometry(r, 0.02, 8, 64)
    disposables.push(ringGeo)
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = P.y + 0.16 + i * 0.16
    g.add(ring)
  }

  return g
}

let loadedModel: THREE.Object3D | null = null
let loadedBackboneModel: THREE.Object3D | null = null
const geckoGroup = new THREE.Group()
const backboneAxisFixGroup = new THREE.Group()
const backboneModelAxis = new THREE.Vector3(0.0002, -0.19, 0.9818).normalize()
const worldVerticalAxis = new THREE.Vector3(0, 1, 0)
const DEG = Math.PI / 180
const geckoEuler = new THREE.Euler(
  CFG.gecko.rotationDeg.x * DEG,
  CFG.gecko.rotationDeg.y * DEG,
  CFG.gecko.rotationDeg.z * DEG
)
const baseGeckoRotation = geckoEuler.clone()
let targetRotationY = 0
let currentRotationY = 0
let targetParticleLift = 0
let currentParticleLift = 0
let currentParticlePull = 0
let currentGridReveal = 0
let targetTimeline = 0
let currentTimeline = 0
// Scene3 卡片輸送進度：卡片完整揭露後才接管捲動；進度有上限，避免回捲時要倒退過久。
let targetCardOrbit = 0
let currentCardOrbit = 0
let cardOrbitUnlockedNow = false
// CSS/clip-path 每幀重算會配置陣列/物件/字串並寫 DOM；只在數值有變化時才更新（不捲動時完全跳過）
let cssLastSweep = -1
let cssLastScrollHint = -1
let cssLastLogo = -1
let cssLastBand = -1
let lastBottomRenderMode: 'always' | 'manual' = 'always'
let lastTouchY = 0
const cardOrbitSpeed = 0.0024
const cardOrbitSettleEpsilon = 0.003
// 卡片只保留很小的視覺慣性；數值高於骨幹 damping，代表比骨幹更快收斂、慣性更小。
const cardOrbitDamping = 0.28
const cardCount = 8
const cardStep = 1.1 // 相鄰卡片的環繞相位間距（弧度）
const cardEntranceAngle = 0 // 第一張卡起始相位（正面中間）
const cardOrbitMax = cardStep * (cardCount - 1)
const wheelDeltaLimit = 90
const timelineWheelScale = 1.65
const scene01Slowdown = 0.78
const scene01SpanScale = scene01Slowdown * (wheelDeltaLimit / 60)
const scene01MotionScale = 0.1
const scene01ParticleScale = 0.045
const stageEpsilon = 0.001
// 守宮本體 + 金字塔（投影底座）共用同一轉速，鎖在一起轉。
// 調小即整組少轉幾圈（不影響 DNA / 粒子）。
const geckoPyramidSpinFactor = 0.4
// 網格沿自身形狀往背景上方延伸方向的流速（依滾動進度驅動）。
// 負號 = 往背景（vUv.y 增大方向）流；若方向相反改正號。調大 = 流更快。
const gridFlowRate = 0.002
const introRevealMax = 1
const firstExitMax = 1
const finalEnterMax = 1
const exitBodyMax = 1
const introRevealSpan = (introRevealMax / 0.00042) * scene01SpanScale
const gridRevealSpan = (introRevealMax / 0.00024) * scene01SpanScale
const firstExitSpan = firstExitMax / 0.00058
const finalEnterSpan = finalEnterMax / 0.00058
const exitBodySpan = exitBodyMax / 0.00052
const timelineBreaks = {
  introRevealEnd: introRevealSpan,
  firstExitEnd: introRevealSpan + firstExitSpan,
  finalEnterEnd: introRevealSpan + firstExitSpan + finalEnterSpan,
  finalDnaEnd: introRevealSpan + firstExitSpan + finalEnterSpan + exitBodySpan
}
// Scene3 卡片接管滾輪的時間點：0=Scene3 斜帶剛開始揭露，1=斜帶完全結束。
// 如果卡片已完整揭露但還不轉，調小這個值；如果太早轉，調大。
const cardOrbitInputStartRatio = 1
const cardOrbitInputStart = timelineBreaks.firstExitEnd + finalEnterSpan * cardOrbitInputStartRatio
// 場景定義：
// 1. Scene 01：起始只有 DNA；下滾後粒子、守宮、底座、網格才 reveal 入場
// 2. Transition 01：Scene 01 -> LOGO，整個 3D 畫布由下往斜上切離
// 3. LOGO 過橋：不獨立停留，Transition 01 結束後直接接 Transition 02
// 4. Transition 02：LOGO -> Scene 03，由下往斜上切入骨幹範例
// 5. Scene 03：僅保留 DNA 骨幹，供後續替換新骨幹內容
const revealClipPlane = new THREE.Plane(new THREE.Vector3(0.2, 1, 0).normalize(), -9.8)
const exitClipPlane = new THREE.Plane(new THREE.Vector3(0.2, 1, 0).normalize(), 20)

geckoGroup.position.y = CFG.gecko.y
geckoGroup.position.z = CFG.gecko.z

function setBottomRenderMode(mode: 'always' | 'manual') {
  if (lastBottomRenderMode === mode) return
  lastBottomRenderMode = mode
  emit('bottom-render-mode', mode)
}

function wakeBottomRender() {
  setBottomRenderMode('always')
}

function applyScrollDelta(deltaY: number) {
  const wheelDelta = THREE.MathUtils.clamp(deltaY, -wheelDeltaLimit, wheelDeltaLimit)
  const motionScale = targetTimeline < timelineBreaks.introRevealEnd ? scene01MotionScale : 1
  targetRotationY += wheelDelta * CFG.wheel.speed * motionScale
  // 序列捲動：時間軸到底（Scene3 骨幹完成）後，往下滾改驅動卡片環繞；
  // 往上滾且卡片有可見進度時，先完整退卡片，退完才退時間軸。
  const nextTimeline = THREE.MathUtils.clamp(
    targetTimeline + wheelDelta * timelineWheelScale,
    0,
    timelineBreaks.finalDnaEnd
  )
  const wantsForward = wheelDelta > 0
  const wantsBackward = wheelDelta < 0
  const cardOrbitInputUnlocked =
    cardOrbitUnlockedNow ||
    (targetTimeline >= cardOrbitInputStart && currentTimeline >= cardOrbitInputStart - stageEpsilon)
  const cardOrbitHasTargetProgress = targetCardOrbit > cardOrbitSettleEpsilon
  const cardOrbitHasVisibleProgress = currentCardOrbit > cardOrbitSettleEpsilon
  const cardOrbitConsumesWheel =
    (wantsForward && cardOrbitInputUnlocked) || (wantsBackward && cardOrbitHasVisibleProgress)

  if (wantsBackward && cardOrbitHasTargetProgress && !cardOrbitHasVisibleProgress) {
    // 反向輸入時不要先消耗使用者滾輪去倒退尚未可見的 target buffer。
    targetCardOrbit = 0
  }

  if (!cardOrbitConsumesWheel) {
    const particleScale = targetTimeline < timelineBreaks.introRevealEnd ? scene01ParticleScale : 1
    targetParticleLift = THREE.MathUtils.clamp(
      targetParticleLift + wheelDelta * 0.005 * particleScale,
      0,
      20
    )
  }

  if (wantsForward && cardOrbitInputUnlocked) {
    targetTimeline = Math.max(targetTimeline, timelineBreaks.finalEnterEnd)
    targetCardOrbit = THREE.MathUtils.clamp(
      targetCardOrbit + wheelDelta * cardOrbitSpeed,
      0,
      cardOrbitMax
    )
    return
  }

  if (wantsBackward && cardOrbitHasVisibleProgress) {
    targetTimeline = Math.max(targetTimeline, timelineBreaks.finalEnterEnd)
    targetCardOrbit = THREE.MathUtils.clamp(
      targetCardOrbit + wheelDelta * cardOrbitSpeed,
      0,
      cardOrbitMax
    )
    if (targetCardOrbit <= cardOrbitSettleEpsilon) {
      targetCardOrbit = 0
    }
    return
  }

  targetTimeline = nextTimeline
}

function onWheel(event: WheelEvent) {
  wakeBottomRender()
  applyScrollDelta(event.deltaY)
}

function onTouchStart(event: TouchEvent) {
  wakeBottomRender()
  lastTouchY = event.touches[0]?.clientY ?? 0
}

function onTouchMove(event: TouchEvent) {
  const y = event.touches[0]?.clientY ?? lastTouchY
  const deltaY = (lastTouchY - y) * 1.8
  lastTouchY = y
  if (event.cancelable) event.preventDefault()
  wakeBottomRender()
  applyScrollDelta(deltaY)
}

function stageValue(progress: number, start: number, span: number, max: number) {
  return THREE.MathUtils.clamp((progress - start) / span, 0, 1) * max
}

// 幀率無關指數平滑：base 為「以 60fps 為基準的每幀收斂係數」。
// 120Hz 時 dt 較小 → 係數自動變小，長期收斂速度與 60Hz 一致（避免高刷新率跑太快）。
function fpsSmooth(base: number, dt: number) {
  return 1 - Math.pow(1 - base, dt * 60)
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose())
    return
  }

  material.dispose()
}

function normalizeModel(root: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const scale = CFG.gecko.targetSize / maxAxis

  root.position.sub(center)
  root.scale.setScalar(scale)
  root.rotation.copy(geckoEuler)
}

function loadGeckoModel() {
  const loader = new GLTFLoader()

  loader.load(MODEL_URL, (gltf) => {
    const model = gltf.scene

    model.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return

      mesh.geometry.computeVertexNormals()
      disposeMaterial(mesh.material)
      mesh.material = geckoMat
    })

    normalizeModel(model)
    loadedModel = model
    geckoGroup.add(model)
  })
}

function normalizeBackboneModel(root: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const scale = 11.6 / maxAxis

  root.position.sub(center)
  root.scale.setScalar(scale)
  root.rotation.set(0, 0, 0)
}

function loadBackboneModel() {
  const loader = new GLTFLoader()

  loader.load(BACKBONE_MODEL_URL, (gltf) => {
    const model = gltf.scene

    model.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return

      mesh.geometry.computeVertexNormals()
      disposeMaterial(mesh.material)
      mesh.material = backboneSampleMat
    })

    normalizeBackboneModel(model)
    backboneAxisFixGroup.clear()
    backboneAxisFixGroup.quaternion.setFromUnitVectors(backboneModelAxis, worldVerticalAxis)
    backboneAxisFixGroup.add(model)
    loadedBackboneModel = model
  })
}

const { height: H, radius: R, turns: TURNS, segments: SEG } = CFG.dna

function helixCurve(offset: number, radius = R) {
  const pts: THREE.Vector3[] = []

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG
    const ang = t * TURNS * Math.PI * 2 + offset
    pts.push(new THREE.Vector3(radius * Math.cos(ang), t * H - H / 2, radius * Math.sin(ang)))
  }

  return new THREE.CatmullRomCurve3(pts)
}

const dnaGroup = new THREE.Group()
dnaGroup.position.z = CFG.dna.z

for (const off of [0, Math.PI]) {
  const curve = helixCurve(off, R)
  const tube = new THREE.TubeGeometry(curve, SEG, CFG.dna.tubeRadius, 10, false)
  disposables.push(tube)
  dnaGroup.add(new THREE.Mesh(tube, dnaTubeMat))
}

for (let k = 0; k < CFG.dna.rungs; k++) {
  const t = (k + 0.5) / CFG.dna.rungs
  const ang = t * TURNS * Math.PI * 2
  const y = t * H - H / 2
  const a = new THREE.Vector3(R * Math.cos(ang + Math.PI), y, R * Math.sin(ang + Math.PI))
  const b = new THREE.Vector3(R * Math.cos(ang), y, R * Math.sin(ang))
  const len = a.distanceTo(b)
  const rung = new THREE.CylinderGeometry(CFG.dna.rungRadius, CFG.dna.rungRadius, len, 8)
  disposables.push(rung)

  const mid = a.clone().add(b).multiplyScalar(0.5)
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize()
  )
  const mesh = new THREE.Mesh(rung, dnaTubeMat)
  mesh.position.copy(mid)
  mesh.quaternion.copy(quat)
  dnaGroup.add(mesh)
}

function buildBackboneSample() {
  const g = new THREE.Group()
  g.position.set(0, 0, 1.1)
  g.add(backboneAxisFixGroup)

  return g
}

function createAmbientParticles() {
  const count = 2200
  const cylinderRadius = 8.8
  const spreadY = 18.5
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)
  const phases = new Float32Array(count)
  const tones = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const i3 = i * 3
    const angle = Math.random() * Math.PI * 2
    const radial = Math.pow(Math.random(), 0.74)
    const radius = THREE.MathUtils.lerp(0.3, cylinderRadius, radial)
    positions[i3] = Math.cos(angle) * radius
    const bottomBias = Math.pow(Math.random(), 3.6)
    positions[i3 + 1] = THREE.MathUtils.lerp(-spreadY - 3.6, -spreadY / 3.2, bottomBias)
    positions[i3 + 2] = Math.sin(angle) * radius

    const bigBias = Math.pow(Math.random(), 2.2)
    const floorBoost = bottomBias < 0.22 ? 1.35 : 1.0
    sizes[i] = THREE.MathUtils.lerp(1.2, 5.8, 1 - bigBias) * floorBoost
    speeds[i] = THREE.MathUtils.lerp(0.08, 0.38, Math.random())
    phases[i] = Math.random() * 0.25
    tones[i] = Math.random()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aTone', new THREE.BufferAttribute(tones, 1))
  geo.computeBoundingSphere()
  disposables.push(geo)

  const points = new THREE.Points(geo, ambientParticleMat)
  points.position.set(0, -1.5, CFG.dna.z)
  return points
}

function applyRevealClip(material: THREE.Material | THREE.Material[]) {
  const mats = Array.isArray(material) ? material : [material]
  mats.forEach((mat) => {
    Object.assign(mat, {
      clippingPlanes: [revealClipPlane, exitClipPlane],
      clipShadows: true
    })
    mat.needsUpdate = true
  })
}

applyRevealClip(ringMat)
applyRevealClip(pyramidGlassMat)
applyRevealClip(pyramidEdgeMat)
applyRevealClip(plateMetalMat)

// ── Scene3 環繞卡片（8 張功能入口，環繞骨幹旋轉、滾動驅動）──
interface HeroCard {
  title: string
  color: string
  accent: string
  to: string
}
const HERO_CARDS: HeroCard[] = [
  { title: '飼養指南', color: '#d88a48', accent: '#6f96c7', to: '/care' },
  { title: '專欄文章', color: '#dc7d43', accent: '#c45a88', to: '/articles' },
  { title: '信任保證', color: '#d69a52', accent: '#69aa94', to: '/why-gencko' },
  { title: '種群展示', color: '#e08b3f', accent: '#b8a45a', to: '/breeders' },
  { title: '選購守宮', color: '#d87546', accent: '#9a677f', to: '/shop' },
  { title: '基因圖鑑', color: '#da8446', accent: '#7f9fd0', to: '/genes' },
  { title: '基因計算', color: '#dd7d3f', accent: '#c9688d', to: '/calculator' },
  { title: '特寵醫院', color: '#d8954d', accent: '#72a996', to: '/hospital' }
]
const CARD_W = 2.6
const CARD_H = 1.7
const CARD_THICKNESS = 0.06
const CARD_RADIUS = 0.08
const CARD_TITLE_DEPTH_LAYERS = 4
const CARD_TITLE_DEPTH_STEP = 0.003
// 環繞軸心：卡片固定半徑繞脊椎 Y 軸公轉，初始為「第一張正中、其餘依序在右下」。
const cardRingRadius = 2.9 // 距軸心半徑
const cardRingCenterZ = 1.1 // 環繞中心（對齊脊椎軸）
const cardRingY = 0.08 // 第一張正面時基準高度
const cardVerticalSlope = 0.48 // 相位每推進 1 rad 時沿 Y 軸抬升距離
const heroCardsGroup = new THREE.Group()
interface HeroCardItem {
  index: number
  pivot: THREE.Group
  holder: THREE.Group
  coreMesh: THREE.Mesh
  coreMat: THREE.MeshStandardMaterial
  titleMat: THREE.ShaderMaterial
  titleMats: THREE.ShaderMaterial[]
  to: string
}
const heroCardItems: HeroCardItem[] = []

function makeCardTitleTexture(text: string): THREE.CanvasTexture {
  const cvs = document.createElement('canvas')
  cvs.width = 640
  cvs.height = 160
  const ctx = cvs.getContext('2d')!
  ctx.clearRect(0, 0, cvs.width, cvs.height)
  ctx.font = '600 68px "Noto Sans TC", "PingFang TC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 不使用描邊；文字厚度由多層 mesh 在 Z 軸堆疊產生。
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.fillText(text, cvs.width / 2, cvs.height / 2)
  const tex = new THREE.CanvasTexture(cvs)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function makeScreenRevealCardCoreMaterial(color: string, accent: string, alpha = 0.46) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: uniforms.uResolution,
      uSeamB: uniforms.uSeamB,
      uColor: { value: new THREE.Color(color) },
      uAccent: { value: new THREE.Color(accent) },
      uAlpha: { value: alpha }
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vLocal;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vLocal = position;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uResolution;
      uniform float uSeamB;
      uniform vec3 uColor;
      uniform vec3 uAccent;
      uniform float uAlpha;
      varying vec2 vUv;
      varying vec3 vLocal;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        float _sd = gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y;
        float revealBand = smoothstep(uSeamB + 0.035, uSeamB - 0.01, _sd);
        if (revealBand <= 0.001) discard;
        float radius = 0.1;
        vec2 q = abs(vUv - vec2(0.5)) - vec2(0.5 - radius);
        float roundedDist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float aa = max(fwidth(roundedDist) * 1.4, 0.0015);
        float roundedMask = 1.0 - smoothstep(-aa, aa, roundedDist);
        if (roundedMask <= 0.001) discard;
        float fresnel = pow(1.0 - clamp(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0, 1.0), 2.2);
        float curveShade = smoothstep(0.0, 1.0, abs(vLocal.x) / ${(CARD_W * 0.5).toFixed(3)});
        float inner = smoothstep(0.04, 0.22, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
        float grain = 0.5 + 0.5 * sin(vUv.x * 28.0 + vUv.y * 19.0);
        vec3 tint = mix(uColor, uAccent, 0.18 + curveShade * 0.2);
        vec3 col = tint * (0.58 + inner * 0.18) + uColor * grain * 0.04;
        col += mix(uAccent, uColor, 0.55) * fresnel * 0.1;
        float alphaOut = uAlpha * (0.9 + inner * 0.08 + fresnel * 0.06) * revealBand * roundedMask;
        gl_FragColor = vec4(col, alphaOut);
      }
    `
  })
  disposables.push(mat)
  return mat
}

function makeScreenRevealTitleMaterial(
  map: THREE.Texture,
  tint = '#8f96a2',
  alpha = 1,
  chroma = 0,
  layerSeed = 0
) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uResolution: uniforms.uResolution,
      uSeamB: uniforms.uSeamB,
      uMap: { value: map },
      uTint: { value: new THREE.Color(tint) },
      uAlpha: { value: alpha },
      uChroma: { value: chroma },
      uLayerSeed: { value: layerSeed }
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uResolution;
      uniform float uSeamB;
      uniform sampler2D uMap;
      uniform vec3 uTint;
      uniform float uAlpha;
      uniform float uChroma;
      uniform float uLayerSeed;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        float _sd = gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y;
        float revealBand = smoothstep(uSeamB + 0.035, uSeamB - 0.01, _sd);
        if (revealBand <= 0.001) discard;
        vec2 uv = vUv;
        float aR = texture2D(uMap, uv + vec2(uChroma, 0.0)).a;
        float aG = texture2D(uMap, uv).a;
        float aB = texture2D(uMap, uv - vec2(uChroma, 0.0)).a;
        float a = max(aG, max(aR, aB));
        if (a < 0.02) discard;
        vec3 mono = uTint * (0.5 + aG * 0.18);
        vec3 aberration = vec3(aR * 0.42, aG * 0.34, aB * 0.5);
        vec3 col = mix(mono, mono * 0.72 + aberration, step(0.0001, uChroma));
        float facing = dot(normalize(vWorldNormal), normalize(vViewDir));
        float backFade = smoothstep(-0.72, -0.05, facing);
        gl_FragColor = vec4(col, a * uAlpha * revealBand * backFade);
      }
    `
  })
  disposables.push(mat)
  return mat
}

function applyScreenRevealDiscard(material: THREE.Material) {
  const mat = material as THREE.Material & {
    onBeforeCompile: (shader: { uniforms: Record<string, unknown>; fragmentShader: string }) => void
    customProgramCacheKey?: () => string
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uResolution = uniforms.uResolution
    shader.uniforms.uSeamB = uniforms.uSeamB
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      /* glsl */ `
      uniform vec2 uResolution;
      uniform float uSeamB;
      void main() {
        float _screenRevealSd = gl_FragCoord.x / uResolution.x + gl_FragCoord.y / uResolution.y;
        if (_screenRevealSd > uSeamB) discard;
      `
    )
  }
  mat.customProgramCacheKey = () => 'screen-reveal-discard-v1'
  mat.needsUpdate = true
}

// 只繞 Y 軸彎曲：Y 完全不動，只把 X 投影到 XZ 圓柱面，避免出現其他方向的彎曲。
function bendCardGeometryAroundYAxis(geo: THREE.BufferGeometry, radius: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const theta = x / radius
    pos.setX(i, radius * Math.sin(theta))
    pos.setZ(i, z + radius * Math.cos(theta) - radius)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
}

function makeProjectionCardGeometry() {
  // 自建多分段圓角薄板：正反面都是圓角輪廓，且 X 方向有足夠分段可沿 Y 軸彎曲。
  // 不用 ExtrudeGeometry，避免直邊缺少中間頂點導致彎曲只剩兩端、看起來像平板。
  const halfW = CARD_W * 0.5
  const halfH = CARD_H * 0.5
  const halfT = CARD_THICKNESS * 0.5
  const r = Math.min(CARD_RADIUS, halfW, halfH)
  const xSeg = 36
  const ySeg = 18
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const front: number[][] = []
  const back: number[][] = []

  const halfWidthAtY = (y: number) => {
    const ay = Math.abs(y)
    const straight = halfH - r
    if (ay <= straight) return halfW
    const dy = ay - straight
    return halfW - r + Math.sqrt(Math.max(0, r * r - dy * dy))
  }

  const pushVertex = (x: number, y: number, z: number) => {
    positions.push(x, y, z)
    uvs.push((x + halfW) / CARD_W, (y + halfH) / CARD_H)
    return positions.length / 3 - 1
  }

  for (let iy = 0; iy <= ySeg; iy++) {
    const y = THREE.MathUtils.lerp(-halfH, halfH, iy / ySeg)
    const rowHalfW = halfWidthAtY(y)
    front[iy] = []
    back[iy] = []
    for (let ix = 0; ix <= xSeg; ix++) {
      const x = THREE.MathUtils.lerp(-rowHalfW, rowHalfW, ix / xSeg)
      front[iy][ix] = pushVertex(x, y, halfT)
      back[iy][ix] = pushVertex(x, y, -halfT)
    }
  }

  for (let iy = 0; iy < ySeg; iy++) {
    for (let ix = 0; ix < xSeg; ix++) {
      const a = front[iy][ix]
      const b = front[iy][ix + 1]
      const c = front[iy + 1][ix]
      const d = front[iy + 1][ix + 1]
      indices.push(a, b, c, b, d, c)

      const ba = back[iy][ix]
      const bb = back[iy][ix + 1]
      const bc = back[iy + 1][ix]
      const bd = back[iy + 1][ix + 1]
      indices.push(ba, bc, bb, bb, bc, bd)
    }
  }

  for (let iy = 0; iy < ySeg; iy++) {
    indices.push(
      front[iy][0],
      front[iy + 1][0],
      back[iy][0],
      back[iy][0],
      front[iy + 1][0],
      back[iy + 1][0]
    )
    indices.push(
      front[iy][xSeg],
      back[iy][xSeg],
      front[iy + 1][xSeg],
      back[iy][xSeg],
      back[iy + 1][xSeg],
      front[iy + 1][xSeg]
    )
  }

  for (let ix = 0; ix < xSeg; ix++) {
    indices.push(
      front[0][ix],
      back[0][ix],
      front[0][ix + 1],
      back[0][ix],
      back[0][ix + 1],
      front[0][ix + 1]
    )
    indices.push(
      front[ySeg][ix],
      front[ySeg][ix + 1],
      back[ySeg][ix],
      back[ySeg][ix],
      front[ySeg][ix + 1],
      back[ySeg][ix + 1]
    )
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  bendCardGeometryAroundYAxis(geo, cardRingRadius)
  return geo
}

function makeProjectionCardMaterial(color: string, accent: string) {
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.72),
    emissive: new THREE.Color(color).lerp(new THREE.Color(accent), 0.22),
    emissiveIntensity: 0.34,
    roughness: 0.34,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  applyScreenRevealDiscard(mat)
  disposables.push(mat)
  return mat
}

function buildHeroCards() {
  const N = HERO_CARDS.length
  const coreGeo = makeProjectionCardGeometry()
  disposables.push(coreGeo)
  const titleGeo = new THREE.PlaneGeometry(CARD_W * 0.9, CARD_W * 0.9 * (160 / 640), 24, 1)
  bendCardGeometryAroundYAxis(titleGeo, cardRingRadius)
  disposables.push(titleGeo)

  for (let i = 0; i < N; i++) {
    const card = HERO_CARDS[i]
    const pivot = new THREE.Group() // 繞軸公轉（每幀設 rotation.y）
    const holder = new THREE.Group()
    holder.position.set(0, cardRingY, cardRingRadius) // 位於半徑上、卡面朝外(+Z)

    // 只保留有厚度的內層卡；renderOrder 拉高，避免透明骨幹深度排序造成卡片跳消失。
    const coreMat = makeProjectionCardMaterial(card.color, card.accent)
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreMesh.renderOrder = 20
    holder.add(coreMesh)

    // 浮空標題：多層 mesh 疊出文字厚度，不用描邊。
    const titleTex = makeCardTitleTexture(card.title)
    disposables.push(titleTex)
    const titleMats: THREE.ShaderMaterial[] = []
    let titleMat: THREE.ShaderMaterial | null = null
    const titleBaseZ = CARD_THICKNESS * 0.5 + 0.0005
    for (let layer = 0; layer < CARD_TITLE_DEPTH_LAYERS; layer++) {
      const t = layer / Math.max(1, CARD_TITLE_DEPTH_LAYERS - 1)
      const isFront = layer === CARD_TITLE_DEPTH_LAYERS - 1
      const tint = isFront ? '#ffffff' : ['#2f75a6', '#9a476f', '#8c6843', '#56606f'][layer % 4]
      const mat = makeScreenRevealTitleMaterial(
        titleTex,
        tint,
        isFront ? 0.9 : THREE.MathUtils.lerp(0.18, 0.34, t),
        isFront ? 0 : THREE.MathUtils.lerp(0.01, 0.003, t),
        i * 11.0 + layer * 3.7
      )
      const title = new THREE.Mesh(titleGeo, mat)
      title.position.set(
        0,
        -CARD_H * 0.18,
        titleBaseZ - (CARD_TITLE_DEPTH_LAYERS - 1 - layer) * CARD_TITLE_DEPTH_STEP
      )
      title.renderOrder = 22 + layer
      holder.add(title)
      titleMats.push(mat)
      if (isFront) titleMat = mat
    }

    pivot.add(holder)
    heroCardsGroup.add(pivot)
    heroCardItems.push({
      index: i,
      pivot,
      holder,
      coreMesh,
      coreMat,
      titleMat: titleMat!,
      titleMats,
      to: card.to
    })
  }

  heroCardsGroup.position.set(0, 0, cardRingCenterZ)
  heroCardsGroup.visible = false
}

buildHeroCards()

const projectorGroup = buildProjector()
const ambientParticles = createAmbientParticles()
const groundGrid = buildGroundGrid()
const backboneSampleGroup = buildBackboneSample()

group.add(groundGrid)
group.add(dnaGroup)
group.add(backboneSampleGroup)
group.add(geckoGroup)
group.add(projectorGroup)
group.add(ambientParticles)
group.add(heroCardsGroup)
loadGeckoModel()
loadBackboneModel()

const groupRef = shallowRef<THREE.Group>(group)

const { onBeforeRender } = useLoop()
const tres = useTresContext()
let envRT: THREE.WebGLRenderTarget | null = null
let envDone = false
let rendererRef: THREE.WebGLRenderer | null = null
const tmpRes = new THREE.Vector2()
const SEAM_BAND = 0.85 // Logo 斜帶在 d 座標的寬度（越小越窄）
type ClipPoint = { x: number; y: number }

function pointBandValue(p: ClipPoint) {
  // CSS y 軸向下；shader y 軸向上，所以 d = x + (1 - y)。
  return p.x + 1 - p.y
}

function clipPolygonByBand(poly: ClipPoint[], seam: number, keepAbove: boolean) {
  if (!poly.length) return poly
  const out: ClipPoint[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const da = pointBandValue(a) - seam
    const db = pointBandValue(b) - seam
    const aIn = keepAbove ? da >= 0 : da <= 0
    const bIn = keepAbove ? db >= 0 : db <= 0
    if (aIn && bIn) {
      out.push(b)
    } else if (aIn !== bIn) {
      const t = da / (da - db)
      out.push({
        x: THREE.MathUtils.lerp(a.x, b.x, t),
        y: THREE.MathUtils.lerp(a.y, b.y, t)
      })
      if (bIn) out.push(b)
    }
  }
  return out
}

function makeBandClipPath(seamB: number, seamA: number) {
  let poly: ClipPoint[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]
  poly = clipPolygonByBand(poly, seamB, true)
  poly = clipPolygonByBand(poly, seamA, false)
  if (poly.length < 3) return 'polygon(0 0, 0 0, 0 0)'
  return `polygon(${poly
    .map((p) => `${(p.x * 100).toFixed(2)}% ${(p.y * 100).toFixed(2)}%`)
    .join(', ')})`
}

function resolvePerspectiveCamera(x: unknown): THREE.PerspectiveCamera | null {
  const camera = resolveCamera(x)
  if (!camera) return null
  const maybePerspective = camera as THREE.PerspectiveCamera & { isPerspectiveCamera?: boolean }
  return maybePerspective.isPerspectiveCamera || typeof maybePerspective.fov === 'number'
    ? maybePerspective
    : null
}

function getMobileCardFitScale() {
  if (typeof window === 'undefined') return 1
  const canvas = rendererRef?.domElement
  const width = canvas?.clientWidth || window.innerWidth || 1
  const height = canvas?.clientHeight || window.innerHeight || 1
  if (width >= 768) return 1
  const camera = resolvePerspectiveCamera(tres.camera)
  const fov = camera?.fov ?? 55
  const cameraZ = camera?.position.z ?? 7
  const cardZ = heroCardsGroup.position.z + cardRingRadius
  const distance = Math.max(1, Math.abs(cameraZ - cardZ))
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov) * 0.5) * distance
  const viewWidth = viewHeight * (width / height)
  return THREE.MathUtils.clamp((viewWidth * 0.84) / CARD_W, 0.24, 1)
}

function resolveCamera(x: unknown): THREE.Camera | null {
  const cands = [x, (x as { value?: unknown })?.value]
  for (const c of cands) {
    if (c && typeof (c as THREE.Camera).projectionMatrix !== 'undefined') {
      return c as THREE.Camera
    }
  }
  return null
}

// TresJS v5 ??renderer ?航??銝撅歹????岫?曉?迤??WebGLRenderer
function resolveRenderer(x: unknown): THREE.WebGLRenderer | null {
  const cands = [
    x,
    (x as { value?: unknown })?.value,
    (x as { instance?: unknown })?.instance,
    (x as { value?: { instance?: unknown } })?.value?.instance
  ]
  for (const c of cands) {
    if (c && typeof (c as THREE.WebGLRenderer).getRenderTarget === 'function') {
      return c as THREE.WebGLRenderer
    }
  }
  return null
}

function initEnvMap() {
  if (envDone) return
  const webgl = resolveRenderer(tres.renderer)
  if (!webgl) return
  envDone = true
  rendererRef = webgl
  webgl.localClippingEnabled = true
  const pmrem = new THREE.PMREMGenerator(webgl)
  envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  plateMetalMat.envMap = envRT.texture
  plateMetalMat.needsUpdate = true
  pyramidGlassMat.envMap = envRT.texture // ?餌???/???啣?
  pyramidGlassMat.needsUpdate = true
  for (const item of heroCardItems) {
    item.coreMat.needsUpdate = true
  }
  pmrem.dispose()
}

onBeforeRender(({ elapsed, delta }) => {
  uniforms.uTime.value = elapsed
  if (!envDone) initEnvMap()
  // 卡住/切回分頁時 delta 會爆大，夾住上限避免一次跳太多
  const dt = Math.min(delta, 0.05)
  currentRotationY += (targetRotationY - currentRotationY) * fpsSmooth(CFG.wheel.damping, dt)
  currentParticleLift += (targetParticleLift - currentParticleLift) * fpsSmooth(0.07, dt)
  currentTimeline += (targetTimeline - currentTimeline) * fpsSmooth(0.06, dt)
  const introReveal = stageValue(currentTimeline, 0, introRevealSpan, introRevealMax)
  const gridReveal = stageValue(currentTimeline, 0, gridRevealSpan, introRevealMax)
  const firstExit = stageValue(
    currentTimeline,
    timelineBreaks.introRevealEnd,
    firstExitSpan,
    firstExitMax
  )
  const finalEnter = stageValue(
    currentTimeline,
    timelineBreaks.firstExitEnd,
    finalEnterSpan,
    finalEnterMax
  )
  const finalDna = stageValue(
    currentTimeline,
    timelineBreaks.finalEnterEnd,
    exitBodySpan,
    exitBodyMax
  )
  // ── 雙斜縫連續掃描：單一 sweep 進度驅動 seamA/seamB ──
  const sweep = THREE.MathUtils.clamp(0.5 * firstExit + 0.5 * finalEnter, 0, 1)
  const seamA = THREE.MathUtils.clamp(sweep * (2 + SEAM_BAND), 0, 2) // Scene01 保留 d>seamA（右上）
  const seamB = THREE.MathUtils.clamp(sweep * (2 + SEAM_BAND) - SEAM_BAND, 0, 2) // Scene03 保留 d<seamB（左下）
  const introSeamProgress = THREE.MathUtils.clamp(Math.pow(introReveal, 0.58), 0, 1)
  const introSeam = THREE.MathUtils.lerp(0.18, 2.16, introSeamProgress)
  uniforms.uSeamA.value = seamA
  uniforms.uSeamB.value = seamB
  uniforms.uIntroSeam.value = introSeam
  if (rendererRef) {
    rendererRef.getDrawingBufferSize(tmpRes)
    uniforms.uResolution.value.set(tmpRes.x, tmpRes.y)
  }
  // Logo 盤旋轉：橫跨 T1+T2 的單一單調曲線。
  // 直接對線性 sweep（0→1 已單調跨越 T1+T2）套「一次」smoothstep：
  // 只有最頭(−90°)與最尾(+90°)平滑，中間（含正面）等速通過。
  // 舊版用兩段獨立 smoothstep 相加，會在接點(正面)各自 ease-out/ease-in 疊成
  // 停頓平台，導致「轉到正面後減速、T2 幅度很小」——改成單一 smoothstep 消除。
  const logoRotateProgress = THREE.MathUtils.smoothstep(sweep, 0.0, 1.0)
  const scene01Active = introReveal > stageEpsilon && sweep < 0.86 // seamA 於 s≈0.77 到頂
  const projectorActive = scene01Active && sweep < 0.72
  const projFade = 1 - THREE.MathUtils.smoothstep(sweep, 0.62, 0.72) // 斜帶掃過中段後完全關閉投影底座
  const backboneReveal = Math.max(THREE.MathUtils.smoothstep(sweep, 0.35, 1.0), finalDna)
  const scene3Active = finalEnter > stageEpsilon || finalDna > stageEpsilon
  const particleFade = introReveal * (1 - THREE.MathUtils.smoothstep(sweep, 0.0, 0.55))
  // 收束後維持聚攏（不再隨 sweep 釋放散開）；轉場時靠 particleFade 淡出消失。
  const particlePullTarget = introReveal
  const revealPlaneOffset = THREE.MathUtils.lerp(-9.8, 9.6, introReveal)
  currentParticlePull += (particlePullTarget - currentParticlePull) * fpsSmooth(0.14, dt)
  group.rotation.y = 0
  dnaGroup.rotation.y = currentRotationY
  backboneSampleGroup.rotation.y = currentRotationY * 0.18
  geckoGroup.rotation.y = currentRotationY * geckoPyramidSpinFactor
  ambientParticles.rotation.y = currentRotationY * 0.5
  projectorGroup.rotation.y = currentRotationY * geckoPyramidSpinFactor
  dnaGroup.position.z = CFG.dna.z
  backboneSampleGroup.position.set(0, 0, 1.1)
  geckoGroup.position.y = CFG.gecko.y
  geckoGroup.position.z = CFG.gecko.z
  dnaGroup.visible = scene01Active
  geckoGroup.visible = scene01Active
  ambientParticles.visible = scene01Active
  groundGrid.visible = gridReveal > stageEpsilon && scene01Active
  projectorGroup.visible = projectorActive && projFade > 0.01
  // 投影金字塔/底座在斜帶掃過後直接關掉，不殘留到 Scene3 揭露完成後。
  pyramidGlassMat.opacity = 0.028 * projFade
  pyramidEdgeMat.opacity = 0.95 * projFade
  ringMat.opacity = 0.22 * projFade
  plateMetalMat.opacity = projFade
  // 骨幹（Scene03）：seamB>0 才顯示，材質內以 seamB 由左下 discard 露出
  backboneSampleGroup.visible = seamB > 0.001
  backboneSampleGroup.scale.setScalar(1)
  backboneSampleMat.uniforms.uAlpha.value = 0.13 + backboneReveal * 0.14
  // ── Scene3 卡片環繞軸心：與骨幹一起被斜帶揭露，初始為第一張正中、其餘沿右下排隊，
  //    捲動時依序從右下進中間，再往左上繞到骨幹後側。──
  const cardOrbitDelta = targetCardOrbit - currentCardOrbit
  currentCardOrbit += cardOrbitDelta * fpsSmooth(cardOrbitDamping, dt)
  if (Math.abs(cardOrbitDelta) < cardOrbitSettleEpsilon) {
    currentCardOrbit = targetCardOrbit
  }
  const cardFitScale = getMobileCardFitScale()
  heroCardsGroup.visible = scene3Active
  if (scene3Active) {
    cardOrbitUnlockedNow =
      (targetTimeline >= cardOrbitInputStart &&
        currentTimeline >= cardOrbitInputStart - stageEpsilon) ||
      targetCardOrbit > cardOrbitSettleEpsilon ||
      currentCardOrbit > cardOrbitSettleEpsilon
    const orbitPhase = cardOrbitUnlockedNow ? currentCardOrbit : 0
    for (const it of heroCardItems) {
      const wa = orbitPhase - (cardEntranceAngle + it.index * cardStep)
      it.pivot.rotation.y = wa
      it.holder.position.y = cardRingY + wa * cardVerticalSlope
      const front = THREE.MathUtils.clamp(Math.cos(wa), -1, 1)
      it.coreMat.opacity = 0.78
      it.coreMat.emissiveIntensity = 0.34
      for (const mat of it.titleMats) mat.uniforms.uAlpha.value = mat === it.titleMat ? 0.9 : 0.2
      it.holder.scale.setScalar(cardFitScale * THREE.MathUtils.lerp(0.94, 1.02, Math.max(front, 0)))
      it.holder.visible = true
    }
  } else {
    cardOrbitUnlockedNow = false
    for (const it of heroCardItems) {
      const wa = -(cardEntranceAngle + it.index * cardStep)
      it.pivot.rotation.y = wa
      it.holder.position.y = cardRingY + wa * cardVerticalSlope
      it.coreMat.opacity = 0.78
      it.coreMat.emissiveIntensity = 0.34
      for (const mat of it.titleMats) mat.uniforms.uAlpha.value = mat === it.titleMat ? 0.9 : 0.2
      it.holder.scale.setScalar(cardFitScale)
      it.holder.visible = false
    }
  }
  ambientParticleMat.uniforms.uLift.value = currentParticleLift + introReveal * 2.2
  ambientParticleMat.uniforms.uPull.value = currentParticlePull
  ambientParticleMat.uniforms.uTargetZ.value = 0.0
  ambientParticleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5)
  ambientParticleMat.uniforms.uFade.value = particleFade
  uniforms.uRevealPlaneOffset.value = revealPlaneOffset
  currentGridReveal += (gridReveal * (1 - sweep) - currentGridReveal) * fpsSmooth(0.028, dt)
  gridMat.uniforms.uReveal.value = currentGridReveal
  gridMat.uniforms.uScroll.value = -currentTimeline * gridFlowRate
  revealClipPlane.constant = revealPlaneOffset
  exitClipPlane.constant = 20 // 內建材質改淡出，exit 平面恆不裁切
  const scrollHintProgress = THREE.MathUtils.clamp(currentTimeline / 180, 0, 1)
  const bandActive = sweep > stageEpsilon && sweep < 0.999
  const bottomRenderSettled =
    Math.abs(targetTimeline - currentTimeline) < 0.08 &&
    Math.abs(targetRotationY - currentRotationY) < 0.002 &&
    Math.abs(targetParticleLift - currentParticleLift) < 0.02 &&
    Math.abs(targetCardOrbit - currentCardOrbit) < cardOrbitSettleEpsilon
  const logoResting = bandActive && sweep > 0.08 && sweep < 0.98 && bottomRenderSettled
  setBottomRenderMode(logoResting ? 'manual' : 'always')
  // 只有數值真的變了才寫 CSS（否則每幀配置字串/物件 + 寫 DOM = GC + reflow）
  const cssDirty =
    Math.abs(sweep - cssLastSweep) > 0.0004 ||
    Math.abs(scrollHintProgress - cssLastScrollHint) > 0.0004 ||
    Math.abs(logoRotateProgress - cssLastLogo) > 0.0004 ||
    (bandActive ? 1 : 0) !== cssLastBand
  if (cssDirty && typeof document !== 'undefined') {
    cssLastSweep = sweep
    cssLastScrollHint = scrollHintProgress
    cssLastLogo = logoRotateProgress
    cssLastBand = bandActive ? 1 : 0
    const el = document.documentElement.style
    el.setProperty('--hero-scroll-progress', String(scrollHintProgress))
    el.setProperty('--hero-exit-progress', String(sweep))
    el.setProperty('--hero-logo-next-progress', String(sweep))
    el.setProperty('--hero-logo-rotate-progress', String(logoRotateProgress))
    // canvas 全程不硬切（3D 內部以 seam 處理 Scene01 退場 / Scene03 進場）→ 消除交界閃動
    el.setProperty('--hero-clip', 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)')
    // Logo underlay 固定在前層（z=3），不再做 1→3 硬跳
    el.setProperty('--hero-underlay-z', '3')
    el.setProperty('--hero-underlay-opacity', bandActive ? '1' : '0')
    // Logo 斜帶 = seamB..seamA。CSS 也用 d = x + (1 - y) 的同一套座標，避免手機比例不同步。
    el.setProperty('--hero-underlay-clip', makeBandClipPath(seamB, seamA))
    // 斜帶內部凹陷光影：一條垂直於 TL–BR 斜縫的漸層，兩緣白+橘高光、內側微陰影
    // d ∈[0,2] 沿漸層軸線性對應 0→100%，故 pos = d/2*100；角度取 atan(H/W) 使軸線垂直斜縫
    if (bandActive) {
      const canvas = rendererRef?.domElement
      const vw = canvas?.clientWidth || window.innerWidth || 1
      const vh = canvas?.clientHeight || window.innerHeight || 1
      const ang = ((Math.atan2(vh, vw) * 180) / Math.PI).toFixed(2)
      const pB = (seamB / 2) * 100
      const pA = (seamA / 2) * 100
      const edgeCore = 0.08
      const edgeFade = 0.72
      const HI_CORE = 'rgba(255,210,155,1)'
      const HI_SOFT = 'rgba(255,178,95,0.56)'
      const f = (n: number) => n.toFixed(2)
      el.setProperty(
        '--hero-underlay-shade-hi',
        `linear-gradient(${ang}deg, ${HI_CORE} ${f(pB)}%, ${HI_SOFT} ${f(pB + edgeCore)}%, transparent ${f(pB + edgeFade)}%, transparent ${f(pA - edgeFade)}%, ${HI_SOFT} ${f(pA - edgeCore)}%, ${HI_CORE} ${f(pA)}%)`
      )
      el.setProperty('--hero-underlay-shade-lo', 'none')
    } else {
      el.setProperty('--hero-underlay-shade-hi', 'none')
      el.setProperty('--hero-underlay-shade-lo', 'none')
    }
  }
  if (loadedModel) {
    loadedModel.rotation.copy(baseGeckoRotation)
  }
})

onMounted(() => {
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  // Debug：瞬間跳關（僅供 hero-lab 驗證用）
  ;(window as unknown as { __hero?: unknown }).__hero = {
    jump(t: number, c = 0) {
      wakeBottomRender()
      targetTimeline = t
      currentTimeline = t
      targetCardOrbit = c
      currentCardOrbit = c
    },
    scene3(c = 0) {
      wakeBottomRender()
      targetTimeline = timelineBreaks.finalDnaEnd
      currentTimeline = timelineBreaks.finalDnaEnd
      targetCardOrbit = c
      currentCardOrbit = c
    },
    breaks: () => timelineBreaks,
    cardMax: () => cardOrbitMax,
    // Debug：即時改所有卡片材質（找亮度/透明度來源用）
    setCard(p: Record<string, unknown>) {
      for (const it of heroCardItems) {
        Object.assign(it.coreMat, p)
        it.coreMat.needsUpdate = true
      }
      return 'ok'
    },
    // Debug：讀上一幀 renderer 統計（找卡頓來源用）
    info: () => {
      const r = rendererRef
      return r
        ? {
            calls: r.info.render.calls,
            triangles: r.info.render.triangles,
            programs: r.info.programs?.length ?? 0
          }
        : null
    },
    state: () => ({
      targetTimeline,
      currentTimeline,
      targetCardOrbit,
      currentCardOrbit,
      targetRotationY,
      currentRotationY,
      heroCardsVisible: heroCardsGroup.visible,
      cardOrbitUnlockedNow,
      bottomRenderMode: lastBottomRenderMode
    })
  }
})

onUnmounted(() => {
  setBottomRenderMode('always')
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)

  if (loadedModel) {
    geckoGroup.remove(loadedModel)
    loadedModel.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }

  if (loadedBackboneModel) {
    backboneAxisFixGroup.remove(loadedBackboneModel)
    loadedBackboneModel.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }

  disposables.forEach((item) => item.dispose())
  envRT?.dispose()

  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty('--hero-exit-progress')
    document.documentElement.style.removeProperty('--hero-logo-next-progress')
    document.documentElement.style.removeProperty('--hero-logo-rotate-progress')
    document.documentElement.style.removeProperty('--hero-scroll-progress')
    document.documentElement.style.removeProperty('--hero-underlay-opacity')
    document.documentElement.style.removeProperty('--hero-underlay-z')
    document.documentElement.style.removeProperty('--hero-underlay-clip')
    document.documentElement.style.removeProperty('--hero-clip')
  }
})
</script>

<template>
  <primitive :object="groupRef" />
</template>
