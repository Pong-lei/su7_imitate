uniform float vTime;
uniform vec3 color;
uniform float opacity;
varying vec2 vUv;
varying vec4 vCoord;


#define S smoothstep
#define IS(x,y,z) (1. - smoothstep(x,y,z))


vec3 draw_line(vec2 uv,vec3 color, float shift, float freq){
	// 粗细
	 float line_thickness = 0.2;
	// 中心纵向scale     
    float amp_coef = 0.8;
    uv.y -=IS(0.,1.3,abs(uv.x)) * sin(uv.x + shift * freq) * amp_coef * sin(uv.x + shift);
    return IS(0.,line_thickness*S(1.2,1.,abs(uv.x)),abs(uv.y*1.2)) * color;
}

void main() {
    float speed = 0.5;
    
    float freq_coef = 1.5;
	 	vec2 uv = vUv*2. - 1.;
    // uv.x *= vCoord.x/vCoord.y;
    
	float shift = vTime * speed;

	float vProgress = smoothstep(-1.,1.,sin(vUv.x*12. + vTime*6.));
	// end: x > 1 : 0  x < 0.9 : 1  0.9 < x < 1 : 1-->0  
	float hideCorners = smoothstep(1., 0.9, vUv.x);
	// begin: x < 0 : 0  x > 0.1 : 1  0 < x < 0.1 : 0--> 1
	float hideCorners1 = smoothstep(0., 0.1, vUv.x);
	
	vec3 color = vec3(0.);
	for (float idx = 0.; idx < 1.; idx += 1.){
			color += draw_line(uv,vec3(0.2,0.3,0.6),shift+idx*0.4,1.+freq_coef);
	}
	vec3 finalColor = mix(color,color * 0.25,vProgress);
	gl_FragColor = vec4(finalColor,opacity*hideCorners*hideCorners1);
}