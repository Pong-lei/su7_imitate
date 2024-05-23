import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import bodyPlan from './model/bodyPlan/bodyPlan.glb'

export default class BodyMode {
  constructor() {
    this.group = new THREE.Group()
    this.group.name = 'bodyMode'
    this.clock = new THREE.Clock()
    this.init()
  }
  init() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco/gltf/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.dracoLoader.dispose()
    loader.load(bodyPlan, (gltf) => {
      gltf.scene.scale.set(2, 2, 2)
      gltf.scene.position.y = 0.8
      gltf.scene.children[0].name = 'bodyPlan'
      let bodyPlan = gltf.scene.children[0]
      console.log(gltf.scene);
      bodyPlan.material = new THREE.ShaderMaterial({
        extensions: {
          derivatives: "#extension GL_OES_standard_derivatives : enable"
        },
        side: THREE.DoubleSide,
        uniforms: {
          vTime: { type: "f", value: 0 },
          opacity:{type:'f',value:0},
          resolution: { value: new THREE.Vector2(1080, 1920) },
        },
        transparent: true,
        // depthTest: false,
        // depthWrite: true,
        // blending: THREE.AdditiveBlending,
        vertexShader: `

          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1. );
            // gl_PointSize = 10. * ( 1. / - mvPosition.z );
            gl_Position = projectionMatrix * mvPosition;
          }`,
        fragmentShader: `

        #define WIDTH 50.0 // width of bands in pixels
        #define PERIOD 1.0 // time per cycle in seconds (Zero for no animation)
        #define CONTRAST 1.0 // [0,1] intensity of effect
        #define HARD 1.5// [NONZERO!] hardness of lines (<1 essentially inverts the pattern)
        #define EXPAND 0.6 // [0,1] rate at which distance between lines increases with distance from center
        #define REVERSE false // boolean, reverse direction

        #define COL_0 vec3(0.2,0.2,0.2)
        #define COL_1 vec3(.9,0.9,0.9)
          uniform vec2 resolution;
          uniform float opacity;
          varying vec2 vUv;
          uniform float vTime;
          void main() {
            vec2 xuv = vUv;
            xuv -= vec2(0.5,0.5);
            xuv = abs(vec2(xuv.x,xuv.y));
            float frequency = floor(min(resolution.x,resolution.y) / WIDTH);
            float radius = length(xuv);
            radius = radius * pow(radius,-EXPAND);
            float timeFactor = 0.0;
            if (PERIOD > 0.0) timeFactor = (1.0-(-vTime / (PERIOD*frequency)));
            if(REVERSE) timeFactor = timeFactor * -1.0;
            radius = radius + timeFactor;
            radius = radius * frequency;
            radius = radius-floor(radius);
            radius = 2.0*abs(radius-0.5); 
            radius = pow(radius,4.0/HARD)*smoothstep(0.04,0.08,length(xuv))*(1. - smoothstep(0.5,0.52,length(xuv)));
            
            vec3 col = mix(COL_0,COL_1,radius);
            gl_FragColor = vec4(col,radius*opacity);
          }
        `
      })
      this.bodyPlanMaterial = bodyPlan.material
      this.group.add(gltf.scene)
    })
  }
  renderThing() {
    if (this.bodyPlanMaterial) {
      this.bodyPlanMaterial.uniforms.vTime.value = this.clock.getElapsedTime()
    }

  }
}