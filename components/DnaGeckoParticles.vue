<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { FontLoader, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import helvetikerFont from 'three/examples/fonts/helvetiker_regular.typeface.json'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

const emit = defineEmits<{
  'bottom-render-mode': [mode: 'always' | 'manual']
  'card-focus': [card: HeroCard | null]
  'card-hitbox': [hitbox: HeroCardHitbox | null]
  'card-select': [card: HeroCard]
  'finale-action': [to: string]
  // 進度條：整段旅程正規化為 0→1 的單一進度，以及各場景在進度上的邊界。
  'journey-progress': [value: number]
  'journey-segments': [segments: { key: string; end: number }[]]
  'next-scene-progress': [value: number]
  // 終章揭露進度(0→1)：讓父層在終章把 Bloom 壓下來（白實驗室易觸發 Bloom）。
  'finale-reveal': [value: number]
}>()

const MODEL_URL = '/models/gecko-tripo.glb'
const BACKBONE_MODEL_URL = '/models/scene03-main-rig.glb'
const EMBRYO_MODEL_URL = '/models/gecko-embryo.glb'
const LOGO_TEXTURE_URL = '/logo.png'

const CFG = {
  dna: {
    height: 10.0,
    radius: 0.62,
    turns: 2.2,
    tubeRadius: 0.058,
    rungRadius: 0.03,
    rungs: 28,
    segments: 500,
    alpha: 0.52,
    z: -1.65
  },
  gecko: {
    targetSize: 5.2,
    y: 0.6,
    z: 0.55
  },
  spinDeg: 10,
  wheel: {
    // 皛曇憚撣嗅? DNA 頧?嚗peed 頞之頧?頞之
    speed: 0.0055,
    damping: 0.09
  },
  // ?冽?蔣摨漣 + ??嚗嗾??芸楛隤選?
  projector: {
    y: -1.4,
    discRadius: 1.14,
    beamHeight: 3,
    beamSpreadDeg: 29,
    pyramidTopRadius: 3.42,
    pyramidBottomRadius: 0.8, // 摨(?亙??方?)??
    pyramidHeight: 2.96,
    pyramidWallThickness: 0.068,
    basePlateRadius: 1.14, // 摨??
    basePlateThickness: 0.25 // 摨?漲
  }
}

const uniforms = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color('#ee6a2e') },
  uColorB: { value: new THREE.Color('#ff9a3d') },
  uColorC: { value: new THREE.Color('#ffd08a') },
  uRevealPlaneNormal: { value: new THREE.Vector3(0.86, 0.52, 0).normalize() },
  uRevealPlaneOffset: { value: -9.8 },
  uExitPlaneNormal: { value: new THREE.Vector3(0.2, 1, 0).normalize() },
  uExitPlaneOffset: { value: 20 },
  // 螢幕座標雙斜縫（d = screenUV.x + screenUV.y ∈[0,2]，TL–BR 對角線為 d=1）
  // Scene01 保留 d>uSeamA（右上）；Scene03 保留 d<uSeamB（左下）；中間為 Logo 斜帶
  uResolution: { value: new THREE.Vector2(1, 1) },
  // 終章 wipe 專用解析度（與斜帶 uResolution 解耦）：設成 (超大, H/2) → sd≈2·(y/H)
  // = 水平線掃描（由下往上），前面斜帶維持斜向不受影響。
  uEggRes: { value: new THREE.Vector2(1, 1) },
  uSeamA: { value: 0 }, // 起始 0 = 全顯示
  uSeamB: { value: 0 }, // 起始 0 = 骨幹全隱藏
  uIntroSeam: { value: 0.18 }, // DNA 入場專用：由下往上顯示
  uEggReveal: { value: 0 } // 終章水平 wipe：0→1 沿螢幕 y 揭露，蛋/背景出現、骨幹/卡片退場
}

const screenEdgeNoiseGlsl = /* glsl */ `
  float screenEdgeHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float screenEdgeNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = screenEdgeHash(i);
    float b = screenEdgeHash(i + vec2(1.0, 0.0));
    float c = screenEdgeHash(i + vec2(0.0, 1.0));
    float d = screenEdgeHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // fBm = sum(noise_i * amplitude_i)。三個 octave 以 persistence=0.5 衰減，
  // 比單一頻率 noise 更接近湍流能量由大尺度往小尺度遞減的物理分佈。
  float screenEdgeFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 3; i++) {
      value += screenEdgeNoise(p) * amplitude;
      total += amplitude;
      p = p * 2.03 + vec2(17.13, 9.71);
      amplitude *= 0.5;
    }
    return value / total;
  }

  float perturbScreenD(vec2 fragCoord, vec2 resolution, float time, float amplitude) {
    float d = fragCoord.x / resolution.x + fragCoord.y / resolution.y;
    // 斜帶邊界必須和 DOM clip 使用同一條直線；小方塊雜訊只留給終章 wipe。
    return d;
  }
`

const opticalPhysicsGlsl = /* glsl */ `
  vec3 toLinearColor(vec3 color) {
    return pow(max(color, vec3(0.0)), vec3(2.2));
  }

  vec3 toSrgbColor(vec3 color) {
    return pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));
  }

  // Schlick's Approximation:
  // R(theta)=R0+(1-R0)(1-cosTheta)^5, R0=((1-ior)/(1+ior))^2。
  // ior=1.5 時 R0 約 0.04，符合普通玻璃正入射反射率。
  float schlickFresnel(float cosTheta, float ior) {
    float r0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
    float m = clamp(1.0 - cosTheta, 0.0, 1.0);
    return r0 + (1.0 - r0) * pow(m, 5.0);
  }
`

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
  bloomSafe = false,
  clipMode: 'scene3' | 'scene1' = 'scene3',
  enableTopDissolve = false,
  enableFinaleWipe = false,
  alphaCap?: number
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
  const alphaClamp = alphaCap !== undefined ? alphaCap.toFixed(2) : bloomSafe ? '0.58' : '0.95'

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uAlpha: { value: alpha },
      uOpacityMul: { value: 1 },
      uBoost: { value: boost },
      uColorA: { value: new THREE.Color(colors.a) },
      uColorB: { value: new THREE.Color(colors.b) },
      uColorC: { value: new THREE.Color(colors.c) },
      uResolution: uniforms.uResolution,
      uSeamA: uniforms.uSeamA,
      uSeamB: uniforms.uSeamB,
      ...(enableTopDissolve
        ? {
            uDissolveStart: { value: -999 },
            uDissolveEnd: { value: -999 },
            uDissolveStrength: { value: 0 }
          }
        : {}),
      ...(enableFinaleWipe
        ? {
            uEggReveal: uniforms.uEggReveal,
            uEggRes: uniforms.uEggRes
          }
        : {})
    },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;
      ${enableTopDissolve ? 'varying vec3 vWorld;' : ''}

      void main() {
        vUv = uv;
        vec3 transformed = position;
        vec3 objectNormal = normal;
        #ifdef USE_INSTANCING
          transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
          objectNormal = mat3(instanceMatrix) * objectNormal;
        #endif
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        ${enableTopDissolve ? 'vWorld = wp.xyz;' : ''}
        vN = normalize(mat3(modelMatrix) * objectNormal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAlpha;
      uniform float uOpacityMul;
      uniform float uBoost;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec2 uResolution;
      uniform float uSeamA;
      uniform float uSeamB;
      varying vec3 vN;
      varying vec3 vV;
      varying vec2 vUv;
      ${enableTopDissolve ? 'varying vec3 vWorld;' : ''}
      ${enableTopDissolve ? 'uniform float uDissolveStart;' : ''}
      ${enableTopDissolve ? 'uniform float uDissolveEnd;' : ''}
      ${enableTopDissolve ? 'uniform float uDissolveStrength;' : ''}
      ${enableFinaleWipe ? 'uniform float uEggReveal;' : ''}
      ${enableFinaleWipe ? 'uniform vec2 uEggRes;' : ''}

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      ${screenEdgeNoiseGlsl}
      ${opticalPhysicsGlsl}

      void main() {
        ${
          enableFinaleWipe
            ? /* glsl */ `
        // 終章退場 wipe（與蛋入場同一道斜向邊界、反向）。
        float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
        float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
        if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
        `
            : ''
        }
        // scene3: 保留 d<seamB（Scene03 揭露）；scene1: 保留 d>=seamA（起始 DNA 可見、斜帶退場）。
        float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.018);
        ${clipMode === 'scene1' ? 'if (_sd < uSeamA) discard;' : 'if (_sd > uSeamB) discard;'}
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        vec3 colorA = toLinearColor(uColorA);
        vec3 colorB = toLinearColor(uColorB);
        vec3 colorC = toLinearColor(uColorC);
        vec3 warmRim = toLinearColor(vec3(1.0, 0.72, 0.38));
        vec3 dispersionBias = vec3(0.018, 0.0, 0.0);
        float fresR = schlickFresnel(clamp(abs(dot(normalize(N + dispersionBias), V)), 0.0, 1.0), 1.5);
        float fresG = schlickFresnel(clamp(abs(dot(N, V)), 0.0, 1.0), 1.5);
        float fresB = schlickFresnel(clamp(abs(dot(normalize(N - dispersionBias), V)), 0.0, 1.0), 1.5);
        float fres = smoothstep(0.04, 0.62, fresG);
        vec3 spectralFresnel = vec3(fresR, fresG, fresB);
        float edgePrism = smoothstep(0.045, 0.38, fresG);
        // 線性色彩空間中混色，避免 sRGB mix 造成灰階死區。
        vec3 baseGradient = mix(colorA, colorB, smoothstep(0.04, 0.35, fresG));
        baseGradient = mix(baseGradient, colorC, pow(edgePrism, 2.4));
        vec3 spectralColor = baseGradient * spectralFresnel;
        spectralColor += toLinearColor(vec3(fresR * 0.2, fresG * 0.04, fresB * 0.28)) * edgePrism;
        vec3 irid = mix(baseGradient, spectralColor, 0.38 + edgePrism * 0.32);
        vec3 col = colorA * ${baseGlow};
        col += irid * fres * ${fresnelGlow};
        col += spectralColor * edgePrism * 0.085;
        col += pow(edgePrism, 3.0) * warmRim * ${rimGlow};
        col *= uBoost;
        float a = uAlpha + fres * 0.24;

        ${
          tubeFlow
            ? /* glsl */ `
        float flow = 0.5 + 0.5 * sin(vUv.y * 5.0 - uTime * 2.0);
        float ring = 0.35 + 0.65 * pow(abs(sin(vUv.x * 3.14159)), 0.6);
        col += colorC * flow * ring * 0.12;
        col += colorA * ring * 0.08;
        a += flow * 0.025;
        `
            : ''
        }

        ${
          surfaceLit
            ? /* glsl */ `
        vec3 L = normalize(vec3(0.0, 0.9, 0.5));
        float lit = 0.5 + 0.9 * max(dot(N, L), 0.0);
        col += colorA * lit * ${litGlow};
        float fineRidge = pow(0.5 + 0.5 * sin((vUv.y * 180.0 + vUv.x * 42.0) - uTime * 0.65), 10.0);
        float crossRidge = pow(0.5 + 0.5 * sin((vUv.x * 120.0 - vUv.y * 26.0) + uTime * 0.45), 12.0);
        float shimmer = 0.5 + 0.5 * sin(N.x * 18.0 + N.y * 12.0 + N.z * 8.0 - uTime * 1.2);
        float rimTrace = pow(fres, 3.6);
        col += colorB * fineRidge * ${ridgeGlow};
        col += colorA * crossRidge * ${crossGlow};
        col += colorC * pow(shimmer, 5.0) * ${shimmerGlow};
        col += colorB * rimTrace * (${traceGlow} + 0.012 * sin(uTime * 1.4));
        a += lit * 0.11 + fineRidge * 0.02 + rimTrace * 0.035;
        `
            : ''
        }

        ${
          clipMode === 'scene1'
            ? /* glsl */ `
        float seamEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
        col += colorB * seamEdge * ${enterGlowA};
        col += colorC * pow(seamEdge, 2.2) * ${enterGlowB};
        a += seamEdge * ${enterAlpha};
        `
            : /* glsl */ `
        float seamEdge = 1.0 - smoothstep(0.0, 0.16, uSeamB - _sd);
        col += colorB * seamEdge * ${enterGlowA};
        col += colorC * pow(seamEdge, 2.2) * ${enterGlowB};
        a += seamEdge * ${enterAlpha};
        `
        }
        ${
          enableTopDissolve
            ? /* glsl */ `
        // 溶入盤底：DNA 頂端依世界高度漸淡溶進 Logo 盤，過渡帶暖光（像流進盤裡）。
        float _dz = smoothstep(uDissolveStart, uDissolveEnd, vWorld.y) * uDissolveStrength;
        float _dGlow = _dz * (1.0 - _dz) * 4.0;
        col += toLinearColor(vec3(1.0, 0.72, 0.36)) * _dGlow * 0.7;
        a *= (1.0 - _dz);
        a += _dGlow * 0.08;
        `
            : ''
        }
        gl_FragColor = vec4(toSrgbColor(col), clamp(a, 0.0, ${alphaClamp}));
      }
    `
  })
}

function makeHologram(
  alpha: number,
  boost = 1.0,
  colors = { a: '#ff6a1f', b: '#ff9a3d', c: '#ffe6c0' },
  enableReveal = true,
  enableIntroReveal = false,
  enableShatterReveal = false
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uAlpha: { value: alpha },
      uOpacityMul: { value: 1 },
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
        : {}),
      ...(enableShatterReveal
        ? {
            uReveal: { value: 0 },
            uShatterFreq: { value: 12.6 }
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
      uniform float uOpacityMul;
      uniform float uBoost;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      ${enableReveal ? 'uniform vec3 uRevealPlaneNormal;' : ''}
      ${enableReveal ? 'uniform float uRevealPlaneOffset;' : ''}
      uniform vec2 uResolution;
      uniform float uSeamA;
      ${enableIntroReveal ? 'uniform float uIntroSeam;' : ''}
      ${enableShatterReveal ? 'uniform float uReveal;' : ''}
      ${enableShatterReveal ? 'uniform float uShatterFreq;' : ''}
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vWorld;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n) * 43758.5453); }
      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise2d(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      ${screenEdgeNoiseGlsl}
      ${opticalPhysicsGlsl}

      void main() {
        ${enableReveal ? 'if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;' : ''}
        float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.016);
        ${enableIntroReveal ? 'if (_sd > uIntroSeam) discard;' : ''}
        if (_sd < uSeamA) discard;
        ${
          enableShatterReveal
            ? /* glsl */ `
        // 碎化揭露：本體以 3D cell（碎片）為單位、依 uReveal 逐格成形，
        // cell 隨機相位越大越晚出現 → 讀起來像本體由碎片拼成而非平滑淡入。
        vec3 _scell = floor(vWorld * uShatterFreq);
        float _cphase = fract(sin(dot(_scell, vec3(27.17, 61.31, 113.7))) * 43758.5453);
        float _rev = uReveal * 1.12;
        float _cellReveal = smoothstep(_cphase - 0.10, _cphase + 0.03, _rev);
        if (_cellReveal <= 0.004) discard;
        float _cellEdge = (1.0 - smoothstep(0.0, 0.28, _rev - _cphase)) * step(0.004, _cellReveal);
        `
            : ''
        }
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        vec3 colorA = toLinearColor(uColorA);
        vec3 colorB = toLinearColor(uColorB);
        vec3 colorC = toLinearColor(uColorC);
        vec3 seamHot = toLinearColor(vec3(1.0, 0.86, 0.6));
        vec3 dispersionBias = vec3(0.016, 0.0, 0.0);
        float fresR = schlickFresnel(clamp(abs(dot(normalize(N + dispersionBias), V)), 0.0, 1.0), 1.5);
        float fresG = schlickFresnel(clamp(abs(dot(N, V)), 0.0, 1.0), 1.5);
        float fresB = schlickFresnel(clamp(abs(dot(normalize(N - dispersionBias), V)), 0.0, 1.0), 1.5);
        float fres = smoothstep(0.04, 0.58, fresG);
        vec3 spectralFresnel = vec3(fresR, fresG, fresB);
        float edgePrism = smoothstep(0.045, 0.34, fresG);
        // 所有投影色在 linear space 混合，輸出時再回 sRGB。
        vec3 spectralGradient = mix(colorA, colorB, smoothstep(0.04, 0.32, fresG));
        spectralGradient = mix(spectralGradient, colorC, pow(edgePrism, 2.2));
        vec3 spectralColor = spectralGradient * spectralFresnel;
        spectralColor += toLinearColor(vec3(fresR * 0.22, fresG * 0.035, fresB * 0.32)) * edgePrism;

        vec3 L = normalize(vec3(0.55, 0.8, 0.6));
        float diff = max(dot(N, L), 0.0);
        float wrap = diff * 0.5 + 0.5;
        vec3 Hh = normalize(L + V);
        float spec = pow(max(dot(N, Hh), 0.0), 42.0);
        float softHalo = pow(fres, 1.55) * 0.14 + spec * 0.035;

        // ?餌??冽嚗楛摨?+ ??頨恍? + 鈭桅? + 擃?
        vec3 col = colorA * 0.16;
        col += colorB * wrap * 0.14;
        col += colorB * fres * 0.45;
        col += spectralGradient * pow(fres, 5.0) * 0.38;
        col += spectralColor * edgePrism * 0.16;
        col += colorC * spec * 0.18;
        col += mix(colorB, colorC, 0.42) * softHalo;

        float scan = 0.5 + 0.5 * sin(vWorld.y * 55.0 - uTime * 3.5);
        col += colorB * scan * 0.008;
        // 類似骨幹的體積感：正面厚度光 + 側緣高光分離，讓 DNA 管線不只是一層發光線。
        float bodyFacing = pow(clamp(abs(dot(N, V)), 0.0, 1.0), 0.72);
        float sideRim = pow(clamp(1.0 - abs(dot(N, V)), 0.0, 1.0), 2.8);
        float tubeBand = 0.5 + 0.5 * sin(vUv.x * 6.28318);
        float surfaceNoise =
          screenEdgeFbm(vWorld.xy * 4.6 + vec2(uTime * 0.015, -uTime * 0.01)) * 0.46 +
          screenEdgeFbm(vWorld.yz * 6.8 + vec2(9.3, 2.1)) * 0.34 +
          screenEdgeFbm(vWorld.zx * 10.2 + vec2(3.7, 11.4)) * 0.20;
        float pore = smoothstep(0.58, 0.9, surfaceNoise);
        float vein = pow(abs(sin((vWorld.x * 5.2 + vWorld.y * 2.7 - vWorld.z * 3.8))), 18.0);
        float subsurface = smoothstep(0.16, 0.82, bodyFacing) * (0.72 + surfaceNoise * 0.36);
        col += colorA * bodyFacing * 0.18;
        col += colorC * sideRim * (0.095 + tubeBand * 0.032);
        col *= 0.9 + surfaceNoise * 0.22;
        col += colorB * subsurface * 0.16;
        col += colorC * pore * 0.052;
        col += colorB * vein * pore * 0.046;

        float _microFlicker = 0.84 + 0.16 * sin(uTime * 7.4 + _cphase * 24.0);
        float _steadyFlicker = mix(1.0, _microFlicker, smoothstep(0.72, 0.88, uReveal));
        col *= _steadyFlicker;
        col *= uBoost;

        float a = uAlpha + bodyFacing * 0.08 + fres * 0.16;
        a += softHalo * 0.055;
        a *= mix(1.0, 0.92 + 0.08 * sin(uTime * 6.6 + _cphase * 21.0), smoothstep(0.72, 0.88, uReveal));

        ${
          enableIntroReveal
            ? /* glsl */ `
        float introEdge = 1.0 - smoothstep(0.0, 0.16, uIntroSeam - _sd);
        col += colorC * introEdge * 0.58;
        col += seamHot * pow(introEdge, 2.2) * 0.22;
        a += introEdge * 0.18;
        `
            : ''
        }

        // ??湛??澆?皞嗉圾?嚗撟曆?瘛勗漲韏瑚? ??蝡???
        float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
        col += colorC * exitEdge * 0.58;
        col += seamHot * pow(exitEdge, 2.2) * 0.22;
        a += exitEdge * 0.18;

        ${
          enableShatterReveal
            ? /* glsl */ `
        col += colorC * _cellEdge * 0.85;
        a = a * _cellReveal + _cellEdge * 0.18;
        `
            : ''
        }

        gl_FragColor = vec4(toSrgbColor(col), clamp(a * uOpacityMul, 0.0, 0.9));
      }
    `
  })
}

const group = new THREE.Group()
const disposables: { dispose(): void }[] = []

function makeInitialLogoBodyGeometry() {
  const radius = 1.5
  const halfT = 0.17
  const fillet = 0.12
  const segments = 14
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0, halfT),
    new THREE.Vector2(radius - fillet, halfT)
  ]

  for (let i = 1; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2)
    profile.push(
      new THREE.Vector2(
        radius - fillet + Math.sin(a) * fillet,
        halfT - fillet + Math.cos(a) * fillet
      )
    )
  }
  profile.push(new THREE.Vector2(radius, -halfT + fillet))
  for (let i = 1; i <= segments; i++) {
    const a = (i / segments) * (Math.PI / 2)
    profile.push(
      new THREE.Vector2(
        radius - fillet + Math.cos(a) * fillet,
        -halfT + fillet - Math.sin(a) * fillet
      )
    )
  }
  profile.push(new THREE.Vector2(0, -halfT))

  return new THREE.LatheGeometry(profile, 256)
}

const LOGO_KEY = {
  lumLo: 0.76,
  lumHi: 0.96,
  satLo: 0.1,
  satHi: 0.24,
  maxBgAlphaLoss: 0.9
}

function keyOutLogoBackground(img: HTMLImageElement) {
  const cvs = document.createElement('canvas')
  cvs.width = img.naturalWidth || 512
  cvs.height = img.naturalHeight || 512
  const ctx = cvs.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const id = ctx.getImageData(0, 0, cvs.width, cvs.height)
  const d = id.data

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255
    const g = d[i + 1] / 255
    const b = d[i + 2] / 255
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    const sat = mx > 1e-4 ? (mx - mn) / mx : 0
    const bright = THREE.MathUtils.smoothstep(lum, LOGO_KEY.lumLo, LOGO_KEY.lumHi)
    const desat = 1 - THREE.MathUtils.smoothstep(sat, LOGO_KEY.satLo, LOGO_KEY.satHi)
    const bgness = bright * desat
    d[i + 3] = Math.round(d[i + 3] * (1 - bgness * LOGO_KEY.maxBgAlphaLoss))
  }

  ctx.putImageData(id, 0, 0)
  return cvs
}

const geckoMat = makeHologram(
  0.3,
  1.22,
  {
    a: '#df5a1e',
    b: '#ff7c22',
    c: '#ffad52'
  },
  false,
  false,
  true
)
geckoMat.blending = THREE.NormalBlending
geckoMat.depthWrite = false
geckoMat.depthTest = false
const geckoAssemblyPointsMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uIntroReveal: { value: 0 },
    uAlpha: { value: 0 },
    uPointSize: { value: 0.92 },
    uScatter: { value: 392.0 },
    uColorA: { value: new THREE.Color('#ff6f22') },
    uColorB: { value: new THREE.Color('#f89545') },
    uColorC: { value: new THREE.Color('#ffb86f') },
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA
  },
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    attribute vec3 aCloudPos;
    attribute vec3 aCorePos;
    uniform float uTime;
    uniform float uIntroReveal;
    uniform float uPointSize;
    uniform float uScatter;
    varying float vSeed;
    varying float vShellBlend;
    varying float vAssembly;
    varying float vCenterFlash;
    varying float vShardMask;

    float hash31(vec3 p) {
      return fract(sin(dot(p, vec3(17.13, 71.91, 113.37))) * 43758.5453123);
    }

    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);
      return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z) * 2.0 - 1.0;
    }

    void main() {
      float converge = smoothstep(0.01, 0.56, uIntroReveal);
      float assembly = smoothstep(0.42, 1.0, uIntroReveal);
      float shellBlend = smoothstep(0.86, 1.0, uIntroReveal);
      float centerFlash = (1.0 - smoothstep(0.0, 0.12, abs(uIntroReveal - 0.32))) * 0.32;
      vec3 noiseVec = vec3(
        noise3(position * 0.52 + vec3(0.0, uTime * 0.05, 0.0)),
        noise3(position * 0.52 + vec3(11.7, 1.0, 3.1)),
        noise3(position * 0.52 + vec3(5.2, 2.0, 17.4))
      );
      // 第一段：從守宮外圍 360 度球殼往中心收束。
      vec3 outerPos = aCloudPos + noiseVec * uScatter * 0.034 * (1.0 - converge);
      vec3 coreDir = normalize(noiseVec + vec3(0.001));
      float coreRadius = (0.22 + hash31(position * 2.91) * 0.78) * 0.085;
      vec3 corePos = aCorePos + coreDir * coreRadius * (1.0 - assembly);
      vec3 gatheredPos = mix(outerPos, corePos, converge);
      // 第二段：由中心團塊碎裂式噴散到守宮表面，而不是整團平滑放大。
      float pSeed = hash31(position * 3.7);
      float localAssembly = smoothstep(0.3 + pSeed * 0.34, 0.9, uIntroReveal);
      vec3 burstDir = normalize(position - aCorePos + noiseVec * 0.45);
      float shardMask = hash31(position * 7.31 + vec3(9.3, 2.1, 5.7));
      vec3 shardJitter =
        (burstDir * (0.7 + shardMask * 0.8) + noiseVec * 0.9) *
        sin(localAssembly * 3.14159265) *
        uScatter *
        0.016;
      vec3 currentPos = mix(gatheredPos, position, localAssembly) + shardJitter;
      vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
      vSeed = hash31(position * 1.73);
      vShellBlend = shellBlend;
      vAssembly = localAssembly;
      vCenterFlash = centerFlash;
      vShardMask = shardMask;
      gl_PointSize =
        uPointSize *
        (0.78 + vSeed * 0.88) *
        (1.0 - shellBlend * 0.28) *
        (280.0 / max(80.0, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uIntroReveal;
    uniform float uAlpha;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying float vSeed;
    varying float vShellBlend;
    varying float vAssembly;
    varying float vCenterFlash;
    varying float vShardMask;
    ${screenEdgeNoiseGlsl}
    ${opticalPhysicsGlsl}

    void main() {
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.016);
      if (_sd < uSeamA) discard;

      vec2 p = gl_PointCoord * 2.0 - 1.0;
      // 點雲維持乾淨的細小方格，讓守宮輪廓可讀，不再是模糊的碎屑光斑。
      float gridEdge = max(abs(p.x), abs(p.y));
      if (gridEdge > 0.84) discard;

      float core = 1.0 - smoothstep(0.16, 0.84, gridEdge);
      float spark = pow(core, 1.7);
      float appear = smoothstep(0.0, 0.08, uIntroReveal);
      float mergeDim = mix(1.0, 0.72, vShellBlend);
      vec3 color = mix(toLinearColor(uColorA), toLinearColor(uColorB), vSeed);
      color = mix(color, toLinearColor(uColorC), spark * 0.58);
      // 外圍點雲剛出現時最亮，收束到守宮表面時逐步退回正常亮度。
      float launchGlow = 1.0 - smoothstep(0.04, 0.78, vAssembly);
      color *= 0.78 + vAssembly * 0.22 + launchGlow * 0.58 + vCenterFlash * 0.08;
      color += toLinearColor(vec3(1.0, 0.88, 0.7)) * pow(core, 5.0) * (0.14 + launchGlow * 0.3);
      float earlyDim = mix(0.94, 1.0, vAssembly);
      float centerDim = mix(0.82, 1.0, vAssembly);
      float alpha =
        uAlpha *
        appear *
        earlyDim *
        centerDim *
        mergeDim *
        mix(1.34, 1.0, vAssembly) *
        (0.34 + spark * 0.62 + core * 0.26);
      gl_FragColor = vec4(toSrgbColor(color), clamp(alpha, 0.0, 0.96));
    }
  `
})
const dnaTubeMat = makeGlass(
  0.36,
  false,
  true,
  2.36,
  {
    a: '#ff6518',
    b: '#ff9b36',
    c: '#ffd38a'
  },
  true,
  'scene1',
  true,
  true
)
dnaTubeMat.depthWrite = true
dnaTubeMat.depthTest = true
const dnaDetailMat = makeGlass(
  0.16,
  false,
  true,
  1.5,
  {
    a: '#f26a22',
    b: '#ff8a2a',
    c: '#ffc36f'
  },
  true,
  'scene1',
  true,
  true
)
dnaDetailMat.depthWrite = true
dnaDetailMat.depthTest = true
// 次幹採低飽和淺橘色系，與亮橘主幹保留清楚層次。
const dnaAuxMat = makeGlass(
  0.3,
  true,
  true,
  1.82,
  {
    a: '#f6a85c',
    b: '#ffc98e',
    c: '#ffe5bd'
  },
  false,
  'scene1',
  true,
  true
)
dnaAuxMat.depthWrite = true
dnaAuxMat.depthTest = true
const backboneSampleMat = makeGlass(
  0.24,
  false,
  true,
  1.56,
  {
    a: '#df5a1e',
    b: '#ff7c22',
    c: '#ffad52'
  },
  true,
  'scene3',
  false,
  true,
  0.92 // alphaCap：骨幹可到 ~92% 不透明（其他玻璃材質不受影響）
)
backboneSampleMat.depthWrite = true
backboneSampleMat.depthTest = true
const initialLogoMat = new THREE.MeshPhysicalMaterial({
  color: '#e2d7cc',
  transparent: true,
  alphaTest: 0.01,
  opacity: 1,
  metalness: 0,
  roughness: 0.48,
  clearcoat: 0.46,
  clearcoatRoughness: 0.18,
  emissive: '#d8c6b9',
  emissiveIntensity: 0.0,
  envMapIntensity: 0.34,
  depthWrite: true,
  depthTest: true,
  side: THREE.DoubleSide
})
const initialLogoBodyMat = new THREE.MeshPhysicalMaterial({
  color: '#140f11',
  metalness: 0.0,
  roughness: 0.52,
  clearcoat: 0.55,
  clearcoatRoughness: 0.22,
  envMapIntensity: 0.42,
  transparent: false,
  depthWrite: true,
  depthTest: true,
  side: THREE.DoubleSide
})
disposables.push(
  geckoMat,
  geckoAssemblyPointsMat,
  dnaTubeMat,
  dnaDetailMat,
  dnaAuxMat,
  backboneSampleMat,
  initialLogoMat,
  initialLogoBodyMat
)

const initialLogoGroup = new THREE.Group()
initialLogoGroup.position.z = CFG.dna.z + 0.08
const initialLogoGeo = new THREE.CircleGeometry(1.31, 192)
const initialLogoBodyGeo = makeInitialLogoBodyGeometry()
disposables.push(initialLogoGeo, initialLogoBodyGeo)
const initialLogoBodyMesh = new THREE.Mesh(initialLogoBodyGeo, initialLogoBodyMat)
initialLogoBodyMesh.rotation.x = -Math.PI / 2
initialLogoBodyMesh.renderOrder = 4
initialLogoGroup.add(initialLogoBodyMesh)
const initialLogoMesh = new THREE.Mesh(initialLogoGeo, initialLogoMat)
initialLogoMesh.position.z = 0.182
initialLogoMesh.renderOrder = 5
initialLogoGroup.add(initialLogoMesh)
const initialLogoBackMesh = new THREE.Mesh(initialLogoGeo, initialLogoMat)
initialLogoBackMesh.position.z = -0.182
initialLogoBackMesh.rotation.y = Math.PI
initialLogoBackMesh.renderOrder = 5
initialLogoGroup.add(initialLogoBackMesh)

new THREE.ImageLoader().load(LOGO_TEXTURE_URL, (img) => {
  const texture = new THREE.CanvasTexture(keyOutLogoBackground(img))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = rendererRef?.capabilities.getMaxAnisotropy() ?? 1
  initialLogoMat.map = texture
  initialLogoMat.emissiveMap = texture
  initialLogoMat.needsUpdate = true
  disposables.push(texture)
})

// 脊髓：骨幹中心的發光核心，兼作 Scene3 光線來源（能量沿 Y 向上流動）
const spinalCordMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uSeamB: uniforms.uSeamB,
    uResolution: uniforms.uResolution,
    uColorHot: { value: new THREE.Color('#ffb15a') },
    uColorEdge: { value: new THREE.Color('#ff741f') },
    uEggReveal: uniforms.uEggReveal,
    uEggRes: uniforms.uEggRes
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
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
    uniform float uSeamB;
    uniform vec2 uResolution;
    uniform vec3 uColorHot;
    uniform vec3 uColorEdge;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    ${screenEdgeNoiseGlsl}
    void main() {
      // 終章退場 wipe（與蛋入場同一道斜向邊界、反向）。
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
      if (_sd > uSeamB) discard;
      // 穩定發光，不隨時間閃爍：中心亮、邊緣 rim 提亮。
      float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.2);
      vec3 col = mix(uColorEdge, uColorHot, 0.55 + rim * 0.45);
      float a = 0.62 + rim * 0.34;
      gl_FragColor = vec4(col * a, a);
    }
  `
})
const spinalVolumeMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uSeamB: uniforms.uSeamB,
    uResolution: uniforms.uResolution,
    uColorHot: { value: new THREE.Color('#ff9a36') },
    uColorEdge: { value: new THREE.Color('#f05e18') },
    uAlpha: { value: 0.18 },
    uEggReveal: uniforms.uEggReveal,
    uEggRes: uniforms.uEggRes
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vUv = uv;
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uSeamB;
    uniform vec2 uResolution;
    uniform vec3 uColorHot;
    uniform vec3 uColorEdge;
    uniform float uAlpha;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    ${screenEdgeNoiseGlsl}
    void main() {
      // 終章退場 wipe（與蛋入場同一道斜向邊界、反向）。
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
      if (_sd > uSeamB) discard;
      float facing = abs(dot(normalize(vN), normalize(vV)));
      float softBody = pow(clamp(facing, 0.0, 1.0), 1.35);
      float axial = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
      vec3 col = mix(uColorEdge, uColorHot, 0.68 + softBody * 0.22);
      float a = uAlpha * softBody * (0.58 + axial * 0.42);
      gl_FragColor = vec4(col * a, a);
    }
  `
})
const spineLight = new THREE.PointLight(new THREE.Color('#ff8a3d'), 0, 16, 1.5)
disposables.push(spinalCordMat, spinalVolumeMat)

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
    ${screenEdgeNoiseGlsl}
    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.016);
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
    ${screenEdgeNoiseGlsl}
    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.016);
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

const eggUniforms = {
  uFinaleReveal: { value: 0 },
  uTime: uniforms.uTime,
  // 蛋在 canvas 內的螢幕座標 wipe 揭露（0=全隱藏、1=全顯示），跟斜帶同機制。
  // 與骨幹/卡片退場共用同一個邊界（shared uniforms.uEggReveal）。
  uEggReveal: uniforms.uEggReveal,
  uEggRes: uniforms.uEggRes
}
let eggRotationY = 0

function eggHashNoiseGlsl() {
  return /* glsl */ `
    float eggHash31(vec3 p) {
      return fract(sin(dot(p, vec3(17.17, 71.71, 113.13))) * 43758.5453123);
    }

    float eggNoise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = eggHash31(i + vec3(0.0, 0.0, 0.0));
      float n100 = eggHash31(i + vec3(1.0, 0.0, 0.0));
      float n010 = eggHash31(i + vec3(0.0, 1.0, 0.0));
      float n110 = eggHash31(i + vec3(1.0, 1.0, 0.0));
      float n001 = eggHash31(i + vec3(0.0, 0.0, 1.0));
      float n101 = eggHash31(i + vec3(1.0, 0.0, 1.0));
      float n011 = eggHash31(i + vec3(0.0, 1.0, 1.0));
      float n111 = eggHash31(i + vec3(1.0, 1.0, 1.0));
      float nx00 = mix(n000, n100, f.x);
      float nx10 = mix(n010, n110, f.x);
      float nx01 = mix(n001, n101, f.x);
      float nx11 = mix(n011, n111, f.x);
      return mix(mix(nx00, nx10, f.y), mix(nx01, nx11, f.y), f.z);
    }

    float eggVoronoiF1(vec3 p) {
      vec3 cell = floor(p);
      vec3 f = fract(p);
      float best = 9.0;
      for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec3 offset = vec3(float(x), float(y), float(z));
            vec3 n = vec3(
              eggHash31(cell + offset + vec3(2.3, 5.7, 9.1)),
              eggHash31(cell + offset + vec3(11.4, 3.9, 7.2)),
              eggHash31(cell + offset + vec3(4.8, 12.6, 1.7))
            );
            vec3 r = offset + n - f;
            best = min(best, dot(r, r));
          }
        }
      }
      return sqrt(best);
    }

    float eggVoronoiEdge(vec3 p) {
      vec3 cell = floor(p);
      vec3 f = fract(p);
      float best = 9.0;
      float second = 9.0;
      for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec3 offset = vec3(float(x), float(y), float(z));
            vec3 n = vec3(
              eggHash31(cell + offset + vec3(2.3, 5.7, 9.1)),
              eggHash31(cell + offset + vec3(11.4, 3.9, 7.2)),
              eggHash31(cell + offset + vec3(4.8, 12.6, 1.7))
            );
            vec3 r = offset + n - f;
            float d = dot(r, r);
            if (d < best) {
              second = best;
              best = d;
            } else if (d < second) {
              second = d;
            }
          }
        }
      }
      return max(0.0, sqrt(second) - sqrt(best));
    }

    vec3 eggVoronoiCellCenter(vec3 p) {
      vec3 cell = floor(p);
      vec3 f = fract(p);
      float best = 9.0;
      vec3 bestCenter = vec3(0.0);
      for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
            vec3 offset = vec3(float(x), float(y), float(z));
            vec3 n = vec3(
              eggHash31(cell + offset + vec3(2.3, 5.7, 9.1)),
              eggHash31(cell + offset + vec3(11.4, 3.9, 7.2)),
              eggHash31(cell + offset + vec3(4.8, 12.6, 1.7))
            );
            vec3 candidate = offset + n;
            vec3 r = candidate - f;
            float d = dot(r, r);
            if (d < best) {
              best = d;
              bestCenter = cell + candidate;
            }
          }
        }
      }
      return bestCenter / 4.2;
    }
  `
}

const eggShellMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#eaf3ff'),
  metalness: 0,
  roughness: 0.045,
  ior: 1.5,
  thickness: 0.62,
  transmission: 0.94,
  transparent: true,
  opacity: 0,
  clearcoat: 0.45,
  clearcoatRoughness: 0.08,
  iridescence: 0.6,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [140, 460],
  envMapIntensity: 1.05, // 拉高反射，讓完整蛋殼在白背景下有清晰高光/環境影
  depthWrite: false,
  side: THREE.DoubleSide,
  attenuationColor: new THREE.Color('#8093ad'), // 由近白改為冷灰藍，讓厚處產生可見暗邊
  attenuationDistance: 1.4 // 由 16（幾乎無效）縮短到真正產生吸光
})
eggShellMat.onBeforeCompile = (shader) => {
  shader.uniforms.uFinaleReveal = eggUniforms.uFinaleReveal
  shader.uniforms.uIntroReveal = eggUniforms.uFinaleReveal
  shader.uniforms.uTime = eggUniforms.uTime
  shader.uniforms.uEggReveal = eggUniforms.uEggReveal
  shader.uniforms.uEggRes = eggUniforms.uEggRes
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    /* glsl */ `
      #include <common>
      uniform float uFinaleReveal;
      uniform float uIntroReveal;
      uniform float uTime;
      varying vec3 vEggLocalPos;
      varying float vEggBreakMask;
      varying float vEggCellF1;
      varying float vEggShatterPhase;
      ${eggHashNoiseGlsl()}
    `
  )
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    /* glsl */ `
      #include <begin_vertex>
      float eggYNormVertex = clamp(position.y / 1.05 * 0.5 + 0.5, 0.0, 1.0);
      float bottomMaskVertex = 1.0 - smoothstep(0.08, 0.72, eggYNormVertex);
      float shatterPhase = smoothstep(0.16, 0.34, uIntroReveal);
      vec3 voronoiP = position * 4.2;
      float cellF1 = eggVoronoiF1(voronoiP);

      // 破裂前保持原始蛋殼尺寸；裂縫與碎殼只在 fragment/instanced shards 階段顯現。
      vEggLocalPos = transformed;
      vEggBreakMask = bottomMaskVertex * shatterPhase;
      vEggCellF1 = cellF1;
      vEggShatterPhase = shatterPhase;
    `
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    /* glsl */ `
      #include <common>
      uniform float uFinaleReveal;
      uniform float uIntroReveal;
      uniform float uTime;
      uniform float uEggReveal;
      uniform vec2 uEggRes;
      varying vec3 vEggLocalPos;
      varying float vEggBreakMask;
      varying float vEggCellF1;
      varying float vEggShatterPhase;
      ${eggHashNoiseGlsl()}
    `
  )
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <opaque_fragment>',
    /* glsl */ `
      // 蛋揭露 wipe（跟斜帶同機制）：沿 screenD 對角掃描 + 像素抖動邊。
      // uEggReveal 0→1 時邊界完整通過畫面，蛋在前面被揭露出來。
      float _egSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _egDither = eggHash31(vec3(floor(gl_FragCoord.xy / 7.0), 3.1));
      if (_egSd > uEggReveal * 2.24 - 0.12 + _egDither * 0.085) discard;
      float eggYNorm = clamp(vEggLocalPos.y / 1.05 * 0.5 + 0.5, 0.0, 1.0);
      // 裂縫發光時序改由「轉場 wipe(uEggReveal)」驅動 → 蛋一被揭露就已有裂縫發光。
      float crackPhase = mix(0.55, 1.0, smoothstep(0.0, 0.5, uEggReveal));
      // 碎裂(破殼)時序不動：仍由 uIntroReveal 驅動。
      float breakPhase = smoothstep(0.16, 0.36, uIntroReveal);
      // 玻璃碎片邊界由底向上充能：底部最先、最亮，之後往整顆蛋擴散。
      float bottomBias = 1.0 - smoothstep(0.1, 1.05, eggYNorm);
      // crackSpread 同樣改由 wipe 驅動 → 揭露當下整顆蛋的裂縫都已可見（不只最底部）。
      float crackSpread = mix(0.5, 1.0, smoothstep(0.0, 0.5, uEggReveal));
      float edgeCharge = mix(bottomBias, 1.0, crackSpread) * crackPhase;
      float chipNoise = eggNoise3(vEggLocalPos * 6.2 + vec3(7.3, 0.0, 0.0));
      float voronoiEdge = eggVoronoiEdge(vEggLocalPos * 4.2);
      float cellSeam = 1.0 - smoothstep(0.02, 0.085, voronoiEdge);
      float cellSeamCore = 1.0 - smoothstep(0.007, 0.022, voronoiEdge);
      float cellSeamWide = 1.0 - smoothstep(0.035, 0.11, voronoiEdge);
      float shardFacet = smoothstep(0.28, 0.92, chipNoise * 0.82 + bottomBias * 0.24);
      float shardEdgeGlow = cellSeamWide * edgeCharge * mix(0.55, 1.0, shardFacet);
      float shardEdgeCore = cellSeamCore * edgeCharge;
      float shardCut = smoothstep(0.72, 0.98, breakPhase + chipNoise * 0.3 + cellSeam * 0.52 + vEggBreakMask * 0.28);
      if (breakPhase > 0.02 && shardCut > 0.56) discard;
      vec3 crackOrangeLinear = pow(vec3(1.0, 0.478, 0.0), vec3(2.2));
      vec3 crackWarmLinear = pow(vec3(1.0, 0.93, 0.84), vec3(2.2));
      vec3 crackChargeLinear = pow(vec3(1.0, 0.72, 0.38), vec3(2.2));
      // 用玻璃碎片的 cell 邊界發亮，取代人造弧形裂縫。
      // 終章 Bloom 已壓到幾乎不發光暈 → 裂縫發光可加回清楚可見的程度，
      // 亮線就是亮線、不會再被 Bloom 擴散糊成白蛋（橘 1.0、暖核 1.3）。
      outgoingLight += crackOrangeLinear * shardEdgeGlow * 1.0;
      outgoingLight += crackWarmLinear * pow(shardEdgeCore, 1.25) * 1.3;
      outgoingLight += crackChargeLinear * edgeCharge * bottomBias * cellSeamWide * 0.18;
      diffuseColor.a *= 1.0 - breakPhase * shardCut * 0.96;
      // 讓碎片邊線在玻璃上保持可見，但降低「實體化」程度：避免近白蛋殼被推到不透明
      // 而整片超過 Bloom 門檻(0.9)糊成白蛋（先前 crackSpread 底值讓此效應遍佈全蛋）。
      diffuseColor.a = max(
        diffuseColor.a,
        clamp(shardEdgeCore * 0.8 + shardEdgeGlow * 0.32, 0.0, 1.0) * (1.0 - breakPhase * shardCut)
      );
      #include <opaque_fragment>
    `
  )
}
eggShellMat.customProgramCacheKey = () => 'gencko-finale-egg-v14-shard-edge-glow'
// 胚胎改金屬材質：MeshStandard(metalness=1) + envMap 反射；保留與蛋殼同一道 wipe 揭露，
// 心跳改由 emissiveIntensity 微脈動（見迴圈）。envMap 於 initEnvMap 指定。
const embryoMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#f4722a'), // 橘色金屬（橘銅感，可調）
  metalness: 1.0,
  roughness: 0.3,
  envMapIntensity: 1.0,
  emissive: new THREE.Color('#ff5a1e'), // 心跳暖脈動用
  emissiveIntensity: 0.0,
  transparent: true, // 全息階段需要 alpha
  depthWrite: false
})
const embryoUniforms = {
  uEggReveal: eggUniforms.uEggReveal,
  uEggRes: eggUniforms.uEggRes,
  uHologram: { value: 0 }, // 0=金屬，1=菲涅爾橘色全息
  uTime: uniforms.uTime,
  uFade: { value: 1 } // 消失階段整體淡出
}
embryoMat.onBeforeCompile = (shader) => {
  shader.uniforms.uEggReveal = embryoUniforms.uEggReveal
  shader.uniforms.uEggRes = embryoUniforms.uEggRes
  shader.uniforms.uHologram = embryoUniforms.uHologram
  shader.uniforms.uTime = embryoUniforms.uTime
  shader.uniforms.uFade = embryoUniforms.uFade
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uEggReveal;
      uniform vec2 uEggRes;
      uniform float uHologram;
      uniform float uTime;
      uniform float uFade;`
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      // 與蛋殼同一道斜向 wipe 揭露。
      float _emSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _emD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_emSd > uEggReveal * 2.24 - 0.12 + _emD * 0.085) discard;`
    )
    .replace(
      '#include <opaque_fragment>',
      `// 菲涅爾橘色全息 + 電子感（掃描線 + flicker）+ 自體發光（白底也看得見）。
      float _emFres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.4);
      float _emScan = 0.5 + 0.5 * sin(gl_FragCoord.y * 1.5 - uTime * 9.0); // 掃描線（電子感）
      float _emFlick = 0.82 + 0.18 * sin(uTime * 26.0); // 微閃爍
      vec3 _emHolo = vec3(1.0, 0.42, 0.12); // 橘
      // 邊緣強光 + 全身微亮（不只細邊）+ 掃描線明暗（在白底上保有對比）。
      float _emStruct = (_emFres * 1.7 + 0.3) * mix(0.5, 1.0, _emScan) * _emFlick;
      vec3 _emGlow = _emHolo * (_emStruct * 2.6) + vec3(1.0, 0.72, 0.4) * pow(_emFres, 3.0) * 1.3;
      outgoingLight = mix(outgoingLight, _emGlow, uHologram);
      float _emAlpha = clamp(_emStruct * 1.05 + _emFres * 0.5 + 0.24, 0.0, 1.0); // 更不透明
      diffuseColor.a = mix(diffuseColor.a, _emAlpha, uHologram) * uFade;
      #include <opaque_fragment>`
    )
}
embryoMat.customProgramCacheKey = () => 'gencko-embryo-metal-holo-v1'

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
    ${screenEdgeNoiseGlsl}

    void main() {
      if (dot(vWorld, uRevealPlaneNormal) + uRevealPlaneOffset < 0.0) discard;
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
      if (_sd < uSeamA) discard;
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
const scene3GravityWellGridMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uSeamB: uniforms.uSeamB,
    uResolution: uniforms.uResolution,
    uFade: { value: 0 },
    uConverge: { value: 0 },
    uColor: { value: new THREE.Color('#ff7a00') },
    uStrength: { value: 5.4 },
    uEpsilon: { value: 0.2 },
    uCenterFadeRadius: { value: 1.05 },
    uOuterFadeRadius: { value: 13.5 },
    uGridScale: { value: 1.05 },
    uScrollVelocity: { value: 0 }
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  extensions: { derivatives: true } as unknown as THREE.ShaderMaterialParameters['extensions'],
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uStrength;
    uniform float uEpsilon;
    uniform float uScrollVelocity;
    varying vec2 vGridPos;

    void main() {
      vec3 p = position;
      vec2 center = vec2(0.0, 0.0);
      vec2 gridPos = p.xy - center;
      float r = length(gridPos);
      // uScrollVelocity 實際承載彈簧形變 x：正值=滾動衝擊後漏斗加深，負值=阻尼回彈時略微變淺。
      float springCompression = clamp(uScrollVelocity, -0.42, 2.4);
      float springEnergy = abs(springCompression);
      float depthBoost = max(0.9, 1.0 + springCompression * 0.18);
      float waveBoost = 1.0 + springEnergy * 0.34;
      float falloff = (uStrength * depthBoost) / (r + uEpsilon);
      float depth = -falloff * 1.7;

      // PlaneGeometry 經過 rotation.x = -PI/2 後，local z 會映射到 world Y；負值讓重力井維持在底部。
      p.z += depth;
      // 物理衰減波：Wave = sin(r*K - omega*t) * exp(-alpha*r)。
      // 波源附近有能量，往外以 e^(-alpha*r) 衰減，避免無限等振幅 sine 看起來像機械掃描。
      float waveAttenuation = exp(-0.16 * r) * smoothstep(0.55, 1.8, r);
      p.z += sin(r * 2.05 - uTime * 0.82) * 0.24 * waveAttenuation * waveBoost;

      vGridPos = gridPos;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uSeamB;
    uniform vec2 uResolution;
    uniform float uFade;
    uniform vec3 uColor;
    uniform float uCenterFadeRadius;
    uniform float uOuterFadeRadius;
    uniform float uGridScale;
    uniform float uConverge;
    uniform float uStrength;
    uniform float uEpsilon;
    uniform float uScrollVelocity;
    varying vec2 vGridPos;
    ${screenEdgeNoiseGlsl}
    ${opticalPhysicsGlsl}

    float drawParticle(vec2 uv, vec2 pos, float size) {
      float d = length(uv - pos);
      float halo = smoothstep(size, 0.0, d);
      float core = smoothstep(size * 0.24, 0.0, d);
      return halo * 0.42 + core * 1.25;
    }

    vec3 renderAtmosphericDust(vec2 uv, float time, float converge) {
      float pull = smoothstep(0.0, 1.25, converge);
      vec2 center = vec2(0.5);
      vec2 p1 = vec2(sin(time * 0.18) * 0.28 + 0.46, cos(time * 0.24) * 0.22 + 0.5);
      vec2 p2 = vec2(cos(time * 0.12) * 0.34 + 0.54, sin(time * 0.19) * 0.18 + 0.42);
      vec2 p3 = vec2(sin(time * 0.08) * 0.2 + 0.36, cos(time * 0.31) * 0.18 + 0.62);
      vec2 p4 = vec2(cos(time * 0.22 + 1.7) * 0.24 + 0.42, sin(time * 0.16 + 0.8) * 0.26 + 0.58);
      vec2 p5 = vec2(sin(time * 0.14 + 2.3) * 0.31 + 0.58, cos(time * 0.2 + 1.2) * 0.2 + 0.48);
      p1 = mix(p1, center, pull * 0.58);
      p2 = mix(p2, center, pull * 0.68);
      p3 = mix(p3, center, pull * 0.5);
      p4 = mix(p4, center, pull * 0.76);
      p5 = mix(p5, center, pull * 0.62);
      float sinkGlow = smoothstep(0.36, 0.0, length(uv - center)) * pull;
      vec3 dust = vec3(0.0);
      dust += drawParticle(uv, p1, 0.038) * vec3(1.0, 0.5, 0.18) * 0.52;
      dust += drawParticle(uv, p2, 0.052) * vec3(0.96, 0.3, 0.08) * 0.38;
      dust += drawParticle(uv, p3, 0.032) * vec3(1.0, 0.72, 0.4) * 0.46;
      dust += drawParticle(uv, p4, 0.044) * vec3(1.0, 0.4, 0.12) * 0.34;
      dust += drawParticle(uv, p5, 0.036) * vec3(1.0, 0.58, 0.22) * 0.42;
      dust += vec3(1.0, 0.42, 0.14) * sinkGlow * 0.18;
      return dust;
    }

    void main() {
      float sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
      float reveal = smoothstep(uSeamB + 0.08, uSeamB - 0.08, sd);
      if (reveal <= 0.001) discard;

      // 非線性的井深度在片元重算，避免三角面間的線性插值露出色塊。
      float fragmentRadius = length(vGridPos);
      float springCompression = clamp(uScrollVelocity, -0.42, 2.4);
      float depthBoost = max(0.9, 1.0 + springCompression * 0.18);
      float fragmentDepth = clamp((uStrength * depthBoost * 1.7 / (fragmentRadius + uEpsilon)) / 7.2, 0.0, 1.0);

      // 橫線固定不動；直線以中心軸為來源往左右吐出，避免整片線網突然跳位。
      float verticalCoord = abs(vGridPos.x) * uGridScale - uConverge * 3.8;
      float horizontalCoord = vGridPos.y * uGridScale;
      float verticalDeriv = max(fwidth(verticalCoord), 0.0001);
      float horizontalDeriv = max(fwidth(horizontalCoord), 0.0001);
      float verticalCell = abs(fract(verticalCoord - 0.5) - 0.5) / verticalDeriv;
      float horizontalCell = abs(fract(horizontalCoord - 0.5) - 0.5) / horizontalDeriv;
      float verticalLine = 1.0 - min(verticalCell, 1.0);
      float horizontalLine = 1.0 - min(horizontalCell, 1.0);
      float verticalSoft = 1.0 - min(verticalCell * 0.26, 1.0);
      float horizontalSoft = 1.0 - min(horizontalCell * 0.32, 1.0);
      float centerEmitter = 1.0 - smoothstep(0.0, 0.18, abs(vGridPos.x));
      float line = max(verticalLine + centerEmitter * 0.28, horizontalLine * 0.82);
      float softLine = max(verticalSoft, horizontalSoft * 0.72);

      float centerFade = smoothstep(0.12, uCenterFadeRadius + 0.55, fragmentRadius);
      float outerFade = 1.0 - smoothstep(uOuterFadeRadius * 0.72, uOuterFadeRadius, fragmentRadius);
      float radialFade = centerFade * outerFade;

      float drainGlow = smoothstep(5.8, 1.25, fragmentRadius) * centerFade * (1.0 + uConverge * 0.8);
      vec3 colorBase = toLinearColor(uColor);
      vec3 peach = toLinearColor(vec3(1.0, 0.55, 0.25));
      vec3 color = mix(colorBase, peach, fragmentDepth * 0.26);
      color += colorBase * drainGlow * 0.08;
      vec2 dustUv = gl_FragCoord.xy / uResolution;
      float screenDustMask = smoothstep(0.18, 0.34, gl_FragCoord.y / uResolution.y);
      vec3 dust = vec3(0.0);
      color += dust;

      float alpha = (line * 0.28 + softLine * 0.016) * radialFade * uFade * reveal;
      alpha += max(dust.r, max(dust.g, dust.b)) * uFade * 0.54;

      gl_FragColor = vec4(toSrgbColor(color), clamp(alpha, 0.0, 0.36));
    }
  `
})
const gravityWellLiquidMetalMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uSeamB: uniforms.uSeamB,
    uResolution: uniforms.uResolution,
    uFade: { value: 0 },
    uConverge: { value: 0 },
    uStrength: { value: 5.4 },
    uEpsilon: { value: 0.2 }
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  depthTest: true,
  blending: THREE.NormalBlending,
  extensions: { derivatives: true } as unknown as THREE.ShaderMaterialParameters['extensions'],
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uStrength;
    uniform float uEpsilon;
    uniform float uConverge;
    varying vec3 vWorld;
    varying vec2 vGridPos;

    void main() {
      vec3 p = position;
      vec2 gridPos = p.xy;
      float r = length(gridPos);
      float falloff = uStrength / (r + uEpsilon);
      float depth = -falloff * 1.7;
      float waveAttenuation = exp(-0.16 * r) * smoothstep(0.55, 1.8, r);
      float liquidWave = sin(r * 2.05 - uTime * 0.82) * 0.24 * waveAttenuation;
      // 細微高度差提供實際法線變化，讓金屬高光貼著漏斗曲面流動。
      vec2 surfaceDrift = gridPos * 0.92 + vec2(uTime * 0.075, -uTime * 0.052);
      float surfaceLarge = sin(surfaceDrift.x * 1.7 + sin(surfaceDrift.y * 1.13));
      surfaceLarge *= cos(surfaceDrift.y * 1.42 - uTime * 0.04);
      float surfaceFine = sin(surfaceDrift.x * 4.6 - surfaceDrift.y * 2.2 + uTime * 0.11) * 0.34;
      float surfaceDetail = (surfaceLarge * 0.68 + surfaceFine) * 0.018 * smoothstep(0.38, 1.1, r);
      p.z += depth + liquidWave + surfaceDetail + 0.035;

      vGridPos = gridPos;
      vec4 worldPosition = modelMatrix * vec4(p, 1.0);
      vWorld = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform float uSeamB;
    uniform vec2 uResolution;
    uniform float uFade;
    uniform float uConverge;
    uniform float uStrength;
    uniform float uEpsilon;
    varying vec3 vWorld;
    varying vec2 vGridPos;
    ${screenEdgeNoiseGlsl}
    ${opticalPhysicsGlsl}

    // 兩層慢速向量場只驅動材質讀值；座標來自漏斗本身，而不是螢幕 UV。
    float metalField(vec3 p) {
      float foldA = sin(p.x * 2.46 + p.z * 0.72 + cos(p.y * 2.08 - p.z * 0.48));
      foldA *= cos(p.y * 2.72 - p.z * 0.58 + sin(p.x * 1.34 + p.z));
      float foldB = sin(p.y * 3.58 - p.z * 0.46 + cos(p.x * 2.86 + p.z * 0.62));
      foldB *= cos(p.x * 3.16 + p.z * 0.4 + sin(p.y * 1.68 - p.z));
      return mix(foldA, foldB, 0.39);
    }

    vec2 metalFlow(vec2 p, float time) {
      float slowTime = time * 0.055;
      vec2 layerA = vec2(
        metalField(vec3(p + vec2(slowTime * 0.72, -slowTime * 0.28), slowTime)),
        metalField(vec3(p + vec2(3.8, 6.1) + vec2(-slowTime * 0.24, slowTime * 0.66), slowTime * 0.82))
      );
      vec2 layerB = vec2(
        metalField(vec3(p + layerA * 0.46 + vec2(1.6, -0.8), slowTime * 0.56)),
        metalField(vec3(p + layerA.yx * 0.54 + vec2(-2.3, 1.1), slowTime * 0.68))
      );
      return layerB;
    }

    void main() {
      // 材質半徑與深度同樣在片元重算，避免液態層出現三角切片。
      float fragmentRadius = length(vGridPos);
      float fragmentDepth = clamp((uStrength * 1.7 / (fragmentRadius + uEpsilon)) / 7.2, 0.0, 1.0);
      if (fragmentRadius > 9.6) discard;
      float sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
      float reveal = smoothstep(uSeamB + 0.08, uSeamB - 0.08, sd);
      if (reveal <= 0.001) discard;

      float edgeFade = 1.0 - smoothstep(6.4, 9.6, fragmentRadius);
      float coreFade = smoothstep(0.34, 0.96, fragmentRadius);
      float mask = edgeFade * coreFade;
      if (mask <= 0.02) discard;
      vec2 liquidCoord = vGridPos * 0.44;
      vec2 flow = metalFlow(liquidCoord, uTime);
      float flowField = 0.5 + 0.5 * metalField(vec3(liquidCoord + flow * 0.42, uTime * 0.034));
      float flowEnergy = clamp(length(flow) * 0.74, 0.0, 1.0);
      float metalVein = smoothstep(0.76, 0.94, flowField) * (0.3 + flowEnergy * 0.7);
      float liquidFlow = (flowField * 0.32 + metalVein * 0.68) * mask;

      vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
      if (!gl_FrontFacing) normal *= -1.0;
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.5);
      float specularPath = pow(max(dot(reflect(-viewDir, normal), normalize(vec3(-0.35, 0.82, 0.46))), 0.0), 18.0);
      // 鏡頭從漏斗內側掠過時，背面只保留反射邊緣；避免前後透明面把整個畫面染滿。
      float frontFace = gl_FrontFacing ? 1.0 : 0.0;
      float backFaceTransmission = 0.055 + fresnel * 0.18;
      float lensClearance = smoothstep(0.55, 2.25, length(cameraPosition - vWorld));

      vec3 iron = toLinearColor(vec3(0.035, 0.009, 0.004));
      vec3 graphite = toLinearColor(vec3(0.16, 0.034, 0.012));
      vec3 copper = toLinearColor(vec3(1.0, 0.35, 0.12));
      vec3 molten = toLinearColor(vec3(1.0, 0.67, 0.34));
      float surfaceLight = pow(max(dot(normal, normalize(vec3(-0.22, 0.56, 0.8))), 0.0), 2.4);
      vec3 color = mix(iron, graphite, 0.42 + fragmentDepth * 0.22);
      color = mix(color, copper, metalVein * 0.2 + fragmentDepth * 0.035);
      color += copper * (surfaceLight * 0.16 + fresnel * 0.12 + metalVein * 0.18);
      color += molten * specularPath * (0.26 + metalVein * 0.2) * mask;

      float alpha = (0.3 + fragmentDepth * 0.18 + liquidFlow * 0.1 + fresnel * 0.07) * mask * uFade * reveal;
      alpha *= mix(backFaceTransmission, 1.0, frontFace) * lensClearance;
      gl_FragColor = vec4(toSrgbColor(color), clamp(alpha, 0.0, 0.62));
    }
  `
})
// DNA 折回牆面向相機前移；水平段保持原位。
const DNA_WALL_FORWARD = 1.2
const gridMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uColorBase: { value: new THREE.Color('#15171c') },
    uColorLine: { value: new THREE.Color('#ef6a1e') },
    uColorGlow: { value: new THREE.Color('#b94912') },
    uReveal: { value: 0 },
    uScroll: { value: 0 },
    uResolution: uniforms.uResolution,
    uSeamA: uniforms.uSeamA,
    uWallForward: { value: DNA_WALL_FORWARD }
  },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.NormalBlending,
  extensions: { derivatives: true } as unknown as THREE.ShaderMaterialParameters['extensions'],
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uWallForward;
    varying vec3 vWorld;
    varying vec2 vUv;
    varying float vFold;

    const float FOLD_START = 4.0;
    const float FOLD_RADIUS = 13.0;
    const float PI = 3.14159265;

    void main() {
      vUv = uv;
      vec3 p = position;
      // 底部網格只加低幅度波動，讓骨幹下方地面有呼吸感，但不改整體折回輪廓。
      float waveZone = 1.0 - smoothstep(FOLD_START - 5.6, FOLD_START + 0.8, p.y);
      float waveA = sin(p.x * 0.24 + uTime * 0.74);
      float waveB = sin(p.y * 0.33 - uTime * 0.88);
      float waveC = sin((p.x + p.y) * 0.14 - uTime * 0.52);
      p.z += (waveA * 0.18 + waveB * 0.12 + waveC * 0.08) * waveZone;
      float s = p.y - FOLD_START;
      float fold = 0.0;
      if (s > 0.0) {
        float ang = min(s / FOLD_RADIUS, PI * 1.12);
        p.z = FOLD_RADIUS * (1.0 - cos(ang));
        p.y = FOLD_START + FOLD_RADIUS * sin(ang);
        p.y -= uWallForward * smoothstep(0.0, 4.0, s);
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
    uniform vec3 uColorBase;
    uniform vec3 uColorLine;
    uniform vec3 uColorGlow;
    uniform float uReveal;
    uniform float uScroll;
    uniform vec2 uResolution;
    uniform float uSeamA;
    varying vec3 vWorld;
    varying vec2 vUv;
    varying float vFold;
    ${screenEdgeNoiseGlsl}
    ${opticalPhysicsGlsl}

    float drawGridDustParticle(vec2 uv, vec2 pos, float size) {
      float d = length(uv - pos);
      float halo = smoothstep(size, 0.0, d);
      float core = smoothstep(size * 0.22, 0.0, d);
      return halo * 0.46 + core * 1.18;
    }

    vec3 renderGridAtmosphericDust(vec2 uv, float time, float scroll, float fold) {
      vec2 driftUv = uv;
      driftUv.y += scroll * 0.018;
      float turbulence = screenEdgeFbm(uv * 7.5 + vec2(time * 0.05, -time * 0.04));
      driftUv.x += sin(time * 0.08 + uv.y * 3.0) * 0.018 + (turbulence - 0.5) * 0.026;
      driftUv.y += (screenEdgeFbm(uv * 5.2 - vec2(time * 0.035, time * 0.02)) - 0.5) * 0.018;
      vec2 p1 = vec2(0.18 + sin(time * 0.13) * 0.06, 0.34 + cos(time * 0.1) * 0.08);
      vec2 p2 = vec2(0.42 + cos(time * 0.11 + 1.4) * 0.08, 0.56 + sin(time * 0.16) * 0.1);
      vec2 p3 = vec2(0.68 + sin(time * 0.09 + 2.1) * 0.07, 0.42 + cos(time * 0.14) * 0.08);
      vec2 p4 = vec2(0.82 + cos(time * 0.12 + 0.7) * 0.05, 0.7 + sin(time * 0.1 + 1.6) * 0.07);
      vec2 p5 = vec2(0.3 + sin(time * 0.07 + 3.0) * 0.08, 0.78 + cos(time * 0.13 + 2.0) * 0.06);
      float foldBoost = 0.72 + fold * 0.28;
      vec3 dust = vec3(0.0);
      dust += drawGridDustParticle(driftUv, p1, 0.042) * vec3(1.0, 0.46, 0.16) * 0.46;
      dust += drawGridDustParticle(driftUv, p2, 0.058) * vec3(0.96, 0.32, 0.08) * 0.34;
      dust += drawGridDustParticle(driftUv, p3, 0.036) * vec3(1.0, 0.64, 0.28) * 0.4;
      dust += drawGridDustParticle(driftUv, p4, 0.048) * vec3(1.0, 0.52, 0.18) * 0.3;
      dust += drawGridDustParticle(driftUv, p5, 0.04) * vec3(1.0, 0.74, 0.42) * 0.38;
      return dust * foldBoost;
    }

    void main() {
      float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.016);
      if (_sd < uSeamA) discard;

      // 隞?UV ?Ｙ?蝑??潛?嚗?蝬脫蝝啣??⊿?嚗???隞雁??潘?
      // uScroll 霈楛摨行???潛?敺?豢??孵?瘚? ???脫?
      vec2 cells = vec2(160.0, 112.0);
      vec2 uv = vUv * cells;
      uv.y += uScroll;
      vec2 gw = fwidth(uv);
      vec2 gl = abs(fract(uv - 0.5) - 0.5) / gw;
      vec2 axisLine = 1.0 - min(gl, 1.0);
      float line = max(axisLine.x, axisLine.y);
      float glowLine = 1.0 - min(min(gl.x, gl.y) * 0.28, 1.0);
      float junction = axisLine.x * axisLine.y;

      // 餈璈垢(uv.y 撠?雿?豢?敺)瘛∪嚗???蝡臭???憭?憛急遛銝)
      float depthFade = smoothstep(0.28, 0.44, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y) * 0.3);
      // 瘝踵?脫?????賡???
      float pulse = 1.0;

      vec3 colorLine = toLinearColor(uColorLine);
      vec3 colorGlow = toLinearColor(uColorGlow);
      // 能量帶沿著折疊後的網格表面前進，並與捲動方向維持同一座標系。
      float gridEnergyWave = pow(
        0.5 + 0.5 * sin(vUv.y * 22.0 + uScroll * 0.46 - uTime * 1.18),
        8.0
      );
      gridEnergyWave *= smoothstep(0.18, 0.52, vUv.y) * depthFade;
      // 導光綁定折疊後曲面的 UV；低頻扭曲讓每一道垂直能量帶不會形成平行矩形。
      float columnNoise = screenEdgeFbm(vec2(vUv.x * 7.0, vUv.y * 1.45) + vec2(uTime * 0.025, -uTime * 0.07));
      float columnWarp = screenEdgeFbm(vec2(vUv.x * 15.0, vUv.y * 2.3) + vec2(-uTime * 0.035, uTime * 0.018));
      float guide = 0.26 + 0.74 * smoothstep(0.28, 0.8, columnNoise);
      float flowPhase = fract(vUv.y * 2.6 - uTime * 0.105 + columnWarp * 0.42 + uScroll * 0.012);
      float movingCore = exp(-pow((flowPhase - 0.52) * 7.2, 2.0));
      float movingTail = exp(-pow((flowPhase - 0.24) * 3.4, 2.0)) * 0.28;
      float verticalVeil = guide * (movingCore + movingTail) * depthFade * smoothstep(0.1, 0.38, vUv.y);
      float surfaceGrain = screenEdgeFbm(vUv * vec2(22.0, 38.0) + vec2(uTime * 0.012, -uTime * 0.018));
      vec3 colorBase = toLinearColor(uColorBase);
      vec3 col = colorBase * (0.74 + surfaceGrain * 0.22);
      col += mix(colorGlow, colorLine, line) * (0.55 + 0.82 * vFold);
      col += colorLine * line * pulse * 0.06;
      // 高亮只出現在線段、交點與局部導光核心，避免整面過曝。
      col += colorGlow * glowLine * depthFade * 0.22;
      col += colorLine * junction * depthFade * 0.82;
      col += colorLine * (line * 0.64 + glowLine * 0.26) * gridEnergyWave;
      col += mix(colorGlow, colorLine, 0.72) * verticalVeil * 1.26;
      float sheen = smoothstep(0.46, 0.0, abs(fract(vUv.y * 14.0 + uScroll * 0.14) - 0.5));
      col += colorLine * sheen * 0.12 * depthFade;

      float a = 0.1 * depthFade;
      a += line * depthFade * 0.5;
      a += glowLine * depthFade * 0.05;
      a += gridEnergyWave * (line * 0.14 + glowLine * 0.04);
      a += verticalVeil * 0.16;

      // ?脣嚗擃楚?伐??∠征??????銝??撩閫?敺?reveal 銝??撠望筑?橘?
      a *= smoothstep(0.0, 0.42, uReveal);

      float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
      col += colorLine * exitEdge * 0.55;
      a += exitEdge * line * 0.24;

      gl_FragColor = vec4(toSrgbColor(col), clamp(a, 0.0, 0.9));
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
  gridMat
)

function buildGroundGrid() {
  const g = new THREE.Group()
  // 保留雙向細分以消除透視下的大三角色塊；高度維持原曲面範圍，避免折回重疊。
  const geo = new THREE.PlaneGeometry(120, 56, 180, 220)
  disposables.push(geo)
  const mesh = new THREE.Mesh(geo, gridMat)
  mesh.rotation.x = -Math.PI / 2
  // 微幅上移補齊鏡頭最上緣，不改變網格折回的原始輪廓。
  mesh.position.set(0, CFG.projector.y + 0.08, -6)
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
let embryoModelHolder: THREE.Group | null = null
// 胚胎 GLB 定位微調（可用 __hero.embryo(rx,ry,rz,scaleMul) 即時試，定案寫回這裡）。
let EMBRYO_ROT_X = 0
let EMBRYO_ROT_Y = 0
let EMBRYO_ROT_Z = 0
let EMBRYO_SCALE_MUL = 1
let loadedBackboneInner: THREE.Object3D | null = null
const geckoGroup = new THREE.Group()
const backboneAxisFixGroup = new THREE.Group()
const backboneModelAxis = new THREE.Vector3(0.0002, -0.19, 0.9818).normalize()
const worldVerticalAxis = new THREE.Vector3(0, 1, 0)
const GECKO_GROUP_Y_OFFSET = -0.32
let targetRotationY = 0
let currentRotationY = 0
let currentGridReveal = 0
let targetTimeline = 0
let currentTimeline = 0
// Scene3 卡片輸送進度：卡片完整揭露後才接管捲動；進度有上限，避免回捲時要倒退過久。
let targetCardOrbit = 0
let currentCardOrbit = 0
let cardOrbitUnlockedNow = false
let targetNextSceneProgress = 0
let currentNextSceneProgress = 0
let targetPlaceholderProgress = 0
let currentPlaceholderProgress = 0
// CSS/clip-path 每幀重算會配置陣列/物件/字串並寫 DOM；只在數值有變化時才更新（不捲動時完全跳過）
let cssLastSweep = -1
let cssLastScrollHint = -1
let cssLastLogo = -1
let cssLastUnderlayMode = -1
let cssLastIntroLogo = -1
let cssLastLogoDnaProgress = -1
let cssLastLogoSpin = Number.NaN
// 斜縫權重也要納入 cssDirty：手機網址列伸縮會改變 aspect → 權重變動，
// 若此時 sweep 沒變（滾動暫停），DOM clip 不重算就會與 canvas 斜縫脫開（沒對齊）。
let cssLastSeamWeightX = -1
let cssLastSeamWeightY = -1
let lastBottomRenderMode: 'always' | 'manual' = 'always'
let lastTouchY = 0
// 手機保底捲動：固定覆蓋層會吃掉觸控、原生捲動失效，改由 touchmove 手動驅動 window.scrollBy，
// 放開手指後以慣性衰減續捲（模擬原生 momentum）。
let lastTouchT = 0
let touchScrollVel = 0 // px/ms
let touchMomentumRaf = 0
// 手動觸控捲動力道：頁面很長，1:1 跟手要滑太多次才到終章。加倍率讓每次滑動走更遠（近似原生慣性）。
const TOUCH_SCROLL_GAIN = 1.9
const cardOrbitSpeed = 0.0006
const cardOrbitSettleEpsilon = 0.003
const nextSceneSpeed = 0.00007 // 骨幹退場+wipe 的捲動距離（還原：加距離反而讓終章更難滾到）
const nextSceneSettleEpsilon = 0.002
// 卡片只保留很小的視覺慣性；數值高於骨幹 damping，代表比骨幹更快收斂、慣性更小。
const cardOrbitDamping = 0.16
// 終章阻尼調緊：讓 wipe/蛋隨捲動貼近前進，不再落後半秒 → 捲到底就轉完（修「沒完整轉/會卡」）。
const nextSceneDamping = 0.3
const nativeScrollInputPull = 0.16
const nativeScrollCardInputPull = 0.24
const nativeScrollNextInputPull = 0.2
const cardCount = 8
const cardStep = 1.1 // 相鄰卡片的環繞相位間距（弧度）
const cardEntranceAngle = 0 // 第一張卡起始相位（正面中間）
const cardOrbitMax = cardStep * (cardCount - 1)
const wheelDeltaLimit = 90
const timelineWheelScale = 0.34
const scene01Slowdown = 0.78
const scene01SpanScale = scene01Slowdown * (wheelDeltaLimit / 60)
const scene01MotionScale = 0.1
const geckoFullHoldSpan = 1050
const scene01GridHoldSpan = 420 + geckoFullHoldSpan
const stageEpsilon = 0.001
// 原生捲動以同一個總旋轉值同步各場景；DNA 僅取其中一小段，避免每格滾輪轉得過快。
const DNA_SCROLL_ROTATION_FACTOR = 0.18
// 守宮本體 + 金字塔（投影底座）共用同一轉速，鎖在一起轉。
// 調小即整組少轉幾圈（不影響 DNA / 粒子）。調大 = 進斜帶前就轉更多圈。
const geckoPyramidSpinFactor = 0.48
// 守宮定角：成形完成時落在參考圖的 3/4 前上方視角，成形後保持固定。
// 可用 window.__hero.geckoRot(y, x, z) 即時試角，定案後把數值寫回這裡。
let GECKO_REST_ROT_Y = -1.18
let GECKO_REST_ROT_X = 0.36
let GECKO_REST_ROT_Z = -0.42
// 網格沿自身形狀往背景上方延伸方向的流速（依滾動進度驅動）。
// 負號 = 往背景（vUv.y 增大方向）流；若方向相反改正號。調大 = 流更快。
const gridFlowRate = 0.002
const scene01ExitSweep = 0.86
const introRevealMax = 1
const firstExitMax = 1
const finalEnterMax = 1
const exitBodyMax = 1
const introRevealSpan = (introRevealMax / 0.00042) * scene01SpanScale
const geckoRevealStart = introRevealSpan * 0.0
const geckoRevealSpan = introRevealSpan * 1.8
const gridRevealSpan = (introRevealMax / 0.00024) * scene01SpanScale
const gridRevealStart = 0
const scene01IntroVisualEnd = Math.max(
  gridRevealStart + gridRevealSpan,
  geckoRevealStart + geckoRevealSpan
)
const firstExitSpan = firstExitMax / 0.00058
const finalEnterSpan = finalEnterMax / 0.00058
const exitBodySpan = exitBodyMax / 0.00052
const timelineBreaks = {
  introRevealEnd: scene01IntroVisualEnd + scene01GridHoldSpan,
  firstExitEnd: scene01IntroVisualEnd + scene01GridHoldSpan + firstExitSpan,
  finalEnterEnd: scene01IntroVisualEnd + scene01GridHoldSpan + firstExitSpan + finalEnterSpan,
  finalDnaEnd:
    scene01IntroVisualEnd + scene01GridHoldSpan + firstExitSpan + finalEnterSpan + exitBodySpan
}
// Scene3 卡片接管滾輪的時間點：0=Scene3 斜帶剛開始揭露，1=斜帶完全結束。
// 如果卡片已完整揭露但還不轉，調小這個值；如果太早轉，調大。
const cardOrbitInputStartRatio = 0.68
const cardOrbitInputStart = timelineBreaks.firstExitEnd + finalEnterSpan * cardOrbitInputStartRatio
const scene3HoldTimeline = timelineBreaks.finalEnterEnd
// ── 進度條旅程正規化 ──
// 整段體驗 = timeline 段與卡片段部分重疊：
// 卡片在第一個斜帶接近離場時提早轉，但 timeline 仍繼續跑到斜帶完整離場。
// 以各自「等效滾輪距離」拼接成單一 0→1 進度，讓拖曳進度條時捲動手感線性一致。
const cardOrbitStartWheelLen = cardOrbitInputStart / timelineWheelScale
const timelineWheelLen = scene3HoldTimeline / timelineWheelScale
const cardWheelLen = cardOrbitMax / cardOrbitSpeed
const nextSceneWheelLen = 1 / nextSceneSpeed
const placeholderSceneWheelLen = nextSceneWheelLen * 1.2 // 終章蛋生命週期的捲動距離（還原）
const placeholderSceneSpeed = 1 / placeholderSceneWheelLen
const cardsEndWheelLen = cardOrbitStartWheelLen + cardWheelLen
const nextSceneEndWheelLen = cardsEndWheelLen + nextSceneWheelLen
const totalJourneyWheelLen = nextSceneEndWheelLen + placeholderSceneWheelLen
const journeySegments: { key: string; end: number }[] = [
  {
    key: 'scene01',
    end: timelineBreaks.introRevealEnd / timelineWheelScale / totalJourneyWheelLen
  },
  {
    key: 'transition',
    end: timelineBreaks.finalEnterEnd / timelineWheelScale / totalJourneyWheelLen
  },
  { key: 'scene03', end: cardOrbitStartWheelLen / totalJourneyWheelLen },
  { key: 'cards', end: cardsEndWheelLen / totalJourneyWheelLen },
  { key: 'next', end: nextSceneEndWheelLen / totalJourneyWheelLen },
  { key: 'placeholder', end: 1 }
]
let lastJourneyEmit = -1
let lastFinaleEmit = -1
let lastNextSceneEmit = -1
// 骨幹隨 Scene3 捲動沿 +Y 上移（脊椎上升）。
const BACKBONE_BASE_Y = 0
const BACKBONE_SCALE = 0.96
const BACKBONE_SCROLL_RISE = 1.7
const BACKBONE_NEXT_SCENE_RISE = 1.6
// 起始頁 DNA 必須維持原始比例，只整組等比例放大到兩側主鏈接近 Logo 盤寬度。
const DNA_LOGO_SCALE = 2.45
const DNA_LOGO_TOP_ANCHOR_Y = -(CFG.dna.height * DNA_LOGO_SCALE * 0.5)
const DNA_LOGO_SCROLL_RISE = 14.6
const DNA_LOGO_TRAVEL_SPAN =
  timelineBreaks.firstExitEnd + finalEnterSpan * ((scene01ExitSweep - 0.5) / 0.5)
const CARD_NEXT_SCENE_RISE = 4.8
// 場景定義：
// 1. Scene 01：起始只有 DNA；下滾後粒子、守宮、底座、網格才 reveal 入場
// 2. Transition 01：Scene 01 -> LOGO，整個 3D 畫布由下往斜上切離
// 3. LOGO 過橋：不獨立停留，Transition 01 結束後直接接 Transition 02
// 4. Transition 02：LOGO -> Scene 03，由下往斜上切入骨幹範例
// 5. Scene 03：僅保留 DNA 骨幹，供後續替換新骨幹內容
const revealClipPlane = new THREE.Plane(new THREE.Vector3(0.86, 0.52, 0).normalize(), -9.8)
const exitClipPlane = new THREE.Plane(new THREE.Vector3(0.2, 1, 0).normalize(), 20)

geckoGroup.position.y = CFG.gecko.y + GECKO_GROUP_Y_OFFSET
geckoGroup.position.z = CFG.gecko.z

function setBottomRenderMode(mode: 'always' | 'manual') {
  if (lastBottomRenderMode === mode) return
  lastBottomRenderMode = mode
  emit('bottom-render-mode', mode)
}

function wakeBottomRender() {
  lastBottomRenderMode = 'manual'
  setBottomRenderMode('always')
}

// 焦點/可見性/回到頁面時，強制重送 always（繞過相等判斷），避免元件的 render-mode 狀態
// 與實際 canvas 因分頁切換、視窗失焦、bfcache 還原等時機不同步，導致 onBeforeRender 未恢復、
// 捲動看起來卡住不動。同時清掉可能殘留的觸控狀態。
function forceWakeRender() {
  lastBottomRenderMode = 'manual'
  setBottomRenderMode('always')
  lastTouchY = 0
}

function onVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') forceWakeRender()
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
    scene3HoldTimeline
  )
  const wantsForward = wheelDelta > 0
  const wantsBackward = wheelDelta < 0
  const cardOrbitInputUnlocked =
    cardOrbitUnlockedNow ||
    (targetTimeline >= cardOrbitInputStart && currentTimeline >= cardOrbitInputStart - stageEpsilon)
  const cardOrbitHasTargetProgress = targetCardOrbit > cardOrbitSettleEpsilon
  const cardOrbitHasVisibleProgress = currentCardOrbit > cardOrbitSettleEpsilon
  const cardOrbitAtEnd = targetCardOrbit >= cardOrbitMax - cardOrbitSettleEpsilon
  const nextSceneAtEnd = targetNextSceneProgress >= 1 - nextSceneSettleEpsilon
  const nextSceneHasTargetProgress = targetNextSceneProgress > nextSceneSettleEpsilon
  const nextSceneHasVisibleProgress = currentNextSceneProgress > nextSceneSettleEpsilon
  const placeholderHasTargetProgress = targetPlaceholderProgress > nextSceneSettleEpsilon
  const placeholderHasVisibleProgress = currentPlaceholderProgress > nextSceneSettleEpsilon

  if (wantsBackward && cardOrbitHasTargetProgress && !cardOrbitHasVisibleProgress) {
    // 反向輸入時不要先消耗使用者滾輪去倒退尚未可見的 target buffer。
    targetCardOrbit = 0
  }

  if (wantsBackward && nextSceneHasTargetProgress && !nextSceneHasVisibleProgress) {
    targetNextSceneProgress = 0
  }

  if (wantsBackward && placeholderHasTargetProgress && !placeholderHasVisibleProgress) {
    targetPlaceholderProgress = 0
  }

  if (wantsBackward && placeholderHasVisibleProgress) {
    targetTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    targetNextSceneProgress = 1
    targetPlaceholderProgress = THREE.MathUtils.clamp(
      targetPlaceholderProgress + wheelDelta * placeholderSceneSpeed,
      0,
      1
    )
    return
  }

  if (wantsBackward && nextSceneHasVisibleProgress) {
    targetTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    targetPlaceholderProgress = 0
    targetNextSceneProgress = THREE.MathUtils.clamp(
      targetNextSceneProgress + wheelDelta * nextSceneSpeed,
      0,
      1
    )
    return
  }

  if (wantsForward && (placeholderHasTargetProgress || nextSceneAtEnd)) {
    targetTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    targetNextSceneProgress = 1
    targetPlaceholderProgress = THREE.MathUtils.clamp(
      targetPlaceholderProgress + wheelDelta * placeholderSceneSpeed,
      0,
      1
    )
    return
  }

  if (wantsForward && (nextSceneHasTargetProgress || cardOrbitAtEnd)) {
    targetTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    targetPlaceholderProgress = 0
    targetNextSceneProgress = THREE.MathUtils.clamp(
      targetNextSceneProgress + wheelDelta * nextSceneSpeed,
      0,
      1
    )
    return
  }

  if (wantsForward && cardOrbitInputUnlocked) {
    targetTimeline = nextTimeline
    targetCardOrbit = THREE.MathUtils.clamp(
      targetCardOrbit + wheelDelta * cardOrbitSpeed,
      0,
      cardOrbitMax
    )
    return
  }

  if (wantsBackward && cardOrbitHasVisibleProgress) {
    targetTimeline = scene3HoldTimeline
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
  if (document.body.classList.contains('hero-lab-active')) {
    wakeBottomRender()
    lastTouchY = 0
    return
  }
  wakeBottomRender()
  applyScrollDelta(event.deltaY)
}

function onTouchStart(event: TouchEvent) {
  wakeBottomRender()
  lastTouchY = event.touches[0]?.clientY ?? 0
  lastTouchT = performance.now()
  touchScrollVel = 0
  if (touchMomentumRaf) {
    window.cancelAnimationFrame(touchMomentumRaf)
    touchMomentumRaf = 0
  }
}

function onTouchMove(event: TouchEvent) {
  if (document.body.classList.contains('hero-lab-active')) {
    // 原生捲動在固定覆蓋層上失效 → 手動用手指位移驅動 window.scrollBy（1:1 跟手），
    // 由此觸發 scroll 事件 → 既有 native 同步把 3D 跟上。
    const y = event.touches[0]?.clientY ?? lastTouchY
    const now = performance.now()
    const dy = lastTouchY - y
    const dt = Math.max(1, now - lastTouchT)
    lastTouchY = y
    lastTouchT = now
    if (dy !== 0) {
      const move = dy * TOUCH_SCROLL_GAIN
      window.scrollBy(0, move)
      touchScrollVel = move / dt
      if (event.cancelable) event.preventDefault()
    }
    wakeBottomRender()
    return
  }
  const y = event.touches[0]?.clientY ?? lastTouchY
  const deltaY = (lastTouchY - y) * 1.8
  lastTouchY = y
  if (event.cancelable) event.preventDefault()
  wakeBottomRender()
  applyScrollDelta(deltaY)
}

function onTouchEnd() {
  if (typeof document === 'undefined') return
  if (!document.body.classList.contains('hero-lab-active')) return
  if (touchMomentumRaf) {
    window.cancelAnimationFrame(touchMomentumRaf)
    touchMomentumRaf = 0
  }
  let vel = touchScrollVel // px/ms
  if (Math.abs(vel) < 0.03) return // 太輕的觸碰不啟動慣性
  let prev = performance.now()
  const step = () => {
    const now = performance.now()
    const frameDt = Math.min(48, now - prev)
    prev = now
    window.scrollBy(0, vel * frameDt)
    wakeBottomRender()
    vel *= Math.pow(0.975, frameDt / 16) // 每 ~16ms 衰減 2.5% → 甩一下滑更遠
    if (Math.abs(vel) > 0.012) {
      touchMomentumRaf = window.requestAnimationFrame(step)
    } else {
      touchMomentumRaf = 0
    }
  }
  touchMomentumRaf = window.requestAnimationFrame(step)
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
  root.rotation.set(0, 0, 0)
  return scale
}

function seeded01(seed: number) {
  return THREE.MathUtils.euclideanModulo(Math.sin(seed) * 43758.5453123, 1)
}

const MAX_GECKO_ASSEMBLY_POINTS_PER_MESH = 8000

function createGeckoAssemblyPoints(mesh: THREE.Mesh, model: THREE.Object3D, modelScale: number) {
  const sourceGeo = mesh.geometry
  const positionAttr = sourceGeo.getAttribute('position')
  if (!positionAttr) return null

  const pointGeo = new THREE.BufferGeometry()
  // 頂點全數渲染會在匯聚中心疊成白球；固定取樣上限才能看清每個方格點。
  const pointCount = Math.min(positionAttr.count, MAX_GECKO_ASSEMBLY_POINTS_PER_MESH)
  const pointPositions = new Float32Array(pointCount * 3)
  const cloud = new Float32Array(pointCount * 3)
  const core = new Float32Array(pointCount * 3)
  const cloudRoot = new THREE.Vector3()
  const cloudWorld = new THREE.Vector3()
  const cloudLocal = new THREE.Vector3()
  const coreRoot = new THREE.Vector3(0, 0, 0)
  const coreWorld = new THREE.Vector3()
  const coreLocal = new THREE.Vector3()
  const invScale = modelScale > 1e-6 ? 1 / modelScale : 1
  coreWorld.copy(coreRoot).applyMatrix4(model.matrixWorld)
  coreLocal.copy(coreWorld)
  mesh.worldToLocal(coreLocal)
  for (let i = 0; i < pointCount; i++) {
    const sourceIndex = Math.floor((i / Math.max(1, pointCount - 1)) * (positionAttr.count - 1))
    pointPositions[i * 3] = positionAttr.getX(sourceIndex)
    pointPositions[i * 3 + 1] = positionAttr.getY(sourceIndex)
    pointPositions[i * 3 + 2] = positionAttr.getZ(sourceIndex)
    // 360° 均勻橢球殼：粒子從守宮四周各方向隨機匯聚（取代原本四邊框的「四方形」來源）。
    // polarCos 均勻於 [-1,1] → 球面均勻；azimuth 繞 Y 軸；再依場景比例壓成寬>高>淺的橢球。
    const spread = 1.0 + seeded01(i * 19.19 + 3.7) * 0.52
    const azimuth = seeded01(i * 12.9898 + 78.233) * Math.PI * 2
    const polarCos = seeded01(i * 39.3467 + 11.135) * 2 - 1
    const polarSin = Math.sqrt(Math.max(0, 1 - polarCos * polarCos))
    const shellRadius = (27.0 + seeded01(i * 73.1569 + 42.421) * 18.0) * spread
    const outerX = polarSin * Math.cos(azimuth) * shellRadius * 1.15
    const outerY = polarCos * shellRadius * 1.0
    const outerZ = polarSin * Math.sin(azimuth) * shellRadius * 0.88

    // 從畫面外四周生成，先收束到 aCorePos，再由 shader 爆發成守宮表面。
    cloudRoot.set(outerX * invScale, outerY * invScale, outerZ * invScale)
    cloudWorld.copy(cloudRoot).applyMatrix4(model.matrixWorld)
    cloudLocal.copy(cloudWorld)
    mesh.worldToLocal(cloudLocal)
    cloud[i * 3] = cloudLocal.x
    cloud[i * 3 + 1] = cloudLocal.y
    cloud[i * 3 + 2] = cloudLocal.z
    core[i * 3] = coreLocal.x
    core[i * 3 + 1] = coreLocal.y
    core[i * 3 + 2] = coreLocal.z
  }
  pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointGeo.setAttribute('aCloudPos', new THREE.BufferAttribute(cloud, 3))
  pointGeo.setAttribute('aCorePos', new THREE.BufferAttribute(core, 3))
  const points = new THREE.Points(pointGeo, geckoAssemblyPointsMat)
  points.frustumCulled = false
  points.renderOrder = 9
  disposables.push(pointGeo)
  return points
}

function loadGeckoModel() {
  const loader = new GLTFLoader()

  loader.load(MODEL_URL, (gltf) => {
    const model = gltf.scene
    const geckoMeshes: THREE.Mesh[] = []

    model.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return

      mesh.geometry.computeVertexNormals()
      disposeMaterial(mesh.material)
      mesh.material = geckoMat
      mesh.renderOrder = 8
      geckoMeshes.push(mesh)
    })

    const modelScale = normalizeModel(model)
    model.updateMatrixWorld(true)
    for (const mesh of geckoMeshes) {
      const points = createGeckoAssemblyPoints(mesh, model, modelScale)
      if (points) mesh.add(points)
    }
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
  const scale = 23.2 / maxAxis

  root.position.sub(center)
  root.scale.setScalar(scale)
  root.rotation.set(0, 0, 0)
}

// 取脊椎 glb 的脊髓線：沿模型本身的脊椎長軸分箱，再往脊椎管方向偏移。
// 不能取幾何中心，否則線會穿過椎體；脊髓應位在椎體背側的脊椎管內。
function buildSpineCenterline(model: THREE.Object3D, group: THREE.Object3D) {
  group.updateWorldMatrix(true, true)
  model.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const tmp = new THREE.Vector3()
  const BINS = 72
  const axisDir = backboneModelAxis.clone().normalize()
  const sideDir = new THREE.Vector3(1, 0, 0).projectOnPlane(axisDir).normalize()
  const canalDir = new THREE.Vector3().crossVectors(axisDir, sideDir).normalize()
  if (canalDir.dot(new THREE.Vector3(0, 1, 0)) < 0) canalDir.negate()
  const sums = Array.from({ length: BINS }, () => ({
    axis: 0,
    side: 0,
    canal: 0,
    canalMax: -Infinity,
    n: 0
  }))
  const meshes: THREE.Mesh[] = []
  let minAxis = Infinity
  let maxAxis = -Infinity

  model.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    meshes.push(mesh)
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(m)
      const axisCoord = tmp.dot(axisDir)
      if (axisCoord < minAxis) minAxis = axisCoord
      if (axisCoord > maxAxis) maxAxis = axisCoord
    }
  })
  if (!Number.isFinite(minAxis) || maxAxis <= minAxis) return null

  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld)
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i).applyMatrix4(m)
      const axisCoord = tmp.dot(axisDir)
      const sideCoord = tmp.dot(sideDir)
      const canalCoord = tmp.dot(canalDir)
      const t = THREE.MathUtils.clamp((axisCoord - minAxis) / (maxAxis - minAxis), 0, 0.9999)
      const s = sums[Math.floor(t * BINS)]
      s.axis += axisCoord
      s.side += sideCoord
      s.canal += canalCoord
      s.canalMax = Math.max(s.canalMax, canalCoord)
      s.n += 1
    }
  }

  const pts = sums
    .filter((s) => s.n > 0)
    .map((s) => {
      const axisCoord = s.axis / s.n
      const sideCoord = s.side / s.n
      const avgCanal = s.canal / s.n
      const canalCoord = THREE.MathUtils.lerp(avgCanal, s.canalMax, 0.32)
      return new THREE.Vector3()
        .addScaledVector(axisDir, axisCoord)
        .addScaledVector(sideDir, sideCoord)
        .addScaledVector(canalDir, canalCoord)
    })
  if (pts.length < 2) return null

  const curve = new THREE.CatmullRomCurve3(pts)
  const volumeGeo = new THREE.TubeGeometry(curve, Math.max(32, pts.length * 2), 0.12, 12, false)
  const geo = new THREE.TubeGeometry(curve, Math.max(32, pts.length * 2), 0.045, 8, false)
  disposables.push(volumeGeo, geo)
  const g = new THREE.Group()
  const volume = new THREE.Mesh(volumeGeo, spinalVolumeMat)
  volume.renderOrder = 1
  volume.frustumCulled = false
  const line = new THREE.Mesh(geo, spinalCordMat)
  line.renderOrder = 2
  line.frustumCulled = false
  g.add(volume)
  g.add(line)
  return g
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

    // 脊髓：沿脊椎中心線的一條細發光線，曲度貼合骨幹本身。
    const inner = buildSpineCenterline(model, backboneAxisFixGroup)
    if (inner) {
      backboneAxisFixGroup.add(inner)
      loadedBackboneInner = inner
    }
  })
}

const { height: H, radius: R, turns: TURNS, segments: SEG } = CFG.dna
const DNA_SIDE_EXIT_PHASE = -TURNS * Math.PI * 2

interface DnaAuxStrandSpec {
  mainOffset: number
  tubeRadius: number
  phase: number
  wrapTurns: number
  orbitRadius: number
  radiusWave: number
}

function mainHelixCurve(offset: number) {
  const pts: THREE.Vector3[] = []

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG
    const angle = t * TURNS * Math.PI * 2 + offset + DNA_SIDE_EXIT_PHASE
    pts.push(new THREE.Vector3(R * Math.cos(angle), t * H - H / 2, R * Math.sin(angle)))
  }

  return new THREE.CatmullRomCurve3(pts)
}

// 次幹繞著主幹的局部法線與副法線走，形成真正貼附式的非規則纏繞。
function auxHelixCurve(spec: DnaAuxStrandSpec) {
  const pts: THREE.Vector3[] = []
  const angularVelocity = TURNS * Math.PI * 2

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG
    const baseAngle = t * angularVelocity + spec.mainOffset + DNA_SIDE_EXIT_PHASE
    const base = new THREE.Vector3(R * Math.cos(baseAngle), t * H - H / 2, R * Math.sin(baseAngle))
    const outward = new THREE.Vector3(Math.cos(baseAngle), 0, Math.sin(baseAngle))
    const tangent = new THREE.Vector3(
      -R * angularVelocity * Math.sin(baseAngle),
      H,
      R * angularVelocity * Math.cos(baseAngle)
    ).normalize()
    const sideways = new THREE.Vector3().crossVectors(tangent, outward).normalize()
    const wrap =
      t * Math.PI * 2 * spec.wrapTurns +
      spec.phase +
      Math.sin(t * Math.PI * (spec.wrapTurns * 1.73) + spec.phase * 1.4) * 0.26
    const radius =
      spec.orbitRadius +
      Math.sin(t * Math.PI * spec.radiusWave + spec.phase * 0.8) * 0.018 +
      Math.sin(t * Math.PI * (spec.radiusWave * 2.9) + spec.phase * 2.1) * 0.009
    pts.push(
      base
        .addScaledVector(outward, Math.cos(wrap) * radius)
        .addScaledVector(sideways, Math.sin(wrap) * radius)
    )
  }

  return new THREE.CatmullRomCurve3(pts)
}

function dnaRand(seed: number) {
  return Math.abs(Math.sin(seed * 127.1) * 43758.5453) % 1
}

function dnaSurfaceCurve(offset: number, phase: number) {
  const pts: THREE.Vector3[] = []
  const surfaceRadius = R + CFG.dna.tubeRadius * 1.28

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG
    const baseAng = t * TURNS * Math.PI * 2 + offset + DNA_SIDE_EXIT_PHASE
    const ripple = Math.sin(t * Math.PI * 18 + phase * 3.7) * 0.018
    const ang = baseAng + phase * 0.22 + Math.sin(t * Math.PI * 10 + phase) * 0.018
    pts.push(
      new THREE.Vector3(
        (surfaceRadius + ripple) * Math.cos(ang),
        t * H - H / 2,
        (surfaceRadius + ripple) * Math.sin(ang)
      )
    )
  }

  return new THREE.CatmullRomCurve3(pts)
}

const dnaGroup = new THREE.Group()
dnaGroup.position.z = CFG.dna.z

const dnaMainCurves = [mainHelixCurve(0), mainHelixCurve(Math.PI)]
const dnaAuxStrandSpecs: DnaAuxStrandSpec[] = [
  {
    mainOffset: 0,
    tubeRadius: 0.017,
    phase: 0.42,
    wrapTurns: 3.2,
    orbitRadius: 0.092,
    radiusWave: 4.3
  },
  {
    mainOffset: 0,
    tubeRadius: 0.014,
    phase: 2.18,
    wrapTurns: 4.7,
    orbitRadius: 0.118,
    radiusWave: 2.6
  },
  {
    mainOffset: 0,
    tubeRadius: 0.012,
    phase: 4.86,
    wrapTurns: 5.9,
    orbitRadius: 0.078,
    radiusWave: 5.1
  },
  {
    mainOffset: Math.PI,
    tubeRadius: 0.016,
    phase: 1.14,
    wrapTurns: 3.8,
    orbitRadius: 0.104,
    radiusWave: 3.4
  },
  {
    mainOffset: Math.PI,
    tubeRadius: 0.013,
    phase: 3.72,
    wrapTurns: 5.3,
    orbitRadius: 0.082,
    radiusWave: 4.8
  },
  {
    mainOffset: Math.PI,
    tubeRadius: 0.011,
    phase: 5.44,
    wrapTurns: 6.6,
    orbitRadius: 0.126,
    radiusWave: 2.2
  }
]
const dnaAuxCurves = dnaAuxStrandSpecs.map((spec) => auxHelixCurve(spec))

for (const curve of dnaMainCurves) {
  const tube = new THREE.TubeGeometry(curve, SEG, CFG.dna.tubeRadius, 20, false)
  disposables.push(tube)
  dnaGroup.add(new THREE.Mesh(tube, dnaTubeMat))
}

for (let i = 0; i < dnaAuxCurves.length; i++) {
  const tube = new THREE.TubeGeometry(
    dnaAuxCurves[i],
    SEG,
    dnaAuxStrandSpecs[i].tubeRadius,
    10,
    false
  )
  disposables.push(tube)
  dnaGroup.add(new THREE.Mesh(tube, dnaAuxMat))
}

for (let k = 0; k < CFG.dna.rungs; k++) {
  const t = (k + 0.5) / CFG.dna.rungs
  const a = dnaMainCurves[0].getPoint(t)
  const b = dnaMainCurves[1].getPoint(t)
  const len = a.distanceTo(b)
  const rung = new THREE.CylinderGeometry(CFG.dna.rungRadius, CFG.dna.rungRadius, len, 14)
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

  // 光線來源：脊髓中心點光源（illuminate 環繞卡片等受光材質）
  spineLight.position.set(0, 0, 0)
  g.add(spineLight)

  return g
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
applyScene01ExitDiscard(ringMat)
applyScene01ExitDiscard(pyramidGlassMat)
applyScene01ExitDiscard(pyramidEdgeMat)
applyScene01ExitDiscard(plateMetalMat)

// ── Scene3 環繞卡片（8 張功能入口，環繞骨幹旋轉、滾動驅動）──
interface HeroCard {
  title: string
  color: string
  accent: string
  video: string
  to: string
  year: string
  kind: string
  description: string
}

interface HeroCardHitbox {
  card: HeroCard
  left: number
  top: number
  width: number
  height: number
}

const HERO_CARD_SAMPLE_VIDEO_URL = '/previews/hero-card-sample.mp4'

const HERO_CARDS: HeroCard[] = [
  {
    title: '飼養指南',
    color: '#d88a48',
    accent: '#6f96c7',
    to: '/care',
    year: '2026',
    kind: 'HUSBANDRY / KNOWLEDGE',
    description: '以飼養環境、營養節奏與日常觀察為核心，整理新手到進階飼主都能執行的守宮照護方法。'
  },
  {
    title: '專欄文章',
    color: '#dc7d43',
    accent: '#c45a88',
    to: '/articles',
    year: '2026',
    kind: 'EDITORIAL / FIELD NOTES',
    description:
      '收錄繁殖、基因、健康與市場觀察，將 Gencko 的實務經驗轉成可閱讀、可追溯的專題內容。'
  },
  {
    title: '信任保證',
    color: '#d69a52',
    accent: '#69aa94',
    to: '/why-gencko',
    year: '2026',
    kind: 'TRUST / STANDARD',
    description: '公開個體紀錄、飼養標準與售後原則，讓每一次選購都能建立在透明資訊與長期照護上。'
  },
  {
    title: '種群展示',
    color: '#e08b3f',
    accent: '#b8a45a',
    to: '/breeders',
    year: '2026',
    kind: 'BREEDERS / LINEAGE',
    description: '展示核心種群與繁殖方向，讓血系、表現與未來配對策略能被清楚理解。'
  },
  {
    title: '選購守宮',
    color: '#d87546',
    accent: '#9a677f',
    to: '/shop',
    year: '2026',
    kind: 'SHOP / CURATION',
    description: '用個體狀態、基因表現與飼養門檻作為選購依據，協助飼主找到合適而健康的守宮。'
  },
  {
    title: '基因圖鑑',
    color: '#da8446',
    accent: '#7f9fd0',
    to: '/genes',
    year: '2026',
    kind: 'GENETICS / INDEX',
    description: '整理常見基因、表現差異與判讀線索，讓基因名不只是標籤，而是可理解的資訊系統。'
  },
  {
    title: '基因計算',
    color: '#dd7d3f',
    accent: '#c9688d',
    to: '/calculator',
    year: '2026',
    kind: 'TOOLS / CALCULATION',
    description: '以配對條件推算可能結果，協助繁殖規劃前先看見風險、機率與組合方向。'
  },
  {
    title: '特寵醫院',
    color: '#d8954d',
    accent: '#72a996',
    to: '/hospital',
    year: '2026',
    kind: 'VET / SUPPORT MAP',
    description: '整理可看診特寵的醫院資訊，讓飼主在需要時能更快找到合適的醫療支援。'
  }
].map((card) => ({ ...card, video: HERO_CARD_SAMPLE_VIDEO_URL }))
const CARD_W = 2.6
const CARD_H = 1.7
const CARD_THICKNESS = 0.06
const CARD_RADIUS = 0.08
const CARD_TITLE_DEPTH_LAYERS = 4
const CARD_TITLE_DEPTH_STEP = 0.003
const CARD_TITLE_FLOAT_Z = 0.055
// 環繞軸心：卡片固定半徑繞脊椎 Y 軸公轉，初始為「第一張正中、其餘依序在右下」。
const cardRingRadius = 2.9 // 距軸心半徑
const cardRingCenterZ = 1.1 // 環繞中心（對齊脊椎軸）
const cardRingY = 0.08 // 第一張正面時基準高度
const cardVerticalSlope = 0.48 // 相位每推進 1 rad 時沿 Y 軸抬升距離
const heroCardsGroup = new THREE.Group()
const cardPreviewVideo = typeof document !== 'undefined' ? document.createElement('video') : null
const cardPreviewTexture = cardPreviewVideo
  ? new THREE.VideoTexture(cardPreviewVideo)
  : new THREE.Texture()

if (cardPreviewVideo) {
  cardPreviewVideo.src = HERO_CARD_SAMPLE_VIDEO_URL
  cardPreviewVideo.muted = true
  cardPreviewVideo.loop = true
  cardPreviewVideo.playsInline = true
  cardPreviewVideo.preload = 'auto'
  cardPreviewVideo.setAttribute('playsinline', '')
  cardPreviewTexture.colorSpace = THREE.SRGBColorSpace
  cardPreviewTexture.minFilter = THREE.LinearFilter
  cardPreviewTexture.magFilter = THREE.LinearFilter
}
disposables.push(cardPreviewTexture)

interface HeroCardItem {
  index: number
  pivot: THREE.Group
  holder: THREE.Group
  coreMesh: THREE.Mesh
  coreMat: THREE.ShaderMaterial
  titleMat: THREE.ShaderMaterial
  titleMats: THREE.ShaderMaterial[]
  to: string
  front: number
  hoverScale: number
  card: HeroCard
}
const heroCardItems: HeroCardItem[] = []
const heroCardHitMeshes: THREE.Object3D[] = []
const heroCardByMesh = new WeakMap<THREE.Object3D, HeroCardItem>()
let activeHeroCardTitle = ''
let activeHeroCardHitboxKey = ''
const cardHitboxCorners = [
  new THREE.Vector3(-CARD_W * 0.5, -CARD_H * 0.5, CARD_THICKNESS * 0.5),
  new THREE.Vector3(CARD_W * 0.5, -CARD_H * 0.5, CARD_THICKNESS * 0.5),
  new THREE.Vector3(CARD_W * 0.5, CARD_H * 0.5, CARD_THICKNESS * 0.5),
  new THREE.Vector3(-CARD_W * 0.5, CARD_H * 0.5, CARD_THICKNESS * 0.5)
]
const cardHitboxWorld = new THREE.Vector3()
const cardHitboxProjected = new THREE.Vector3()

function syncActiveHeroCard(card: HeroCard | null) {
  const nextTitle = card?.title ?? ''
  if (nextTitle === activeHeroCardTitle) return
  activeHeroCardTitle = nextTitle
  emit('card-focus', card)
}

function syncActiveHeroCardHitbox(item: HeroCardItem | null) {
  if (!item) {
    if (activeHeroCardHitboxKey) {
      activeHeroCardHitboxKey = ''
      emit('card-hitbox', null)
    }
    return
  }

  const camera = resolveCamera(tres.camera)
  if (!camera) return
  const canvas =
    rendererRef?.domElement ?? document.querySelector<HTMLCanvasElement>('.hero-canvas')
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const corner of cardHitboxCorners) {
    cardHitboxWorld.copy(corner)
    item.coreMesh.localToWorld(cardHitboxWorld)
    cardHitboxProjected.copy(cardHitboxWorld).project(camera)
    if (!Number.isFinite(cardHitboxProjected.x) || !Number.isFinite(cardHitboxProjected.y)) {
      continue
    }
    const sx = (cardHitboxProjected.x * 0.5 + 0.5) * rect.width + rect.left
    const sy = (-cardHitboxProjected.y * 0.5 + 0.5) * rect.height + rect.top
    minX = Math.min(minX, sx)
    minY = Math.min(minY, sy)
    maxX = Math.max(maxX, sx)
    maxY = Math.max(maxY, sy)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return
  const padX = Math.max(10, (maxX - minX) * 0.08)
  const padY = Math.max(10, (maxY - minY) * 0.1)
  const left = Math.round(minX + padX)
  const top = Math.round(minY + padY)
  const width = Math.round(Math.max(1, maxX - minX - padX * 2))
  const height = Math.round(Math.max(1, maxY - minY - padY * 2))
  const key = `${item.card.title}:${left}:${top}:${width}:${height}`
  if (key === activeHeroCardHitboxKey) return
  activeHeroCardHitboxKey = key
  emit('card-hitbox', { card: item.card, left, top, width, height })
}

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
      uTime: uniforms.uTime,
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
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeamB;
      uniform vec3 uColor;
      uniform vec3 uAccent;
      uniform float uAlpha;
      varying vec2 vUv;
      varying vec3 vLocal;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${screenEdgeNoiseGlsl}
      void main() {
        float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
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
      uTime: uniforms.uTime,
      uResolution: uniforms.uResolution,
      uSeamB: uniforms.uSeamB,
      uEggReveal: uniforms.uEggReveal,
      uEggRes: uniforms.uEggRes,
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
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeamB;
      uniform float uEggReveal;
      uniform vec2 uEggRes;
      uniform sampler2D uMap;
      uniform vec3 uTint;
      uniform float uAlpha;
      uniform float uChroma;
      uniform float uLayerSeed;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${screenEdgeNoiseGlsl}
      void main() {
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
        float _sd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
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
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uResolution = uniforms.uResolution
    shader.uniforms.uSeamB = uniforms.uSeamB
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      /* glsl */ `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeamB;
      ${screenEdgeNoiseGlsl}
      void main() {
        float _screenRevealSd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
        if (_screenRevealSd > uSeamB) discard;
      `
    )
  }
  mat.customProgramCacheKey = () => 'screen-reveal-discard-noise-v2'
  mat.needsUpdate = true
}

function applyScene01ExitDiscard(material: THREE.Material) {
  const mat = material as THREE.Material & {
    onBeforeCompile: (shader: { uniforms: Record<string, unknown>; fragmentShader: string }) => void
    customProgramCacheKey?: () => string
  }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uResolution = uniforms.uResolution
    shader.uniforms.uSeamA = uniforms.uSeamA
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      /* glsl */ `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeamA;
      ${screenEdgeNoiseGlsl}
      void main() {
        float _scene01ExitSd = perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014);
        if (_scene01ExitSd < uSeamA) discard;
      `
    )
  }
  mat.customProgramCacheKey = () => 'scene01-exit-discard-noise-v1'
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

function makeProjectionCardVideoMaterial(color: string, accent: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uResolution: uniforms.uResolution,
      uSeamB: uniforms.uSeamB,
      uEggReveal: uniforms.uEggReveal,
      uEggRes: uniforms.uEggRes,
      uVideo: { value: cardPreviewTexture },
      uColor: { value: new THREE.Color(color) },
      uAccent: { value: new THREE.Color(accent) }
    },
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeamB;
      uniform float uEggReveal;
      uniform vec2 uEggRes;
      uniform sampler2D uVideo;
      uniform vec3 uColor;
      uniform vec3 uAccent;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      ${screenEdgeNoiseGlsl}

      void main() {
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
        float reveal = smoothstep(uSeamB + 0.035, uSeamB - 0.01, perturbScreenD(gl_FragCoord.xy, uResolution, uTime, 0.014));
        if (reveal <= 0.001) discard;

        vec2 px = vec2(1.0 / 960.0, 1.0 / 540.0) * 8.0;
        vec3 frame = texture2D(uVideo, vUv).rgb * 0.18;
        frame += texture2D(uVideo, vUv + vec2(px.x, 0.0)).rgb * 0.13;
        frame += texture2D(uVideo, vUv - vec2(px.x, 0.0)).rgb * 0.13;
        frame += texture2D(uVideo, vUv + vec2(0.0, px.y)).rgb * 0.13;
        frame += texture2D(uVideo, vUv - vec2(0.0, px.y)).rgb * 0.13;
        frame += texture2D(uVideo, vUv + px).rgb * 0.075;
        frame += texture2D(uVideo, vUv - px).rgb * 0.075;
        frame += texture2D(uVideo, vUv + vec2(px.x, -px.y)).rgb * 0.075;
        frame += texture2D(uVideo, vUv + vec2(-px.x, px.y)).rgb * 0.075;

        float luma = dot(frame, vec3(0.299, 0.587, 0.114));
        vec3 tint = mix(uColor, uAccent, smoothstep(0.16, 0.88, vUv.y));
        frame = mix(frame, vec3(luma), 0.34);
        frame = mix(frame, tint, 0.55);
        float scan = 0.82 + 0.18 * sin(vUv.y * 320.0 + uTime * 2.4);
        float vignette = smoothstep(1.1, 0.24, length(vUv - 0.5));
        float facing = abs(dot(normalize(vNormal), normalize(vViewDir)));
        float edgeGlow = pow(1.0 - facing, 3.0);
        // 影片直接覆蓋整個有厚度的卡片；邊與側面以入射角染光，保留立體層次。
        frame *= scan * (0.42 + vignette * 0.58) * (0.52 + facing * 0.48);
        frame += mix(uColor, uAccent, 0.5) * edgeGlow * 0.46;
        gl_FragColor = vec4(frame, 1.0);
      }
    `
  })
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

    // 影片直接包覆整張有厚度的卡，寫入深度，前方卡片必定遮擋後方卡片。
    const coreMat = makeProjectionCardVideoMaterial(card.color, card.accent)
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    coreMesh.renderOrder = 20
    holder.add(coreMesh)

    // 浮空標題：多層 mesh 疊出文字厚度，不用描邊。
    const titleTex = makeCardTitleTexture(card.title)
    disposables.push(titleTex)
    const titleMats: THREE.ShaderMaterial[] = []
    let titleMat: THREE.ShaderMaterial | null = null
    const titleBaseZ = CARD_THICKNESS * 0.5 + CARD_TITLE_FLOAT_Z
    const titleSurfaceZ = CARD_THICKNESS * 0.5 + 0.006
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
      const titleLayerZ = isFront ? titleBaseZ : THREE.MathUtils.lerp(titleSurfaceZ, titleBaseZ, t)
      title.position.set(0, -CARD_H * 0.18, titleLayerZ)
      title.renderOrder = 22 + layer
      holder.add(title)
      titleMats.push(mat)
      if (isFront) titleMat = mat
    }

    pivot.add(holder)
    heroCardsGroup.add(pivot)
    const item: HeroCardItem = {
      index: i,
      pivot,
      holder,
      coreMesh,
      coreMat,
      titleMat: titleMat!,
      titleMats,
      to: card.to,
      front: 0,
      hoverScale: 1,
      card
    }
    heroCardItems.push(item)
    heroCardHitMeshes.push(coreMesh)
    heroCardByMesh.set(coreMesh, item)
  }

  heroCardsGroup.position.set(0, 0, cardRingCenterZ)
  heroCardsGroup.visible = false
}

buildHeroCards()

const EGG_BASE_RADIUS = 1.05
const EGG_Y_STRETCH = 1.35
const EGG_DISPLAY_SCALE = 0.94
// 預留心跳振幅後，胚胎外接球最高仍維持在蛋內半徑的 98% 以內。
const EMBRYO_INTERIOR_FILL = 0.972
const eggGroup = new THREE.Group()
eggGroup.position.set(0, 0.1, 2.0)
eggGroup.scale.set(EGG_DISPLAY_SCALE, EGG_Y_STRETCH * EGG_DISPLAY_SCALE, EGG_DISPLAY_SCALE)
eggGroup.visible = false

const eggShellGeo = new THREE.SphereGeometry(EGG_BASE_RADIUS, 96, 96)
const eggShellMesh = new THREE.Mesh(eggShellGeo, eggShellMat)
// 玻璃外殼必須晚於胚胎與蛋液繪製，透明化時仍維持在最外層。
eggShellMesh.renderOrder = 44
// 全程改用碎片蛋殼(eggShardMesh)呈現 → 停用光滑完整蛋殼（保留程式，改此行即可還原）。
eggShellMesh.visible = false
eggGroup.add(eggShellMesh)

// 破裂蛋殼：把球面碎裂成「無縫緊密鋪滿」的不規則三角形/四邊形殼片，每片有厚度（3D 玻璃）。
// 薄玻璃碎殼：真實透光/折射搭配極淡橘吸收色，不靠 emissive 做假亮。
const eggShardMat = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#dfe8f2'),
  emissive: new THREE.Color('#2a1004'),
  emissiveIntensity: 0.008,
  roughness: 0.055,
  metalness: 0,
  ior: 1.46,
  // 反射玻璃：拿掉 transmission(折射) → 不再進 transmission 緩衝，
  // 180 片碎殼不再逐片做昂貴折射取樣，是終章掉幀最大宗的解法。
  // 質感改由 envMap 反射 + clearcoat 高光呈現（碎片本來就適合反光）。
  transmission: 0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  envMapIntensity: 0.55, // 反射白房間 → 強度必須壓低，否則碎片反射成純白爆掉
  transparent: true,
  opacity: 0,
  depthWrite: false,
  // 單面（外向 winding 已修正）：避免厚殼片正反面 + 重疊層層堆疊成死白。
  side: THREE.FrontSide
})
const eggShardUniforms = {
  uShatter: { value: 0 },
  uEggReveal: eggUniforms.uEggReveal,
  uEggRes: eggUniforms.uEggRes
}
eggShardMat.onBeforeCompile = (shader) => {
  shader.uniforms.uShatter = eggShardUniforms.uShatter
  shader.uniforms.uEggReveal = eggShardUniforms.uEggReveal
  shader.uniforms.uEggRes = eggShardUniforms.uEggRes
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      attribute vec3 aCentroid;
      attribute vec3 aAxis;
      attribute float aSeed;
      uniform float uShatter;
      varying vec3 vShardOrig;
      vec3 shardRotate(vec3 v, vec3 k, float a) {
        float c = cos(a); float s = sin(a);
        return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
      }`
    )
    .replace(
      '#include <beginnormal_vertex>',
      `#include <beginnormal_vertex>
      objectNormal = shardRotate(objectNormal, aAxis, aSeed * 7.0 * uShatter);`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vShardOrig = position; // 原始（未飛散）局部位置 → 供 fragment 算 cell 縫發光
      vec3 shardRel = shardRotate(transformed - aCentroid, aAxis, aSeed * 7.0 * uShatter);
      vec3 shardFly = normalize(aCentroid) * uShatter * (1.3 + aSeed * 1.15);
      transformed = aCentroid + shardRel + shardFly;`
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uEggReveal;
      uniform vec2 uEggRes;
      varying vec3 vShardOrig;
      ${eggHashNoiseGlsl()}
      float eggShardHash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }`
    )
    .replace(
      '#include <opaque_fragment>',
      `float _egSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _egDither = eggShardHash21(floor(gl_FragCoord.xy / 7.0));
      if (_egSd > uEggReveal * 2.24 - 0.12 + _egDither * 0.085) discard;
      // 保留裂縫的光：碎片飛散後，用原始位置的 cell 縫在碎片邊緣續發橘光。
      float _shardVe = eggVoronoiEdge(vShardOrig * 4.2);
      float _shardSeam = 1.0 - smoothstep(0.02, 0.12, _shardVe); // 稍寬
      vec3 _shardCrackLin = pow(vec3(1.0, 0.478, 0.0), vec3(2.2));
      // 菲涅爾暗邊（加重）：白背景下透明玻璃靠「掠射角變暗 + 邊緣變不透明」才看得出輪廓。
      float _shFres = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 1.6);
      outgoingLight = mix(outgoingLight, vec3(0.05, 0.07, 0.12), _shFres * 0.95);
      diffuseColor.a = max(diffuseColor.a, _shFres * 0.9);
      // 蛋碎裂縫發光加強（放在暗邊之後 → 不被壓掉）。
      outgoingLight += _shardCrackLin * _shardSeam * 2.8;
      diffuseColor.a = max(diffuseColor.a, _shardSeam * 0.6);
      #include <opaque_fragment>`
    )
}
eggShardMat.customProgramCacheKey = () => 'gencko-egg-shard-fracture-v3-reflective-crackglow'

// 把球面碎裂成密鋪的三角/四邊形厚殼片。回傳含 aCentroid/aAxis/aSeed 的 BufferGeometry。
function buildFracturedEggShell(radius: number, thickness: number, seedCount: number) {
  const hash1 = (n: number) => Math.abs(Math.sin(n * 127.1 + 3.7) * 43758.5453) % 1
  // 1. 抖動 Fibonacci 種子方向（抖動 → 不規則碎片形狀）。
  const seeds: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < seedCount; i++) {
    const y = 1 - (2 * (i + 0.5)) / seedCount
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const t = i * golden
    const dir = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)
    dir.x += (hash1(i + 1) - 0.5) * 0.24
    dir.y += (hash1(i + 91) - 0.5) * 0.24
    dir.z += (hash1(i + 217) - 0.5) * 0.24
    dir.normalize().multiplyScalar(radius)
    seeds.push(dir)
  }
  // 2. Convex hull → 密鋪三角化球面（相鄰邊完全貼合，無縫）。
  const hull = new ConvexGeometry(seeds)
  const hp = hull.getAttribute('position')
  const triCount = Math.floor(hp.count / 3)
  // 3. 去重頂點、建三角形索引。
  const uv: THREE.Vector3[] = []
  const keyToIdx = new Map<string, number>()
  const vidx = (x: number, y: number, z: number) => {
    const k = Math.round(x * 800) + ',' + Math.round(y * 800) + ',' + Math.round(z * 800)
    let id = keyToIdx.get(k)
    if (id === undefined) {
      id = uv.length
      keyToIdx.set(k, id)
      uv.push(new THREE.Vector3(x, y, z))
    }
    return id
  }
  const tris: number[][] = []
  for (let t = 0; t < triCount; t++) {
    tris.push([
      vidx(hp.getX(t * 3), hp.getY(t * 3), hp.getZ(t * 3)),
      vidx(hp.getX(t * 3 + 1), hp.getY(t * 3 + 1), hp.getZ(t * 3 + 1)),
      vidx(hp.getX(t * 3 + 2), hp.getY(t * 3 + 2), hp.getZ(t * 3 + 2))
    ])
  }
  // 4. 邊 → 相鄰三角形。
  const ekey = (a: number, b: number) => (a < b ? a + '_' + b : b + '_' + a)
  const edgeMap = new Map<string, number[]>()
  tris.forEach((tri, ti) => {
    for (let e = 0; e < 3; e++) {
      const k = ekey(tri[e], tri[(e + 1) % 3])
      const arr = edgeMap.get(k) || []
      arr.push(ti)
      edgeMap.set(k, arr)
    }
  })
  // 5. 隨機把約一半三角形併成四邊形 → 三邊形 + 四邊形多種形狀（#2）。
  const used = new Array(tris.length).fill(false)
  const fragments: number[][] = []
  for (let ti = 0; ti < tris.length; ti++) {
    if (used[ti]) continue
    let didMerge = false
    if (hash1(ti + 500) < 0.55) {
      const tri = tris[ti]
      for (let e = 0; e < 3; e++) {
        const a = tri[e]
        const bb = tri[(e + 1) % 3]
        const c = tri[(e + 2) % 3]
        const neigh = (edgeMap.get(ekey(a, bb)) || []).find((x) => x !== ti && !used[x])
        if (neigh !== undefined) {
          const nt = tris[neigh]
          const d = nt.find((v) => v !== a && v !== bb)
          if (d !== undefined) {
            fragments.push([c, a, d, bb])
            used[ti] = true
            used[neigh] = true
            didMerge = true
          }
          break
        }
      }
    }
    if (!didMerge) {
      used[ti] = true
      fragments.push(tris[ti].slice())
    }
  }
  // 6. 每片建「有厚度稜柱」（外面 + 內面 + 側牆）+ 飛散屬性（3D 玻璃殼片）。
  const posArr: number[] = []
  const cenArr: number[] = []
  const axisArr: number[] = []
  const seedArr: number[] = []
  const N = new THREE.Vector3()
  const fragCenter = new THREE.Vector3()
  const prismCenter = new THREE.Vector3()
  const triC = new THREE.Vector3()
  const e1 = new THREE.Vector3()
  const e2 = new THREE.Vector3()
  const fn = new THREE.Vector3()
  fragments.forEach((frag, fi) => {
    const outer = frag.map((idx) => uv[idx].clone())
    fragCenter.set(0, 0, 0)
    outer.forEach((v) => fragCenter.add(v))
    fragCenter.multiplyScalar(1 / outer.length)
    N.copy(fragCenter).normalize()
    const inner = outer.map((v) => v.clone().addScaledVector(N, -thickness))
    prismCenter.set(0, 0, 0)
    outer.concat(inner).forEach((v) => prismCenter.add(v))
    prismCenter.multiplyScalar(1 / (outer.length * 2))
    const axis = new THREE.Vector3(
      hash1(fi + 11) - 0.5,
      hash1(fi + 71) - 0.5,
      hash1(fi + 131) - 0.5
    ).normalize()
    const seedVal = 0.5 + hash1(fi + 300) * 0.95
    const cx = fragCenter.x
    const cy = fragCenter.y
    const cz = fragCenter.z
    const pushTri = (A: THREE.Vector3, B: THREE.Vector3, C: THREE.Vector3) => {
      e1.subVectors(B, A)
      e2.subVectors(C, A)
      fn.crossVectors(e1, e2)
      triC
        .copy(A)
        .add(B)
        .add(C)
        .multiplyScalar(1 / 3)
      let P1 = B
      let P2 = C
      if (fn.dot(triC.sub(prismCenter)) < 0) {
        P1 = C
        P2 = B
      }
      for (const P of [A, P1, P2]) {
        posArr.push(P.x, P.y, P.z)
        cenArr.push(cx, cy, cz)
        axisArr.push(axis.x, axis.y, axis.z)
        seedArr.push(seedVal)
      }
    }
    for (let k = 1; k < outer.length - 1; k++) pushTri(outer[0], outer[k], outer[k + 1])
    for (let k = 1; k < inner.length - 1; k++) pushTri(inner[0], inner[k], inner[k + 1])
    for (let k = 0; k < outer.length; k++) {
      const k2 = (k + 1) % outer.length
      pushTri(outer[k], outer[k2], inner[k2])
      pushTri(outer[k], inner[k2], inner[k])
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
  geo.setAttribute('aCentroid', new THREE.Float32BufferAttribute(cenArr, 3))
  geo.setAttribute('aAxis', new THREE.Float32BufferAttribute(axisArr, 3))
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seedArr, 1))
  geo.computeVertexNormals()
  hull.dispose()
  return geo
}

// 提高蛋碎密度：在既有玻璃碎殼語言下直接把 seed 數加倍，讓破片更細更滿。
const eggShardGeo = buildFracturedEggShell(EGG_BASE_RADIUS * 1.015, EGG_BASE_RADIUS * 0.03, 180)
const eggShardMesh = new THREE.Mesh(eggShardGeo, eggShardMat)
eggShardMesh.renderOrder = 45
eggShardMesh.visible = false
eggShardMesh.frustumCulled = false
// 碎裂散開系統：掛入 eggGroup，破殼時啟用（#6/#9）。
eggGroup.add(eggShardMesh)

const embryoGroup = new THREE.Group()
embryoGroup.rotation.set(0.16, -0.52, -0.12)
embryoGroup.renderOrder = 41
eggGroup.add(embryoGroup)

const embryoBodyGeo = new THREE.SphereGeometry(0.34, 30, 18)
const embryoBodyMesh = new THREE.Mesh(embryoBodyGeo, embryoMat)
embryoBodyMesh.scale.set(1.08, 0.58, 0.42)
embryoBodyMesh.position.set(-0.04, -0.02, 0.02)
embryoBodyMesh.renderOrder = 41
embryoGroup.add(embryoBodyMesh)

const embryoHeadGeo = new THREE.SphereGeometry(0.18, 24, 16)
const embryoHeadMesh = new THREE.Mesh(embryoHeadGeo, embryoMat)
embryoHeadMesh.scale.set(1.0, 0.82, 0.74)
embryoHeadMesh.position.set(0.26, 0.05, 0.03)
embryoHeadMesh.renderOrder = 41
embryoGroup.add(embryoHeadMesh)

const embryoTailCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.24, -0.04, 0.0),
  new THREE.Vector3(-0.44, -0.12, -0.03),
  new THREE.Vector3(-0.44, 0.11, -0.04),
  new THREE.Vector3(-0.2, 0.18, -0.02),
  new THREE.Vector3(0.02, 0.1, 0.0)
])
const embryoTailGeo = new THREE.TubeGeometry(embryoTailCurve, 44, 0.036, 8, false)
const embryoTailMesh = new THREE.Mesh(embryoTailGeo, embryoMat)
embryoTailMesh.renderOrder = 41
embryoGroup.add(embryoTailMesh)

const embryoLimbCurveA = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.08, -0.04, 0.04),
  new THREE.Vector3(0.23, -0.17, 0.03),
  new THREE.Vector3(0.34, -0.12, 0.0)
])
const embryoLimbCurveB = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.02, 0.08, 0.02),
  new THREE.Vector3(0.18, 0.19, 0.01),
  new THREE.Vector3(0.3, 0.16, -0.02)
])
const embryoLimbGeoA = new THREE.TubeGeometry(embryoLimbCurveA, 18, 0.019, 6, false)
const embryoLimbGeoB = new THREE.TubeGeometry(embryoLimbCurveB, 18, 0.017, 6, false)
const embryoLimbMeshA = new THREE.Mesh(embryoLimbGeoA, embryoMat)
const embryoLimbMeshB = new THREE.Mesh(embryoLimbGeoB, embryoMat)
embryoLimbMeshA.renderOrder = 41
embryoLimbMeshB.renderOrder = 41
embryoGroup.add(embryoLimbMeshA)
embryoGroup.add(embryoLimbMeshB)

// 程序化胚胎（球體/管線拼的）保留為 GLB 載入失敗時的 fallback；載到守宮胚胎 GLB 後隱藏。
const proceduralEmbryoMeshes = [
  embryoBodyMesh,
  embryoHeadMesh,
  embryoTailMesh,
  embryoLimbMeshA,
  embryoLimbMeshB
]

// #3 守宮胚胎 GLB：套用 embryoMat（半透明發光 + 同一道 wipe + 心跳），置入蛋內。
function getObjectMaxRadius(root: THREE.Object3D) {
  root.updateMatrixWorld(true)
  const point = new THREE.Vector3()
  let maxRadiusSq = 0
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!positions) return
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld)
      maxRadiusSq = Math.max(maxRadiusSq, point.lengthSq())
    }
  })
  return Math.sqrt(maxRadiusSq) || 1
}

function loadEmbryoModel() {
  const loader = new GLTFLoader()
  loader.load(EMBRYO_MODEL_URL, (gltf) => {
    const model = gltf.scene
    model.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.computeVertexNormals()
      disposeMaterial(mesh.material)
      mesh.material = embryoMat
      mesh.renderOrder = 41
    })
    // 置中後以胚胎外接球計算可容納尺寸。
    const box = new THREE.Box3().setFromObject(model)
    const center = new THREE.Vector3()
    box.getCenter(center)
    model.position.sub(center)

    const holder = new THREE.Group()
    holder.add(model)
    holder.rotation.set(EMBRYO_ROT_X, EMBRYO_ROT_Y, EMBRYO_ROT_Z)
    // 用旋轉後每個實際頂點的最大半徑做精準 fit，避免外接球過度保守造成胚胎偏小。
    const maxRadius = getObjectMaxRadius(holder)
    const baseScale = (EGG_BASE_RADIUS * EMBRYO_INTERIOR_FILL) / maxRadius
    holder.userData.baseScale = baseScale
    holder.scale.setScalar(baseScale * EMBRYO_SCALE_MUL)
    embryoModelHolder = holder
    embryoGroup.add(holder)
    // GLB 這才進場景 → 補一輪預熱，讓金屬胚胎 shader 也提前編譯（否則轉場首見時卡頓）。
    if (envDone) finalePrewarmFrames = 0
    // GLB 成功 → 隱藏程序化 fallback。
    for (const m of proceduralEmbryoMeshes) m.visible = false
  })
}
loadEmbryoModel()

const heartLight = new THREE.PointLight('#ff8a3d', 0, 4.2)
heartLight.position.set(0, 0, 0.12)
eggGroup.add(heartLight)

// 終章場景背景：全螢幕 quad，用與蛋同一道 wipe 揭露、排在骨幹之上蛋之下 →
// 背景跟蛋一起被揭露、蓋住骨幹（蛋不再是浮在骨幹前面）。
const finaleBackdropGeo = new THREE.PlaneGeometry(2, 2)
const finaleBackdropMat = new THREE.ShaderMaterial({
  uniforms: {
    uEggReveal: eggUniforms.uEggReveal,
    uEggRes: eggUniforms.uEggRes,
    uOpacity: { value: 0 },
    uOccludeBackbone: { value: 0 }
  },
  transparent: false,
  depthWrite: false,
  depthTest: false,
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.9999, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec2 uEggRes;
    uniform float uEggReveal;
    uniform float uOpacity;
    uniform float uOccludeBackbone;
    varying vec2 vUv;
    void main() {
      float sd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float dither = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      float boundary = uEggReveal * 2.24 - 0.12 + dither * 0.085;
      if (uOccludeBackbone > 0.5 && sd > boundary) {
        gl_FragColor = vec4(vec3(0.025, 0.028, 0.034), 1.0);
        return;
      }
      // 格狀遮罩仍負責蛋的揭露；一旦進入終章，底層先完整遮住骨幹。
      if (uOccludeBackbone < 0.5 && sd > boundary) discard;
      // ===== 暖調孵化室：一點透視房間（地板 + 左右牆 + 後牆 + 天花）=====
      vec2 uv = vUv;
      vec2 vp = vec2(0.5, 0.52);       // 消失點（約在蛋的位置）
      vec2 d = uv - vp;
      vec2 halfBack = vec2(0.17, 0.15); // 後牆(內矩形)半尺寸
      float rSlope = halfBack.y / halfBack.x; // 牆/地板分界斜率

      bool inBack = abs(d.x) < halfBack.x && abs(d.y) < halfBack.y;
      bool vertical = abs(d.y) > rSlope * abs(d.x); // true=地板/天花, false=左右牆

      // 各面暖色基調
      vec3 backCol = vec3(0.60, 0.50, 0.40);
      vec3 floorN = vec3(0.66, 0.50, 0.36);  // 地板近端
      vec3 floorF = vec3(0.50, 0.38, 0.28);  // 地板遠端(近消失點)
      vec3 ceilCol = vec3(0.30, 0.25, 0.21); // 天花偏暗
      vec3 wallL = vec3(0.50, 0.41, 0.33);   // 左牆
      vec3 wallR = vec3(0.57, 0.47, 0.38);   // 右牆(光偏右，略亮)

      // 深度：0=近消失點, 1=近畫面邊
      float depth = clamp(length(d / vec2(0.55, 0.55)), 0.0, 1.0);

      vec3 room;
      if (inBack) {
        room = backCol;
      } else if (vertical && d.y < 0.0) {
        room = mix(floorF, floorN, depth);        // 地板
      } else if (vertical) {
        room = ceilCol;                            // 天花
      } else if (d.x > 0.0) {
        room = mix(wallR * 0.78, wallR, depth);    // 右牆
      } else {
        room = mix(wallL * 0.78, wallL, depth);    // 左牆
      }

      // 面接縫柔和暗線（沿消失點放射）
      float seamWF = abs(rSlope * abs(d.x) - abs(d.y)) / max(1e-3, length(d));
      room *= mix(0.72, 1.0, smoothstep(0.0, 0.05, seamWF));
      // 後牆外框接縫
      float boxEdge = min(abs(abs(d.x) - halfBack.x), abs(abs(d.y) - halfBack.y));
      float onBox = step(abs(d.x), halfBack.x + 0.02) * step(abs(d.y), halfBack.y + 0.02);
      room *= mix(0.8, 1.0, smoothstep(0.0, 0.012, boxEdge) + (1.0 - onBox));

      // 蛋下方暖聚光池
      vec2 pspot = uv - vec2(0.5, 0.46);
      float spot = smoothstep(0.5, 0.0, length(pspot * vec2(1.0, 1.4)));
      room += vec3(1.0, 0.62, 0.3) * spot * 0.4;
      // 邊角暗角
      float vig = smoothstep(1.15, 0.4, length(uv - 0.5));
      room *= mix(0.6, 1.0, vig);
      vec3 col = room;
      // 保留橘→暖灰的轉場邊界帶（亮度沿用先前調暗值 0.68）
      float edgeBand = 1.0 - smoothstep(0.0, 0.11, abs(sd - boundary));
      float edgeRamp = clamp((sd - boundary) * 7.5 + 0.5, 0.0, 1.0);
      vec3 edgeOrange = vec3(0.92, 0.42, 0.14);
      vec3 edgeGray = vec3(0.5, 0.4, 0.32);
      col += mix(edgeOrange, edgeGray, edgeRamp) * edgeBand * 0.68;
      gl_FragColor = vec4(col * clamp(uOpacity, 0.0, 1.0), 1.0);
    }
  `
})
const finaleBackdropMesh = new THREE.Mesh(finaleBackdropGeo, finaleBackdropMat)
finaleBackdropMesh.frustumCulled = false
finaleBackdropMesh.renderOrder = 28
finaleBackdropMesh.visible = false

// ===== 終章：真正的 3D 攝影棚房間（Box 內殼）取代 2D quad 假透視 =====
// 相機在 z=7、蛋在 z≈1.82；房間中心 z=1、深 17 → 相機在盒內、後牆在蛋後方。
const ROOM_W = 20
const ROOM_H = 13
const ROOM_D = 26
// 細分較高只增加少量頂點（不影響 fill 效能），讓烘焙的燈光/AO 漸層平滑。
const roomGeo = new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D, 10, 10, 10)
{
  // 頂點色一次烘焙：牆角 AO + 各面加深 + 以蛋為中心的暖光（取代動態點光）。
  const posAttr = roomGeo.attributes.position
  const colors = new Float32Array(posAttr.count * 3)
  const hw = ROOM_W / 2
  const hh = ROOM_H / 2
  const hd = ROOM_D / 2
  // 天花板燈：光源在頂面、蛋正上方附近，由上往下衰減（光感來自天花）。
  const lightX = 0
  const lightY = hh // 天花板高度(local)
  const lightZ = 0.8 // 蛋在 room-local z≈0.82，燈放其正上方
  const GLOW_RADIUS = 12 // 縮小光暈擴散範圍，避免 Bloom 爆成大白團
  const baseR = 0.94 // 純白科技實驗室基色（略冷白）
  const baseG = 0.95
  const baseB = 0.97
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i)
    const y = posAttr.getY(i)
    const z = posAttr.getZ(i)
    const ax = Math.abs(x) / hw
    const ay = Math.abs(y) / hh
    const az = Math.abs(z) / hd
    let faceTint = 1
    let edge = 1
    if (ax >= ay && ax >= az) {
      faceTint = 0.82 // 左右側牆（實驗室偏亮乾淨）
      edge = Math.min(hh - Math.abs(y), hd - Math.abs(z))
    } else if (az >= ax && az >= ay) {
      faceTint = z < 0 ? 0.85 : 0.92 // 後牆略深（前牆在相機後方看不到）
      edge = Math.min(hw - Math.abs(x), hh - Math.abs(y))
    } else {
      faceTint = y < 0 ? 0.97 : 0.88 // 地板亮、天花稍暗
      edge = Math.min(hw - Math.abs(x), hd - Math.abs(z))
    }
    let ao = Math.min(1, Math.max(0, edge / 3.0))
    ao = ao * ao * (3 - 2 * ao) // smoothstep
    ao = 0.62 + 0.38 * ao // 牆角陰影更淡（實驗室乾淨感）
    const m = faceTint * ao
    // 由天花板燈往下衰減的冷白光。
    const dlx = x - lightX
    const dly = y - lightY
    const dlz = z - lightZ
    const ldist = Math.sqrt(dlx * dlx + dly * dly + dlz * dlz)
    let glow = Math.max(0, 1 - ldist / GLOW_RADIUS)
    glow = glow * glow * 0.22 // 降低整體光暈強度
    // 天花板上看得見的燈板（頂面、靠近燈的圓形亮核）。
    let fixture = 0
    if (ay >= ax && ay >= az && y > 0) {
      const fdx = x - lightX
      const fdz = z - lightZ
      const fd = Math.sqrt(fdx * fdx + fdz * fdz)
      fixture = Math.max(0, 1 - fd / 3.5) // 縮小燈板
      fixture = fixture * fixture * 0.7 // 調暗燈板，避免爆白
    }
    colors[i * 3] = Math.min(1, baseR * m + 0.92 * glow + 1.0 * fixture)
    colors[i * 3 + 1] = Math.min(1, baseG * m + 0.96 * glow + 1.0 * fixture)
    colors[i * 3 + 2] = Math.min(1, baseB * m + 1.0 * glow + 1.0 * fixture)
  }
  roomGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}
// MeshBasic：完全不吃場景光源（最省），顏色/AO/暖光全烘焙進頂點色。
// 移除點光源後，全場每個材質（含最貴的折射碎殼）都少算一盞燈。
const roomMat = new THREE.MeshBasicMaterial({
  color: 0xffffff, // 顏色全交給頂點色
  vertexColors: true,
  side: THREE.BackSide // 只看房間內側
  // 不透明：才會進 transmission buffer，讓蛋殼碎片折射得到房間而可見。
})
// 房間與蛋共用同一道斜向 wipe，並在邊界畫出橘色轉場帶。
roomMat.onBeforeCompile = (shader) => {
  shader.uniforms.uEggReveal = eggUniforms.uEggReveal
  shader.uniforms.uEggRes = eggUniforms.uEggRes
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float uEggReveal;
      uniform vec2 uEggRes;`
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      float _sd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _dith = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      float _bnd = uEggReveal * 2.24 - 0.12 + _dith * 0.085;
      if (_sd > _bnd) discard;`
    )
    .replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float _eb = 1.0 - smoothstep(0.0, 0.11, abs(_sd - _bnd));
      float _er = clamp((_sd - _bnd) * 7.5 + 0.5, 0.0, 1.0);
      vec3 _eo = vec3(0.92, 0.42, 0.14);
      vec3 _eg = vec3(0.5, 0.4, 0.32);
      gl_FragColor.rgb += mix(_eo, _eg, _er) * _eb * 0.68;`
    )
}
roomMat.customProgramCacheKey = () => 'gencko-finale-room-wipe-v1'
const roomMesh = new THREE.Mesh(roomGeo, roomMat)
roomMesh.position.set(0, 0.2, 1.0)
roomMesh.renderOrder = 30
roomMesh.frustumCulled = false
roomMesh.visible = false

// 房間表面網格：每個平面各自貼合房間內側，不延伸到任何前景物件。
const wallGridGeo = new THREE.PlaneGeometry(ROOM_W - 0.36, ROOM_H - 0.36)
const wallGridMat = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color('#ff7638') },
    uOpacity: { value: 0.72 },
    uCells: { value: new THREE.Vector2(18, 12) },
    uTime: uniforms.uTime,
    uEggReveal: eggUniforms.uEggReveal,
    uEggRes: eggUniforms.uEggRes
  },
  transparent: true,
  depthWrite: false,
  depthTest: true,
  side: THREE.FrontSide,
  blending: THREE.AdditiveBlending,
  extensions: { derivatives: true } as unknown as THREE.ShaderMaterialParameters['extensions'],
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform vec2 uCells;
    uniform float uTime;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying vec2 vUv;
    void main() {
      float sd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      vec2 tile = floor(gl_FragCoord.xy / 7.0);
      float dith = fract(sin(dot(tile, vec2(12.9898, 78.233))) * 43758.5453);
      float boundary = uEggReveal * 2.24 - 0.12 + dith * 0.085;
      if (sd > boundary) discard;
      vec2 cells = vUv * uCells;
      vec2 lineDist = abs(fract(cells - 0.5) - 0.5) / (fwidth(cells) * 2.25);
      float line = 1.0 - min(min(lineDist.x, lineDist.y), 1.0);
      float scan = 0.78 + 0.22 * (0.5 + 0.5 * sin(uTime * 0.72 + vUv.x * 8.0 + vUv.y * 6.0));
      float alpha = line * uOpacity * scan;
      if (alpha < 0.002) discard;
      gl_FragColor = vec4(uColor * (1.02 + line * 0.78 + scan * 0.16), alpha);
    }
  `
})
const wallGridMesh = new THREE.Mesh(wallGridGeo, wallGridMat)
wallGridMesh.position.set(0, roomMesh.position.y, roomMesh.position.z - ROOM_D / 2 + 0.028)
wallGridMesh.renderOrder = 31
wallGridMesh.frustumCulled = false
wallGridMesh.visible = false
const sideGridGeo = new THREE.PlaneGeometry(ROOM_D - 0.36, ROOM_H - 0.36)
const leftWallGridMesh = new THREE.Mesh(sideGridGeo, wallGridMat)
leftWallGridMesh.position.set(
  roomMesh.position.x - ROOM_W / 2 + 0.028,
  roomMesh.position.y,
  roomMesh.position.z
)
leftWallGridMesh.rotation.y = Math.PI / 2
leftWallGridMesh.renderOrder = 31
leftWallGridMesh.frustumCulled = false
leftWallGridMesh.visible = false
const rightWallGridMesh = new THREE.Mesh(sideGridGeo, wallGridMat)
rightWallGridMesh.position.set(
  roomMesh.position.x + ROOM_W / 2 - 0.028,
  roomMesh.position.y,
  roomMesh.position.z
)
rightWallGridMesh.rotation.y = -Math.PI / 2
rightWallGridMesh.renderOrder = 31
rightWallGridMesh.frustumCulled = false
rightWallGridMesh.visible = false
const floorGridGeo = new THREE.PlaneGeometry(ROOM_W - 0.36, ROOM_D - 0.36)
const floorGridMesh = new THREE.Mesh(floorGridGeo, wallGridMat)
floorGridMesh.position.set(
  roomMesh.position.x,
  roomMesh.position.y - ROOM_H / 2 + 0.028,
  roomMesh.position.z
)
floorGridMesh.rotation.x = -Math.PI / 2
floorGridMesh.renderOrder = 31
floorGridMesh.frustumCulled = false
floorGridMesh.visible = false
const ceilingGridGeo = new THREE.PlaneGeometry(ROOM_W - 0.36, ROOM_D - 0.36)
const ceilingGridMesh = new THREE.Mesh(ceilingGridGeo, wallGridMat)
ceilingGridMesh.position.set(
  roomMesh.position.x,
  roomMesh.position.y + ROOM_H / 2 - 0.028,
  roomMesh.position.z
)
ceilingGridMesh.rotation.x = Math.PI / 2
ceilingGridMesh.renderOrder = 31
ceilingGridMesh.frustumCulled = false
ceilingGridMesh.visible = false
const roomGridMeshes = [
  wallGridMesh,
  leftWallGridMesh,
  rightWallGridMesh,
  floorGridMesh,
  ceilingGridMesh
]
wallGridMat.side = THREE.DoubleSide
disposables.push(wallGridGeo, sideGridGeo, floorGridGeo, ceilingGridGeo, wallGridMat)

// 終章後牆的立體 GENCKO 招牌：只保留有厚度與 bevel 的文字，不放底板遮住蛋。
const logoSignGroup = new THREE.Group()
const logoSignY = 4.15
const logoSignZ = 1.0 - ROOM_D / 2 + 0.035
const logoFont = new FontLoader().parse(helvetikerFont as unknown as FontData)
const logoTextGeo = new TextGeometry('GENCKO', {
  font: logoFont,
  size: 2.5,
  depth: 0.5,
  curveSegments: 8,
  bevelEnabled: true,
  bevelThickness: 0.09,
  bevelSize: 0.06,
  bevelSegments: 3
})
logoTextGeo.computeBoundingBox()
logoTextGeo.center()
const logoTextWidth = logoTextGeo.boundingBox
  ? logoTextGeo.boundingBox.max.x - logoTextGeo.boundingBox.min.x
  : 1
logoTextGeo.scale((ROOM_W * 0.86) / Math.max(logoTextWidth, 0.001), 1, 1)
const logoTextMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#ff7b32'),
  metalness: 0.72,
  roughness: 0.2,
  emissive: new THREE.Color('#d94e18'),
  emissiveIntensity: 1.25,
  toneMapped: false
})
const logoTextMesh = new THREE.Mesh(logoTextGeo, logoTextMat)
logoTextMesh.position.z = 0.055
logoTextMesh.renderOrder = 33
logoSignGroup.add(logoTextMesh)

const logoLightStripGeo = new THREE.BoxGeometry(17.4, 0.045, 0.06)
const logoLightStripVerticalGeo = new THREE.BoxGeometry(0.045, 2.8, 0.06)
const logoLightStripMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#ff6c2a'),
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false
})

function applyLogoSquareReveal(material: THREE.Material, cacheKey: string) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEggReveal = eggUniforms.uEggReveal
    shader.uniforms.uEggRes = eggUniforms.uEggRes
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uEggReveal;
        uniform vec2 uEggRes;`
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float _logoSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
        vec2 _logoTile = floor(gl_FragCoord.xy / 7.0);
        float _logoDith = fract(sin(dot(_logoTile, vec2(12.9898, 78.233))) * 43758.5453);
        float _logoBnd = uEggReveal * 2.24 - 0.12 + _logoDith * 0.085;
        if (_logoSd > _logoBnd) discard;`
      )
  }
  material.customProgramCacheKey = () => cacheKey
}
applyLogoSquareReveal(logoTextMat, 'gencko-sign-text-square-v1')
applyLogoSquareReveal(logoLightStripMat, 'gencko-sign-light-square-v1')
for (const y of [-1.62, 1.62]) {
  const strip = new THREE.Mesh(logoLightStripGeo, logoLightStripMat)
  strip.position.set(0, y, 0.025)
  logoSignGroup.add(strip)
}
for (const x of [-8.7, 8.7]) {
  const strip = new THREE.Mesh(logoLightStripVerticalGeo, logoLightStripMat)
  strip.position.set(x, 0, 0.025)
  logoSignGroup.add(strip)
}
logoSignGroup.position.set(0, logoSignY, logoSignZ)
logoSignGroup.renderOrder = 33
logoSignGroup.frustumCulled = false
logoSignGroup.visible = false
disposables.push(
  logoTextGeo,
  logoTextMat,
  logoLightStripGeo,
  logoLightStripVerticalGeo,
  logoLightStripMat
)

// 終章導覽柱體：四個獨立 3D 柱子從地板長出，後排較高、前排較低。
const finaleButtonGroup = new THREE.Group()
const finaleFloorY = roomMesh.position.y - ROOM_H / 2 + 0.04
const finaleColumnWidth = 9.3
const finaleColumnDepth = 1.42
const finaleColumnGap = 0.12
const finaleColumnXs = [
  -(finaleColumnWidth / 2 + finaleColumnGap / 2),
  finaleColumnWidth / 2 + finaleColumnGap / 2
]
const finaleFrontZ = -0.45
const finaleBackZ = -2.0
const finaleTopSlopeRise = 1.42
const finaleFrontTopNear = 0.96
// 前後柱子的頂面使用同一條斜率，兩排會落在同一個連續斜面上。
const finaleBackTopNear = finaleFrontTopNear + (finaleFrontZ - finaleBackZ)
const finaleFrontTopFar = finaleFrontTopNear + finaleTopSlopeRise
const finaleBackTopFar = finaleBackTopNear + finaleTopSlopeRise

function createFinaleColumnGeo(nearTop: number, farTop: number, extra = 0) {
  const halfWidth = finaleColumnWidth / 2 + extra
  const halfDepth = finaleColumnDepth / 2 + extra
  const bottom = extra > 0 ? 0.012 : 0
  return new ConvexGeometry([
    new THREE.Vector3(-halfWidth, bottom, halfDepth),
    new THREE.Vector3(halfWidth, bottom, halfDepth),
    new THREE.Vector3(-halfWidth, bottom, -halfDepth),
    new THREE.Vector3(halfWidth, bottom, -halfDepth),
    new THREE.Vector3(-halfWidth, nearTop + extra, halfDepth),
    new THREE.Vector3(halfWidth, nearTop + extra, halfDepth),
    new THREE.Vector3(-halfWidth, farTop + extra, -halfDepth),
    new THREE.Vector3(halfWidth, farTop + extra, -halfDepth)
  ])
}

function addFinaleColumnGridUvs(
  geometry: THREE.BufferGeometry,
  width: number,
  depth: number,
  height: number
) {
  const positions = geometry.attributes.position
  const normals = geometry.attributes.normal
  const uvs = new Float32Array(positions.count * 2)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const z = positions.getZ(i)
    const nx = Math.abs(normals.getX(i))
    const ny = Math.abs(normals.getY(i))
    const nz = Math.abs(normals.getZ(i))
    let u = x / width + 0.5
    let v = y / height
    if (ny >= nx && ny >= nz) {
      u = x / width + 0.5
      v = z / depth + 0.5
    } else if (nz >= nx) {
      u = x / width + 0.5
      v = y / height
    } else {
      u = z / depth + 0.5
      v = y / height
    }
    uvs[i * 2] = u
    uvs[i * 2 + 1] = v
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

const finaleColumnFrontGeo = createFinaleColumnGeo(finaleFrontTopNear, finaleFrontTopFar)
const finaleColumnBackGeo = createFinaleColumnGeo(finaleBackTopNear, finaleBackTopFar)
const finaleColumnGridFrontGeo = createFinaleColumnGeo(finaleFrontTopNear, finaleFrontTopFar, 0.035)
const finaleColumnGridBackGeo = createFinaleColumnGeo(finaleBackTopNear, finaleBackTopFar, 0.035)
addFinaleColumnGridUvs(
  finaleColumnGridFrontGeo,
  finaleColumnWidth + 0.07,
  finaleColumnDepth + 0.07,
  finaleFrontTopFar + 0.035
)
addFinaleColumnGridUvs(
  finaleColumnGridBackGeo,
  finaleColumnWidth + 0.07,
  finaleColumnDepth + 0.07,
  finaleBackTopFar + 0.035
)
// 牆面每格約 1.1 世界單位；柱面使用相同尺度，而不是把整個柱面硬切成 18×12。
const finaleColumnGridMat = wallGridMat.clone()
finaleColumnGridMat.uniforms.uColor = wallGridMat.uniforms.uColor
finaleColumnGridMat.uniforms.uOpacity = wallGridMat.uniforms.uOpacity
finaleColumnGridMat.uniforms.uTime = uniforms.uTime
finaleColumnGridMat.uniforms.uEggReveal = eggUniforms.uEggReveal
finaleColumnGridMat.uniforms.uEggRes = eggUniforms.uEggRes
finaleColumnGridMat.uniforms.uCells.value.set(8.5, 2)
// 直接複用房間牆壁的材質與 wipe shader，柱體會跟牆面維持同樣的白色質感。
const finaleColumnMat = roomMat.clone()
finaleColumnMat.side = THREE.DoubleSide
finaleColumnMat.vertexColors = false
finaleColumnMat.color.set('#ffffff')
finaleColumnMat.transparent = false
finaleColumnMat.opacity = 1
finaleColumnMat.depthWrite = true
finaleColumnMat.depthTest = true
applyLogoSquareReveal(finaleColumnMat, 'gencko-finale-column-square-v1')
const finaleButtonEdgeMat = new THREE.LineBasicMaterial({
  color: new THREE.Color('#9ca5a8'),
  transparent: true,
  opacity: 0.3,
  depthWrite: false
})
applyLogoSquareReveal(finaleButtonEdgeMat, 'gencko-finale-button-edge-v1')
const finaleColumnFrontEdgeGeo = new THREE.EdgesGeometry(finaleColumnFrontGeo)
const finaleColumnBackEdgeGeo = new THREE.EdgesGeometry(finaleColumnBackGeo)
type FinaleActionItem = {
  to: string
  hitMesh: THREE.Mesh
  objects: THREE.Object3D[]
  hoverScale: number
  labelMesh?: THREE.Mesh
  labelBaseY?: number
}
const finaleActionItems: FinaleActionItem[] = []
const finaleActionHitMeshes: THREE.Mesh[] = []
const finaleActionByMesh = new WeakMap<THREE.Object3D, FinaleActionItem>()
const finaleActionTo = {
  backLeft: '/start-here',
  backRight: '/shop',
  frontLeft: '/hospital',
  frontRight: '/calculator'
}

for (const x of finaleColumnXs) {
  const frontColumn = new THREE.Mesh(finaleColumnFrontGeo, finaleColumnMat)
  frontColumn.position.set(x, finaleFloorY, finaleFrontZ)
  frontColumn.renderOrder = 34
  frontColumn.frustumCulled = false
  finaleButtonGroup.add(frontColumn)

  const backColumn = new THREE.Mesh(finaleColumnBackGeo, finaleColumnMat)
  backColumn.position.set(x, finaleFloorY, finaleBackZ)
  backColumn.renderOrder = 34
  backColumn.frustumCulled = false
  finaleButtonGroup.add(backColumn)

  const frontGrid = new THREE.Mesh(finaleColumnGridFrontGeo, finaleColumnGridMat)
  frontGrid.position.copy(frontColumn.position)
  frontGrid.renderOrder = 36
  frontGrid.frustumCulled = false
  finaleButtonGroup.add(frontGrid)

  const backGrid = new THREE.Mesh(finaleColumnGridBackGeo, finaleColumnGridMat)
  backGrid.position.copy(backColumn.position)
  backGrid.renderOrder = 36
  backGrid.frustumCulled = false
  finaleButtonGroup.add(backGrid)

  const frontEdges = new THREE.LineSegments(finaleColumnFrontEdgeGeo, finaleButtonEdgeMat)
  frontEdges.position.copy(frontColumn.position)
  frontEdges.renderOrder = 35
  frontEdges.frustumCulled = false
  finaleButtonGroup.add(frontEdges)

  const backEdges = new THREE.LineSegments(finaleColumnBackEdgeGeo, finaleButtonEdgeMat)
  backEdges.position.copy(backColumn.position)
  backEdges.renderOrder = 35
  backEdges.frustumCulled = false
  finaleButtonGroup.add(backEdges)

  const frontAction: FinaleActionItem = {
    to: x === finaleColumnXs[0] ? finaleActionTo.frontLeft : finaleActionTo.frontRight,
    hitMesh: frontColumn,
    objects: [frontColumn, frontGrid, frontEdges],
    hoverScale: 1
  }
  const backAction: FinaleActionItem = {
    to: x === finaleColumnXs[0] ? finaleActionTo.backLeft : finaleActionTo.backRight,
    hitMesh: backColumn,
    objects: [backColumn, backGrid, backEdges],
    hoverScale: 1
  }
  finaleActionItems.push(frontAction, backAction)
  finaleActionHitMeshes.push(frontColumn, backColumn)
  finaleActionByMesh.set(frontColumn, frontAction)
  finaleActionByMesh.set(backColumn, backAction)
}

const finaleLabelData = [
  {
    label: '新手入門',
    english: 'START HERE',
    x: finaleColumnXs[0],
    z: finaleBackZ,
    y: finaleFloorY + (finaleBackTopNear + finaleBackTopFar) / 2,
    rotation: -Math.atan2(finaleColumnDepth, finaleTopSlopeRise),
    to: finaleActionTo.backLeft
  },
  {
    label: '選購守宮',
    english: 'SHOP GECKOS',
    x: finaleColumnXs[1],
    z: finaleBackZ,
    y: finaleFloorY + (finaleBackTopNear + finaleBackTopFar) / 2,
    rotation: -Math.atan2(finaleColumnDepth, finaleTopSlopeRise),
    to: finaleActionTo.backRight
  },
  {
    label: '特寵醫院',
    english: 'EXOTIC VET',
    x: finaleColumnXs[0],
    z: finaleFrontZ,
    y: finaleFloorY + (finaleFrontTopNear + finaleFrontTopFar) / 2,
    rotation: -Math.atan2(finaleColumnDepth, finaleTopSlopeRise),
    to: finaleActionTo.frontLeft
  },
  {
    label: '基因計算',
    english: 'GENETICS LAB',
    x: finaleColumnXs[1],
    z: finaleFrontZ,
    y: finaleFloorY + (finaleFrontTopNear + finaleFrontTopFar) / 2,
    rotation: -Math.atan2(finaleColumnDepth, finaleTopSlopeRise),
    to: finaleActionTo.frontRight
  }
]
const finaleLabelGeo = new THREE.PlaneGeometry(9.05, 1.72)
const finaleLabelMaterials: THREE.MeshBasicMaterial[] = []
const finaleLabelTextures: THREE.CanvasTexture[] = []
const finaleLabelStreams: {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  label: string
  english: string
  seed: number
}[] = []

function drawFinaleStreamText(stream: (typeof finaleLabelStreams)[number], time: number) {
  const { canvas, context: ctx, label, english, seed } = stream
  const width = canvas.width
  const height = canvas.height
  const sweepX = ((time * 0.18 + seed) % 1) * width
  ctx.clearRect(0, 0, width, height)

  // 流動的水平資料帶，保持透明背景只留下文字與掃描痕跡。
  ctx.fillStyle = 'rgba(86, 101, 106, 0.12)'
  for (let y = 24; y < height; y += 20) {
    const drift = Math.sin(time * 1.7 + y * 0.035 + seed * 8.0) * 18
    ctx.fillRect(drift, y, width * 0.7, 2)
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 190px "Microsoft JhengHei", "Noto Sans TC", sans-serif'
  ctx.fillStyle = 'rgba(36, 45, 49, 0.96)'
  ctx.fillText(label, width / 2, 100)
  ctx.font = '700 46px "Courier New", monospace'
  ctx.fillStyle = 'rgba(61, 71, 75, 0.82)'
  ctx.fillText(english, width / 2, 198)

  // 以切片重繪製造 STREAM 的資料流錯位與拖影。
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  for (let band = 0; band < 8; band++) {
    const y = band * 22
    const offset = Math.sin(time * 2.3 + band * 0.95 + seed * 5.0) * 7
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, y, width, 22)
    ctx.clip()
    ctx.translate(offset, 0)
    ctx.globalAlpha = 0.24
    ctx.fillStyle = 'rgba(215, 231, 235, 0.9)'
    ctx.fillText(label, width / 2, 100)
    ctx.globalAlpha = 0.13
    ctx.fillText(english, width / 2, 198)
    ctx.restore()
  }

  const sweep = ctx.createLinearGradient(sweepX - 100, 0, sweepX + 100, 0)
  sweep.addColorStop(0, 'rgba(255, 255, 255, 0)')
  sweep.addColorStop(0.5, 'rgba(255, 255, 255, 0.72)')
  sweep.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sweep
  ctx.fillRect(sweepX - 100, 0, 200, height)
  ctx.restore()

  ctx.fillStyle = 'rgba(233, 243, 245, 0.34)'
  ctx.fillRect(sweepX, 18, 2, height - 36)
}

if (typeof document !== 'undefined') {
  for (const item of finaleLabelData) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 260
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    const stream = {
      canvas,
      context: ctx,
      label: item.label,
      english: item.english,
      seed: finaleLabelStreams.length * 0.19
    }
    drawFinaleStreamText(stream, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      toneMapped: false
    })
    const labelMesh = new THREE.Mesh(finaleLabelGeo, material)
    labelMesh.position.set(item.x, item.y + 0.06, item.z)
    labelMesh.rotation.x = item.rotation
    labelMesh.renderOrder = 37
    labelMesh.frustumCulled = false
    const owner = finaleActionItems.find((action) => action.to === item.to)
    if (owner) {
      owner.objects.push(labelMesh)
      owner.labelMesh = labelMesh
      owner.labelBaseY = item.y + 0.06
    }
    finaleButtonGroup.add(labelMesh)
    finaleLabelMaterials.push(material)
    finaleLabelTextures.push(texture)
    finaleLabelStreams.push(stream)
  }
}

finaleButtonGroup.renderOrder = 34
finaleButtonGroup.frustumCulled = false
// 往後牆移動，讓底座底部完整進入鏡頭。
finaleButtonGroup.position.z = -7.5
finaleButtonGroup.visible = false
disposables.push(
  finaleColumnFrontGeo,
  finaleColumnBackGeo,
  finaleColumnGridFrontGeo,
  finaleColumnGridBackGeo,
  finaleColumnFrontEdgeGeo,
  finaleColumnBackEdgeGeo,
  finaleColumnMat,
  finaleColumnGridMat,
  finaleButtonEdgeMat,
  finaleLabelGeo,
  ...finaleLabelTextures,
  ...finaleLabelMaterials
)
// 開場前幾幀強制繪製一次，讓房間 shader 提前編譯（避免揭露轉場那一瞬的編譯頓）。
let roomPrewarmFrames = 0

// 全頁滑鼠視差狀態：DNA、骨幹與終章共用同一組平滑相機偏移。
const parallaxPointer = { x: 0, y: 0 }
const parallaxCam = { x: 0, y: 0 }
function onParallaxPointerMove(e: PointerEvent) {
  parallaxPointer.x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1
  parallaxPointer.y = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1)
}

// 骨幹/卡片場景背景：橘色神經光絲。畫布經 EffectComposer(bloom) 合成後不透明，
// 背景必須畫在場景「內部」（如同 finaleBackdrop），DOM 墊在畫布後方看不到。
// renderOrder -100（即先前被移除的大氣層位置）→ 墊在所有 3D 內容之後。
const neuralBgGeo = new THREE.PlaneGeometry(2, 2)
const neuralBgMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uResolution: uniforms.uResolution,
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color('#d24e12') } // 深橘神經紋路（在淺灰上對比才夠）
  },
  // 這層必須留在 opaque pass；若設成 transparent，會晚於骨幹/卡片/終章背景繪製，
  // 視覺上就像蓋在前景上方，無法被蛋場景的 backdrop 擋住。
  transparent: false,
  depthWrite: false,
  depthTest: false,
  vertexShader: /* glsl */ `
    void main() {
      gl_Position = vec4(position.xy, 0.9999, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uOpacity;
    uniform vec3 uColor;

    void main() {
      vec2 sc = gl_FragCoord.xy / max(vec2(1.0), uResolution);
      float sceneMix = smoothstep(0.2, 0.6, clamp(uOpacity, 0.0, 1.0));
      vec3 baseDark = vec3(0.02, 0.025, 0.035);
      vec3 baseBlack = mix(baseDark, vec3(0.024, 0.028, 0.036), sceneMix);
      vec3 techGray = mix(baseDark, vec3(0.035, 0.038, 0.046), sceneMix);
      float lowerMask = 1.0 - smoothstep(0.34, 0.7, sc.y);
      float centerMask = 1.0 - smoothstep(0.32, 0.98, abs(sc.x - 0.5) * 1.26);
      float vignette = 1.0 - smoothstep(0.28, 0.96, length(sc - 0.5) * 1.34);
      vec3 col = mix(baseBlack, techGray, lowerMask * centerMask * 0.42);
      col *= 0.92 + vignette * 0.08;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})
const neuralBgMesh = new THREE.Mesh(neuralBgGeo, neuralBgMat)
neuralBgMesh.frustumCulled = false
neuralBgMesh.renderOrder = -100
neuralBgMesh.visible = false

// ===== 骨幹背景橘色線網：恢復為繞 Y 軸的環繞網格，節點保留自動閃爍 =====
const PLEX_RINGS = 26
const PLEX_PER = 34
const PLEX_R = 13.0
const PLEX_H = 32.0
const plexPts: THREE.Vector3[][] = []
for (let ri = 0; ri < PLEX_RINGS; ri++) {
  const row: THREE.Vector3[] = []
  const y = -PLEX_H / 2 + (ri / (PLEX_RINGS - 1)) * PLEX_H
  for (let k = 0; k < PLEX_PER; k++) {
    const theta = (k / PLEX_PER) * Math.PI * 2 + ri * 0.08
    const r = PLEX_R + (Math.random() - 0.5) * 2.4
    const yj = y + (Math.random() - 0.5) * 0.9
    row.push(new THREE.Vector3(Math.cos(theta) * r, yj, Math.sin(theta) * r))
  }
  plexPts.push(row)
}
const plexNodePos: number[] = []
for (const row of plexPts) for (const p of row) plexNodePos.push(p.x, p.y, p.z)
const plexLinePos: number[] = []
for (let ri = 0; ri < PLEX_RINGS; ri++) {
  for (let k = 0; k < PLEX_PER; k++) {
    const a = plexPts[ri][k]
    const b = plexPts[ri][(k + 1) % PLEX_PER] // 環向連線（水平）
    plexLinePos.push(a.x, a.y, a.z, b.x, b.y, b.z)
    if (ri < PLEX_RINGS - 1) {
      const c = plexPts[ri + 1][k] // 縱向連線（垂直）→ 幾何直角格
      plexLinePos.push(a.x, a.y, a.z, c.x, c.y, c.z)
    }
  }
}
const plexNodeGeo = new THREE.BufferGeometry()
plexNodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(plexNodePos, 3))
const plexLineGeo = new LineSegmentsGeometry()
plexLineGeo.setPositions(plexLinePos)
{
  // 依深度烘焙頂點色：近亮遠暗（plexus 靜態、相機靜態 → 各點距離固定）。
  const _lc = Math.cos(0.12)
  const _ls = Math.sin(0.12)
  const plexLineColors: number[] = []
  for (let i = 0; i < plexLinePos.length; i += 3) {
    const y = plexLinePos[i + 1]
    const z = plexLinePos[i + 2]
    const worldZ = y * _ls + z * _lc // 繞 X 軸 0.12 後的世界 Z
    const viewDepth = 7 - worldZ // 相機在 z=7 看 -z
    const b = THREE.MathUtils.clamp(1.0 - (viewDepth - 5) / 20, 0.22, 1.0)
    plexLineColors.push(1.7 * b, 0.72 * b, 0.24 * b) // 亮橘 × 深度亮度(>1 → bloom 發光)
  }
  plexLineGeo.setColors(plexLineColors)
}
const plexCellPos: number[] = []
const plexCellUv: number[] = []
const plexCellSeed: number[] = []
for (let ri = 0; ri < PLEX_RINGS - 1; ri++) {
  for (let k = 0; k < PLEX_PER; k++) {
    const a = plexPts[ri][k]
    const b = plexPts[ri][(k + 1) % PLEX_PER]
    const c = plexPts[ri + 1][(k + 1) % PLEX_PER]
    const d = plexPts[ri + 1][k]
    const center = new THREE.Vector3().add(a).add(b).add(c).add(d).multiplyScalar(0.25)
    const cover = -0.024
    const qa = a.clone().lerp(center, cover)
    const qb = b.clone().lerp(center, cover)
    const qc = c.clone().lerp(center, cover)
    const qd = d.clone().lerp(center, cover)
    const seed = Math.random()
    plexCellPos.push(
      qa.x,
      qa.y,
      qa.z,
      qb.x,
      qb.y,
      qb.z,
      qc.x,
      qc.y,
      qc.z,
      qa.x,
      qa.y,
      qa.z,
      qc.x,
      qc.y,
      qc.z,
      qd.x,
      qd.y,
      qd.z
    )
    plexCellUv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1)
    for (let i = 0; i < 6; i++) plexCellSeed.push(seed)
  }
}
const plexCellGeo = new THREE.BufferGeometry()
plexCellGeo.setAttribute('position', new THREE.Float32BufferAttribute(plexCellPos, 3))
plexCellGeo.setAttribute('uv', new THREE.Float32BufferAttribute(plexCellUv, 2))
plexCellGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(plexCellSeed, 1))
const plexUniforms = {
  uOpacity: { value: 0 },
  uColor: { value: new THREE.Color('#ff6a1e') },
  uTime: uniforms.uTime
}
const plexNodeMat = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: plexUniforms.uOpacity,
    uColor: plexUniforms.uColor,
    uTime: plexUniforms.uTime,
    uEggReveal: eggUniforms.uEggReveal, // 退場用終章 wipe（與骨幹同一道）
    uEggRes: eggUniforms.uEggRes,
    uSize: { value: 210.0 }
  },
  transparent: true,
  depthWrite: false,
  depthTest: true, // 讓卡片/骨幹(有寫深度)能遮住後面的節點 → 節點不擋前景
  blending: THREE.AdditiveBlending, // 相加發光（跟原本神經背景一致）
  vertexShader: /* glsl */ `
    uniform float uSize;
    uniform float uTime;
    varying float vDepth;
    varying float vPulse;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      float seed = fract(sin(dot(floor(world.xy * 1.7), vec2(12.9898, 78.233))) * 43758.5453);
      float speed = mix(0.55, 1.2, fract(seed * 17.31));
      float phase = seed * 6.2831853 + world.x * 0.11 + world.y * 0.07;
      float wave = 0.5 + 0.5 * sin(uTime * speed + phase);
      vPulse = smoothstep(0.82, 0.98, wave) * step(0.68, seed);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize / max(0.5, -mv.z);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uTime;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying float vDepth;
    varying float vPulse;
    void main() {
      // 退場：與骨幹同一道終章 wipe（7px 像素格、由下往上消失）。
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      vec2 pc = gl_PointCoord - 0.5;
      float d = length(pc);
      float halo = exp(-d * 3.4); // 大範圍柔和光暈（直接畫，不依賴 bloom）
      vec2 q = abs(pc);
      float core = 1.0 - smoothstep(0.10, 0.19, max(q.x, q.y)); // 方形亮核
      float depthFade = clamp(1.0 - (vDepth - 8.0) / 28.0, 0.18, 1.0);
      float bright = 0.85 + vPulse * 1.25;
      vec3 c = uColor * bright * (halo * 1.35 + core * (2.0 + vPulse * 1.8)); // 光暈 + 發光亮核
      float a = uOpacity * depthFade * clamp(halo * 0.7 + core * (0.72 + vPulse), 0.0, 1.0);
      gl_FragColor = vec4(c, a);
    }
  `
})
// 真.粗線：LineMaterial（可設線寬）+ 相加發光；顏色/深度由頂點色控制。
const plexLineMat = new LineMaterial({
  color: 0xffffff, // 交給頂點色（依深度烘焙）
  linewidth: 2.8, // 螢幕像素寬
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  worldUnits: false,
  dashed: false
})
plexLineMat.resolution.set(
  typeof window !== 'undefined' ? window.innerWidth : 1920,
  typeof window !== 'undefined' ? window.innerHeight : 1080
)
// 退場：與骨幹同一道終章 wipe（7px 像素格、由下往上消失）。
plexLineMat.onBeforeCompile = (shader) => {
  shader.uniforms.uEggReveal = eggUniforms.uEggReveal
  shader.uniforms.uEggRes = eggUniforms.uEggRes
  shader.fragmentShader = shader.fragmentShader
    .replace(
      'uniform vec3 diffuse;',
      `uniform vec3 diffuse;
      uniform float uEggReveal;
      uniform vec2 uEggRes;`
    )
    .replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;`
    )
}
const plexCellMat = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: plexUniforms.uOpacity,
    uColor: plexUniforms.uColor,
    uTime: plexUniforms.uTime,
    uEggReveal: eggUniforms.uEggReveal,
    uEggRes: eggUniforms.uEggRes
  },
  transparent: true,
  depthWrite: false,
  depthTest: true,
  side: THREE.DoubleSide,
  blending: THREE.NormalBlending,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying float vDepth;
    varying float vBlink;
    varying float vSeed;
    varying vec2 vUv;
    attribute float aSeed;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      float seed = aSeed;
      float speed = mix(0.18, 0.48, fract(seed * 13.37));
      float phase = seed * 6.2831853 + world.x * 0.09 + world.y * 0.05;
      float wave = 0.5 + 0.5 * sin(uTime * speed + phase);
      vBlink = smoothstep(0.88, 0.992, wave) * step(0.68, seed);
      vSeed = seed;
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying float vDepth;
    varying float vBlink;
    varying float vSeed;
    varying vec2 vUv;
    void main() {
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      if (vBlink <= 0.001) discard;
      vec2 pc = vUv - 0.5;
      vec2 ap = abs(pc);
      float edge = max(ap.x, ap.y);
      float square = 1.0 - smoothstep(0.497, 0.5, edge);
      float inner = 1.0 - smoothstep(0.02, 0.499, edge);
      float bevel = smoothstep(0.04, 0.5, edge);
      vec2 lightDir = normalize(vec2(-0.72, -0.58));
      float directional = clamp(dot(pc, lightDir) * -1.15 + 0.56, 0.0, 1.0);
      float rimGlow = smoothstep(0.36, 0.5, edge) * (1.0 - smoothstep(0.5, 0.535, edge));
      float depthFade = clamp(1.0 - (vDepth - 8.0) / 28.0, 0.16, 1.0);
      vec3 deepOrange = uColor * 1.02;
      vec3 lightOrange = vec3(1.0, 0.74, 0.44);
      vec3 base = mix(deepOrange, lightOrange, directional * 0.52 + inner * 0.22);
      vec3 highlight = vec3(1.0, 0.9, 0.62) * (directional * 0.26 + rimGlow * 0.15);
      vec3 shadow = uColor * 0.06 * (1.0 - directional) * bevel * 0.24;
      vec3 c = base + highlight - shadow;
      float a = uOpacity * depthFade * vBlink * clamp(square * (0.42 + inner * 0.22), 0.0, 1.0);
      gl_FragColor = vec4(c, a);
    }
  `
})
// （已移除「發光點疊線」爛招，改用真.粗線 LineSegments2 + LineMaterial）
const plexNodes = new THREE.Points(plexNodeGeo, plexNodeMat)
const plexLines = new LineSegments2(plexLineGeo, plexLineMat)
const plexCellMesh = new THREE.Mesh(plexCellGeo, plexCellMat)
plexNodes.frustumCulled = false
plexLines.frustumCulled = false
plexCellMesh.frustumCulled = false
plexNodes.visible = false
const plexusGroup = new THREE.Group()
plexusGroup.add(plexCellMesh)
plexusGroup.add(plexLines)
plexusGroup.rotation.x = 0.12
plexusGroup.renderOrder = -90
plexusGroup.visible = false

// ===== 骨幹背景：暖橘色水平網格（#FF5500）+ 向遠處自然淡出 =====
const boneGridGeo = new THREE.PlaneGeometry(160, 160, 80, 80)
const BONE_GRID_Y = -3.4
const BONE_GRID_TILT_X = THREE.MathUtils.degToRad(14)
const boneGridMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: uniforms.uTime,
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color('#ff5500') },
    uCell: { value: 0.6 }, // 再將單格長寬各縮半，面積為目前的 1/4
    uFadeStart: { value: 10.0 },
    uFadeEnd: { value: 55.0 },
    uEggReveal: eggUniforms.uEggReveal,
    uEggRes: eggUniforms.uEggRes
  },
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorld;
    void main() {
      vec3 p = position;
      // 讓底部骨幹網格本體也跟著慢速起伏；local y 經過 -PI/2 旋轉後會映射到 world z，
      // 所以線條本身也會一起波動，而不只是上面的格子 tile 在動。
      float waveZone = 1.0 - smoothstep(3.2, 18.0, length(p.xy));
      float waveA = sin(p.x * 0.28 + uTime * 0.72);
      float waveB = sin(p.y * 0.34 - uTime * 0.86);
      float waveC = sin((p.x + p.y) * 0.18 - uTime * 0.48);
      p.z += (waveA * 0.22 + waveB * 0.14 + waveC * 0.08) * waveZone;
      vec4 w = modelMatrix * vec4(p, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uCell;
    uniform float uFadeStart;
    uniform float uFadeEnd;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying vec3 vWorld;
    void main() {
      // 與其他背景一致的終章退場 wipe。
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      // 抗鋸齒網格線
      vec2 g = vWorld.xz / uCell;
      vec2 gd = abs(fract(g - 0.5) - 0.5) / fwidth(g);
      float line = 1.0 - min(min(gd.x, gd.y), 1.0);
      // 向遠處(半徑)自然淡出 → 邊緣融進背景
      float dist = length(vWorld.xz);
      float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
      float a = line * fade * uOpacity;
      if (a < 0.002) discard;
      gl_FragColor = vec4(uColor * (0.8 + line * 0.7), a);
    }
  `
})
const boneGridMesh = new THREE.Mesh(boneGridGeo, boneGridMat)
boneGridMesh.rotation.x = -Math.PI / 2 + BONE_GRID_TILT_X // 向鏡頭方向微傾，讓平面更接近鏡頭方向
boneGridMesh.position.set(0, BONE_GRID_Y, 0) // 骨幹下方地板，上移一點
boneGridMesh.renderOrder = -80
boneGridMesh.frustumCulled = false
boneGridMesh.visible = false

// ===== 網格「滑鼠經過會浮起的格子」=====
const BONE_TILE_CELL = 0.6 // 再將單格長寬各縮半，面積為目前的 1/4
const BONE_TILES_N = 160
const BONE_TILE_THICKNESS = 0.16
const boneTileGeo = new THREE.BoxGeometry(
  BONE_TILE_CELL * 0.86,
  BONE_TILE_THICKNESS,
  BONE_TILE_CELL * 0.86
)
boneTileGeo.translate(0, BONE_TILE_THICKNESS * 0.5, 0) // 底面貼在原網格，方塊由底部向上長
const boneTileLift = new Float32Array(BONE_TILES_N * BONE_TILES_N)
const boneTileLiftAttr = new THREE.InstancedBufferAttribute(boneTileLift, 1)
boneTileGeo.setAttribute('aLift', boneTileLiftAttr)
const boneTilesMat = new THREE.ShaderMaterial({
  uniforms: {
    uOpacity: { value: 0 },
    uColor: { value: new THREE.Color('#ff5500') },
    uMouse: { value: new THREE.Vector3(9999, 9999, 9999) },
    uHoverRadius: { value: 0.8 },
    uTileThickness: { value: BONE_TILE_THICKNESS },
    uEggReveal: eggUniforms.uEggReveal,
    uEggRes: eggUniforms.uEggRes
  },
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    attribute float aLift;
    uniform float uTileThickness;
    varying float vLift;
    varying vec3 vNormal;
    void main() {
      float lift = aLift;
      vLift = lift;
      vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
      float grow = smoothstep(0.0, uTileThickness, position.y);
      vec3 worldNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0));
      world.xyz += worldNormal * (lift * grow);
      vNormal = normalize(normalMatrix * mat3(instanceMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    uniform float uEggReveal;
    uniform vec2 uEggRes;
    varying float vLift;
    varying vec3 vNormal;
    void main() {
      float _fwSd = gl_FragCoord.x / max(1.0, uEggRes.x) + gl_FragCoord.y / max(1.0, uEggRes.y);
      float _fwD = fract(sin(dot(floor(gl_FragCoord.xy / 7.0), vec2(12.9898, 78.233))) * 43758.5453);
      if (_fwSd < uEggReveal * 2.24 - 0.12 + _fwD * 0.085) discard;
      float a = uOpacity * smoothstep(0.05, 0.28, vLift) * 0.55; // 小範圍、低亮度拖曳
      if (a < 0.002) discard;
      float faceLight = 0.55 + 0.45 * max(dot(normalize(vNormal), normalize(vec3(-0.35, 0.8, 0.45))), 0.0);
      gl_FragColor = vec4(uColor * faceLight * (0.62 + vLift * 0.28), a);
    }
  `
})
const boneTiles = new THREE.InstancedMesh(boneTileGeo, boneTilesMat, BONE_TILES_N * BONE_TILES_N)
{
  const _tm = new THREE.Matrix4()
  let ti = 0
  for (let ix = 0; ix < BONE_TILES_N; ix++) {
    for (let iz = 0; iz < BONE_TILES_N; iz++) {
      const x = (ix - BONE_TILES_N / 2 + 0.5) * BONE_TILE_CELL
      const z = (iz - BONE_TILES_N / 2 + 0.5) * BONE_TILE_CELL
      _tm.makeTranslation(x, 0, z)
      boneTiles.setMatrixAt(ti++, _tm)
    }
  }
  boneTiles.instanceMatrix.needsUpdate = true
}
boneTiles.position.set(0, BONE_GRID_Y, 0)
boneTiles.rotation.x = BONE_GRID_TILT_X // 方塊厚度法線與底網格保持一致
boneTiles.renderOrder = -79
boneTiles.frustumCulled = false
boneTiles.visible = false

// ===== DNA 場景網格：水平段同步加入滑鼠經過浮起的厚方塊 =====
// DNA 網格密度與浮起方塊共用同一組 160 x 112 的細格。
const DNA_GRID_Y = CFG.projector.y + 0.08
const DNA_GRID_Z = -6
const DNA_GRID_CELL_X = 120 / 160
const DNA_GRID_CELL_Z = 56 / 112
const DNA_GRID_COLUMNS = 160
const DNA_GRID_ROWS = 112
const dnaTileGeo = new THREE.BoxGeometry(
  DNA_GRID_CELL_X * 0.82,
  BONE_TILE_THICKNESS,
  DNA_GRID_CELL_Z * 0.82
)
dnaTileGeo.translate(0, BONE_TILE_THICKNESS * 0.5, 0)
const dnaTileLift = new Float32Array(DNA_GRID_COLUMNS * DNA_GRID_ROWS)
const dnaTileLiftAttr = new THREE.InstancedBufferAttribute(dnaTileLift, 1)
dnaTileGeo.setAttribute('aLift', dnaTileLiftAttr)
const dnaTilesMat = boneTilesMat.clone()
dnaTilesMat.uniforms.uEggReveal = eggUniforms.uEggReveal
dnaTilesMat.uniforms.uEggRes = eggUniforms.uEggRes
dnaTilesMat.uniforms.uHoverRadius.value = 0.75
const dnaTiles = new THREE.InstancedMesh(dnaTileGeo, dnaTilesMat, DNA_GRID_COLUMNS * DNA_GRID_ROWS)
const dnaTileCenters = new Float32Array(DNA_GRID_COLUMNS * DNA_GRID_ROWS * 3)
{
  const _dtm = new THREE.Matrix4()
  let dti = 0
  for (let ix = 0; ix < DNA_GRID_COLUMNS; ix++) {
    for (let iz = 0; iz < DNA_GRID_ROWS; iz++) {
      const x = (ix - DNA_GRID_COLUMNS / 2 + 0.5) * DNA_GRID_CELL_X
      const localY = -56 / 2 + (iz + 0.5) * DNA_GRID_CELL_Z
      let surfaceY = localY
      let surfaceZ = 0
      let foldAngle = 0
      if (localY > 4.0) {
        foldAngle = Math.min((localY - 4.0) / 13.0, Math.PI * 1.12)
        surfaceY = 4.0 + 13.0 * Math.sin(foldAngle)
        surfaceZ = 13.0 * (1.0 - Math.cos(foldAngle))
        surfaceY -= DNA_WALL_FORWARD * Math.min((localY - 4.0) / 4.0, 1.0)
      }
      _dtm.makeRotationX(foldAngle)
      _dtm.setPosition(x, surfaceZ, -surfaceY)
      const centerOffset = dti * 3
      dnaTileCenters[centerOffset] = x
      dnaTileCenters[centerOffset + 1] = surfaceZ
      dnaTileCenters[centerOffset + 2] = -surfaceY
      dnaTiles.setMatrixAt(dti++, _dtm)
    }
  }
  dnaTiles.instanceMatrix.needsUpdate = true
}
dnaTiles.position.set(0, DNA_GRID_Y, DNA_GRID_Z)
dnaTiles.frustumCulled = false
dnaTiles.renderOrder = 1
dnaTiles.visible = false

// 透明折面代理只用來做滑鼠 raycast，座標與 gridMat 的折回公式一致。
const dnaHoverSurfacePositions: number[] = []
const dnaHoverSurfaceIndices: number[] = []
for (let iz = 0; iz <= DNA_GRID_ROWS; iz++) {
  const localY = -56 / 2 + iz * DNA_GRID_CELL_Z
  let surfaceY = localY
  let surfaceZ = 0
  if (localY > 4.0) {
    const foldAngle = Math.min((localY - 4.0) / 13.0, Math.PI * 1.12)
    surfaceY = 4.0 + 13.0 * Math.sin(foldAngle)
    surfaceZ = 13.0 * (1.0 - Math.cos(foldAngle))
    surfaceY -= DNA_WALL_FORWARD * Math.min((localY - 4.0) / 4.0, 1.0)
  }
  for (let ix = 0; ix <= DNA_GRID_COLUMNS; ix++) {
    const x = -60 + ix * DNA_GRID_CELL_X
    dnaHoverSurfacePositions.push(x, surfaceY, surfaceZ)
  }
}
for (let iz = 0; iz < DNA_GRID_ROWS; iz++) {
  for (let ix = 0; ix < DNA_GRID_COLUMNS; ix++) {
    const a = iz * (DNA_GRID_COLUMNS + 1) + ix
    const b = a + 1
    const c = a + DNA_GRID_COLUMNS + 1
    const d = c + 1
    dnaHoverSurfaceIndices.push(a, c, b, b, c, d)
  }
}
const dnaHoverSurfaceGeo = new THREE.BufferGeometry()
dnaHoverSurfaceGeo.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(dnaHoverSurfacePositions, 3)
)
dnaHoverSurfaceGeo.setIndex(dnaHoverSurfaceIndices)
const dnaHoverSurfaceMat = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide
})
const dnaHoverSurface = new THREE.Mesh(dnaHoverSurfaceGeo, dnaHoverSurfaceMat)
dnaHoverSurface.position.set(0, DNA_GRID_Y, DNA_GRID_Z)
dnaHoverSurface.rotation.x = -Math.PI / 2
dnaHoverSurface.frustumCulled = false
dnaHoverSurface.visible = true

// 把滑鼠投影到與底網格相同的傾斜平面
const boneGridRaycaster = new THREE.Raycaster()
const boneGridPlane = new THREE.Plane()
boneGridPlane.setFromNormalAndCoplanarPoint(
  new THREE.Vector3(0, Math.cos(BONE_GRID_TILT_X), Math.sin(BONE_GRID_TILT_X)),
  new THREE.Vector3(0, BONE_GRID_Y, 0)
)
const boneGridHit = new THREE.Vector3()
const boneGridNdc = new THREE.Vector2()
const boneGridMouseTarget = new THREE.Vector3(9999, 9999, 9999)
const dnaGridRaycaster = new THREE.Raycaster()
const dnaGridIntersections: THREE.Intersection[] = []
const dnaGridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -DNA_GRID_Y)
const dnaGridHit = new THREE.Vector3()
const dnaGridMouseTarget = new THREE.Vector3(9999, 9999, 9999)
const HOVER_FAST_FOLLOW = 0.2
const HOVER_FALL_FOLLOW = 0.045

function updateBoneTileLifts(dt: number) {
  const radius = boneTilesMat.uniforms.uHoverRadius.value as number
  const sinTilt = Math.sin(BONE_GRID_TILT_X)
  const cosTilt = Math.cos(BONE_GRID_TILT_X)
  const localTargetX = boneGridMouseTarget.x
  const localTargetZ =
    -sinTilt * (boneGridMouseTarget.y - BONE_GRID_Y) + cosTilt * boneGridMouseTarget.z
  const followRise = fpsSmooth(HOVER_FAST_FOLLOW, dt)
  const followFall = fpsSmooth(HOVER_FALL_FOLLOW, dt)

  for (let ix = 0, i = 0; ix < BONE_TILES_N; ix++) {
    const x = (ix - BONE_TILES_N / 2 + 0.5) * BONE_TILE_CELL
    for (let iz = 0; iz < BONE_TILES_N; iz++, i++) {
      const z = (iz - BONE_TILES_N / 2 + 0.5) * BONE_TILE_CELL
      const targetLift =
        THREE.MathUtils.smoothstep(radius, 0, Math.hypot(localTargetX - x, localTargetZ - z)) * 0.5
      const follow = targetLift > boneTileLift[i] ? followRise : followFall
      boneTileLift[i] += (targetLift - boneTileLift[i]) * follow
    }
  }
  boneTileLiftAttr.needsUpdate = true
}

function updateDnaTileLifts(dt: number) {
  const radius = dnaTilesMat.uniforms.uHoverRadius.value as number
  const followRise = fpsSmooth(HOVER_FAST_FOLLOW, dt)
  const followFall = fpsSmooth(HOVER_FALL_FOLLOW, dt)

  for (let i = 0; i < dnaTileLift.length; i++) {
    const offset = i * 3
    const centerX = dnaTileCenters[offset]
    const centerY = dnaTileCenters[offset + 1] + DNA_GRID_Y
    const centerZ = dnaTileCenters[offset + 2] + DNA_GRID_Z
    const targetLift =
      THREE.MathUtils.smoothstep(
        radius,
        0,
        Math.hypot(
          centerX - dnaGridMouseTarget.x,
          centerY - dnaGridMouseTarget.y,
          centerZ - dnaGridMouseTarget.z
        )
      ) * 0.5
    const follow = targetLift > dnaTileLift[i] ? followRise : followFall
    dnaTileLift[i] += (targetLift - dnaTileLift[i]) * follow
  }
  dnaTileLiftAttr.needsUpdate = true
}

// ===== 縮成點的爆發特效：collapse 完成瞬間，中心閃光 + 火花外射（相加發光）。=====
const BURST_N = 70
const burstPosArr: number[] = []
const burstDirArr: number[] = []
const burstSeedArr: number[] = []
for (let i = 0; i < BURST_N; i++) {
  const dir = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize()
  burstPosArr.push(0, 0, 0)
  burstDirArr.push(dir.x, dir.y, dir.z)
  burstSeedArr.push(Math.random())
}
const burstGeo = new THREE.BufferGeometry()
burstGeo.setAttribute('position', new THREE.Float32BufferAttribute(burstPosArr, 3))
burstGeo.setAttribute('aDir', new THREE.Float32BufferAttribute(burstDirArr, 3))
burstGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(burstSeedArr, 1))
const burstMat = new THREE.ShaderMaterial({
  uniforms: { uBurst: { value: 0 }, uColor: { value: new THREE.Color('#ff7a2e') } },
  transparent: true,
  depthWrite: false,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */ `
    attribute vec3 aDir;
    attribute float aSeed;
    uniform float uBurst;
    varying float vSeed;
    void main() {
      float t = uBurst;
      vec3 p = position + aDir * (t * (1.2 + aSeed * 2.4)); // 外射
      vSeed = aSeed;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float grow = mix(2.4, 0.35, smoothstep(0.0, 0.5, t)); // 初期大(閃光) → 之後小(火花)
      gl_PointSize = (170.0 * grow) / max(0.5, -mv.z);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uBurst;
    uniform vec3 uColor;
    varying float vSeed;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float glow = exp(-d * 5.5);
      float life = smoothstep(0.0, 0.06, uBurst) * (1.0 - smoothstep(0.22, 1.0, uBurst)); // 快閃→衰減
      vec3 c = mix(vec3(1.0, 0.92, 0.72), uColor, vSeed * 0.75); // 白熱 → 橘
      gl_FragColor = vec4(c * glow * (1.6 + vSeed), glow * life);
    }
  `
})
const burstPoints = new THREE.Points(burstGeo, burstMat)
burstPoints.frustumCulled = false
const burstGroup = new THREE.Group()
burstGroup.add(burstPoints)
burstGroup.position.set(0, 0.01, 1.82) // 蛋中心
burstGroup.renderOrder = 60
burstGroup.visible = false

disposables.push(
  plexNodeGeo,
  plexLineGeo,
  plexCellGeo,
  burstGeo,
  burstMat,
  boneGridGeo,
  boneGridMat,
  boneTileGeo,
  boneTilesMat,
  dnaTileGeo,
  dnaTilesMat,
  dnaHoverSurfaceGeo,
  dnaHoverSurfaceMat,
  plexNodeMat,
  plexLineMat,
  plexCellMat,
  neuralBgGeo,
  neuralBgMat,
  eggShellGeo,
  eggShellMat,
  eggShardGeo,
  eggShardMat,
  embryoBodyGeo,
  embryoHeadGeo,
  embryoTailGeo,
  embryoLimbGeoA,
  embryoLimbGeoB,
  embryoMat,
  finaleBackdropGeo,
  finaleBackdropMat
)

const groundGrid = buildGroundGrid()
const backboneSampleGroup = buildBackboneSample()

group.add(groundGrid)
group.add(dnaGroup)
group.add(initialLogoGroup)
group.add(backboneSampleGroup)
group.add(geckoGroup)
group.add(heroCardsGroup)
group.add(neuralBgMesh)
group.add(plexusGroup)
group.add(boneGridMesh)
group.add(boneTiles)
group.add(dnaHoverSurface)
group.add(dnaTiles)
group.add(finaleBackdropMesh)
group.add(roomMesh)
for (const roomGridMesh of roomGridMeshes) group.add(roomGridMesh)
group.add(logoSignGroup)
group.add(finaleButtonGroup)
group.add(eggGroup)
group.add(burstGroup)
loadGeckoModel()
loadBackboneModel()

const groupRef = shallowRef<THREE.Group>(group)

const { onBeforeRender } = useLoop()
const tres = useTresContext()
let envRT: THREE.WebGLRenderTarget | null = null
let roomEnvRT: THREE.WebGLRenderTarget | null = null
let envDone = false
let rendererRef: THREE.WebGLRenderer | null = null
// 終章材質預熱：蛋殼碎片(反射玻璃)、金屬胚胎等 shader 較重，若等到轉場當下才首次繪製，
// GPU 會即時編譯造成 ~100ms 卡頓（轉場「不順」）。envMap 就緒後的前幾幀先強制繪製一次
// （此時 uEggReveal≈0 → 全 discard 不可見），把 shader 提前編譯掉。胚胎 GLB 載入後再補一輪。
const FINALE_PREWARM_FRAMES = 6
let finalePrewarmFrames = FINALE_PREWARM_FRAMES // 初始為滿=不預熱，envDone 時歸零啟動
let debugHudEl: HTMLDivElement | null = null // 網址 ?debug=1 顯示的即時數值面板（診斷真機捲動用）
const tmpRes = new THREE.Vector2()
let responsiveViewportWidth = 0
let responsiveViewportHeight = 0
let responsiveSceneScale = 1
let responsiveIsCompact = false
// 斜縫/終章 wipe 的對角座標權重（a2,b2；a2+b2=2，桌機為 1,1）。
// d = a2·(x/W) + b2·(y/H) 仍落在 [0,2]，但可調整常數-d 線在直向手機上的視覺斜角。
// 手機直向時把 y 權重加大、x 權重縮小，使斜角壓回接近桌機（不再接近垂直）。
let seamWeightX = 1
let seamWeightY = 1
// 目標斜率量值（|dy/dx|）；natural 斜率 1/aspect 超過此值（直向）才校正。
// 0.45 ≈ 24°（比桌機再平一點，直向手機看起來更順、不再接近垂直）。調小=更平、調大=更陡。
const SEAM_TARGET_SLOPE = 0.45
const cardRaycaster = new THREE.Raycaster()
const cardPointerNdc = new THREE.Vector2()
const cardIntersections: THREE.Intersection[] = []
const finaleRaycaster = new THREE.Raycaster()
const finalePointerNdc = new THREE.Vector2()
const finaleIntersections: THREE.Intersection[] = []
let cardClickCanvas: HTMLCanvasElement | null = null
let lastCardPointerAt = 0
let cardInteractionReady = false
let finaleActionInteractionReady = false
let hoveredHeroCardTitle = ''
let hoveredFinaleActionTo = ''

function syncResponsiveSceneLayout() {
  if (typeof window === 'undefined') return
  const canvas =
    rendererRef?.domElement ?? document.querySelector<HTMLCanvasElement>('.hero-canvas')
  const rect = canvas?.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect?.width || window.innerWidth))
  const height = Math.max(1, Math.round(rect?.height || window.innerHeight))
  if (width === responsiveViewportWidth && height === responsiveViewportHeight) return

  responsiveViewportWidth = width
  responsiveViewportHeight = height
  const aspect = width / height
  const compact = window.matchMedia('(hover: none), (pointer: coarse)').matches
  // 直向與接近平方的手機都需要縮小構圖；手機橫向寬畫面則保留原本比例。
  const narrowMobile = compact && aspect < 1.2

  // 以實際畫布比例計算，不依賴特定手機型號；窄直向螢幕縮放場景並拉寬視野，避免兩側裁切。
  const nextScale = narrowMobile ? THREE.MathUtils.clamp(0.44 + aspect * 0.26, 0.52, 0.8) : 1
  const nextFov = narrowMobile ? THREE.MathUtils.clamp(60 + (1.3 - aspect) * 32, 64, 82) : 55
  const camera = resolvePerspectiveCamera(tres.camera)
  if (camera && Math.abs(camera.fov - nextFov) > 0.01) {
    camera.fov = nextFov
    camera.updateProjectionMatrix()
  }

  responsiveSceneScale = nextScale
  responsiveIsCompact = compact
  // 直向手機斜縫 aspect 校正：只有在自然斜率(1/aspect)比目標更陡時才壓平；
  // 桌機/寬螢幕 1/aspect <= 目標 → 權重維持 1,1（完全不動桌機）。
  const naturalSlope = height / width // = 1/aspect
  if (compact && naturalSlope > SEAM_TARGET_SLOPE) {
    const ratio = SEAM_TARGET_SLOPE * aspect // a2/b2，使 slope = (a2/b2)/aspect = 目標
    seamWeightX = (2 * ratio) / (1 + ratio)
    seamWeightY = 2 / (1 + ratio)
  } else {
    seamWeightX = 1
    seamWeightY = 1
  }
  group.scale.setScalar(responsiveSceneScale)
  plexLineMat.resolution.set(width, height)
}
let cardPointerEventsBound = false
const SEAM_BAND = 0.85 // Logo 斜帶在 d 座標的寬度（越小越窄，桌機用）
const COMPACT_SEAM_BAND = 0.26 // 手機直向收窄黑色斜帶，避免骨幹揭露區被過寬遮罩壓縮
type ClipPoint = { x: number; y: number }

function pointBandValue(p: ClipPoint) {
  // CSS y 軸向下；shader y 軸向上，所以 d = x + (1 - y)。
  // 乘上與 canvas 相同的斜縫權重(a2,b2)，讓 DOM clip 與 canvas 對角在直向手機上仍完全對齊。
  return seamWeightX * p.x + seamWeightY * (1 - p.y)
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

function getHeroCardUnderPointer(event: MouseEvent | PointerEvent) {
  if (!cardInteractionReady || !heroCardsGroup.visible) return null
  const camera = resolveCamera(tres.camera)
  if (!camera) return null

  const canvas =
    cardClickCanvas ??
    rendererRef?.domElement ??
    document.querySelector<HTMLCanvasElement>('.hero-canvas')
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return null
  }

  cardPointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )
  cardRaycaster.setFromCamera(cardPointerNdc, camera)
  cardIntersections.length = 0
  cardRaycaster.intersectObjects(heroCardHitMeshes, false, cardIntersections)
  const hit = cardIntersections.find((item) => {
    const card = heroCardByMesh.get(item.object)
    return card && card.holder.visible
  })
  const raycastHit = hit ? (heroCardByMesh.get(hit.object) ?? null) : null
  if (raycastHit) return raycastHit

  let fallbackHit: HeroCardItem | null = null
  let fallbackScore = -Infinity
  for (const item of heroCardItems) {
    if (!item.holder.visible || item.front < -0.12) continue
    if (!isPointInsideProjectedCard(item, event.clientX, event.clientY, camera, rect)) continue
    if (item.front > fallbackScore) {
      fallbackScore = item.front
      fallbackHit = item
    }
  }
  return fallbackHit
}

function isPointInsideProjectedCard(
  item: HeroCardItem,
  x: number,
  y: number,
  camera: THREE.Camera,
  rect: DOMRect
) {
  const pts: ClipPoint[] = []
  for (const corner of cardHitboxCorners) {
    cardHitboxWorld.copy(corner)
    item.coreMesh.localToWorld(cardHitboxWorld)
    cardHitboxProjected.copy(cardHitboxWorld).project(camera)
    if (!Number.isFinite(cardHitboxProjected.x) || !Number.isFinite(cardHitboxProjected.y)) {
      return false
    }
    pts.push({
      x: (cardHitboxProjected.x * 0.5 + 0.5) * rect.width + rect.left,
      y: (-cardHitboxProjected.y * 0.5 + 0.5) * rect.height + rect.top
    })
  }

  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const pi = pts[i]
    const pj = pts[j]
    const intersect =
      pi.y > y !== pj.y > y &&
      x < ((pj.x - pi.x) * (y - pi.y)) / Math.max(0.0001, pj.y - pi.y) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

function setHoveredHeroCard(card: HeroCardItem | null) {
  const nextTitle = card?.card.title ?? ''
  if (nextTitle === hoveredHeroCardTitle) return
  hoveredHeroCardTitle = nextTitle
  if (cardClickCanvas) cardClickCanvas.style.cursor = nextTitle ? 'pointer' : ''
  if (typeof document !== 'undefined') document.body.style.cursor = nextTitle ? 'pointer' : ''
  wakeBottomRender()
}

function getFinaleActionUnderPointer(event: MouseEvent | PointerEvent) {
  if (!finaleActionInteractionReady || !finaleButtonGroup.visible) return null
  const camera = resolveCamera(tres.camera)
  if (!camera) return null
  const canvas = cardClickCanvas ?? rendererRef?.domElement
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  ) {
    return null
  }
  finalePointerNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  )
  finaleRaycaster.setFromCamera(finalePointerNdc, camera)
  finaleIntersections.length = 0
  finaleRaycaster.intersectObjects(finaleActionHitMeshes, false, finaleIntersections)
  for (const intersection of finaleIntersections) {
    const action = finaleActionByMesh.get(intersection.object)
    if (action) return action
  }
  return null
}

function setHoveredFinaleAction(action: FinaleActionItem | null) {
  const nextTo = action?.to ?? ''
  if (nextTo === hoveredFinaleActionTo) return
  hoveredFinaleActionTo = nextTo
  if (cardClickCanvas) cardClickCanvas.style.cursor = nextTo ? 'pointer' : ''
  if (typeof document !== 'undefined') document.body.style.cursor = nextTo ? 'pointer' : ''
  wakeBottomRender()
}

function onCardPointerMove(event: PointerEvent) {
  if (document.querySelector('.gallery-scene')) {
    setHoveredFinaleAction(null)
    setHoveredHeroCard(null)
    return
  }
  if (
    finaleActionInteractionReady &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  ) {
    setHoveredFinaleAction(getFinaleActionUnderPointer(event))
    setHoveredHeroCard(null)
    return
  }
  setHoveredFinaleAction(null)
  setHoveredHeroCard(getHeroCardUnderPointer(event))
}

function onCardPointerLeave() {
  setHoveredFinaleAction(null)
  setHoveredHeroCard(null)
}

function onCardClick(event: MouseEvent | PointerEvent) {
  if (document.querySelector('.gallery-scene')) return
  const now = performance.now()
  if (now - lastCardPointerAt < 180) return
  const finaleAction = getFinaleActionUnderPointer(event)
  if (finaleAction) {
    event.preventDefault()
    lastCardPointerAt = now
    wakeBottomRender()
    emit('finale-action', finaleAction.to)
    return
  }
  const card = getHeroCardUnderPointer(event)
  if (!card) return

  event.preventDefault()
  lastCardPointerAt = now
  wakeBottomRender()
  emit('card-select', card.card)
}

function hasFinePointer() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

function bindCardClickCanvas(canvas: HTMLCanvasElement) {
  if (cardClickCanvas === canvas) return
  cardClickCanvas = canvas
  if (cardPointerEventsBound) return
  cardPointerEventsBound = true
  window.addEventListener('click', onCardClick, true)
  // 觸控裝置只保留 click 觸發，避免把 hover/pointermove 綁到手機造成耗電與誤觸。
  if (hasFinePointer()) {
    window.addEventListener('pointermove', onCardPointerMove, true)
    window.addEventListener('pointerleave', onCardPointerLeave, true)
    window.addEventListener('pointercancel', onCardPointerLeave, true)
    window.addEventListener('blur', onCardPointerLeave, true)
  }
}

function resolveCamera(x: unknown): THREE.Camera | null {
  const seen = new Set<unknown>()
  const cands = [x]
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]
    if (!c || seen.has(c)) continue
    seen.add(c)
    if (c && typeof (c as THREE.Camera).projectionMatrix !== 'undefined') {
      return c as THREE.Camera
    }
    const wrapped = c as {
      value?: unknown
      instance?: unknown
      camera?: unknown
      object?: unknown
      current?: unknown
      activeCamera?: unknown
      cameras?: unknown
    }
    cands.push(
      wrapped.value,
      wrapped.instance,
      wrapped.camera,
      wrapped.object,
      wrapped.current,
      wrapped.activeCamera
    )
    if (Array.isArray(wrapped.cameras)) cands.push(...wrapped.cameras)
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
  bindCardClickCanvas(webgl.domElement)
  webgl.localClippingEnabled = true
  webgl.setClearColor(0x07080a, 0)
  const pmrem = new THREE.PMREMGenerator(webgl)
  envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  initialLogoMat.envMap = envRT.texture
  initialLogoMat.needsUpdate = true
  initialLogoBodyMat.envMap = envRT.texture
  initialLogoBodyMat.needsUpdate = true
  plateMetalMat.envMap = envRT.texture
  plateMetalMat.needsUpdate = true
  pyramidGlassMat.envMap = envRT.texture // ?餌???/???啣?
  pyramidGlassMat.needsUpdate = true
  eggShellMat.envMap = envRT.texture
  eggShellMat.needsUpdate = true
  embryoMat.envMap = envRT.texture // 金屬胚胎的反射環境
  embryoMat.needsUpdate = true
  // 碎片改用「房間本身」烘成的環境貼圖：反射到的就是畫面裡真正的暖房間 + 天花板燈，
  // 不再反射 three.js 內建的通用棚房 → 反光才顯得真實、與場景一致。
  const roomEnvScene = new THREE.Scene()
  const roomEnvMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide
  })
  const roomEnvMesh = new THREE.Mesh(roomGeo, roomEnvMat) // 置於原點：往上看=天花板燈、往下=地板、四周=暖牆
  roomEnvScene.add(roomEnvMesh)
  roomEnvRT = pmrem.fromScene(roomEnvScene, 0.12) // 稍微模糊 → 玻璃反射柔和不刺
  roomEnvMat.dispose()
  eggShardMat.envMap = roomEnvRT.texture
  eggShardMat.needsUpdate = true
  for (const item of heroCardItems) {
    item.coreMat.needsUpdate = true
  }
  pmrem.dispose()
  // envMap 已就緒（最終 shader 定案）→ 啟動終章材質預熱。
  finalePrewarmFrames = 0
}

onBeforeRender(({ elapsed, delta }) => {
  uniforms.uTime.value = elapsed
  if (!envDone) initEnvMap()
  syncResponsiveSceneLayout()
  // 卡住/切回分頁時 delta 會爆大，夾住上限避免一次跳太多
  const dt = Math.min(delta, 0.05)
  currentRotationY += (targetRotationY - currentRotationY) * fpsSmooth(CFG.wheel.damping, dt)
  // 觸控拖曳輸入更密集，手機提高一點追蹤速度，避免轉場落後手指太多。
  const timelineDamping = responsiveIsCompact ? 0.18 : 0.14 // 調緊：骨幹揭露隨捲動貼近，不落後（修「骨幹沒完整揭露」）
  currentTimeline += (targetTimeline - currentTimeline) * fpsSmooth(timelineDamping, dt)
  const introReveal = stageValue(currentTimeline, 0, introRevealSpan, introRevealMax)
  const gridReveal = stageValue(currentTimeline, gridRevealStart, gridRevealSpan, introRevealMax)
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
  // 手機斜帶縮窄，避免直向畫面被黑色轉場面積切掉過半；桌面維持原本寬度。
  const activeSeamBand = responsiveIsCompact ? COMPACT_SEAM_BAND : SEAM_BAND
  const seamA = THREE.MathUtils.clamp(sweep * (2 + activeSeamBand), 0, 2) // Scene01 保留 d>seamA（右上）
  const seamB = THREE.MathUtils.clamp(sweep * (2 + activeSeamBand) - activeSeamBand, 0, 2) // Scene03 保留 d<seamB（左下）
  const introSeamProgress = THREE.MathUtils.clamp(Math.pow(introReveal, 0.58), 0, 1)
  const introSeam = THREE.MathUtils.lerp(0.18, 2.16, introSeamProgress)
  uniforms.uSeamA.value = seamA
  uniforms.uSeamB.value = seamB
  uniforms.uIntroSeam.value = introSeam
  if (rendererRef) {
    rendererRef.getDrawingBufferSize(tmpRes)
    // 前面斜帶（uResolution）：餵入「有效解析度」= (W/a2, H/b2)，讓 d = a2·x/W + b2·y/H
    // 一次壓平斜縫的對角斜角（桌機權重 1,1 → 等同原值）。
    uniforms.uResolution.value.set(tmpRes.x / seamWeightX, tmpRes.y / seamWeightY)
    // 終章 wipe（uEggRes，已解耦）：x 設超大 → x 貢獻≈0，sd ≈ 2·(y/H) → 水平線由下往上掃。
    uniforms.uEggRes.value.set(1e7, tmpRes.y / 2)
  }
  // Logo 盤旋轉：橫跨 T1+T2 的單一單調曲線。
  // 直接對線性 sweep（0→1 已單調跨越 T1+T2）套「一次」smoothstep：
  // 只有最頭(−90°)與最尾(+90°)平滑，中間（含正面）等速通過。
  // 舊版用兩段獨立 smoothstep 相加，會在接點(正面)各自 ease-out/ease-in 疊成
  // 停頓平台，導致「轉到正面後減速、T2 幅度很小」——改成單一 smoothstep 消除。
  const logoRotateProgress = THREE.MathUtils.smoothstep(sweep, 0.0, 1.0)
  const logoDnaProgress = THREE.MathUtils.clamp(
    Math.max(
      currentTimeline / Math.max(DNA_LOGO_TRAVEL_SPAN, 0.001),
      sweep / Math.max(scene01ExitSweep, 0.001)
    ),
    0,
    1
  )
  const geckoRevealTimeline = stageValue(
    currentTimeline,
    geckoRevealStart,
    geckoRevealSpan,
    introRevealMax
  )
  const geckoRevealCutProgress = THREE.MathUtils.smoothstep(geckoRevealTimeline, 0.02, 1.0)
  const geckoPointPresence = THREE.MathUtils.smoothstep(geckoRevealTimeline, 0.0, 0.045)
  const geckoAssemblyProgress = THREE.MathUtils.smoothstep(geckoRevealTimeline, 0.08, 0.72)
  const geckoShellProgress = THREE.MathUtils.smoothstep(geckoRevealTimeline, 0.68, 0.9)
  const geckoRevealProgress = Math.pow(geckoRevealCutProgress, 1.08)
  const scene01Active = sweep < scene01ExitSweep // 起始頁 DNA 直接可見；後續由 seamA 斜帶退場
  const logoDnaPhaseActive = scene01Active && sweep < 0.995
  const initialLogoActive = scene01Active && logoDnaProgress < 0.995
  const logoDnaLiftVh = THREE.MathUtils.lerp(0, 108, logoDnaProgress)
  const logoDnaScale = THREE.MathUtils.lerp(0.92, 0.78, logoDnaProgress)
  const logoDnaBackdropOpacity = 0
  const logoDnaUnderlayBgOpacity = 0
  const gridIntroProgress = THREE.MathUtils.smoothstep(gridReveal, 0.0, 0.18)
  const scene3RevealThreshold = responsiveIsCompact ? 0.04 : 0.012
  const scene3RevealActive = seamB > scene3RevealThreshold || finalDna > stageEpsilon
  // 手機先完整露出骨幹，再開始卡片環繞；否則卡片會在斜帶中段偷跑，與骨幹揭露交疊。
  const cardsShouldRender = responsiveIsCompact
    ? targetCardOrbit > cardOrbitSettleEpsilon || currentCardOrbit > cardOrbitSettleEpsilon
    : scene3RevealActive ||
      targetCardOrbit > cardOrbitSettleEpsilon ||
      currentCardOrbit > cardOrbitSettleEpsilon
  const scene01GeckoActive = scene01Active && geckoPointPresence > 0.001
  const scene01GridActive = scene01Active && gridIntroProgress > 0.001
  const projectorActive = scene01GeckoActive && sweep < 0.995
  const projFade = projectorActive ? Math.max(geckoPointPresence * 0.28, geckoShellProgress) : 0
  // 手機骨幹與斜帶共用 seamB；原本用 sweep 會讓斜帶先走、網格與骨幹亮度稍後才跟上。
  const backboneReveal = responsiveIsCompact
    ? Math.max(THREE.MathUtils.smoothstep(seamB, 0.08, 0.72), finalDna)
    : Math.max(THREE.MathUtils.smoothstep(sweep, 0.35, 1.0), finalDna)
  const scene3Active = scene3RevealActive
  const revealPlaneOffset = THREE.MathUtils.lerp(-8.9, 4.2, geckoRevealProgress)
  group.rotation.y = 0
  dnaGroup.rotation.y = currentRotationY * DNA_SCROLL_ROTATION_FACTOR
  // Logo 與 DNA 共用完全相同的捲動旋轉係數，視覺上保持鎖定同步。
  initialLogoGroup.rotation.y = currentRotationY * DNA_SCROLL_ROTATION_FACTOR
  backboneSampleGroup.rotation.y = currentRotationY * 0.12
  // 守宮完成定角後固定，不再跟著滾動條旋轉。
  geckoGroup.rotation.y = GECKO_REST_ROT_Y * geckoRevealProgress
  geckoGroup.rotation.x = GECKO_REST_ROT_X * geckoRevealProgress
  geckoGroup.rotation.z = GECKO_REST_ROT_Z * geckoRevealProgress
  dnaGroup.scale.setScalar(DNA_LOGO_SCALE)
  dnaGroup.position.y = DNA_LOGO_TOP_ANCHOR_Y + DNA_LOGO_SCROLL_RISE * logoDnaProgress
  dnaGroup.position.z = CFG.dna.z
  // 溶入盤底：DNA 頂端（世界高度 = dnaTopWorldY，等同 Logo 盤中心）漸淡溶進盤裡。
  // 溶解帶隨 DNA 上升一起上移，故起始頁（盤在畫面中心）可見溶入，之後溶解帶升到畫面外、不影響本體。
  const dnaTopWorldY = DNA_LOGO_SCROLL_RISE * logoDnaProgress
  if (dnaTubeMat.uniforms.uDissolveStart) {
    dnaTubeMat.uniforms.uDissolveStart.value = dnaTopWorldY - 1.6
    dnaTubeMat.uniforms.uDissolveEnd.value = dnaTopWorldY - 0.2
    dnaTubeMat.uniforms.uDissolveStrength.value = 1
    dnaDetailMat.uniforms.uDissolveStart.value = dnaTopWorldY - 1.6
    dnaDetailMat.uniforms.uDissolveEnd.value = dnaTopWorldY - 0.2
    dnaDetailMat.uniforms.uDissolveStrength.value = 1
    dnaAuxMat.uniforms.uDissolveStart.value = dnaTopWorldY - 1.6
    dnaAuxMat.uniforms.uDissolveEnd.value = dnaTopWorldY - 0.2
    dnaAuxMat.uniforms.uDissolveStrength.value = 1
  }
  initialLogoGroup.position.y = DNA_LOGO_SCROLL_RISE * logoDnaProgress
  backboneSampleGroup.position.set(0, 0, 1.1)
  geckoGroup.position.y = CFG.gecko.y + GECKO_GROUP_Y_OFFSET
  geckoGroup.position.z = CFG.gecko.z
  dnaGroup.visible = scene01Active
  initialLogoGroup.visible = initialLogoActive
  // 守宮點雲從起始頁就在（散開），隨捲動連續組裝成守宮（同一團、不消失/不重接）。
  geckoGroup.visible = scene01Active || (projectorActive && projFade > 0.01)
  groundGrid.visible = scene01GridActive
  dnaTiles.visible = groundGrid.visible
  dnaTilesMat.uniforms.uOpacity.value = gridIntroProgress
  if (dnaTiles.visible) {
    const _dcam = resolvePerspectiveCamera(tres.camera)
    if (_dcam) {
      dnaHoverSurface.updateMatrixWorld(true)
      boneGridNdc.set(parallaxPointer.x, parallaxPointer.y)
      dnaGridRaycaster.setFromCamera(boneGridNdc, _dcam)
      dnaGridIntersections.length = 0
      dnaGridRaycaster.intersectObject(dnaHoverSurface, false, dnaGridIntersections)
      if (dnaGridIntersections.length > 0) {
        dnaGridHit.copy(dnaGridIntersections[0].point)
        dnaGridMouseTarget.copy(dnaGridHit)
      } else if (dnaGridRaycaster.ray.intersectPlane(dnaGridPlane, dnaGridHit)) {
        dnaGridMouseTarget.copy(dnaGridHit)
      } else {
        dnaGridMouseTarget.set(0, DNA_GRID_Y, DNA_GRID_Z)
      }
    }
    updateDnaTileLifts(dt)
  }
  geckoMat.uniforms.uAlpha.value = 0.58
  // 本體以碎化揭露驅動（逐格碎片成形）；uOpacityMul 只做整體 gating 與極短安全淡入，
  // 避免與碎片 alpha 雙重變暗，讓碎片清楚一格一格拼出。
  geckoMat.uniforms.uReveal.value = geckoShellProgress
  geckoMat.uniforms.uOpacityMul.value = projectorActive
    ? THREE.MathUtils.smoothstep(geckoShellProgress, 0.0, 0.08)
    : 0
  // 起始頁給底值 0.26（散開可見）→ 隨 geckoRevealTimeline 連續組裝到 1（不跳）。
  geckoAssemblyPointsMat.uniforms.uIntroReveal.value = Math.max(
    scene01Active ? 0.26 : 0,
    geckoRevealTimeline
  )
  // alpha：起始頁的散開星雲底值（隨組裝淡出）與投影段的原本 alpha 取大 → 連續交接。
  geckoAssemblyPointsMat.uniforms.uAlpha.value = Math.max(
    scene01Active ? 0.3 * (1 - geckoAssemblyProgress) : 0,
    projectorActive
      ? 0.28 * geckoPointPresence +
          THREE.MathUtils.smoothstep(geckoShellProgress, 0.58, 0.9) *
            (0.095 + 0.02 * (0.5 + 0.5 * Math.sin(elapsed * 6.4)))
      : 0
  )
  // 投影金字塔/底座在斜帶掃過後直接關掉，不殘留到 Scene3 揭露完成後。
  pyramidGlassMat.visible = projectorActive
  pyramidEdgeMat.visible = projectorActive
  ringMat.visible = projectorActive
  plateMetalMat.visible = projectorActive
  pyramidGlassMat.opacity = 0.028 * projFade
  pyramidEdgeMat.opacity = 0.95 * projFade
  ringMat.opacity = 0.22 * projFade
  plateMetalMat.opacity = projFade
  // 骨幹（Scene03）：seamB>0 才顯示，材質內以 seamB 由左下 discard 露出。
  // 骨幹/網格改由 shader 的斜向 wipe（uEggReveal，含 7px 小方塊）逐格掃掉，掃過整個畫面後才隱藏（省效能）。
  // 不再一進轉場就 visible=false（那會瞬間消失，與蛋場景的方格 wipe 脫節 → Issue 3）。
  const finaleWipeDone = uniforms.uEggReveal.value >= 0.985
  backboneSampleGroup.visible = seamB > 0.001 && !finaleWipeDone
  backboneSampleGroup.scale.setScalar(BACKBONE_SCALE)
  backboneSampleMat.uniforms.uAlpha.value = 0.85 + backboneReveal * 0.08
  // ── Scene3 卡片環繞軸心：與骨幹一起被斜帶揭露，初始為第一張正中、其餘沿右下排隊，
  //    捲動時依序從右下進中間，再往左上繞到骨幹後側。──
  const cardOrbitDelta = targetCardOrbit - currentCardOrbit
  currentCardOrbit += cardOrbitDelta * fpsSmooth(cardOrbitDamping, dt)
  if (Math.abs(cardOrbitDelta) < cardOrbitSettleEpsilon) {
    currentCardOrbit = targetCardOrbit
  }
  const nextSceneDelta = targetNextSceneProgress - currentNextSceneProgress
  currentNextSceneProgress += nextSceneDelta * fpsSmooth(nextSceneDamping, dt)
  if (Math.abs(nextSceneDelta) < nextSceneSettleEpsilon) {
    currentNextSceneProgress = targetNextSceneProgress
  }
  const placeholderDelta = targetPlaceholderProgress - currentPlaceholderProgress
  currentPlaceholderProgress += placeholderDelta * fpsSmooth(nextSceneDamping, dt)
  if (Math.abs(placeholderDelta) < nextSceneSettleEpsilon) {
    currentPlaceholderProgress = targetPlaceholderProgress
  }
  const finaleReveal = THREE.MathUtils.clamp(currentPlaceholderProgress, 0, 1)
  const finaleTargetReveal = THREE.MathUtils.clamp(targetPlaceholderProgress, 0, 1)
  const finaleActive = finaleReveal > stageEpsilon || finaleTargetReveal > stageEpsilon
  // 蛋只在最後場景本身開始揭露時出現，不能提前掛在骨幹退場的粒子段。
  const finalePreReveal = THREE.MathUtils.smoothstep(finaleReveal, 0.001, 0.04)
  eggUniforms.uFinaleReveal.value = finaleReveal

  // ── 蛋場景 wipe：在 canvas 內以螢幕座標斜向揭露（跟斜帶同機制）──
  // 「單調連續」掃滿：骨幹退場(nextScene)段 0→1 一路把房間掃滿，骨幹沿同一道斜縫逐格被掃掉
  // （一進一出交接）；進入終章(placeholder)後保持滿，蛋在完整房間內孵化。
  // 修：先前「掃到 0.7 凍住、等 placeholder 才續掃」→ 電腦版滾動會「卡住、再滾才繼續」；
  //     現在整段連續前進、不留中段凍結，收尾直接掃滿（右上角不再留黑）。
  const nextWipeP = Math.max(currentNextSceneProgress, targetNextSceneProgress)
  const placeholderWipeP = Math.max(currentPlaceholderProgress, targetPlaceholderProgress)
  // 手機的 nextScene 實際可視捲動距離較短；0.74 仍會在切到終章時留下半屏未掃完。
  const eggWipeEnd = responsiveIsCompact ? 0.44 : 0.85
  const eggWipeReveal = Math.max(
    THREE.MathUtils.smoothstep(nextWipeP, 0.0, eggWipeEnd), // 骨幹退場段連續掃到滿；手機提早收尾避免黑頂殘留
    placeholderWipeP > stageEpsilon ? 1 : 0 // 進終章後保持滿
  )
  eggUniforms.uEggReveal.value = eggWipeReveal
  const eggTransitionShow = eggWipeReveal > 0.001

  const finaleTransitionReveal = THREE.MathUtils.smoothstep(finaleReveal, 0.0, 0.05)
  const finaleTransitionVisible =
    finaleTransitionReveal > stageEpsilon || finalePreReveal > stageEpsilon || eggTransitionShow
  // 揭露期間蛋完整不透明（由 wipe 掃出來，而非靠 opacity 淡入）→ 不會「淡進來/跳出來」。
  const eggPresence = Math.max(finaleTransitionReveal, finalePreReveal, eggTransitionShow ? 1 : 0)
  // 終章從第一幀即為最終透明玻璃殼；禁止白霧殼再轉玻璃的第二種外觀。
  const eggShouldShow =
    finaleTransitionVisible ||
    finaleReveal > stageEpsilon ||
    finalePreReveal > stageEpsilon ||
    eggTransitionShow
  const eggSolidReveal = eggShouldShow ? 1 : THREE.MathUtils.smoothstep(finaleReveal, 0.0, 0.03)
  eggGroup.visible = eggShouldShow
  // 終章背景改用真正的 3D 房間（roomMesh）。停用舊的 2D quad 假透視背景 —
  // 其 occludeBackbone 會用不透明黑填滿「未揭露側」，把正在退場的骨幹整片蓋掉，
  // 使骨幹看起來瞬間消失、與蛋場景的方格 wipe 脫節（Issue 3）。改為完全關閉，
  // 讓未揭露側維持骨幹本體，交由各材質自己的斜向 wipe 逐格掃掉（房間則從已揭露側掃入）。
  finaleBackdropMesh.visible = false
  finaleBackdropMat.uniforms.uOpacity.value = 0
  finaleBackdropMat.uniforms.uOccludeBackbone.value = 0
  // 房間不透明、靠 shader 的斜向 wipe discard 揭露（與蛋、骨幹同一道邊界）。
  // 前 3 幀強制繪製一次做 shader 預熱（此時 uEggReveal≈0 → 全數 discard、不可見）。
  if (roomPrewarmFrames < 3) {
    roomMesh.visible = true
    roomPrewarmFrames++
  } else {
    roomMesh.visible = eggShouldShow
  }
  for (const roomGridMesh of roomGridMeshes) roomGridMesh.visible = roomMesh.visible
  logoSignGroup.visible = roomMesh.visible
  finaleButtonGroup.visible = roomMesh.visible
  finaleActionInteractionReady = finaleButtonGroup.visible && finaleReveal > 0.78
  if (!finaleActionInteractionReady) setHoveredFinaleAction(null)
  for (const finaleAction of finaleActionItems) {
    const hoverTarget = hoveredFinaleActionTo === finaleAction.to ? 1.045 : 1
    finaleAction.hoverScale += (hoverTarget - finaleAction.hoverScale) * fpsSmooth(0.18, dt)
    for (const object of finaleAction.objects) {
      object.scale.setScalar(finaleAction.hoverScale)
    }
    if (finaleAction.labelMesh && finaleAction.labelBaseY !== undefined) {
      // 文字比柱體多抬一點，避免斜面放大時把文字邊緣吃掉。
      finaleAction.labelMesh.position.y =
        finaleAction.labelBaseY + (finaleAction.hoverScale - 1) * 3.2
    }
  }
  // 柱體與網格只由轉場 shader 的方格 wipe 揭露，不做整體 opacity 漸入。
  finaleColumnMat.opacity = 1
  finaleButtonEdgeMat.opacity = 0.3
  const finaleLabelReveal = THREE.MathUtils.smoothstep(finaleReveal, 0.84, 1.0)
  if (finaleButtonGroup.visible) {
    for (const finaleLabelStream of finaleLabelStreams) {
      drawFinaleStreamText(finaleLabelStream, uniforms.uTime.value)
    }
    for (const finaleLabelTexture of finaleLabelTextures) {
      finaleLabelTexture.needsUpdate = true
    }
  }
  for (const finaleLabelMaterial of finaleLabelMaterials) {
    finaleLabelMaterial.opacity = 0.96 * finaleLabelReveal
  }
  // 全頁滑鼠視差：不再只由蛋殼出現進度 gating，所有場景都平滑跟隨游標。
  const parallaxCamRef = resolvePerspectiveCamera(tres.camera)
  if (parallaxCamRef) {
    const tx = parallaxPointer.x * 0.32
    const ty = parallaxPointer.y * 0.2
    const k = fpsSmooth(0.1, dt)
    parallaxCam.x += (tx - parallaxCam.x) * k
    parallaxCam.y += (ty - parallaxCam.y) * k
    parallaxCamRef.position.x = parallaxCam.x
    // 相機只跟隨全頁視差，不能在終章切換時再改變 Y 座標，避免滾動跨段瞬間跳動。
    parallaxCamRef.position.y = parallaxCam.y
  }
  // 骨幹/卡片場景神經背景：backbone 顯示時淡入，進終章淡出（終章由 finaleBackdrop 接手）。
  const neuralBgOpacity = backboneReveal * (1 - THREE.MathUtils.smoothstep(finaleReveal, 0.0, 0.12))
  // 骨幹場景背景全刪：neuralBg 只在骨幹/卡片顯示，關掉即「僅限骨幹場景背景全空」。
  // （DNA 用畫布底色、終章用房間，皆不受影響。）
  neuralBgMesh.visible = false
  neuralBgMat.uniforms.uOpacity.value = neuralBgOpacity
  // 3D Plexus 神經網：不旋轉；退場完全跟隨終章 wipe（在 shader 內用 uEggReveal，與骨幹同步）。
  // opacity 用 backboneReveal（不含終章淡出），讓像素格 wipe 完整負責退場。
  // 骨幹背景 plexus 已停用（整組隱藏；程式保留可還原）。
  plexUniforms.uOpacity.value = backboneReveal
  plexusGroup.visible = false
  // 骨幹背景：暖橘水平網格（僅限骨幹場景；退場交給 shader wipe）。
  boneGridMesh.visible = backboneReveal > 0.003 && !finaleWipeDone
  boneGridMat.uniforms.uOpacity.value = backboneReveal
  // 網格浮起格子：raycast 指標到地板平面(y=-4) → 近滑鼠的格子浮起發光。
  boneTiles.visible = boneGridMesh.visible
  boneTilesMat.uniforms.uOpacity.value = backboneReveal
  if (boneTiles.visible) {
    const _gcam = resolvePerspectiveCamera(tres.camera)
    if (_gcam) {
      boneGridNdc.set(parallaxPointer.x, parallaxPointer.y)
      boneGridRaycaster.setFromCamera(boneGridNdc, _gcam)
      if (boneGridRaycaster.ray.intersectPlane(boneGridPlane, boneGridHit)) {
        boneGridMouseTarget.copy(boneGridHit)
      } else {
        boneGridMouseTarget.set(0, BONE_GRID_Y, 0)
      }
    }
    updateBoneTileLifts(dt)
  }
  // ===== 終章延伸 =====
  // 胚胎 → 菲涅爾橘色全息（0.4→0.58）；蛋殼碎+胚胎聚攏成一點並消失（0.6→0.84）。
  const holoProg = THREE.MathUtils.smoothstep(finaleReveal, 0.4, 0.58)
  // 玻璃先收回原本蛋型(uShatter 回 0)，再跟胚胎一起淡出消失。
  const reassembleProg = THREE.MathUtils.smoothstep(finaleReveal, 0.57, 0.71) // 收回速度（區間中間值）
  const vanishProg = THREE.MathUtils.smoothstep(finaleReveal, 0.72, 0.88)
  embryoUniforms.uHologram.value = holoProg
  embryoUniforms.uFade.value = 1.0 - vanishProg
  const convScale = 1.0 - vanishProg // 回蛋型後整個蛋+胚胎一起縮小到點並消失
  // 縮成點後的爆發特效（中心閃光 + 火花外射）。
  const burstT = THREE.MathUtils.clamp((finaleReveal - 0.86) / 0.14, 0.0, 1.0)
  burstGroup.visible = burstT > 0.001 && burstT < 0.999
  burstMat.uniforms.uBurst.value = burstT
  if (eggGroup.visible) {
    // 蛋自建立起即使用最終顯示尺寸；聚攏階段整組縮到 0（碎片+胚胎收束成一點）。
    eggGroup.scale.set(
      EGG_DISPLAY_SCALE * convScale,
      EGG_Y_STRETCH * EGG_DISPLAY_SCALE * convScale,
      EGG_DISPLAY_SCALE * convScale
    )
    eggGroup.position.set(0, 0.01, 1.82)
    const eggRotationTarget = currentRotationY * 0.028 + finaleReveal * 0.42
    eggRotationY += (eggRotationTarget - eggRotationY) * fpsSmooth(0.08, dt)
    eggGroup.rotation.x = 0.04
    eggGroup.rotation.y = eggRotationY
    eggShellMat.transparent = true
    eggShellMat.depthWrite = false
    eggShellMat.opacity =
      0.045 * eggPresence * (1 - THREE.MathUtils.smoothstep(finaleReveal, 0.76, 0.92))
    eggShellMat.transmission = 0.985
    eggShellMat.thickness = 0.4
    eggShellMat.roughness = 0.02
    eggShellMat.envMapIntensity = 0.34
    eggShellMat.needsUpdate = true
  } else {
    eggShellMat.opacity = 0
    eggShellMat.transparent = true
    eggShellMat.depthWrite = false
    eggShellMat.transmission = 0.94
    eggShellMat.thickness = 0.76
    eggShellMat.roughness = 0.052
    eggShellMat.envMapIntensity = 0.42
    eggShellMat.needsUpdate = true
  }

  const heartbeatOmega = Math.PI * 2.0
  const heartbeatPulse = 0.5 + 0.5 * Math.sin(elapsed * heartbeatOmega)
  const heartGate =
    THREE.MathUtils.smoothstep(finaleReveal, 0.015, 0.07) *
    (1 - THREE.MathUtils.smoothstep(finaleReveal, 0.18, 0.38))
  const heartbeat = (0.55 + 0.35 * heartbeatPulse) * heartGate
  // 金屬胚胎：心跳改用微弱 emissive 脈動（金屬不透光，不再用 shader alpha）。
  embryoMat.emissiveIntensity = heartbeat * 0.4
  embryoGroup.visible = eggPresence > 0.001
  if (embryoGroup.visible) {
    // 補回原本材質 vertex 的 0.92 基準縮放（換金屬後移除）；心跳只保留微小呼吸避免穿膜。
    const embryoPulse = 0.92 * (1 + heartbeat * 0.03)
    embryoGroup.scale.set(embryoPulse, embryoPulse, embryoPulse)
    embryoGroup.rotation.z = -0.12 + heartbeat * 0.035
  }
  heartLight.intensity = heartbeat * 0.045

  // 全程用碎片蛋殼：從轉場揭露就顯示（組合成蛋形，靠 shader 斜向 wipe discard 揭露），
  // 炸開時序不變（仍由 shatterProg 驅動，揭露到炸開前 uShatter≈0 → 保持組合）。
  const shatterProg = THREE.MathUtils.smoothstep(finaleReveal, 0.16, 0.42) // 炸開速度（區間中間值）
  eggShardMesh.visible = eggGroup.visible
  if (eggShardMesh.visible) {
    eggShardMat.opacity = eggPresence * 0.32 * (1.0 - vanishProg) // 消失階段淡出
    // uShatter：先飛散(shatterProg)，聚攏階段再回到 0 → 碎片收回原本蛋型。
    eggShardUniforms.uShatter.value =
      shatterProg * shatterProg * (3.0 - 2.0 * shatterProg) * (1.0 - reassembleProg)
  }

  // 進度條：以平滑後的 timeline + 卡片環繞換算單一旅程進度，數值變動才 emit。
  let currentJourneyWheel = Math.min(currentTimeline / timelineWheelScale, timelineWheelLen)
  if (currentCardOrbit > cardOrbitSettleEpsilon) {
    currentJourneyWheel = Math.max(
      currentJourneyWheel,
      cardOrbitStartWheelLen + currentCardOrbit / cardOrbitSpeed
    )
  }
  if (
    currentNextSceneProgress > nextSceneSettleEpsilon ||
    currentPlaceholderProgress > nextSceneSettleEpsilon
  ) {
    currentJourneyWheel = cardsEndWheelLen + currentNextSceneProgress * nextSceneWheelLen
  }
  if (currentPlaceholderProgress > nextSceneSettleEpsilon) {
    currentJourneyWheel =
      nextSceneEndWheelLen + currentPlaceholderProgress * placeholderSceneWheelLen
  }
  const journeyProgress = THREE.MathUtils.clamp(currentJourneyWheel / totalJourneyWheelLen, 0, 1)
  if (Math.abs(journeyProgress - lastJourneyEmit) > 0.0008) {
    lastJourneyEmit = journeyProgress
    emit('journey-progress', journeyProgress)
  }
  if (Math.abs(currentNextSceneProgress - lastNextSceneEmit) > 0.001) {
    lastNextSceneEmit = currentNextSceneProgress
    emit('next-scene-progress', currentNextSceneProgress)
  }
  // 用 eggPresence（蛋一出現即為 1，含 wipe 揭露階段）驅動父層 Bloom 抑制，
  // 否則 finaleReveal 在揭露階段還≈0，Bloom 尚未壓低就已白爆。
  if (Math.abs(eggPresence - lastFinaleEmit) > 0.004) {
    lastFinaleEmit = eggPresence
    emit('finale-reveal', eggPresence)
  }
  // Scene3 捲動：骨幹沿 +Y 上移；卡片與下一場景共享同一段退場進度。
  const scene3Scroll = finalDna + (cardOrbitMax > 0 ? currentCardOrbit / cardOrbitMax : 0)
  const sceneExitProgress = currentNextSceneProgress + currentPlaceholderProgress
  const sceneExitWheelDistance =
    currentNextSceneProgress * nextSceneWheelLen +
    currentPlaceholderProgress * placeholderSceneWheelLen
  // 直向手機壓低骨幹在卡片段的上移量，讓完整骨幹保留在視窗內直到方塊轉場接手。
  const backboneSceneRise = BACKBONE_SCROLL_RISE * (responsiveIsCompact ? 0.38 : 1)
  backboneSampleGroup.position.y =
    BACKBONE_BASE_Y +
    backboneSceneRise * scene3Scroll +
    BACKBONE_NEXT_SCENE_RISE * sceneExitProgress
  spineLight.intensity = finaleActive ? 0 : backboneReveal * 0.85
  const cardFitScale = getMobileCardFitScale()
  heroCardsGroup.position.y = sceneExitProgress * CARD_NEXT_SCENE_RISE
  const cardsInteractive =
    targetNextSceneProgress <= nextSceneSettleEpsilon &&
    (targetCardOrbit > cardOrbitSettleEpsilon ||
      currentCardOrbit > cardOrbitSettleEpsilon ||
      currentTimeline >= cardOrbitInputStart - stageEpsilon)
  cardInteractionReady = cardsShouldRender && cardsInteractive
  heroCardsGroup.visible = cardsShouldRender
  if (cardsShouldRender) {
    cardOrbitUnlockedNow =
      (targetTimeline >= cardOrbitInputStart &&
        currentTimeline >= cardOrbitInputStart - stageEpsilon) ||
      targetCardOrbit > cardOrbitSettleEpsilon ||
      currentCardOrbit > cardOrbitSettleEpsilon
    const exitOrbitPhase = sceneExitWheelDistance * cardOrbitSpeed
    const orbitPhase = (cardOrbitUnlockedNow ? currentCardOrbit : 0) + exitOrbitPhase
    let activeCard: HeroCardItem | null = null
    let activeCardScore = -Infinity
    for (const it of heroCardItems) {
      const wa = orbitPhase - (cardEntranceAngle + it.index * cardStep)
      it.pivot.rotation.y = wa
      it.holder.position.y = cardRingY + wa * cardVerticalSlope
      const front = THREE.MathUtils.clamp(Math.cos(wa), -1, 1)
      it.front = front
      for (const mat of it.titleMats) mat.uniforms.uAlpha.value = mat === it.titleMat ? 0.9 : 0.2
      const hoverTarget = hoveredHeroCardTitle === it.card.title ? 1.045 : 1
      it.hoverScale += (hoverTarget - it.hoverScale) * fpsSmooth(0.18, dt)
      it.holder.scale.setScalar(
        cardFitScale * THREE.MathUtils.lerp(0.94, 1.02, Math.max(front, 0)) * it.hoverScale
      )
      it.holder.visible = true
      if (front > activeCardScore) {
        activeCardScore = front
        activeCard = it
      }
    }
    if (cardInteractionReady) {
      syncActiveHeroCard(activeCard?.card ?? null)
      syncActiveHeroCardHitbox(activeCard)
    } else {
      setHoveredHeroCard(null)
      syncActiveHeroCard(null)
      syncActiveHeroCardHitbox(null)
    }
  } else {
    cardOrbitUnlockedNow = false
    cardInteractionReady = false
    setHoveredHeroCard(null)
    for (const it of heroCardItems) {
      const wa = -(cardEntranceAngle + it.index * cardStep)
      it.pivot.rotation.y = wa
      it.holder.position.y = cardRingY + wa * cardVerticalSlope
      it.front = 0
      for (const mat of it.titleMats) mat.uniforms.uAlpha.value = mat === it.titleMat ? 0.9 : 0.2
      it.hoverScale = 1
      it.holder.scale.setScalar(cardFitScale)
      it.holder.visible = false
    }
    syncActiveHeroCard(null)
    syncActiveHeroCardHitbox(null)
  }
  uniforms.uRevealPlaneOffset.value = revealPlaneOffset
  currentGridReveal +=
    (gridReveal * gridIntroProgress * (1 - sweep) - currentGridReveal) * fpsSmooth(0.14, dt)
  gridMat.uniforms.uReveal.value = currentGridReveal
  gridMat.uniforms.uScroll.value = -currentTimeline * gridFlowRate
  revealClipPlane.constant = revealPlaneOffset
  exitClipPlane.constant = 20 // 內建材質改淡出，exit 平面恆不裁切
  const scrollHintProgress = THREE.MathUtils.clamp(currentTimeline / 180, 0, 1)
  const bandActive = sweep > stageEpsilon && sweep < 0.999
  const bottomRenderSettled =
    Math.abs(targetTimeline - currentTimeline) < 0.08 &&
    Math.abs(targetRotationY - currentRotationY) < 0.002 &&
    Math.abs(targetCardOrbit - currentCardOrbit) < cardOrbitSettleEpsilon &&
    Math.abs(targetNextSceneProgress - currentNextSceneProgress) < nextSceneSettleEpsilon &&
    Math.abs(targetPlaceholderProgress - currentPlaceholderProgress) < nextSceneSettleEpsilon
  const finaleNeedsRender = finaleActive || heartGate > 0.001 || eggPresence > 0.001
  const logoResting =
    bandActive && sweep > 0.08 && sweep < 0.98 && bottomRenderSettled && !finaleNeedsRender
  const nativeScrollMode =
    typeof document !== 'undefined' && document.body.classList.contains('hero-lab-active')
  // 卡片影片預覽需要持續更新 VideoTexture，因此卡片可見時不可切成手動渲染。
  setBottomRenderMode(!nativeScrollMode && logoResting && !cardsShouldRender ? 'manual' : 'always')
  // 只有數值真的變了才寫 CSS（否則每幀配置字串/物件 + 寫 DOM = GC + reflow）
  const initialLogoProgress = logoDnaProgress
  const initialLogoOpacity = initialLogoActive ? 1 : 0
  const underlayMode = bandActive ? 2 : initialLogoActive ? 1 : 0
  // 斜帶揭露時固定從左往右轉；sweep=0.5 時正面朝向鏡頭。
  const linkedLogoSpin = bandActive
    ? THREE.MathUtils.degToRad(THREE.MathUtils.lerp(-90, 90, logoRotateProgress))
    : Number.NaN
  const cssDirty =
    Math.abs(sweep - cssLastSweep) > 0.0004 ||
    Math.abs(scrollHintProgress - cssLastScrollHint) > 0.0004 ||
    Math.abs(logoRotateProgress - cssLastLogo) > 0.0004 ||
    Math.abs(initialLogoOpacity - cssLastIntroLogo) > 0.0008 ||
    Math.abs(logoDnaProgress - cssLastLogoDnaProgress) > 0.0008 ||
    (Number.isFinite(linkedLogoSpin)
      ? Math.abs(linkedLogoSpin - cssLastLogoSpin) > 0.0008
      : Number.isFinite(cssLastLogoSpin)) ||
    underlayMode !== cssLastUnderlayMode ||
    Math.abs(seamWeightX - cssLastSeamWeightX) > 0.0004 ||
    Math.abs(seamWeightY - cssLastSeamWeightY) > 0.0004
  if (cssDirty && typeof document !== 'undefined') {
    cssLastSweep = sweep
    cssLastScrollHint = scrollHintProgress
    cssLastLogo = logoRotateProgress
    cssLastIntroLogo = initialLogoOpacity
    cssLastLogoDnaProgress = logoDnaProgress
    cssLastLogoSpin = linkedLogoSpin
    cssLastUnderlayMode = underlayMode
    cssLastSeamWeightX = seamWeightX
    cssLastSeamWeightY = seamWeightY
    const el = document.documentElement.style
    el.setProperty('--hero-scroll-progress', String(scrollHintProgress))
    el.setProperty('--hero-exit-progress', String(sweep))
    el.setProperty('--hero-logo-next-progress', String(sweep))
    el.setProperty('--hero-logo-rotate-progress', String(logoRotateProgress))
    if (Number.isFinite(linkedLogoSpin)) {
      el.setProperty('--hero-logo-spin-rad', linkedLogoSpin.toFixed(5))
    } else {
      el.removeProperty('--hero-logo-spin-rad')
    }
    // canvas 全程不硬切（3D 內部以 seam 處理 Scene01 退場 / Scene03 進場）→ 消除交界閃動
    el.setProperty('--hero-clip', 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)')
    el.setProperty('--hero-canvas-z', '2')
    el.setProperty('--hero-canvas-blend', 'normal')
    // Logo underlay 固定在前層（z=3），不再做 1→3 硬跳
    el.setProperty('--hero-underlay-z', '3')
    el.setProperty(
      '--hero-underlay-opacity',
      bandActive ? '1' : initialLogoActive ? initialLogoOpacity.toFixed(4) : '0'
    )
    el.setProperty(
      '--hero-underlay-bg-opacity',
      bandActive
        ? responsiveIsCompact
          ? '0.82'
          : '1'
        : initialLogoActive
          ? logoDnaUnderlayBgOpacity.toFixed(4)
          : '0'
    )
    el.setProperty(
      '--hero-logo-backdrop-opacity',
      bandActive ? '1' : initialLogoActive ? logoDnaBackdropOpacity.toFixed(4) : '0'
    )
    el.setProperty('--hero-initial-logo-progress', initialLogoProgress.toFixed(4))
    el.setProperty('--hero-initial-logo-opacity', '0')
    el.setProperty('--hero-band-logo-opacity', bandActive ? '1' : '0')
    el.setProperty('--hero-initial-logo-scale', logoDnaScale.toFixed(4))
    el.setProperty('--hero-logo-dna-lift', `${logoDnaLiftVh.toFixed(2)}vh`)
    el.setProperty('--hero-initial-copy-opacity', bandActive ? '0.92' : '0')
    // Logo 斜帶 = seamB..seamA。CSS 也用 d = x + (1 - y) 的同一套座標，避免手機比例不同步。
    el.setProperty(
      '--hero-underlay-clip',
      bandActive ? makeBandClipPath(seamB, seamA) : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
    )
    // 斜帶內部凹陷光影：一條垂直於 TL–BR 斜縫的漸層，兩緣白+橘高光、內側微陰影
    // d ∈[0,2] 沿漸層軸線性對應 0→100%，故 pos = d/2*100；角度取 atan(H/W) 使軸線垂直斜縫
    if (bandActive) {
      const canvas = rendererRef?.domElement
      const vw = canvas?.clientWidth || window.innerWidth || 1
      const vh = canvas?.clientHeight || window.innerHeight || 1
      // 漸層軸沿 d 增加方向；權重納入後角度 = atan2(a2·H, b2·W)，與壓平後的斜縫垂直對齊。
      const ang = ((Math.atan2(seamWeightX * vh, seamWeightY * vw) * 180) / Math.PI).toFixed(2)
      const pB = (seamB / 2) * 100
      const pA = (seamA / 2) * 100
      const edgeCore = responsiveIsCompact ? 0.07 : 0.18
      const edgeFade = responsiveIsCompact ? 0.36 : 1.35
      const HI_CORE = responsiveIsCompact ? 'rgba(255,176,96,0.52)' : 'rgba(255,176,96,0.82)'
      const HI_SOFT = responsiveIsCompact ? 'rgba(226,87,30,0.14)' : 'rgba(226,87,30,0.28)'
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

  // 終章材質預熱（見宣告處說明）：載入早期前幾幀強制繪製終章 mesh 一次，把重的 shader
  // （反射玻璃碎殼、金屬胚胎、房間 wipe…）提前編譯掉；此時 uEggReveal≈0 → 全 discard 不顯示。
  // 放在所有可見性指派之後 → 這幾幀的強制可見會覆蓋常規邏輯，之後自動交還。
  if (finalePrewarmFrames < FINALE_PREWARM_FRAMES && uniforms.uEggReveal.value < 0.001) {
    finalePrewarmFrames++
    eggGroup.visible = true
    eggShardMesh.visible = true
    embryoGroup.visible = true
    roomMesh.visible = true
    for (const roomGridMesh of roomGridMeshes) roomGridMesh.visible = true
    logoSignGroup.visible = true
    finaleButtonGroup.visible = true
    wakeBottomRender()
  }

  // 除錯 HUD：網址加 ?debug=1 才顯示即時數值，讓真機截一張圖就能定位捲動/進度問題。
  if (typeof document !== 'undefined' && /[?&]debug/.test(window.location.search)) {
    if (!debugHudEl) {
      debugHudEl = document.createElement('div')
      debugHudEl.style.cssText =
        'position:fixed;left:6px;top:6px;z-index:99999;font:12px/1.4 monospace;color:#0f0;background:rgba(0,0,0,.72);padding:6px 8px;white-space:pre;pointer-events:none;border-radius:4px'
      document.body.appendChild(debugHudEl)
    }
    const _maxS = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    debugHudEl.textContent =
      'pct   ' +
      (window.scrollY / _maxS).toFixed(3) +
      '\nsweep ' +
      sweep.toFixed(2) +
      '\nnext  ' +
      currentNextSceneProgress.toFixed(2) +
      ' / ' +
      targetNextSceneProgress.toFixed(2) +
      '\nph    ' +
      currentPlaceholderProgress.toFixed(2) +
      ' / ' +
      targetPlaceholderProgress.toFixed(2) +
      '\nwipe  ' +
      eggWipeReveal.toFixed(2)
  }
})

// 進度條拖曳與原生 scrollbar 共用映射：
// immediate=true 給拖曳/跳關，current 直接對齊；immediate=false 給原生 scroll，僅更新 target，
// 由 render loop 的 fpsSmooth 阻尼追上，避免每格滾輪讓 3D 物件瞬間跳段。
function scrubTo(progress: number, immediate = true) {
  wakeBottomRender()
  const clamped = THREE.MathUtils.clamp(progress, 0, 1)
  const targetWheel = clamped * totalJourneyWheelLen
  // 原生 scrollbar 模式不會進 applyScrollDelta；旋轉量必須由絕對進度同步，
  // 否則骨幹/DNA 會只切 timeline 而不轉。
  const rotation = targetWheel * CFG.wheel.speed
  targetRotationY = rotation
  if (immediate) currentRotationY = rotation
  if (targetWheel <= cardOrbitStartWheelLen) {
    const t = THREE.MathUtils.clamp(targetWheel * timelineWheelScale, 0, scene3HoldTimeline)
    targetTimeline = t
    if (immediate) currentTimeline = t
    targetCardOrbit = 0
    if (immediate) currentCardOrbit = 0
    targetNextSceneProgress = 0
    if (immediate) currentNextSceneProgress = 0
    targetPlaceholderProgress = 0
    if (immediate) currentPlaceholderProgress = 0
    cardOrbitUnlockedNow = false
  } else if (targetWheel <= cardsEndWheelLen) {
    const t = THREE.MathUtils.clamp(targetWheel * timelineWheelScale, 0, scene3HoldTimeline)
    targetTimeline = t
    if (immediate) currentTimeline = t
    const c = THREE.MathUtils.clamp(
      (targetWheel - cardOrbitStartWheelLen) * cardOrbitSpeed,
      0,
      cardOrbitMax
    )
    targetCardOrbit = c
    if (immediate) currentCardOrbit = c
    targetNextSceneProgress = 0
    if (immediate) currentNextSceneProgress = 0
    targetPlaceholderProgress = 0
    if (immediate) currentPlaceholderProgress = 0
    cardOrbitUnlockedNow = true
  } else if (targetWheel <= nextSceneEndWheelLen) {
    targetTimeline = scene3HoldTimeline
    if (immediate) currentTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    if (immediate) currentCardOrbit = cardOrbitMax
    const n = THREE.MathUtils.clamp((targetWheel - cardsEndWheelLen) / nextSceneWheelLen, 0, 1)
    targetNextSceneProgress = n
    if (immediate) currentNextSceneProgress = n
    targetPlaceholderProgress = 0
    if (immediate) currentPlaceholderProgress = 0
    cardOrbitUnlockedNow = true
  } else {
    targetTimeline = scene3HoldTimeline
    if (immediate) currentTimeline = scene3HoldTimeline
    targetCardOrbit = cardOrbitMax
    if (immediate) currentCardOrbit = cardOrbitMax
    targetNextSceneProgress = 1
    if (immediate) currentNextSceneProgress = 1
    const p = THREE.MathUtils.clamp(
      (targetWheel - nextSceneEndWheelLen) / placeholderSceneWheelLen,
      0,
      1
    )
    targetPlaceholderProgress = p
    if (immediate) currentPlaceholderProgress = p
    cardOrbitUnlockedNow = true
  }

  if (!immediate) {
    currentRotationY += (targetRotationY - currentRotationY) * nativeScrollInputPull
    if (targetWheel > timelineWheelLen) {
      currentTimeline = scene3HoldTimeline
    } else {
      currentTimeline += (targetTimeline - currentTimeline) * nativeScrollInputPull
    }
    currentCardOrbit += (targetCardOrbit - currentCardOrbit) * nativeScrollCardInputPull
    currentNextSceneProgress +=
      (targetNextSceneProgress - currentNextSceneProgress) * nativeScrollNextInputPull
    currentPlaceholderProgress +=
      (targetPlaceholderProgress - currentPlaceholderProgress) * nativeScrollNextInputPull
  }

  if (
    targetNextSceneProgress > nextSceneSettleEpsilon ||
    targetTimeline < cardOrbitInputStart - stageEpsilon
  ) {
    cardInteractionReady = false
    setHoveredHeroCard(null)
    syncActiveHeroCard(null)
    syncActiveHeroCardHitbox(null)
  } else if (!immediate) {
    syncCardInteractionFromScrollTarget()
  }
}

function syncCardInteractionFromScrollTarget() {
  const cardFitScale = getMobileCardFitScale()
  const sceneExitWheelDistance =
    currentNextSceneProgress * nextSceneWheelLen +
    currentPlaceholderProgress * placeholderSceneWheelLen
  const orbitPhase = currentCardOrbit + sceneExitWheelDistance * cardOrbitSpeed
  let activeCard: HeroCardItem | null = null
  let activeCardScore = -Infinity

  heroCardsGroup.visible = true
  cardInteractionReady = true
  for (const it of heroCardItems) {
    const wa = orbitPhase - (cardEntranceAngle + it.index * cardStep)
    it.pivot.rotation.y = wa
    it.holder.position.y = cardRingY + wa * cardVerticalSlope
    const front = THREE.MathUtils.clamp(Math.cos(wa), -1, 1)
    it.front = front
    it.holder.visible = true
    it.holder.scale.setScalar(
      cardFitScale * THREE.MathUtils.lerp(0.94, 1.02, Math.max(front, 0)) * it.hoverScale
    )
    if (front > activeCardScore) {
      activeCardScore = front
      activeCard = it
    }
  }

  syncActiveHeroCard(activeCard?.card ?? null)
  syncActiveHeroCardHitbox(activeCard)
}

defineExpose({ scrubTo })

onMounted(() => {
  if (cardPreviewVideo) {
    cardPreviewVideo.play().catch(() => {
      // 瀏覽器未允許自動播放時，仍可在下一次使用者互動後開始更新預覽。
    })
  }
  emit('journey-segments', journeySegments)
  emit('next-scene-progress', 0)
  if (hasFinePointer()) {
    window.addEventListener('pointermove', onParallaxPointerMove, { passive: true })
  }
  requestAnimationFrame(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('.hero-canvas')
    if (canvas) bindCardClickCanvas(canvas)
  })
  window.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
  window.addEventListener('touchcancel', onTouchEnd, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', forceWakeRender)
  window.addEventListener('pageshow', forceWakeRender)
  // Debug：瞬間跳關（僅供 hero-lab 驗證用）
  // 版本標記：在 Console 打 window.__heroBuild 可確認瀏覽器跑的是不是最新模組（排除 HMR/快取殘留）。
  ;(window as unknown as { __heroBuild?: string }).__heroBuild = 'debug-hud @2026-08-18f'
  // eslint-disable-next-line no-console
  console.log('[hero-build]', (window as unknown as { __heroBuild?: string }).__heroBuild)
  ;(window as unknown as { __hero?: unknown }).__hero = {
    jump(t: number, c = 0) {
      wakeBottomRender()
      targetTimeline = t
      currentTimeline = t
      targetCardOrbit = c
      currentCardOrbit = c
      targetNextSceneProgress = 0
      currentNextSceneProgress = 0
      targetPlaceholderProgress = 0
      currentPlaceholderProgress = 0
    },
    // 即時試胚胎 GLB 定位：__hero.embryo(rx, ry, rz, scaleMul)（弧度 + 縮放倍率）。
    embryo(rx?: number, ry?: number, rz?: number, s?: number) {
      wakeBottomRender()
      if (typeof rx === 'number') EMBRYO_ROT_X = rx
      if (typeof ry === 'number') EMBRYO_ROT_Y = ry
      if (typeof rz === 'number') EMBRYO_ROT_Z = rz
      if (typeof s === 'number') EMBRYO_SCALE_MUL = s
      if (embryoModelHolder) {
        embryoModelHolder.rotation.set(EMBRYO_ROT_X, EMBRYO_ROT_Y, EMBRYO_ROT_Z)
        const base = embryoModelHolder.userData.baseScale || 1
        embryoModelHolder.scale.setScalar(base * EMBRYO_SCALE_MUL)
      }
      return { rx: EMBRYO_ROT_X, ry: EMBRYO_ROT_Y, rz: EMBRYO_ROT_Z, s: EMBRYO_SCALE_MUL }
    },
    // 即時試守宮定角：__hero.geckoRot(y, x, z)（弧度）。回傳目前值。
    geckoRot(y?: number, x?: number, z?: number) {
      wakeBottomRender()
      if (typeof y === 'number') GECKO_REST_ROT_Y = y
      if (typeof x === 'number') GECKO_REST_ROT_X = x
      if (typeof z === 'number') GECKO_REST_ROT_Z = z
      return { y: GECKO_REST_ROT_Y, x: GECKO_REST_ROT_X, z: GECKO_REST_ROT_Z }
    },
    scene3(c = 0, n = 0, p = 0) {
      wakeBottomRender()
      targetTimeline = scene3HoldTimeline
      currentTimeline = scene3HoldTimeline
      targetCardOrbit = c
      currentCardOrbit = c
      targetNextSceneProgress = n
      currentNextSceneProgress = n
      targetPlaceholderProgress = p
      currentPlaceholderProgress = p
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
      targetNextSceneProgress,
      currentNextSceneProgress,
      targetPlaceholderProgress,
      currentPlaceholderProgress,
      targetRotationY,
      currentRotationY,
      heroCardsVisible: heroCardsGroup.visible,
      heroCardItems: heroCardItems.length,
      heroCardVisibleHolders: heroCardItems.filter((item) => item.holder.visible).length,
      heroCardHitMeshes: heroCardHitMeshes.length,
      cardInteractionReady,
      cardOrbitUnlockedNow,
      bottomRenderMode: lastBottomRenderMode
    }),
    hit: (x: number, y: number) =>
      getHeroCardUnderPointer({ clientX: x, clientY: y } as MouseEvent)?.card.title ?? null,
    cardQuads: () => {
      const camera = resolveCamera(tres.camera)
      const canvas =
        cardClickCanvas ??
        rendererRef?.domElement ??
        document.querySelector<HTMLCanvasElement>('.hero-canvas')
      if (!camera || !canvas) return []
      const rect = canvas.getBoundingClientRect()
      return heroCardItems
        .filter((item) => item.holder.visible)
        .map((item) => {
          const pts = cardHitboxCorners.map((corner) => {
            cardHitboxWorld.copy(corner)
            item.coreMesh.localToWorld(cardHitboxWorld)
            cardHitboxProjected.copy(cardHitboxWorld).project(camera)
            return {
              x: (cardHitboxProjected.x * 0.5 + 0.5) * rect.width + rect.left,
              y: (-cardHitboxProjected.y * 0.5 + 0.5) * rect.height + rect.top
            }
          })
          return { title: item.card.title, front: item.front, pts }
        })
    }
  }
})

onUnmounted(() => {
  setBottomRenderMode('always')
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
  if (touchMomentumRaf) window.cancelAnimationFrame(touchMomentumRaf)
  if (debugHudEl) {
    debugHudEl.remove()
    debugHudEl = null
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', forceWakeRender)
  window.removeEventListener('pageshow', forceWakeRender)
  window.removeEventListener('click', onCardClick, true)
  window.removeEventListener('pointermove', onCardPointerMove, true)
  window.removeEventListener('pointerleave', onCardPointerLeave, true)
  window.removeEventListener('pointercancel', onCardPointerLeave, true)
  window.removeEventListener('blur', onCardPointerLeave, true)
  window.removeEventListener('pointermove', onParallaxPointerMove)
  cardPointerEventsBound = false
  if (cardPreviewVideo) {
    cardPreviewVideo.pause()
    cardPreviewVideo.removeAttribute('src')
    cardPreviewVideo.load()
  }
  if (cardClickCanvas) cardClickCanvas.style.cursor = ''
  document.body.style.cursor = ''
  cardClickCanvas = null

  if (loadedModel) {
    geckoGroup.remove(loadedModel)
    loadedModel.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }

  if (loadedBackboneInner) {
    // 脊髓線的 TubeGeometry 已加入 disposables，這裡只需脫離場景。
    backboneAxisFixGroup.remove(loadedBackboneInner)
    loadedBackboneInner = null
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
  roomEnvRT?.dispose()

  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty('--hero-exit-progress')
    document.documentElement.style.removeProperty('--hero-logo-next-progress')
    document.documentElement.style.removeProperty('--hero-logo-rotate-progress')
    document.documentElement.style.removeProperty('--hero-logo-spin-rad')
    document.documentElement.style.removeProperty('--hero-canvas-z')
    document.documentElement.style.removeProperty('--hero-canvas-blend')
    document.documentElement.style.removeProperty('--hero-initial-logo-progress')
    document.documentElement.style.removeProperty('--hero-initial-logo-opacity')
    document.documentElement.style.removeProperty('--hero-band-logo-opacity')
    document.documentElement.style.removeProperty('--hero-initial-logo-scale')
    document.documentElement.style.removeProperty('--hero-logo-dna-lift')
    document.documentElement.style.removeProperty('--hero-initial-copy-opacity')
    document.documentElement.style.removeProperty('--hero-scroll-progress')
    document.documentElement.style.removeProperty('--hero-underlay-opacity')
    document.documentElement.style.removeProperty('--hero-underlay-bg-opacity')
    document.documentElement.style.removeProperty('--hero-logo-backdrop-opacity')
    document.documentElement.style.removeProperty('--hero-underlay-z')
    document.documentElement.style.removeProperty('--hero-underlay-clip')
    document.documentElement.style.removeProperty('--hero-clip')
  }
})
</script>

<template>
  <primitive :object="groupRef" />
</template>
