import * as THREE from 'three'

export interface CyberpunkGlitchTransitionOptions {
  textureA?: THREE.Texture | null
  textureB?: THREE.Texture | null
  progress?: number
  time?: number
  displacementStrength?: number
  rgbSplitStrength?: number
  noiseScale?: number
  lineDensity?: number
}

export interface CyberpunkGlitchTransitionMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uTextureA: { value: THREE.Texture | null }
    uTextureB: { value: THREE.Texture | null }
    uProgress: { value: number }
    uTime: { value: number }
    uDisplacementStrength: { value: number }
    uRgbSplitStrength: { value: number }
    uNoiseScale: { value: number }
    uLineDensity: { value: number }
  }
}

export function createCyberpunkGlitchTransitionMaterial(
  options: CyberpunkGlitchTransitionOptions = {}
): CyberpunkGlitchTransitionMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTextureA: { value: options.textureA ?? null },
      uTextureB: { value: options.textureB ?? null },
      uProgress: { value: options.progress ?? 0 },
      uTime: { value: options.time ?? 0 },
      uDisplacementStrength: { value: options.displacementStrength ?? 0.11 },
      uRgbSplitStrength: { value: options.rgbSplitStrength ?? 0.018 },
      uNoiseScale: { value: options.noiseScale ?? 7.0 },
      uLineDensity: { value: options.lineDensity ?? 72.0 }
    },
    transparent: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uTextureA;
      uniform sampler2D uTextureB;
      uniform float uProgress;
      uniform float uTime;
      uniform float uDisplacementStrength;
      uniform float uRgbSplitStrength;
      uniform float uNoiseScale;
      uniform float uLineDensity;

      varying vec2 vUv;

      vec2 mod289(vec2 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec3 mod289(vec3 x) {
        return x - floor(x * (1.0 / 289.0)) * 289.0;
      }

      vec3 permute(vec3 x) {
        return mod289(((x * 34.0) + 10.0) * x);
      }

      float snoise(vec2 v) {
        const vec4 C = vec4(
          0.211324865405187,
          0.366025403784439,
          -0.577350269189626,
          0.024390243902439
        );
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(
          permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0)
        );
        vec3 m = max(
          0.5 - vec3(
            dot(x0, x0),
            dot(x12.xy, x12.xy),
            dot(x12.zw, x12.zw)
          ),
          0.0
        );
        m = m * m;
        m = m * m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      vec2 clampUv(vec2 uv) {
        return clamp(uv, vec2(0.001), vec2(0.999));
      }

      vec3 sampleRgbSplit(sampler2D tex, vec2 uv, vec2 split) {
        float r = texture2D(tex, clampUv(uv + split)).r;
        float g = texture2D(tex, clampUv(uv)).g;
        float b = texture2D(tex, clampUv(uv - split)).b;
        return vec3(r, g, b);
      }

      void main() {
        float progress = clamp(uProgress, 0.0, 1.0);
        float transitionPulse = sin(progress * 3.14159265);
        vec2 uv = vUv;

        float row = floor(uv.y * uLineDensity);
        float rowNoise = snoise(vec2(row * 0.08, uTime * 0.85 + progress * 4.0));
        float broadNoise = snoise(vec2(uv.y * uNoiseScale, progress * 3.0 + uTime * 0.2));
        float sliceGate = smoothstep(0.18, 0.84, abs(rowNoise));
        float sliceOffset = (rowNoise + broadNoise * 0.35) * uDisplacementStrength * transitionPulse * sliceGate;

        vec2 displacedUv = clampUv(uv + vec2(sliceOffset, 0.0));
        float wipeNoise = snoise(vec2(uv.y * uNoiseScale * 0.65, progress * 5.0 + uTime * 0.35));
        float wipe = smoothstep(
          progress - 0.08,
          progress + 0.08,
          uv.x + wipeNoise * 0.18 + sliceOffset * 0.5
        );

        float edgeBand = 1.0 - smoothstep(0.0, 0.16, abs((uv.x + wipeNoise * 0.18) - progress));
        vec2 rgbOffset = vec2(uRgbSplitStrength * (0.35 + sliceGate + edgeBand) * transitionPulse, 0.0);

        vec3 fromColor = sampleRgbSplit(uTextureA, displacedUv - rgbOffset * 0.4, rgbOffset);
        vec3 toColor = sampleRgbSplit(uTextureB, displacedUv + rgbOffset * 0.4, -rgbOffset);
        vec3 color = mix(fromColor, toColor, wipe);

        vec3 cyberGlow = vec3(0.0, 0.95, 1.0) * edgeBand * 0.18;
        cyberGlow += vec3(1.0, 0.08, 0.45) * sliceGate * transitionPulse * 0.08;
        float scanline = 0.94 + 0.06 * sin(uv.y * 900.0 + uTime * 16.0);

        gl_FragColor = vec4((color + cyberGlow) * scanline, 1.0);
      }
    `
  }) as CyberpunkGlitchTransitionMaterial
}
