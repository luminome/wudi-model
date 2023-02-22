import * as THREE from "three";
import * as util from './util.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

let renderer, scene, composer, view_axes, render_l_date, layer_one, layer_two, layer_three

const util_c = new THREE.Color();

const visibleAtZDepth = (depth, camera) => {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;

    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180;

    // Math.abs to ensure the result is always positive
    const vis_ht = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
    return {'h': vis_ht, 'w': vis_ht * camera.aspect};
};


/**
 * @author felixturner / http://airtight.cc/
 *
 * RGB Shift Shader
 * Shifts red and blue channels from center in opposite directions
 * Ported from http://kriss.cx/tom/2009/05/rgb-shift/
 * by Tom Butterworth / http://kriss.cx/tom/
 *
 * amount: shift distance (1 is width of input)
 * angle: shift angle in radians
 */


const o_shady = {

	uniforms: {
		"tDiffuse": { type: "t", value: null },
		"amount":   { type: "f", value: 0.005 },
		"angle":    { type: "f", value: 0.0 }
	},

	vertexShader: [
        // "glEnable(GL_BLEND);",
		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [
        // "glBlendFunc(GL_SRC_ALPHA, GL_ONE);",
        // "glBlendFunc(GL_SRC_ALPHA, GL_ONE);",
		"uniform sampler2D tDiffuse;",
		"uniform float amount;",
		"uniform float angle;",

		"varying vec2 vUv;",

		"void main() {",

			"vec2 offset = amount * vec2( cos(angle), sin(angle));",
			"vec4 cr = texture2D(tDiffuse, vUv + offset);",
			"vec4 cga = texture2D(tDiffuse, vUv);",
			"vec4 cb = texture2D(tDiffuse, vUv - offset);",
			"gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);",

		"}"

	].join("\n")

};


const shady = {

	uniforms: {
		"tDiffuse": { type: "t", value: null },
		"alpha":   { type: "f", value: 1.0 },
	},

	vertexShader: [
		"varying vec2 vUv;",
		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"
	].join("\n"),

	fragmentShader: [
		"uniform sampler2D tDiffuse;",
        "uniform float alpha;",
		"varying vec2 vUv;",
		"void main() {",
			"vec4 cga = texture2D(tDiffuse, vUv);",
			"gl_FragColor = vec4(cga.r, cga.g, cga.b, alpha);",
		"}"

	].join("\n")

};



class LayerSimple {
	constructor( camera ) {
		this.scene = new THREE.Scene();
	}
}

class LayerComplex {
	constructor( camera ) {
		this.scene = new THREE.Scene();
		// this.scene.background = null;
        // this.scene.setClearColor(0x000000, 0);
        this.renderPass = new RenderPass( this.scene, camera );
		this.renderPass.clear = true;
		this.renderPass.autoClear = false;
		this.renderPass.clearDepth = false;
		this.renderPass.renderToScreen = true;
        this.renderPass.clearAlpha = 0.0;
        this.renderPass.clearColor = 0x00FF00;


        this.shaderPass = new ShaderPass( shady );
        this.shaderPass.material.uniforms[ 'alpha' ].value = 0.95;
        this.shaderPass.renderToScreen = true;
        this.shaderPass.autoClear = true;
        this.shaderPass.clear = true;
        this.shaderPass.material.transparent = true;
        this.shaderPass.material.blending = THREE.AdditiveBlending;
	}
}

function init(){

    environment.controls.cam.camera = new THREE.PerspectiveCamera(60, environment.vars.view.width / environment.vars.view.height, 0.1, 80);
    // scene = new THREE.Scene();
    // scene.background = new THREE.Color(environment.vars.view.colors.window_background);//util.color_to_hex(environment.vars.view.colors.window_background));

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: false,
        physicallyCorrectLights: true
        // alpha: true
    });

    renderer.setPixelRatio(2);
    renderer.setSize(environment.vars.view.width, environment.vars.view.height);
    // renderer.setClearColor(0x000000);
    // renderer.setClearAlpha(0.0);
    renderer.setClearColor( 0x000000, 0 );
    renderer.autoClear = false;
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const parameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, stencilBuffer: false };
    const renderTarget = new THREE.WebGLRenderTarget( environment.vars.view.width, environment.vars.view.height, parameters );

// cmp = new THREE.EffectComposer(r, renderTarget);

    composer = new EffectComposer( renderer, renderTarget );//, renderTarget );

    // if(environment.vars.view.features.axes_helper){
    //     view_axes = new THREE.AxesHelper(environment.vars.view.scene_width / 2);
    //     view_axes.material.blending = THREE.AdditiveBlending;
    //     view_axes.material.transparent = true;
    //     scene.add(view_axes);
    // }
    //
    const light = new THREE.PointLight(0xffffff, 6.0, environment.vars.view.scene_width * 6);
    light.position.set(0, environment.vars.view.scene_width * 3, 0);

    const light2 = new THREE.PointLight(0xffffff, 10.0, environment.vars.view.scene_width * 6);
    light2.position.set(0, environment.vars.view.scene_width * 3, 0);

    // scene.add(light);

    const ambient_light = new THREE.AmbientLight( 0xFFFFFF ); // soft white light
    // scene.add( ambient_light );

    environment.dom.appendChild(renderer.domElement);
    environment.vars.dom = renderer.domElement;


	layer_one = new LayerSimple( environment.controls.cam.camera );
    layer_one.scene.background = new THREE.Color(environment.vars.view.colors.window_background);
    // layer_one.scene.add(light);
    // layer_one.scene.add(ambient_light);
	layer_one.scene.add( environment.vars.map_model );
    // composer.addPass( layer_one.renderPass );

    layer_two = new LayerSimple( environment.controls.cam.camera );
    // layer_two.scene.add(light);
    // layer_two.scene.add(ambient_light);
	layer_two.scene.add( environment.vars.model );
    // composer.addPass( layer_two.renderPass );

	layer_three = new LayerComplex( environment.controls.cam.camera );
    // layer_three.scene.add(light2);
    // layer_three.scene.add(ambient_light);
	layer_three.scene.add( environment.vars.wudi_model );
    composer.addPass( layer_three.renderPass );
    composer.addPass( layer_three.shaderPass );


    // const hmat = new THREE.MeshBasicMaterial({
    //     blending: THREE.AdditiveBlending,
    //     // depthTest: false,
    //     // depthWrite: true,
    // })
    //
    // layer_three.scene.overrideMaterial = hmat;

    //scene.add(environment.vars.model);
    // scene.add(environment.arrow);
    //environment.vars.model.updateMatrixWorld();
    //environment.controls.cam.run();
}

function post_init() {

    const post = {
        add_helper_grid(){
            const arr = {};
            util_c.set(environment.vars.view.colors.helpers).getHSL(arr);
            const r = environment.vars.view.features.helper_grid.width;
            const col_xy = util_c.clone().setHSL(arr.h, arr.s, arr.l*0.5);
            const col_gd = util_c.clone().setHSL(arr.h, arr.s, arr.l*0.25);
            const view_grid = new THREE.GridHelper(r, r, col_xy, col_gd);
            view_grid.material.blending = THREE.AdditiveBlending;
            view_grid.material.transparent = true;
            view_grid.renderOrder = 1;
            environment.vars.model.add(view_grid);
            environment.objects.helper_grid = view_grid;
        },
        add_position_lines(){
            const vertices = [
                -1,0,0,
                1,0,0,
                0,0,-1,
                0,0,1,
            ]

            const material = new THREE.LineBasicMaterial({color: 0xFFFFFF});
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );

            const line = new THREE.LineSegments( geometry, material );

            environment.vars.model.add(line);
            environment.objects.position_lines = line;

        },
        add_beautiful_position_lines(){
            const ref = environment.vars.view.features.beautiful_position_lines;
            const material = new THREE.RawShaderMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: true,
                uniforms: {
                    color: {
                        type: 'c',
                        value: new THREE.Color(ref.color),//;//.setHex(ref.color) //new THREE.Color(0xFF00FF) //
                    },
                    startOpacity: {
                        value: ref.opacity,
                    },
                    limitDistance: {
                        value: ref.limit,
                    }
                },

                vertexShader: `
                    precision highp float;
                    attribute vec2 uv;
                    attribute vec4 position;
                    varying vec4 vPos;
                    uniform mat4 projectionMatrix;
                    uniform mat4 modelViewMatrix;
                    void main() {
                      vPos = position;
                      gl_Position = projectionMatrix * modelViewMatrix * position;
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    uniform vec3 color;
                    uniform float opacity;
                    uniform float startOpacity;
                    uniform float limitDistance;
                    varying vec4 vPos;
                    void main() {
                      float distance = clamp(length(vPos), 0., limitDistance);
                      float opacity = startOpacity - distance / limitDistance;
                      gl_FragColor = vec4(color, opacity);
                    }
                `
            });
            const axis_line_group = new THREE.Group();
            //const segments = [];

            const vertices = [
                -1,0,0,
                1,0,0,
                0,0,-1,
                0,0,1,
                0,0,0,
                0,-1,0,
            ]

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );
            geometry.scale(20, 20, 20);

            const line = new THREE.LineSegments( geometry, material );
            axis_line_group.add(line);

            //
            // const ralph = new THREE.Quaternion();
            // const rad = ref.weight*0.01;
            // const vu = new THREE.Vector3();
            //
            // for (let n = 0; n < 3; n++) {
            //
            //     const r = [0, 0, 0];
            //     r[2 - n] = 1.0;
            //
            //     vu.fromArray(r);
            //     const c = n === 0 ? 2 : -2;
            //     ralph.setFromAxisAngle(vu, Math.PI / c);
            //
            //     const geometry = new THREE.CylinderGeometry(rad, rad, ref.size, 16);
            //     geometry.translate(0, ref.size / 2, 0);
            //     geometry.applyQuaternion(ralph);
            //     const neg = new THREE.Mesh(geometry, material);
            //
            //     const n_geometry = geometry.clone();
            //     if (n === 1) {
            //         n_geometry.rotateX(Math.PI);
            //     } else {
            //         ralph.setFromAxisAngle(vu, Math.PI);
            //         n_geometry.applyQuaternion(ralph);
            //     }
            //
            //     const pos = new THREE.Mesh(n_geometry, material);
            //
            //     //segments.push(n === 1 ? [pos, neg] : [neg, pos]);
            //
            //     axis_line_group.add(neg);
            //     axis_line_group.add(pos);
            // }

            // const material = new THREE.LineBasicMaterial({color: 0xFFFFFF});
            // const geometry = new THREE.BufferGeometry();
            // geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );
            //
            // const line = new THREE.LineSegments( geometry, material );

            axis_line_group.renderOrder = 10;

            environment.vars.model.add(axis_line_group);
            environment.objects.beautiful_position_lines = axis_line_group;


            //return {art: axis_line_group, segments: segments};
        },
        add_center_line(){
            const vertices = [
                -1,0,0,
                1,0,0,
                0,0,-1,
                0,0,1,
            ]

            const material = new THREE.LineBasicMaterial({color: 0xFFFFFF});
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(vertices), 3 ) );

            const line = new THREE.LineSegments( geometry, material );

            environment.vars.model.add(line);
            environment.objects.center_line = line;
        },
        add_grid_marks(){
            const grid_refs = environment.vars.view.features.grid_marks;
            const plush_material = new THREE.ShaderMaterial({
                depthTest: true,
                depthWrite: true,
                uniforms: {
                    level: {
                        type:'c',
                        value: grid_refs.distance,
                    },
                    base_color:{
                        type:'c',
                        value: new THREE.Color(environment.vars.view.colors.window_background)
                    }
                },
                vertexShader: `
                    uniform vec3 base_color;
                    uniform float level;
                    attribute vec3 color;
                    varying float vOpacity;
                    varying vec3 vColor;
                    varying vec3 vBaseColor;
                    void main() {
                        vColor = color;
                        vBaseColor = base_color;
                        vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4( position, 1.0);
                        vOpacity = 1.0 - (1.0 / (level / -mvPosition.z));
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    precision highp float;
                    varying float vOpacity;
                    varying vec3 vColor;
                    varying vec3 vBaseColor;
                    void main() {
                        vec3 std = vBaseColor + (vColor * vOpacity);
                        gl_FragColor = vec4( std, 1.0 );
                        if( vOpacity < 0.05) discard;
                    }
                `
            });


            const width = grid_refs.width;
            const count = Math.pow(width+1, 2);
            const ds = grid_refs.shape_scale;
            const s = grid_refs.pitch;
            const L = grid_refs.shape_length;

            const plush3dVertices = new Float32Array([
                1.0, L, 1.0,
                1.0, 1.0, 1.0,
                L, 1.0, 1.0,
                L, -1.0, 1.0,
                1.0, -1.0, 1.0,
                1.0, -L, 1.0,
                -1.0, -L, 1.0,
                -1.0, -1.0, 1.0,
                -L, -1.0, 1.0,
                -L, 1.0, 1.0,
                -1.0, 1.0, 1.0,
                -1.0, L, 1.0,

                1.0, L, -1.0,
                1.0, 1.0, -1.0,
                L, 1.0, -1.0,
                L, -1.0, -1.0,
                1.0, -1.0, -1.0,
                1.0, -L, -1.0,
                -1.0, -L, -1.0,
                -1.0, -1.0, -1.0,
                -L, -1.0, -1.0,
                -L, 1.0, -1.0,
                -1.0, 1.0, -1.0,
                -1.0, L, -1.0,

            ]);
            const plush3dIndices = new Uint16Array([
                //front
                0,11,5,
                11,6,5,
                2,1,3,
                1,4,3,
                10,9,7,
                9,8,7,
                //sides
                0,1,13,
                13,12,0,

                1,2,14,
                14,13,1,

                2,3,15,
                15,14,2,

                3,4,16,
                16,15,3,

                4,5,17,
                17,16,4,

                5,6,18,
                18,17,5,

                6,7,19,
                19,18,6,

                7,8,20,
                20,19,7,

                8,9,21,
                21,20,8,

                9,10,22,
                22,21,9,

                10,11,23,
                23,22,10,

                0,12,23,
                23,11,0,
                //back
                12,17,18,
                18,23,12,
                13,14,15,
                15,16,13,
                21,22,19,
                19,20,21
            ]);
            const plushColors = new Float32Array(plush3dVertices.length);
            plushColors.fill(0.5);
            const f_color = [];
            util_c.set(environment.vars.view.colors.view_elements).toArray(f_color);

            for(let i = 0; i < count; i++){
                util.set_buffer_at_index(plushColors,i,f_color);
            }

            let mesh_geometry = new THREE.BufferGeometry();
            mesh_geometry.setAttribute("position", new THREE.BufferAttribute(plush3dVertices, 3, false));
            mesh_geometry.setAttribute("color", new THREE.BufferAttribute(plushColors, 3, false));
            mesh_geometry.setIndex(new THREE.BufferAttribute(plush3dIndices, 1, false));
            mesh_geometry.computeVertexNormals();

            mesh_geometry.scale(ds,ds,ds);
            mesh_geometry.rotateX( Math.PI / 2);

            const plush_mesh = new THREE.InstancedMesh(mesh_geometry, plush_material, count);
            plush_mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            const dummy = new THREE.Object3D();

            for(let i = 0; i <= width; i++){
                for(let j = 0; j <= width; j++){
                    const x = ((width/-2.0) + i)*s;
                    const y = ((width/-2.0) + j)*s;
                    dummy.position.set(x,0,y);
                    dummy.updateMatrix();
                    plush_mesh.setMatrixAt(i*(width+1)+j, dummy.matrix);
                }
            }

            plush_mesh.instanceMatrix.needsUpdate = true;
            environment.objects.grid_marks = plush_mesh;
            environment.vars.model.add(plush_mesh);
        },
        add_tools(){
            const tools = {
                marker: null,
                mover_marker: null,
                ray: null,
                start: new THREE.Vector3(),
                end: new THREE.Vector3(),
                object: new THREE.Group(),
                vertices: [
                    -1,0,0,
                    1,0,0,
                    0,0,-1,
                    0,0,1,
                ],
                init(){
                    const material = new THREE.LineBasicMaterial({color: 0x00FF00});
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(tools.vertices), 3 ) );
                    ['marker','mover_marker'].map(m=>{
                        tools[m] = new THREE.LineSegments( geometry, material );
                        tools[m].scale.setScalar(0.5);
                        tools.object.add(tools[m]);
                    });

                    //console.log(tools);

                    const points = [tools.start, tools.end];
                    const ray_geometry = new THREE.BufferGeometry().setFromPoints( points );
                    ray_geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
                    ray_geometry.attributes.position.needsUpdate = true;

                    tools.ray = new THREE.Line( ray_geometry, material );
                    tools.object.add(tools.ray);
                },

                set(a,b){
                    tools.start.copy(a);
                    tools.end.copy(b);
                    util.set_buffer_at_index(tools.ray.geometry.attributes.position.array,0,tools.start.toArray());
                    util.set_buffer_at_index(tools.ray.geometry.attributes.position.array,1,tools.end.toArray());
                    tools.ray.geometry.attributes.position.needsUpdate = true;
                    tools.marker.position.copy(tools.end);
                }
            }

            tools.init();
            // const a = new THREE.Vector3(0,0,0);
            // const b = new THREE.Vector3(10,0,10);
            // tools.set(a,b);
            environment.vars.model.add(tools.object);
            environment.objects.tools = tools;

        }
    }

    // if(environment.vars.view.features.default_view_z){
    //     const default_view_z = environment.vars.view.features.default_view_z;
    //     const visible_dimensions = visibleAtZDepth(-default_view_z, environment.controls.cam.camera);
    //     environment.controls.cam.base_pos.z = ((default_view_z / visible_dimensions.w) * environment.vars.view.scene_width) + 12.0;
    //     environment.vars.trace.log('visible_dimensions', visible_dimensions);
    //     environment.controls.cam.run();
    // }

    Object.entries(environment.vars.view.features).map(f => {
        if(f[1].hasOwnProperty('on') && f[1].on) post['add_'+f[0]]();
    });
}

function render(a) {
    const k_delta = () => {
        const d = new Date();
        const l_delta = d - render_l_date;
        render_l_date = d;
        return Math.floor(1000 / l_delta);
    }
    environment.fps = k_delta();
    environment.vars.animation(a);


    renderer.clear();
    renderer.render(layer_one.scene, environment.controls.cam.camera);
    renderer.clearDepth();
    renderer.render(layer_two.scene, environment.controls.cam.camera);
    // renderer.render(layer_three.scene, environment.controls.cam.camera);
    composer.render();

    // renderer.clearDepth();
    // renderer.render(layer_three.scene, environment.controls.cam.camera);

    //renderer.clear();
    //renderer.clearDepth();
	//composer.render();
    //
}

function animate(f) {
    environment.frame = window.requestAnimationFrame(animate);
    render(f);
}

function resize(w,h){
    renderer.setSize(w,h);
}


export const environment = {
    objects:{},
    frame: 0,
    fps: 0,
    init(dom, controls, vars){
        // environment.arrow = new THREE.ArrowHelper();
        environment.controls = controls;
        environment.vars = vars;
        environment.dom = dom;
        init();
        post_init();
        animate();
    },
    resize,
    visibleAtZDepth
}