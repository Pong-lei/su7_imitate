import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import streeModel from "../model/stree/stree.glb";
import * as THREE from "three";

export default function Init_I_drivingModeBg(scene, camera) {
  return new Promise((resolve, reject) => {
    let pointMaterial = {
      uniforms: {
        time: { value: 0 },
      },
    };

    const sceneParams = {
      size: 0.85,
    };

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("draco");
    loader.setDRACOLoader(dracoLoader);
    loader.load(streeModel, (gltf) => {
      gltf.scene.rotation.y = Math.PI / 2;
      gltf.scene.scale.set(
        sceneParams.size,
        sceneParams.size,
        sceneParams.size
      );
      // console.log(gltf.scene);

      gltf.scene.updateMatrixWorld(true);

      let mesh;

      // 找到第一个 Mesh（假设你的 glb 只有一个合并模型）
      gltf.scene.traverse((child) => {
        if (child.isMesh && !mesh) {
          mesh = child;
        }
      });

      if (!mesh) {
        console.warn("No mesh found in model.");
        return;
      }

      // 获取模型的 Z 长度范围
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const modelMinZ = box.min.z;
      const modelMaxZ = box.max.z;
      const modelZLength = modelMaxZ - modelMinZ;
      // 克隆一份几何体，应用 world 矩阵（包含缩放等）
      // const geometry = mesh.geometry.clone();
      // geometry.applyMatrix4(mesh.matrixWorld)

      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);

      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const center = new THREE.Vector3();
      //  获取原始 geometry 和 position attribute
      const geometry = mesh.geometry;
      const positionAttr = geometry.attributes.position;
      const indexAttr = geometry.index;
      const faceCount = indexAttr.count / 3; // 每3个顶点一个三角形
      const weights = new Float32Array(faceCount);
      // console.log("Has index:", !!geometry.index);
      // console.log("geometry vertex count:", positionAttr.count);
      // console.log("geometry face count:", faceCount);
      for (let i = 0; i < faceCount; i++) {
        const i0 = indexAttr.getX(i * 3 + 0);
        const i1 = indexAttr.getX(i * 3 + 1);
        const i2 = indexAttr.getX(i * 3 + 2);

        a.fromBufferAttribute(positionAttr, i0);
        b.fromBufferAttribute(positionAttr, i1);
        c.fromBufferAttribute(positionAttr, i2);

        center.copy(a).add(b).add(c).divideScalar(3);
        center.applyMatrix4(mesh.matrixWorld); // 应用缩放

        const dist = center.distanceTo(cameraPos);

        //  权重：距离越近权重越大
        weights[i] = 1.0 / (dist + 1.0); // 防止除0
      }
      //  将每个面权重复制给对应的3个顶点
      const expandedWeights = new Float32Array(positionAttr.count).fill(0);
      const countWeights = new Uint8Array(positionAttr.count).fill(0);

      for (let i = 0; i < faceCount; i++) {
        const i0 = indexAttr.getX(i * 3 + 0);
        const i1 = indexAttr.getX(i * 3 + 1);
        const i2 = indexAttr.getX(i * 3 + 2);

        const w = weights[i];
        expandedWeights[i0] += w;
        expandedWeights[i1] += w;
        expandedWeights[i2] += w;

        countWeights[i0]++;
        countWeights[i1]++;
        countWeights[i2]++;
      }
      // 求平均，防止叠加偏重
      for (let i = 0; i < positionAttr.count; i++) {
        if (countWeights[i] > 0) {
          expandedWeights[i] /= countWeights[i];
        }
      }

      geometry.setAttribute(
        "customWeight",
        new THREE.BufferAttribute(expandedWeights, 1)
      );
      //  构造采样器，并使用 customWeight
      // 使用 MeshSurfaceSampler 从表面采样点
      const sampler = new MeshSurfaceSampler(mesh)
        .setWeightAttribute("customWeight")
        .build();

      const numPoints = 400000;
      const positions = [];
      const colors = [];
      const tempPosition = new THREE.Vector3();
      const color = new THREE.Color();
      const randomDirs = [];
      const initialZ = [];
      // for (let i = 0; i < numPoints; i++) {
      //   const z = positions[i * 3 + 2]; // 只取 z 分量
      //   initialZ.push(z);
      // }

      const matrix = mesh.matrixWorld.clone(); // 包含缩放/旋转/位置
      for (let i = 0; i < numPoints; i++) {
        sampler.sample(tempPosition); // 采样点
        tempPosition.applyMatrix4(matrix); // 将变换作用在采样点上

        positions.push(tempPosition.x, tempPosition.y, tempPosition.z);
        initialZ.push(tempPosition.z); //记录相对 Z 值（用于 wrap）
        // if (i == 0) console.log(tempPosition.z, modelMinZ);

        // 可自定义颜色策略
        color.setHSL(i / numPoints, 1.0, 0.5);
        colors.push(color.r, color.g, color.b);
        // 生成单位向量方向
        const dir = new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize();
        randomDirs.push(dir.x, dir.y, dir.z);
      }
      // console.log(positions);
      console.log(modelMinZ, initialZ);

      const pointsGeometry = new THREE.BufferGeometry();
      pointsGeometry.setAttribute(
        "initialZ",
        new THREE.Float32BufferAttribute(initialZ, 1)
      );
      pointsGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      pointsGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      pointsGeometry.setAttribute(
        "randomDir",
        new THREE.Float32BufferAttribute(randomDirs, 3)
      );

      pointMaterial = new THREE.ShaderMaterial({
        vertexColors: true,
        transparent: true,
        uniforms: {
          time: { value: 0 },
          waveTime: { value: 60 },
          modelMinZ: { value: modelMinZ },
          modelMaxZ: { value: modelMaxZ },
          modelZLength: { value: modelZLength },
          scaleFactor: { value: 1 },
        },
        depthWrite: false,
        vertexShader: `
      attribute vec3 randomDir;
      attribute float initialZ;
      uniform float scaleFactor;
      uniform float time;
      uniform float waveTime;
      uniform float modelMinZ;
      uniform float modelMaxZ;
      uniform float modelZLength;
      varying float vR;
      varying float vWaveFront;
      varying float vWaveWidth;
      float rand(vec3 co) {
        return fract(sin(dot(co.xyz ,vec3(12.9898,78.233, 37.719))) * 43758.5453);
      }
      void main() {
        vec3 pos = position;

        // 滑动 wrap
        float speed = 4.8;
        float startPos = smoothstep(0.,12.,time*0.6)*time;
        float movedZ = initialZ - startPos * speed;

        float upperLimit = modelMaxZ ;
        float lowerLimit = modelMinZ ;

        // 如果超过最大值，就 wrap 到模型后方
        if (movedZ < lowerLimit) {
            float excess = lowerLimit - movedZ;
            movedZ = upperLimit - mod(excess, modelZLength );
        }

        float deltaZ = movedZ - initialZ;
        pos.z += deltaZ;

        // 正交扰动：方向每个点不同
        float t = sin(waveTime + dot(pos.xyz, randomDir));
        pos += randomDir * t * 0.8; // 控制扰动范围（可调）

        float r = length(pos.xz); // 与中心的距离
        float waveFront = waveTime * 8.0; // 控制扩散速度
        float waveWidth = 8.0; // 波的宽度范围
        vR = r;
        vWaveFront = waveFront;
        vWaveWidth = waveWidth;

        float centerFalloff = 1.0 - (r / waveFront); // 越远越小，范围 0~1
        centerFalloff = clamp(centerFalloff, 0.0, 1.0); // 避免负值
        // 最终提升值，靠近中心最大值，靠近波前边缘最小
        float lift = smoothstep(waveFront - waveWidth, waveFront, r) * centerFalloff ;
      
        // lift = smoothstep(1.,0.2,lift) * centerFalloff;
        // // 如果在波的范围内，就上升
        if (r < waveFront && r > waveFront - waveWidth) {
          pos.y += lift * vR * smoothstep(55.0,35.,vR);
        } 
          
        float offset = 10.*sin(waveTime + dot(pos.xyz, randomDir));
        vec3 posRadom = position;
        posRadom += randomDir * offset;


        // pos = mix(posRadom,pos,time*0.083);
        // 平滑混合：time 0 ~ 12s 之间混合
        float transitionProgress = smoothstep(0.0, 12.0, time*1.2);
        pos = mix(posRadom, pos, transitionProgress);

        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 1.0;
      }
    `,
        fragmentShader: `
      varying float vR;
      varying float vWaveFront;
      varying float vWaveWidth;
      void main() {
        // 如果在波的范围内，颜色变换
        if (vR < vWaveFront && vR > vWaveFront - vWaveWidth) {
          gl_FragColor = vec4(vec3(0.482,1.,1.), 1.);
        } else {
          gl_FragColor = vec4(vec3(0.482,1.,1.), 0.6);
        }
			}
    `,
      });

      const points = new THREE.Points(pointsGeometry, pointMaterial);
      points.name = "Points";
      const carObject = scene.getObjectByName("carScene");
      if (carObject) {
        points.position.z = carObject.position.z;
      }
      scene.add(points);

      let timer = setInterval(() => {
        if (
          pointMaterial.uniforms &&
          pointMaterial.uniforms.waveTime &&
          pointMaterial.uniforms.time.value > 8
        )
          pointMaterial.uniforms.waveTime.value = 0;
      }, 2000);
      function renderThing() {
        if (pointMaterial.uniforms && pointMaterial.uniforms.time)
          pointMaterial.uniforms.time.value += 0.1;

        if (pointMaterial.uniforms && pointMaterial.uniforms.waveTime)
          pointMaterial.uniforms.waveTime.value += 0.1;
      }
      resolve({
        renderThing,
      });
    });
  });
}
