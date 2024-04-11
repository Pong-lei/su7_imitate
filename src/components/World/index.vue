<script setup>
import World from './World'
import { onMounted } from 'vue'
import su7Model from './model/su7blender/scene_editor.glb'
import su7ModelMerge from './model/su7blender/merge.gltf'
import Curves from './model/output_file.json'

let su7world = {}
let windMode = false
onMounted(() => {
  su7world = new World('su7World', 'su7World')
  su7world.initPostGrocess(su7ModelMerge)
  su7world.addModle(su7Model)
  su7world.addLineBloom(Curves)
})
const handleClick = () => {
  windMode = !windMode
  if(windMode){
    su7world.changeWind()
  }else{
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
