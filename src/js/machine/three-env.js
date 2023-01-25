import * as THREE from "three";
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BufferAttribute} from "three";

let renderer, scene, model, view_axes, render_l_date, cam

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

function init(){

    environment.controls.cam.camera = new THREE.PerspectiveCamera(60, environment.vars.view.width / environment.vars.view.height, 0.1, 300);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(environment.vars.view.colors.window_background);

    renderer = new THREE.WebGLRenderer({
        powerPreference: "high-performance",
        antialias: true
    });

    renderer.setPixelRatio(1);
    renderer.setSize(environment.vars.view.width, environment.vars.view.height);
    renderer.setClearColor(0x000000);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if(environment.vars.view.features.axes_helper){
        view_axes = new THREE.AxesHelper(environment.vars.view.scene_width / 2);
        view_axes.material.blending = THREE.AdditiveBlending;
        view_axes.material.transparent = true;
        scene.add(view_axes);
    }

    const light = new THREE.PointLight(0xffffff, 10, 100);
    light.position.set(0, environment.vars.view.scene_width * 3, 0);
    scene.add(light);

    const ambient_light = new THREE.AmbientLight( 0x999999 ); // soft white light
    scene.add( ambient_light );

    environment.dom.appendChild(renderer.domElement);
    environment.vars.dom = renderer.domElement;
    scene.add(environment.vars.model);
    environment.controls.cam.run();
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
                // transparent: true,
                // flatShading: true,
                /// blending: THREE.AdditiveBlending,
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
        }
    }

    if(environment.vars.view.features.default_view_z){
        const default_view_z = environment.vars.view.features.default_view_z;
        const visible_dimensions = visibleAtZDepth(-default_view_z, environment.controls.cam.camera);
        environment.controls.cam.base_pos.z = ((default_view_z / visible_dimensions.w) * environment.vars.view.scene_width) + 12.0;
        environment.vars.trace.log('visible_dimensions', visible_dimensions);
        environment.controls.cam.run();
    }

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
    renderer.render(scene, environment.controls.cam.camera);
}

function animate(f) {
    environment.frame = window.requestAnimationFrame(animate);
    render(f);
}


export const environment = {
    objects:{

    },
    frame: 0,
    fps: 0,
    init(dom, controls, vars){
        environment.controls = controls;
        environment.vars = vars;
        environment.dom = dom;
        //cam = controls.cam;
        init();
        post_init();
        animate();
    }
}