import * as THREE from 'three/build/three.module.js';
//#// this is for camera and displacement control.

const util_v = new THREE.Vector3();
const y_up = new THREE.Vector3(0, 1, 0);
const x_right = new THREE.Vector3(1, 0, 0);
const z_in = new THREE.Vector3(0, 0, 1);

const cam = {
    camera: null,
    default_z: 10,
    default_reset_z: 10,
    base_pos: new THREE.Vector3(0, 5, 10),
    pos: new THREE.Vector3(0, 0, 0),
    projected: new THREE.Vector3(0, 0, 0),
    event_origin: new THREE.Vector3(0, 0, 0),
    distance: 1.0,
    min_zoom: 0.25,
    scale: 1.0,
    frustum: new THREE.Frustum(),
    frustum_mat: new THREE.Matrix4(),
    direction: new THREE.Vector3(0, 0, 0),
    right: new THREE.Vector3(0, 0, 0),
    dot_x: new THREE.Vector3(0, 0, 0),
    dot_y: new THREE.Vector3(0, 0, 0),
    dot_z: new THREE.Vector3(0, 0, 0),
    util_v: new THREE.Vector3(0, 0, 0),
    cube: null,
    init(){
        const cube_box = new THREE.BoxGeometry(2, 2, 2);
        cam.cube = new THREE.Mesh(cube_box, new THREE.MeshStandardMaterial({color: 0xffffff}));
        cam.cube.updateMatrix();
        cam.cube.userData.originalMatrix = cam.cube.matrix.clone();
    },
    run() {
        cam.util_v.copy(cam.base_pos).applyQuaternion(cam.cube.quaternion);
        cam.pos.copy(cam.util_v);
        cam.util_v.copy(y_up).applyQuaternion(cam.cube.quaternion);
        cam.camera.up.copy(cam.util_v);
        cam.camera.position.copy(cam.pos);

        cam.util_v.set(0,0,0);
        cam.camera.lookAt(cam.util_v);

        cam.frustum.setFromProjectionMatrix(cam.frustum_mat.multiplyMatrices(cam.camera.projectionMatrix, cam.camera.matrixWorldInverse));
        cam.camera.getWorldDirection(cam.util_v);
        cam.direction.copy(cam.util_v);
        cam.right.crossVectors(cam.util_v, cam.camera.up);
        cam.dot_y = cam.camera.up.dot(y_up);//root_plane.normal);
        cam.dot_x = cam.right.dot(x_right);
        cam.dot_z = z_in.dot(cam.util_v);

        cam.distance = cam.camera.position.length();
        cam.camera.updateProjectionMatrix();
    }
}

export const controls = {
    ray_caster: new THREE.Raycaster(),
    cam: null,
    v:{
        user:{
            mouse:{
                state: null,
                raw: new THREE.Vector3(0, 0, 0),
                plane_pos: new THREE.Vector3(0, 0, 0),
                last_down: new THREE.Vector3(0, 0, 0),
                new_down: new THREE.Vector3(0, 0, 0),
                origin_pos: new THREE.Vector3(0, 0, 0),
                actual: new THREE.Vector3(0, 0, 0),
            }
        },
        view:{

        }
    },
    init(vars){
        controls.v.view.width = vars.view.width;
        controls.v.view.height = vars.view.height;
        controls.cam = cam;
        controls.cam.init();
        controls.ray_caster.params = {
            Line: {threshold: 1},
            Points: {threshold: 3.0},
        }
        controls.v.plane = new THREE.Plane(y_up);
    },
    update(e_meta, model){
        controls.v.user.mouse.state = e_meta.action;
        controls.v.user.mouse.raw.x = (e_meta.pos_x / controls.v.view.width) * 2 - 1;
        controls.v.user.mouse.raw.y = -(e_meta.pos_y / controls.v.view.height) * 2 + 1;
        controls.v.user.mouse.raw.z = 0.0;

        controls.ray_caster.setFromCamera(controls.v.user.mouse.raw, controls.cam.camera);
        controls.ray_caster.ray.intersectPlane(controls.v.plane, controls.v.user.mouse.plane_pos);

        if (e_meta.action === 'down' || e_meta.action === 'secondary-down' || e_meta.action === 'secondary-up') {
            controls.v.user.mouse.last_down.copy(controls.v.user.mouse.plane_pos);
            controls.v.user.mouse.origin_pos.copy(model.position);
        }

        if (e_meta.roto_x || e_meta.roto_y) {
            controls.cam.cube.rotateOnWorldAxis(y_up, e_meta.roto_x);
            controls.cam.cube.rotateX(e_meta.roto_y);
            controls.cam.cube.updateMatrixWorld();
        }

        if (e_meta.delta_x || e_meta.delta_y) {
            controls.v.user.mouse.new_down.copy(controls.v.user.mouse.plane_pos);
            controls.v.user.mouse.actual.copy(controls.v.user.mouse.new_down.sub(controls.v.user.mouse.last_down));
            model.position.copy(controls.v.user.mouse.actual.add(controls.v.user.mouse.origin_pos));
        }

        if (e_meta.scale_z) {
            if (controls.cam.base_pos.z < controls.cam.min_zoom) {
                controls.cam.base_pos.z = controls.cam.min_zoom;
            } else {
                controls.cam.base_pos.multiplyScalar(e_meta.scale_z);
                util_v.copy(controls.v.user.mouse.plane_pos).multiplyScalar(1 - e_meta.scale_z);
                model.position.sub(util_v);
            }
        }

        controls.cam.run();
        // e_meta = {};
    }
}
