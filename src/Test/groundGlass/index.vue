<script setup>
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

import * as THREE from 'three'
import bg from './textures/t_env_light.hdr'
import GlassMesh from './GlassMesh'

import { onMounted } from 'vue'
class GroundGlass {
  constructor(selector, options = {}) {
    this.scene = new THREE.Scene()

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000000, 1)

    this.container = document.getElementById(selector)
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 12, 22)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.time = 0
    this.paused = false

    new RGBELoader().load(bg, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.environment = texture
    })

    this.setupResize()
    this.initLight()
    this.addObjects()
    this.render()
  }
  initLight(){
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
    this.scene.add( directionalLight );
  }
  addObjects() {
    let geometry = new THREE.PlaneGeometry(20, 20)
    this.glass = new GlassMesh(geometry, { flowSpeed: 0, reflectivity: 0.01,color:0xffffff })
    this.glass.position.y = 0.1
    this.glass.rotation.x = Math.PI * -0.5
    this.scene.add(this.glass)

    // ground

    const groundGeometry = new THREE.PlaneGeometry(20, 20, 10, 10)
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x111111 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = Math.PI * -0.5
    this.scene.add(ground)

    const boxG = new THREE.BoxGeometry(4, 4, 4)
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const box = new THREE.Mesh(boxG, boxMaterial)
    box.position.y = 3
    this.scene.add(box)
  }
  render() {
    if (this.paused) return
    this.time += 0.05
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.render.bind(this))
  }
  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }
  resize() {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }
}

// vue

onMounted(() => {
  const groundGlass = new GroundGlass('container')
})
</script>

<template>
  <div id="container"></div>
</template>