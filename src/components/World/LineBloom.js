import * as THREE from "three";
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import fragment from "./shader/fragment_line.glsl";
import vertex from "./shader/vertex_line.glsl";

export default class LineBloom {
  allLinesMesh = []
  otherMaterial;
  constructor(data,option) {
    this.data = data
    this.clock = new THREE.Clock()
    this.group = new THREE.Group()
    this.group.name = 'lineBloom'
    this.initCurves(option);
  }
  destory() {
    this.group.traverse(item => {
      if (item.isMesh) {
        item.geometry.dispose()
        item.material.dispose()
      }
    })
    this.parent.remove(this.group)
  }
  initCurves(option) {
    this.curves = []
    this.data.points.forEach(path => {
      let points = []
      for (let i = 0; i < path.length; i++) {
        points.push(
          new THREE.Vector3(
            path[i].x,
            path[i].y,
            path[i].z
          )
        )
      }
      let tempcurve = new THREE.CatmullRomCurve3(points)
      this.curves.push(tempcurve)
    })

    const material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      side: THREE.DoubleSide,
      uniforms: {
        vTime: { type: "f", value: 0 },
        color: { value: new THREE.Color(0.2, 0.8, 1, 1) },
        vProgress: { type: "f", value: 0.8 },
        uSize: { type: "f", value: 7 }
      },
      transparent: true,
      // depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: vertex,
      fragmentShader: fragment
    });
    
    let len = this.curves.length
    this.material = material
    let radius = option?.radius || 0.005
    let radialSegments = option?.radialSegments || 3
    this.curves.forEach((path, index) => {
      const geometry = new THREE.TubeGeometry(path, 32, radius, radialSegments, false);
      let line = new THREE.Mesh(geometry, material);
      this.group.scale.set(2, 2, 2)
      this.group.position.y = 0.2
      // line.scale.set(0.1, 0.1, 0.1)
      this.group.add(line);
      this.allLinesMesh.push(line)
    })

  }
  setMaterial(index,material,cb){
    this.otherMaterial = material
    this.cb = cb
    for (let i = index; i < this.allLinesMesh.length; i++) {
      this.allLinesMesh[i].material = this.otherMaterial
    }
  }
  renderThing() {
    this.material.uniforms.vTime.value = this.clock.getElapsedTime();
    this.cb && this.cb()
  }
}
