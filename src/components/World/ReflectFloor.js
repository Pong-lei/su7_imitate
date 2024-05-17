import * as THREE from 'three'
import tNormalMap0 from './textures/t_floor_normal.webp'
import tRoughness from './textures/t_floor_roughness.webp'
import tNoise from './textures/noise.png'

export default class Reflector extends THREE.Mesh {
  constructor(geometry, options = {}) {
    super(geometry);

    this.type = 'Reflector';
    this.camera = new THREE.PerspectiveCamera();
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
    const scale = options.scale !== undefined ? options.scale : 1
    const shader =
      options.shader !== undefined ? options.shader : Reflector.ReflectorShader

    const textureLoader = new THREE.TextureLoader()

    const normalMap0 =
      options.normalMap0 ||
      textureLoader.load(tNormalMap0)
    const roughness = options.roughness || textureLoader.load(tRoughness)
    const Noise = options.tNoise || textureLoader.load(tNoise)
    const reflectorPlane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const reflectorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const lookAtPosition = new THREE.Vector3(0, 0, - 1);
    const clipPlane = new THREE.Vector4();

    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const textureMatrix = new THREE.Matrix4(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0);
    const virtualCamera = this.camera;
    const clock = new THREE.Clock()

    // internal components
    const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    renderTarget.depthBuffer = true;
    renderTarget.depthTexture = new THREE.DepthTexture();
    renderTarget.depthTexture.type = THREE.UnsignedShortType;


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


    // maps

    normalMap0.wrapS = normalMap0.wrapT = THREE.RepeatWrapping
    roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping
    Noise.wrapS = Noise.wrapT = THREE.RepeatWrapping

    this.material.uniforms['tReflectionMap'].value = renderTarget.texture
    this.material.uniforms['tNormalMap0'].value = normalMap0
    this.material.uniforms['tRoughness'].value = roughness
    this.material.uniforms['tNoise'].value = Noise
    this.material.uniforms.tDepth.value = renderTarget.depthTexture;

    this.material.uniforms['color'].value = color
    this.material.uniforms['textureMatrix'].value = textureMatrix

    // inital values

    this.material.uniforms['config'].value.x = 0 // 
    this.material.uniforms['config'].value.y = 0.75
    this.material.uniforms['config'].value.w = scale // scale

    // functions
    this.onBeforeRender = function (renderer, scene, camera) {
      reflectorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
      rotationMatrix.extractRotation(scope.matrixWorld);

      normal.set(0, 0, 1);
      normal.applyMatrix4(rotationMatrix);

      view.subVectors(reflectorWorldPosition, cameraWorldPosition);

      // Avoid rendering when reflector is facing away

      if (view.dot(normal) > 0) return;

      view.reflect(normal).negate();
      view.add(reflectorWorldPosition);

      rotationMatrix.extractRotation(camera.matrixWorld);

      lookAtPosition.set(0, 0, - 1);
      lookAtPosition.applyMatrix4(rotationMatrix);
      lookAtPosition.add(cameraWorldPosition);

      target.subVectors(reflectorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(reflectorWorldPosition);

      virtualCamera.position.copy(view);
      virtualCamera.up.set(0, 1, 0);
      virtualCamera.up.applyMatrix4(rotationMatrix);
      virtualCamera.up.reflect(normal);
      virtualCamera.lookAt(target);

      virtualCamera.far = camera.far; // Used in WebGLBackground

      virtualCamera.updateMatrixWorld();
      virtualCamera.projectionMatrix.copy(camera.projectionMatrix);

      this.material.uniforms.cameraNear.value = camera.near;
      this.material.uniforms.cameraFar.value = camera.far;
      // Update the texture matrix
      textureMatrix.set(
        0.5, 0.0, 0.0, 0.5,
        0.0, 0.5, 0.0, 0.5,
        0.0, 0.0, 0.5, 0.5,
        0.0, 0.0, 0.0, 1.0
      );
      textureMatrix.multiply(virtualCamera.projectionMatrix);
      textureMatrix.multiply(virtualCamera.matrixWorldInverse);
      textureMatrix.multiply(scope.matrixWorld);

      // Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
      // Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
      reflectorPlane.setFromNormalAndCoplanarPoint(normal, reflectorWorldPosition);
      reflectorPlane.applyMatrix4(virtualCamera.matrixWorldInverse);

      clipPlane.set(reflectorPlane.normal.x, reflectorPlane.normal.y, reflectorPlane.normal.z, reflectorPlane.constant);

      const projectionMatrix = virtualCamera.projectionMatrix;

      q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
      q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
      q.z = - 1.0;
      q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14];

      // Calculate the scaled plane vector
      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

      // Replacing the third row of the projection matrix
      projectionMatrix.elements[2] = clipPlane.x;
      projectionMatrix.elements[6] = clipPlane.y;
      projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias;
      projectionMatrix.elements[14] = clipPlane.w;

      // Render
      scope.visible = false;

      const currentRenderTarget = renderer.getRenderTarget();

      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

      renderer.xr.enabled = false; // Avoid camera modification
      renderer.shadowMap.autoUpdate = false; // Avoid re-computing shadows

      renderer.setRenderTarget(renderTarget);

      renderer.state.buffers.depth.setMask(true); // make sure the depth buffer is writable so it can be properly cleared, see #18897

      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, virtualCamera);

      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;

      renderer.setRenderTarget(currentRenderTarget);

      // Restore viewport

      const viewport = camera.viewport;

      if (viewport !== undefined) {

        renderer.state.viewport(viewport);

      }

      scope.visible = true;
    };

    this.getRenderTarget = function () {

      return renderTarget;

    };
    this.dispose = function () {

      renderTarget.dispose();
      scope.material.dispose();

    };
  }
}
Reflector.ReflectorShader = {

  name: 'ReflectorShader',

  uniforms: {

    'color': {
      value: null
    },
    'config':{
      value: new THREE.Vector4()
    },
    'tReflectionMap': {
      value: null
    },
    'tNormalMap0':{
      value: null
    },
    'tRoughness':{
      type: 't',
      value: null
    },
    'tNoise':{
      value:null
    },
    'textureMatrix': {
      value: null
    },
    'tDepth': {
      type: 't',
      value: null
    },
    'cameraNear': {
      type: 'f',
      value: 0
    },

    'cameraFar': {
      type: 'f',
      value: 0
    },
  },

  vertexShader: /* glsl */`
		uniform mat4 textureMatrix;
		varying vec4 vCoord;
    varying vec2 vUv;
		void main() {
      vUv = uv;
			vCoord = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */`
    #include <packing>
		uniform vec3 color;
		uniform sampler2D tReflectionMap;
    uniform sampler2D tDepth;
		uniform float cameraNear;
		uniform float cameraFar;
    uniform sampler2D tNormalMap0;
    uniform sampler2D tRoughness;
    uniform sampler2D tNoise;
    uniform vec4 config;
		varying vec4 vCoord;
    varying vec2 vUv;


		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}
    float readDepth( sampler2D depthSampler, vec4 coord ) {
				
		float fragCoordZ = texture2DProj( depthSampler, coord ).x;
		float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
		return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			
		}
    #define pow2(x) (x * x)

    const float pi = atan(1.0) * 4.0;
    const int samples = 8;
    const float sigma = float(samples) * 0.25;
    float gaussian(vec2 i) {
      return 1.0 / (2.0 * pi * pow2(sigma)) * exp(-((pow2(i.x) + pow2(i.y)) / (2.0 * pow2(sigma))));
    }
  
    vec3 blur(sampler2D sp, vec2 uv, vec2 scale) {
        vec3 col = vec3(0.0);
        float accum = 0.0;
        float weight;
        vec2 offset;
        
        for (int x = -samples / 2; x < samples / 2; ++x) {
            for (int y = -samples / 2; y < samples / 2; ++y) {
                offset = vec2(x, y);
                weight = gaussian(offset);
                col += texture(sp, uv + scale * offset).rgb * weight;
                accum += weight;
            }
        }
        
        return col / accum;
    }
    vec2 noise (vec2 uv){
      // uv = vec2(dot(uv,vec2(127.1,311.7)),dot(uv,vec2(269.5,183.3)));
      // return fract(sin(uv) * 43758.5453123) - 0.5;
      return texture2D(tNoise,uv).xy - 0.5;
    }
		void main() {

			#include <logdepthbuf_fragment>
      vec2 uv = vec2(vCoord.x/vCoord.w,vCoord.y/vCoord.w);
			vec4 base = texture2DProj( tReflectionMap, vCoord );
      float depth = readDepth( tDepth, vCoord );
      // vec3 Color = blur(tReflectionMap,vCoord.xy/vCoord.w,vec2(1.0)/vec2(1920.,1080.));
			// gl_FragColor = vec4( blendOverlay( base.rgb, vec3(1.,1.,0.) ), 1. -( depth * 1000.0 )  );
      // vec4 Color = texture2D(tReflectionMap,uv + noise(uv)*blur_power);
      // gl_FragColor = vec4( Color, 1.- ( depth * 100.0 ));

	    float scale = config.w;
      vec4 normalColor = texture2D(tNormalMap0, (uv * scale));
      vec3 normal = normalize(vec3(normalColor.r * 2.0 - 1.0, normalColor.b, normalColor.g * 2.0 - 1.0));
      vec3 coord = vCoord.xyz / vCoord.w;
      vec2 uv_normal = coord.xy + coord.z * normal.xz * 0.25 ;
      vec4 reflectColor = texture2D(tReflectionMap, vec2( uv_normal.x, uv_normal.y));
      float blur_power = 0.04;
      vec4 Color = texture2D(tReflectionMap,uv_normal + noise(uv_normal)*blur_power);
      float roughness = texture2D(tRoughness, vUv*0.5).g;
      float mixRatio = 1. - roughness;

      gl_FragColor = Color;
      gl_FragColor *=  mixRatio;
      gl_FragColor +=  reflectColor*0.2;
			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`
};
