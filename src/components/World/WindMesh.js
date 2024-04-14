import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import fragmentWind from "./shader/fragment_line_wind.glsl";
import vertex from "./shader/vertex_line.glsl";

export default class WindMesh extends THREE.Mesh {
    constructor(options = {}) {
        super()
        this.clock = new THREE.Clock()
        this.group = new THREE.Group()
        this.group.name = 'windMeshGroup'
        this.initMaterial()
    }
    initMaterial() {
        this.material = new THREE.ShaderMaterial({
            extensions: {
                derivatives: '#extension GL_OES_standard_derivatives : enable'
              },
              side: THREE.DoubleSide,
              uniforms: {
                vTime: { type: 'f', value: 0 },
                color: { value: new THREE.Color(1, 0, 0.13, 1) },
                vProgress: { type: 'f', value: 0.8 },
                opacity:{type:'f',value:0},
                random:{value:Math.random()}
              },
              transparent: true,
              // depthTest: false,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              vertexShader: vertex,
              fragmentShader: fragmentWind

        })
    }
    renderThing() {
        console.log(123);
        this.material.uniforms.vTime.value = this.clock.getElapsedTime();
        this.cb && this.cb()
    }
    addModel(model) {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/gltf/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        loader.dracoLoader.dispose()
        loader.load(model, (gltf) => {
            gltf.scene.traverse(item => {
                if (item.isMesh) {
                    item.material = this.material
                    item.material.uniforms.random.value = Math.random()
                }
            })
            this.group.add(gltf.scene)
        })

        // let plane = new THREE.PlaneGeometry(1,1)
        // let planeMesh = new THREE.Mesh(plane,this.material)
        // planeMesh.position.z = 5
        // planeMesh.position.y = 1

        // this.group.add(planeMesh)
    }
}
