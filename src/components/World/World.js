import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import {
  BlendFunction,
  EffectPass,
  EffectComposer,
  SelectiveBloomEffect,
  RenderPass,
} from "postprocessing";

import * as THREE from 'three'
import { gsap } from 'gsap'

import bg from './textures/t_env_light.hdr'
import ReflectFloorMesh from './ReflectFloor';
import OutLineClip from './OutLineClip';
import LineBloom from './LineBloom';

import WindMesh from './WindMesh'
import BodyMode  from './bodyMode';


export default class World {
  bloomEffect;
  scaleValue = 4.8;
  lineBloom;
  windLineBloom;
  constructor(selector, name = 'world') {
    this.domId = selector
    this.scene = new THREE.Scene()
    this.scene.name = name
    this.scene.fog = new THREE.FogExp2(0x000000, 0.01);
    this.scene.position.y = -2.8
    this.clock = new THREE.Clock()
    this.container = document.getElementById(selector)
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.width = this.width
    this.height = this.height
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1;
    this.renderer.localClippingEnabled = true

    this.stats = new Stats();
    this.container.appendChild(this.stats.dom);

    this.composer = ''
    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width / this.height,
      2,
      100
    )
    this.camera.position.set(0, 0, 22);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.update()
    this.time = 0
    this.paused = false

    this.gui = ''
    new RGBELoader().load(bg, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      this.scene.environment = texture
    })

    this.setupResize()
    // this.initLight()
    // this.addObjects()
    this.render()
  }
  initReflector() {
    let geo = new THREE.PlaneGeometry(64, 64)
    let floor = new ReflectFloorMesh(geo, {
      textureWidth: 512,
      textureHeight: 512
    })
    floor.rotation.x = - Math.PI / 2;
    floor.position.y = - 0.0001;
    this.scene.add(floor)
  }
  initComposer() {
    const effect = new SelectiveBloomEffect(this.scene, this.camera, {
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      luminanceThreshold: 0,
      luminanceSmoothing: 0.8,
      opacity: 0.6,
      intensity: 3.0
    });
    effect.inverted = true;
    effect.ignoreBackground = true
    effect.selection.set([])
    let material = new THREE.MeshBasicMaterial({ color: 0x3fffff });
    let geometry = new THREE.PlaneGeometry(5, 5, 10, 10);
    let plane = new THREE.Mesh(geometry, material);
    let plane2 = new THREE.Mesh(geometry, material);
    plane2.position.x = 6
    plane2.position.y = 6
    plane.position.y = 6
    plane.scale.set(0.01, 0.01, 0.01)
    plane2.scale.set(0.01, 0.01, 0.01)
    // this.scene.add(plane, plane2)


    effect.selection.set([plane])
    this.bloomEffect = effect
    let composerBloom = new EffectComposer(this.renderer);
    // 添加renderPass
    composerBloom.addPass(new RenderPass(this.scene, this.camera))
    const effectPass = new EffectPass(this.camera, effect);
    composerBloom.addPass(effectPass);
    this.composer = composerBloom
  }
  initClipPlane() {
    this.localPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    this.localPlane.constant = 13
  }
  initPostGrocess(path) {
    this.initClipPlane()
    this.initReflector()
    this.initComposer()
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco/gltf/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.dracoLoader.dispose()
    loader.load(path, (gltf) => {
      this.initGui()
      this.clipedge = new OutLineClip(this.scaleValue, gltf, this.scene, this.gui, this.renderer)
      this.clipedge.planeMesh.position.x = 13
      // this.bloomEffect.selection.set([])

    })
  }
  changeWind() {
    this.localPlane.constant = 13
    this.lineBloom.group.visible = false
    this.t1 = new gsap.timeline()
    /**
     * 1、scene rotation 
     * 2、clip transform 、cilpOutLine tansform scene fog 
     * **/
    this.windLineBloom.group.visible = true
    this.t1.to(this.scene.rotation, {
      y: Math.PI * 1.3,
      duration: 2,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.updateMatrixWorld(true)
        this.localPlane.normal.set(0, 0, - 1);
        this.clipedge.clippingPlanes[0].normal.set(0, 0, - 1)
        this.localPlane.applyMatrix4(this.clipedge.planeMesh.matrixWorld);
      }
    }).to(this.windLineBloom.material.uniforms.opacity, {
        value: 1,
        duration: 1,
        ease: 'power2.in',
      }, '<')
      .to(this.topLight.material, {
        emissiveIntensity: 0,
        duration: 1,
        ease: 'power2.out',
      }, "<")
      .to(this.scene.fog, {
        density: 0.06,
        duration: 1,
        ease: 'power2.out',
      }, "<")
      .to(this.camera.position, {
        z: 24,
        duration: 1,
        ease: 'power2.out',
      })

      .to(this.localPlane, {
        constant: -13,
        duration: 2,
        ease: 'power2.out',
        onUpdate: () => {
          this.clipedge.planeMesh.position.x = this.localPlane.constant
        },
        onStart: () => {

          this.isWindMode = true
          this.lineBloom.group.visible = true
          this.bloomEffect.selection.set([this.clipedge.outlineLines, ...this.lineBloom.allLinesMesh])
        }
      }, ">+2.5")
      .to(this.windLineBloom.material.uniforms.opacity, {
        value: 0,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => {
          this.windLineBloom.group.visible = false
        }
      })
  }
  bodyModeToNomarl (){
    this.bodyTimeline.reverse()
    this.currentMode = ''
  }
  changeBodyMode(){
    this.bodyTimeline = new gsap.timeline()
    this.bodyTimeline.to(this.scene.rotation, {
      y: -Math.PI / 4,
      duration: 2,
      ease: 'power2.out',
      onComplete: () => {
        this.scene.updateMatrixWorld(true)
        this.bodyMode.group.visible = true
      }
    }).to(this.bodyMode.bodyPlanMaterial.uniforms.opacity,{
      value:1,
      duration:1,
      ease:'power2.in'
    })
  }
  changeNormal() {
    this.topLight.material.emissiveIntensity = 0
    this.localPlane.normal.set(0, 0, - 1);
    this.localPlane.applyMatrix4(this.clipedge.planeMesh.matrixWorld);
    this.t2 = new gsap.timeline()
    this.t2.to(this.localPlane, {
      constant: 13,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        this.clipedge.planeMesh.position.x = this.localPlane.constant
      },
      onComplete: () => {
        this.lineBloom.group.visible = false
      },
    })
      .to(this.camera.position, {
        z: 22,
        duration: 1,
        ease: 'power2.out',
      }, ">")
      .to(this.scene.fog, {
        density: 0.01,
        ease: 'power2.out'
      }, "<")
      .to(this.topLight.material, {
        emissiveIntensity: 0.52,
        ease: 'power2.out',
      }, "<")
      .to(this.scene.rotation, {
        y: `-=${Math.PI * 1.3}`,
        duration: 2,
        ease: 'power2.out',
        onComplete: () => {
          this.lineBloom.group.visible = false
          this.localPlane.normal.set(0, 0, - 1);
          this.localPlane.applyMatrix4(this.clipedge.planeMesh.matrixWorld);
          this.scene.updateMatrixWorld(true)
        }
      }, ">+1")
  }
  addLineBloom(Curves) {
    let lineBloom = new LineBloom(Curves)
    lineBloom.group.visible = false
    this.lineBloom = lineBloom
    this.scene.add(lineBloom.group)
    return lineBloom
  }
  addWindLine(Curves, option) {
    let lineBloom = new WindMesh(Curves, option)
    lineBloom.group.visible = false
    this.windLineBloom = lineBloom
    this.scene.add(lineBloom.group)
    return lineBloom
  }
  addBodyMode(){
    let bodyMode = new BodyMode()
    bodyMode.group.visible = false
    this.bodyMode = bodyMode
    this.scene.add(bodyMode.group)
  }
  addModle(path) {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco/gltf/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.dracoLoader.dispose()
    loader.load(path, (gltf) => {
      gltf.scene.scale.set(2, 2, 2)
      gltf.scene.position.y = 0.2
      gltf.scene.name = 'carScene'
      // remove light
      gltf.scene.remove(gltf.scene.children[1])
      gltf.scene.traverse((item) => {
        if (item.isMesh) {
          item.material.clippingPlanes = [this.localPlane]
          item.stencilRef = 1
          item.stencilWrite = true
          item.stencilWriteMask = 0xff
          item.stencilZPass = THREE.ReplaceStencilOp
          item.geometry.computeVertexNormals()
          if (item.name === '平面') {
            item.visible = false
          }
          if (item.name === 'topLigt') {
            item.material.clippingPlanes = []
            item.position.y = 6
            item.scale.set(12, 0.04, 6)
            // item.visible = false
            item.material.emissiveIntensity = 0.52
            // item.material.emissiveIntensity = 0
            this.topLight = item
          }
        }
      })
      this.scene.add(gltf.scene)
      console.log(this.scene);
    });

  }
  initLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
  }
  addObjects() {
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 10, 10)
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = Math.PI * -0.5
    this.scene.add(ground)
  }
  render() {
    if (this.paused) return
    this.stats.begin();
    if (this.clipedge) {
      this.clipedge.renderThing()
    }
    if (this.lineBloom) {
      this.lineBloom.renderThing()
    }
    if (this.windLineBloom) {
      this.windLineBloom.renderThing()
    }
    if(this.bodyMode){
      this.bodyMode.renderThing()
    }
    this.composer && this.composer.render()
    // this.renderer.render(this.scene, this.camera)
    this.stats.end();
    requestAnimationFrame(this.render.bind(this))
  }
  setupResize() {
    window.addEventListener('resize', this.resize.bind(this))
  }
  resize() {
    this.container = document.getElementById(this.domId)
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight
    this.renderer.setSize(this.width, this.height)
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
  }
  initGui() {
    this.gui = new GUI({ width: 260 });
    let folderLocal = this.gui.addFolder('Local Clipping')
    let propsLocal = {
      Enabled: true,
      Plane: 0
    }
    this.propsLocal = propsLocal
    folderLocal.add(propsLocal, 'Enabled', (v) => {
      this.renderer.localClippingEnabled = v
    });
    folderLocal.add(propsLocal, 'Plane').min(-13).max(13).step(.001).onChange((v) => {
      this.localPlane.constant = v;
      this.clipedge.planeMesh.position.x = v / this.scaleValue + 0.05
    });
  }
}