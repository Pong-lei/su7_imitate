import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { Refractor } from 'three/examples/jsm/objects/Refractor.js'

import fragment from './shader/fragment.glsl'
import fragment2 from './shader/fragment2.glsl'
import vertex from './shader/vertex.glsl'
import tNormalMap0 from './textures/t_floor_normal.webp'
import tNormalMap1 from './textures/t_floor_normal.webp'
import tRoughness from './textures/t_floor_roughness.webp'

export default class GlassMesh extends THREE.Mesh {
  constructor(geometry, options = {}) {
    super(geometry);

    this.isWater = true;

    this.type = 'Water';

    const scope = this

    const color =
      options.color !== undefined
        ? new THREE.Color(options.color)
        : new THREE.Color(0xffffff)
    const textureWidth =
      options.textureWidth !== undefined ? options.textureWidth : 1024
    const textureHeight =
      options.textureHeight !== undefined ? options.textureHeight : 1024
    const clipBias = options.clipBias !== undefined ? options.clipBias : 0
    const flowDirection =
      options.flowDirection !== undefined
        ? options.flowDirection
        : new THREE.Vector2(1, 0)
    const flowSpeed = options.flowSpeed !== undefined ? options.flowSpeed : 0.03
    const reflectivity =
      options.reflectivity !== undefined ? options.reflectivity : 0.02
    const scale = options.scale !== undefined ? options.scale : 1
    const shader =
      options.shader !== undefined ? options.shader : GlassMesh.GlassShader

    const textureLoader = new THREE.TextureLoader()

    const flowMap = options.flowMap || undefined
    const normalMap0 =
      options.normalMap0 ||
      textureLoader.load(tNormalMap0)
    const normalMap1 =
      options.normalMap1 ||
      textureLoader.load(tNormalMap1)
    const roughness = options.roughness || textureLoader.load(tRoughness)

    const cycle = 0.15 // a cycle of a flow map phase
    const halfCycle = cycle * 0.5
    const textureMatrix = new THREE.Matrix4()
    const clock = new THREE.Clock()

    // internal components
    const reflector = new Reflector(geometry, {
      textureWidth: textureWidth,
      textureHeight: textureHeight,
      clipBias: clipBias
    })

    const refractor = new Refractor(geometry, {
      textureWidth: textureWidth,
      textureHeight: textureHeight,
      clipBias: clipBias
    })

    reflector.matrixAutoUpdate = false
    refractor.matrixAutoUpdate = false

    // material

    this.material = new THREE.ShaderMaterial({
      name: shader.name,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib['fog'],
        shader.uniforms
      ]),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      transparent: true,
      fog: true
    })

    if (flowMap !== undefined) {
      this.material.defines.USE_FLOWMAP = ''
      this.material.uniforms['tFlowMap'] = {
        type: 't',
        value: flowMap
      }
    } else {
      this.material.uniforms['flowDirection'] = {
        type: 'v2',
        value: flowDirection
      }
    }

    // maps

    normalMap0.wrapS = normalMap0.wrapT = THREE.RepeatWrapping
    normalMap1.wrapS = normalMap1.wrapT = THREE.RepeatWrapping
    roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping

    this.material.uniforms['tReflectionMap'].value =
      reflector.getRenderTarget().texture
    this.material.uniforms['tRefractionMap'].value =
      refractor.getRenderTarget().texture
    this.material.uniforms['tNormalMap0'].value = normalMap0
    this.material.uniforms['tNormalMap1'].value = normalMap1
    this.material.uniforms['tRoughness'].value = roughness

    // water

    this.material.uniforms['color'].value = color
    this.material.uniforms['reflectivity'].value = reflectivity
    this.material.uniforms['textureMatrix'].value = textureMatrix

    // inital values

    this.material.uniforms['config'].value.x = 0 // flowMapOffset0
    this.material.uniforms['config'].value.y = halfCycle // flowMapOffset1
    this.material.uniforms['config'].value.z = halfCycle // halfCycle
    this.material.uniforms['config'].value.w = scale // scale

    // functions

    function updateTextureMatrix(camera) {
      textureMatrix.set(
        0.5,
        0.0,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.5,
        0.0,
        0.0,
        0.5,
        0.5,
        0.0,
        0.0,
        0.0,
        1.0
      )

      textureMatrix.multiply(camera.projectionMatrix)
      textureMatrix.multiply(camera.matrixWorldInverse)
      textureMatrix.multiply(scope.matrixWorld)
    }

    function updateFlow() {
      const delta = clock.getDelta()
      const config = scope.material.uniforms['config']

      config.value.x += flowSpeed * delta // flowMapOffset0
      config.value.y = config.value.x + halfCycle // flowMapOffset1

      // Important: The distance between offsets should be always the value of "halfCycle".
      // Moreover, both offsets should be in the range of [ 0, cycle ].
      // This approach ensures a smooth water flow and avoids "reset" effects.

      if (config.value.x >= cycle) {
        config.value.x = 0
        config.value.y = halfCycle
      } else if (config.value.y >= cycle) {
        config.value.y = config.value.y - cycle
      }
    }

    this.onBeforeRender = function (renderer, scene, camera) {
      updateTextureMatrix(camera)
      updateFlow()

      scope.visible = false

      reflector.matrixWorld.copy(scope.matrixWorld)
      refractor.matrixWorld.copy(scope.matrixWorld)

      reflector.onBeforeRender(renderer, scene, camera)
      refractor.onBeforeRender(renderer, scene, camera)

      scope.visible = true
    }

  }
}
GlassMesh.GlassShader = {
  name: 'groundGlassShader',
  uniforms: {
    color: {
      type: 'c',
      value: null
    },
    reflectivity: {
      type: 'f',
      value: 0
    },
    tReflectionMap: {
      type: 't',
      value: null
    },
    tRefractionMap: {
      type: 't',
      value: null
    },
    tNormalMap0: {
      type: 't',
      value: null
    },
    tNormalMap1: {
      type: 't',
      value: null
    },
    tRoughness:{
      type: 't',
      value: null
    },
    textureMatrix: {
      type: 'm4',
      value: null
    },
    config: {
      type: 'v4',
      value: new THREE.Vector4()
    }
  },
  vertexShader: vertex,
  fragmentShader: fragment
}
// GlassMesh.GlassShader = {
//   name: 'groundGlassShader',
//   uniforms: {

// 		color: { value: null },
// 		tDiffuse: { value: null },
// 		tDepth: { value: null },
// 		textureMatrix: { value: new Matrix4() },
// 		maxDistance: { value: 180 },
// 		opacity: { value: 0.5 },
// 		fresnelCoe: { value: null },
// 		virtualCameraNear: { value: null },
// 		virtualCameraFar: { value: null },
// 		virtualCameraProjectionMatrix: { value: new Matrix4() },
// 		virtualCameraMatrixWorld: { value: new Matrix4() },
// 		virtualCameraProjectionMatrixInverse: { value: new Matrix4() },
// 		resolution: { value: new Vector2() },

// 	},
//   vertexShader: vertex,
//   fragmentShader: fragment
// }