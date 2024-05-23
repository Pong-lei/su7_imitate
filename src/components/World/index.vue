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

import WindMesh from './WindMesh.js'
import windLine from './model/wind_line.glb'

let su7world = {}
let currentMode = ''
let redMaterial = new ShaderMaterial({
  extensions: {
    derivatives: '#extension GL_OES_standard_derivatives : enable'
  },
  side: DoubleSide,
  uniforms: {
    vTime: { type: 'f', value: 0 },
    color: { value: new Color(1, 0, 0.13, 1) },
    vProgress: { type: 'f', value: 0.8 },
    opacity:{type:'f',value:1}
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
windMaterial.uniforms.random = {value:Math.random()}

onMounted(() => {
  su7world = new World('su7World', 'su7World')
  su7world.initPostGrocess(su7ModelMerge)
  
  su7world.addModle(su7Model)
  let curvesInstence = su7world.addLineBloom(Curves)
  
  curvesInstence.setMaterial(curvesInstence.allLinesMesh.length - 5,redMaterial,()=>{
    curvesInstence.otherMaterial.uniforms.vTime.value = curvesInstence.clock.getElapsedTime();
  })
 
  let windInstence = su7world.addWindLine()
  windInstence.addModel(windLine)
  windInstence.group.scale.set(2,2,2)
  windInstence.group.position.y = 0.2

  su7world.addBodyMode()
})
const handleClick = (mode) => {
  if (currentMode === '' && mode === 'wind') {
    currentMode = mode
    su7world.changeWind()
  } else if(currentMode == 'wind' && mode === 'wind'){
    currentMode = ''
    su7world.changeNormal()
  } else if(currentMode == '' && mode === 'body'){
    currentMode = mode
    su7world.changeBodyMode()
  } else if(currentMode == 'body' && mode === 'body'){
    currentMode = ''
    su7world.bodyModeToNomarl()
  }
}
</script>

<template>
  <div id="su7World">
    <div class="windBtn">
      <button class="btn" @click="handleClick('wind')">风阻</button>
      <button class="btn" @click="handleClick('body')">车身</button>
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
