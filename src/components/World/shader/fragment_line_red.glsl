uniform float vTime;
uniform vec3 color;
varying vec2 vUv;


// varying float vOpacity;
// 定义噪声函数
float random(vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
void main() {
	float vProgress = smoothstep(-1.,1.,sin(vUv.x*12. + vTime*12.));
	vec3 finalColor = mix(color,color * 0.0,vProgress);
	// end: x > 1 : 0  x < 0.9 : 1  0.9 < x < 1 : 1-->0  
	float hideCorners = smoothstep(1., 0.9, vUv.x);
	// begin: x < 0 : 0  x > 0.1 : 1  0 < x < 0.1 : 0--> 1
	float hideCorners1 = smoothstep(0., 0.1, vUv.x);
	finalColor = mix(color,color * 0.25,vProgress);
	vec2 st = vUv;
	st = random(st)*st*500.;
	float nosie = (smoothstep(0.9,0.99,mod(st.x-vTime,1.))+smoothstep(0.2,0.1,mod(st.x-vTime,1.)));
	gl_FragColor = vec4(finalColor*nosie, hideCorners * hideCorners1);
}