import {
  MeshPhysicalMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderChunk,
  TextureLoader,
  Vector2
} from 'three'
import type { Texture } from 'three'

export const CABINET_MATERIAL_ASSETS = {
  color: '/cabinet/materials/concrete-v2-color.jpg',
  normal: '/cabinet/materials/concrete-v2-normal.jpg',
  roughness: '/cabinet/materials/concrete-v2-roughness.jpg',
  environment: '/cabinet/materials/studio.hdr'
} as const

export interface CabinetWoodTextures {
  color: Texture
  normal: Texture
  roughness: Texture
}

// 主貼圖由工作區持有，各板面只複製 UV 設定，共用影像來源。
export async function loadCabinetWoodTextures(
  prefix = 'concrete'
): Promise<CabinetWoodTextures | null> {
  const loader = new TextureLoader()
  const results = await Promise.allSettled([
    loader.loadAsync(`/cabinet/materials/${prefix}-v2-color.jpg`),
    loader.loadAsync(`/cabinet/materials/${prefix}-v2-normal.jpg`),
    loader.loadAsync(`/cabinet/materials/${prefix}-v2-roughness.jpg`)
  ])
  if (results.some((result) => result.status === 'rejected')) {
    for (const result of results) if (result.status === 'fulfilled') result.value.dispose()
    return null
  }
  const values = results.map((result) => (result as PromiseFulfilledResult<Texture>).value)
  const [color, normal, roughness] = values as [Texture, Texture, Texture]
  color.colorSpace = SRGBColorSpace
  normal.colorSpace = roughness.colorSpace = NoColorSpace
  return { color, normal, roughness }
}

export function disposeCabinetWoodTextures(maps: CabinetWoodTextures | null) {
  if (maps) Object.values(maps).forEach((map) => map.dispose())
}

export function boardTextureRepeat(widthCm: number, heightCm: number, tileCm = 60) {
  return new Vector2(widthCm / tileCm, heightCm / tileCm)
}

export function createWhiteLaminateMaterial(black = false) {
  return new MeshPhysicalMaterial({
    color: black ? '#171819' : '#ecece8',
    metalness: 0,
    roughness: 0.55,
    ior: 1.5,
    clearcoat: 0.12,
    clearcoatRoughness: 0.45
  })
}

export function createPpMaterial(smoke: boolean, displayScale: number) {
  return new MeshPhysicalMaterial({
    color: smoke ? '#717975' : '#fafcfb',
    metalness: 0,
    roughness: 0.32,
    transmission: smoke ? 0.58 : 0.8,
    ior: 1.49,
    thickness: 0.16 * displayScale,
    attenuationColor: smoke ? '#929b95' : '#ffffff',
    attenuationDistance: 30 * displayScale,
    clearcoat: 0.06,
    clearcoatRoughness: 0.5,
    opacity: 1,
    transparent: false,
    depthWrite: true
  })
}

// 壓克力保持清晰透射，與磨砂 PP 分開，避免 LED 被粗糙度模糊。
export function createAcrylicMaterial(smoke: boolean, displayScale: number, cutEdge = false) {
  return new MeshPhysicalMaterial({
    color: smoke ? '#a5aaa8' : cutEdge ? '#e0ebe8' : '#ffffff',
    metalness: 0,
    roughness: cutEdge ? 0.09 : 0.055,
    transmission: cutEdge ? 0.74 : 0.92,
    ior: 1.49,
    thickness: 0.3 * displayScale,
    attenuationColor: smoke ? '#919996' : '#ffffff',
    attenuationDistance: 20 * displayScale,
    clearcoat: 0.65,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
    specularIntensity: 1,
    depthWrite: true
  })
}

export function createBoardFaceMaterial(
  maps: CabinetWoodTextures,
  widthCm: number,
  heightCm: number,
  tint: string,
  ownTexture: (texture: Texture) => Texture,
  stone = false
) {
  const repeat = boardTextureRepeat(widthCm, heightCm)
  const clone = (source: Texture) => {
    const map = ownTexture(source.clone())
    map.wrapS = map.wrapT = RepeatWrapping
    map.repeat.copy(repeat)
    map.anisotropy = 4
    map.needsUpdate = true
    return map
  }
  const material = new MeshPhysicalMaterial({
    color: tint,
    map: clone(maps.color),
    normalMap: clone(maps.normal),
    roughnessMap: clone(maps.roughness),
    // 貼皮為平面印刷與細微壓紋，不模擬深凹混凝土。
    normalScale: new Vector2(stone ? 0.02 : 0.12, stone ? 0.02 : 0.12),
    roughness: stone ? 0.65 : 0.8,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.42
  })
  if (stone) {
    // 保留真實石紋的走向，將暖色岩面轉成深灰底與細淡紋；貼皮沒有岩石凹凸。
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        ShaderChunk.map_fragment.replace(
          'diffuseColor *= sampledDiffuseColor;',
          `
          float stoneLuma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          float stoneVein = 1.0 - smoothstep(0.035, 0.09, stoneLuma);
          sampledDiffuseColor.rgb = vec3(0.075 + stoneLuma * 0.018 + stoneVein * 0.065);
          diffuseColor *= sampledDiffuseColor;
        `
        )
      )
    }
    material.customProgramCacheKey = () => 'dark-grey-fine-stone-v1'
  } else {
    // 清水模貼皮使用中性淺灰白，保留原圖的細微深淺而去除褐色底。
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        ShaderChunk.map_fragment.replace(
          'diffuseColor *= sampledDiffuseColor;',
          `
          float concreteLuma = dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          sampledDiffuseColor.rgb = vec3(0.22 + concreteLuma * 0.48);
          diffuseColor *= sampledDiffuseColor;
        `
        )
      )
    }
    material.customProgramCacheKey = () => 'light-grey-concrete-v1'
  }
  return material
}
