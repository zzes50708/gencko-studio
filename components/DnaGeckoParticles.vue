<script setup lang="ts">
import { shallowRef, onMounted, onUnmounted } from 'vue'
import { useLoop, useTresContext } from '@tresjs/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

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
  }
) {
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
        vec3 col = uColorA * 0.24;
        col += irid * fres * 0.56;
        col += pow(fres, 7.0) * vec3(1.0, 0.72, 0.38) * 0.28;
        col *= uBoost;
        float a = uAlpha + fres * 0.34 + 0.12;

        ${
          tubeFlow
            ? /* glsl */ `
        float flow = 0.5 + 0.5 * sin(vUv.y * 5.0 - uTime * 2.0);
        float ring = 0.35 + 0.65 * pow(abs(sin(vUv.x * 3.14159)), 0.6);
        col += uColorC * flow * ring * 0.38;
        col += uColorA * ring * 0.24;
        a += flow * 0.08;
        `
            : ''
        }

        ${
          surfaceLit
            ? /* glsl */ `
        vec3 L = normalize(vec3(0.0, 0.9, 0.5));
        float lit = 0.5 + 0.9 * max(dot(N, L), 0.0);
        col += uColorA * lit * 0.26;
        float fineRidge = pow(0.5 + 0.5 * sin((vUv.y * 180.0 + vUv.x * 42.0) - uTime * 0.65), 10.0);
        float crossRidge = pow(0.5 + 0.5 * sin((vUv.x * 120.0 - vUv.y * 26.0) + uTime * 0.45), 12.0);
        float shimmer = 0.5 + 0.5 * sin(N.x * 18.0 + N.y * 12.0 + N.z * 8.0 - uTime * 1.2);
        float rimTrace = pow(fres, 3.6);
        col += uColorB * fineRidge * 0.07;
        col += uColorA * crossRidge * 0.045;
        col += uColorC * pow(shimmer, 5.0) * 0.08;
        col += uColorB * rimTrace * (0.08 + 0.025 * sin(uTime * 1.4));
        a += lit * 0.11 + fineRidge * 0.02 + rimTrace * 0.035;
        `
            : ''
        }

        // Scene03 露出前緣（seamB 邊界）的燃燒亮邊，含雜訊
        float enterEdge = 1.0 - smoothstep(0.0, 0.16, uSeamB - _sd);
        col += uColorB * enterEdge * 0.36;
        col += uColorC * pow(enterEdge, 2.2) * 0.14;
        a += enterEdge * 0.12;
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.95));
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

        // ?餌??冽嚗楛摨?+ ??頨恍? + 鈭桅? + 擃?
        vec3 col = uColorA * 0.2;
        col += uColorB * wrap * 0.42;
        col += uColorB * fres * 0.72;
        col += uColorC * pow(fres, 5.0) * 0.85;
        col += uColorC * spec * 0.45;

        float scan = 0.5 + 0.5 * sin(vWorld.y * 55.0 - uTime * 3.5);
        col += uColorB * scan * 0.03;

        col *= 0.96 + 0.04 * hash(floor(uTime * 20.0));
        col *= uBoost;

        float a = uAlpha + fres * 0.28 + wrap * 0.1;

        ${
          enableIntroReveal
            ? /* glsl */ `
        float introEdge = 1.0 - smoothstep(0.0, 0.16, uIntroSeam - _sd);
        col += uColorC * introEdge * 1.3;
        col += vec3(1.0, 0.86, 0.6) * pow(introEdge, 2.2) * 0.62;
        a += introEdge * 0.4;
        `
            : ''
        }

        // ??湛??澆?皞嗉圾?嚗撟曆?瘛勗漲韏瑚? ??蝡???
        float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
        col += uColorC * exitEdge * 1.3;
        col += vec3(1.0, 0.86, 0.6) * pow(exitEdge, 2.2) * 0.62;
        a += exitEdge * 0.4;

        gl_FragColor = vec4(col, clamp(a, 0.0, 0.9));
      }
    `
  })
}

const group = new THREE.Group()
const disposables: { dispose(): void }[] = []
const geckoMat = makeHologram(0.14, 1.0, {
  a: '#ff6a1f',
  b: '#ff9a3d',
  c: '#ffe6c0'
})
const dnaTubeMat = makeHologram(
  0.11,
  0.92,
  {
    a: '#ff6a1f',
    b: '#ffb14a',
    c: '#fff2d6'
  },
  false,
  true
)
const backboneSampleMat = makeGlass(0.16, false, true, 0.76, {
  a: '#ffc38b',
  b: '#ff9a3d',
  c: '#fff6de'
})
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
  extensions: { derivatives: true },
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
      vec2 cells = vec2(26.0, 44.0);
      vec2 uv = vUv * cells;
      uv.y += uScroll;
      vec2 gw = fwidth(uv);
      vec2 gl = abs(fract(uv - 0.5) - 0.5) / gw;
      float line = 1.0 - min(min(gl.x, gl.y), 1.0);

      // 餈璈垢(uv.y 撠?雿?豢?敺)瘛∪嚗???蝡臭???憭?憛急遛銝)
      float depthFade = smoothstep(0.28, 0.44, vUv.y) * (1.0 - smoothstep(0.92, 1.0, vUv.y) * 0.3);
      // 瘝踵?脫?????賡???
      float pulse = 0.55 + 0.45 * sin(vUv.y * 16.0 - uTime * 1.8);

      vec3 col = mix(uColorGlow, uColorLine, line);
      col *= 0.55 + 0.85 * vFold;
      col += uColorLine * line * pulse * 0.35;

      float a = line * depthFade * 0.6;

      // ?脣嚗擃楚?伐??∠征??????銝??撩閫?敺?reveal 銝??撠望筑?橘?
      a *= smoothstep(0.0, 0.42, uReveal);

      float exitEdge = 1.0 - smoothstep(0.0, 0.16, _sd - uSeamA);
      col += uColorLine * exitEdge * 1.0;
      a += exitEdge * line * 0.45;

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
const wheelDeltaLimit = 90
const timelineWheelScale = 0.82
const scene01Slowdown = 1.1
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
const firstExitSpan = firstExitMax / 0.00042
const finalEnterSpan = finalEnterMax / 0.00042
const exitBodySpan = exitBodyMax / 0.00038
const timelineBreaks = {
  introRevealEnd: introRevealSpan,
  firstExitEnd: introRevealSpan + firstExitSpan,
  finalEnterEnd: introRevealSpan + firstExitSpan + finalEnterSpan,
  finalDnaEnd: introRevealSpan + firstExitSpan + finalEnterSpan + exitBodySpan
}
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

function onWheel(event: WheelEvent) {
  const wheelDelta = THREE.MathUtils.clamp(event.deltaY, -wheelDeltaLimit, wheelDeltaLimit)
  const motionScale = targetTimeline < timelineBreaks.introRevealEnd ? scene01MotionScale : 1
  const particleScale = targetTimeline < timelineBreaks.introRevealEnd ? scene01ParticleScale : 1
  targetRotationY += wheelDelta * CFG.wheel.speed * motionScale
  targetParticleLift = THREE.MathUtils.clamp(
    targetParticleLift + wheelDelta * 0.005 * particleScale,
    0,
    20
  )
  targetTimeline = THREE.MathUtils.clamp(
    targetTimeline + wheelDelta * timelineWheelScale,
    0,
    timelineBreaks.finalDnaEnd
  )
}

function stageValue(progress: number, start: number, span: number, max: number) {
  return THREE.MathUtils.clamp((progress - start) / span, 0, 1) * max
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
loadGeckoModel()
loadBackboneModel()

const groupRef = shallowRef<THREE.Group>(group)

const { onBeforeRender } = useLoop()
const tres = useTresContext()
let envRT: THREE.WebGLRenderTarget | null = null
let envDone = false
let rendererRef: THREE.WebGLRenderer | null = null
const tmpRes = new THREE.Vector2()
const SEAM_BAND = 1 // Logo 斜帶在 d 座標的寬度

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
  pmrem.dispose()
}

onBeforeRender(({ elapsed }) => {
  uniforms.uTime.value = elapsed
  if (!envDone) initEnvMap()
  currentRotationY += (targetRotationY - currentRotationY) * CFG.wheel.damping
  currentParticleLift += (targetParticleLift - currentParticleLift) * 0.04
  currentTimeline += (targetTimeline - currentTimeline) * 0.035
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
  const projFade = 1 - THREE.MathUtils.smoothstep(sweep, 0.12, 0.44) // 投影底座淡出
  const backboneReveal = Math.max(THREE.MathUtils.smoothstep(sweep, 0.35, 1.0), finalDna)
  const particleFade = introReveal * (1 - THREE.MathUtils.smoothstep(sweep, 0.0, 0.55))
  // 收束後維持聚攏（不再隨 sweep 釋放散開）；轉場時靠 particleFade 淡出消失。
  const particlePullTarget = introReveal
  const revealPlaneOffset = THREE.MathUtils.lerp(-9.8, 9.6, introReveal)
  currentParticlePull += (particlePullTarget - currentParticlePull) * 0.14
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
  projectorGroup.visible = scene01Active && projFade > 0.01
  // 投影金字塔/底座（內建材質無法 screen discard）改為淡出，反正被 Logo 斜帶蓋住
  pyramidGlassMat.opacity = 0.028 * projFade
  pyramidEdgeMat.opacity = 0.95 * projFade
  ringMat.opacity = 0.22 * projFade
  plateMetalMat.opacity = projFade
  // 骨幹（Scene03）：seamB>0 才顯示，材質內以 seamB 由左下 discard 露出
  backboneSampleGroup.visible = seamB > 0.001
  backboneSampleGroup.scale.setScalar(1)
  backboneSampleMat.uniforms.uAlpha.value = 0.055 + backboneReveal * 0.105
  ambientParticleMat.uniforms.uLift.value = currentParticleLift + introReveal * 2.2
  ambientParticleMat.uniforms.uPull.value = currentParticlePull
  ambientParticleMat.uniforms.uTargetZ.value = 0.0
  ambientParticleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2)
  ambientParticleMat.uniforms.uFade.value = particleFade
  uniforms.uRevealPlaneOffset.value = revealPlaneOffset
  currentGridReveal += (gridReveal * (1 - sweep) - currentGridReveal) * 0.028
  gridMat.uniforms.uReveal.value = currentGridReveal
  gridMat.uniforms.uScroll.value = -currentTimeline * gridFlowRate
  revealClipPlane.constant = revealPlaneOffset
  exitClipPlane.constant = 20 // 內建材質改淡出，exit 平面恆不裁切
  if (typeof document !== 'undefined') {
    const el = document.documentElement.style
    const scrollHintProgress = THREE.MathUtils.clamp(currentTimeline / 180, 0, 1)
    el.setProperty('--hero-scroll-progress', String(scrollHintProgress))
    el.setProperty('--hero-exit-progress', String(sweep))
    el.setProperty('--hero-logo-next-progress', String(sweep))
    el.setProperty('--hero-logo-rotate-progress', String(logoRotateProgress))
    // canvas 全程不硬切（3D 內部以 seam 處理 Scene01 退場 / Scene03 進場）→ 消除交界閃動
    el.setProperty('--hero-clip', 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)')
    // Logo underlay 固定在前層（z=3），不再做 1→3 硬跳
    el.setProperty('--hero-underlay-z', '3')
    const bandActive = sweep > stageEpsilon && sweep < 0.999
    el.setProperty('--hero-underlay-opacity', bandActive ? '1' : '0')
    // Logo 斜帶 = seamB..seamA 之間、平行 TL–BR 對角線的條帶
    const tl = ((1 - seamA) * 100).toFixed(2)
    const tr = ((2 - seamA) * 100).toFixed(2)
    const br = ((2 - seamB) * 100).toFixed(2)
    const bl = ((1 - seamB) * 100).toFixed(2)
    el.setProperty(
      '--hero-underlay-clip',
      `polygon(0% ${tl}%, 100% ${tr}%, 100% ${br}%, 0% ${bl}%)`
    )
    // 斜帶內部凹陷光影：一條垂直於 TL–BR 斜縫的漸層，兩緣白+橘高光、內側微陰影
    // d ∈[0,2] 沿漸層軸線性對應 0→100%，故 pos = d/2*100；角度取 atan(H/W) 使軸線垂直斜縫
    if (bandActive) {
      const vw = window.innerWidth || 1
      const vh = window.innerHeight || 1
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
})

onUnmounted(() => {
  window.removeEventListener('wheel', onWheel)

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
