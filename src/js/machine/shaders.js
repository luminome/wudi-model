import * as THREE from "three";
import jsConfig from "../config";

//add polys material soon

export const by_distance = new THREE.ShaderMaterial({

    uniforms: {
        depth: {
            type: 'f',
            value: 5.0  //jsConfig.contours.limit_distance
        },
        color: {
            type: 'c',
            value: null
        },
        baseColor: {
            type: 'c',
            value: null
        }
    },

    vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        uniform float depth;
        varying float vOpacity;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vOpacity = 1.0 - (1.0 / (depth / -mvPosition.z));
            gl_Position = projectionMatrix * mvPosition;
            if( vOpacity < 0.0) vOpacity = 0.0;
        }
    `,
    fragmentShader:`
        uniform vec3 color;
        varying vec3 vColor;
        uniform vec3 baseColor;
        varying float vOpacity;
        
        void main() {
            vec3 offsetColor = baseColor + (vColor * abs(vOpacity));
            gl_FragColor = vec4(offsetColor, 1.0 );
            if( vOpacity < 0.05) discard;
        }
    `
});

export const legend = new THREE.ShaderMaterial({
    uniforms: {
        full_d: {
            type: 'f',
            value: 0.5,
        },
        max_alpha: {
            type: 'f',
            value: 1.0,
        },
        color: {
            type: 'c',
            value: null,
        }
    },
    vertexShader: `
        precision highp float;
        attribute vec3 color;
        uniform float full_d;
        uniform float max_alpha;
        varying float vOpacity;    
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            vOpacity = clamp((1.0 / (full_d / -mvPosition.z)), 0.09, max_alpha);
            gl_Position = projectionMatrix * mvPosition;
        }
	`,
    fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
            gl_FragColor = vec4( vColor, vOpacity );
        }
    `,
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: true,
})

export const legend_instanced = new THREE.ShaderMaterial({
    uniforms: {
        full_d: {
            type: 'f',
            value: 0.5,
        }
    },
    vertexShader: `
        uniform float full_d;
        varying float vOpacity;    
        varying vec3 vInstanceColor;
        void main() {
            vInstanceColor = instanceColor;
            vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0);
            vOpacity = clamp((1.0 / (full_d / -mvPosition.z)), 0.1, 1.0);            
            gl_Position = projectionMatrix * mvPosition;
        }
	`,
    fragmentShader: `
        varying float vOpacity;
        varying vec3 vInstanceColor;
        void main() {
            gl_FragColor = vec4( vInstanceColor, vOpacity );
        }
    `,
    side: THREE.FrontSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: true,
})


export const wudi = new THREE.ShaderMaterial({

    uniforms: {
        "alpha": {type: "f", value: 1.0},
        "lightColor": {type: "c", value: new THREE.Color(0xFFFFFF)},
        "lightDirection": {type: "c", value: new THREE.Vector3(0.0, 0.0, 1.0).normalize()}
    },

    vertexShader: `
        precision highp float;
        uniform float alpha;
        
        varying vec3 vNormal;
        varying float vOpacity;
        varying vec3 vInstanceColor;
        attribute float visible;
        
        void main() {
            vNormal = normal;
            vInstanceColor = instanceColor;
            vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0);
            vOpacity = 1.0*(alpha);
            gl_Position = projectionMatrix * mvPosition;
            gl_Position = mix( vec4( 0, 0, - 1, 1 ), gl_Position, visible );
        }
    `,

    fragmentShader: `
        uniform vec3 lightColor;
        uniform vec3 lightDirection;
        
        varying float vOpacity;
        varying vec3 vNormal;
        varying vec3 vInstanceColor;
        
        void main() {
            //gl_FragColor = vec4( vInstanceColor, vOpacity );
            
            vec3 norm = normalize(vNormal);

            float nDotL = clamp(dot(lightDirection, norm), 0.5, 1.0);
    
            vec3 diffuseColor = lightColor * nDotL * vInstanceColor * 2.0;
    
            gl_FragColor = vec4(diffuseColor, vOpacity);
            
            //if( gl_FragColor.a < 0.15) discard;
        }
    `

});