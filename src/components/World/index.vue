<script setup>
import World from './World'
import { onMounted } from 'vue'
import su7Model from './model/su7blender/scene_editor.glb'
import su7ModelMerge from './model/su7blender/merge.gltf'
import Curves from './model/output_file.json'
import WindCurves from './model/output_file_wind.json'
import { ShaderMaterial, DoubleSide, Color, AdditiveBlending, PlaneGeometry,Mesh } from 'three'

import fragmentRed from "./shader/fragment_line_red.glsl";
import fragmentWind from "./shader/fragment_line_wind.glsl";
import vertex from "./shader/vertex_line.glsl";

let su7world = {}
let windMode = false
let redMaterial = new ShaderMaterial({
  extensions: {
    derivatives: '#extension GL_OES_standard_derivatives : enable'
  },
  side: DoubleSide,
  uniforms: {
    vTime: { type: 'f', value: 0 },
    color: { value: new Color(1, 0, 0.13, 1) },
    vProgress: { type: 'f', value: 0.8 },
    opacity:{type:'f',value:0}
  },
  transparent: true,
  // depthTest: false,
  depthWrite: false,
  blending: AdditiveBlending,
  vertexShader: vertex,
  fragmentShader: fragmentRed
})
let windMaterial = redMaterial.clone()
windMaterial.fragmentShader = fragmentWind
windMaterial.uniforms.color.value = new Color(0x555555)

onMounted(() => {
  su7world = new World('su7World', 'su7World')
  su7world.initPostGrocess(su7ModelMerge)
  su7world.addModle(su7Model)
  let curvesInstence = su7world.addLineBloom(Curves)
  
  curvesInstence.setMaterial(curvesInstence.allLinesMesh.length - 5,redMaterial,()=>{
    curvesInstence.otherMaterial.uniforms.vTime.value = curvesInstence.clock.getElapsedTime();
  })
  let windInstence = su7world.addWindLineBloom(WindCurves,{radius:0.1,radialSegments:8})
  windInstence.group.name = 'windBloom'
  windInstence.setMaterial(0,windMaterial,()=>{
    windInstence.otherMaterial.uniforms.vTime.value = windInstence.clock.getElapsedTime();
  })
})
const handleClick = () => {
  windMode = !windMode
  if (windMode) {
    su7world.changeWind()
  } else {
    su7world.changeNormal()
  }
}
</script>

<template>
  <div id="su7World">
    <div class="windBtn">
      <button class="btn" @click="handleClick">风阻</button>
    </div>
  </div>
</template>

<style scoped>
#su7World {
  padding: 0;
  margin: 0;
  height: 100vh;
  width: 100vw;
}
.windBtn {
  position: absolute;
  top: 10px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.btn {
  width: 60px;
  height: 20px;
  padding: 0;
  border-color: #06576b;
  color: #ffffff;
  background: #06576b;
}
</style>
