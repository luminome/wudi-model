import * as THREE from "three";
import * as window_config from '../window-config';
import * as config from '../model-config.json';


const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0)
}


export const model = {
    width: null,
    height: null,
    container: new THREE.Group(),
    natural_bounds: config.bounds,
    degree_scale: config.sector_degree_scale,
    map_vertical_deg_offset: config.sector_degree_scale,
    dimensions: null,
    center: null,
    model_position(origin){
        origin.x = model.natural_bounds[0] + ((model.width/2) + origin.x);
        origin.z = model.natural_bounds[1] + ((model.height/2) - origin.z);
    },
    init(){
        const map_min = new THREE.Vector2(config.bounds[0], config.bounds[1]);
        const map_max = new THREE.Vector2(config.bounds[2], config.bounds[3]);
        model.dimensions = new THREE.Vector2();
        model.center = new THREE.Vector2();
        const map_box = new THREE.Box2(map_min, map_max);

        map_box.getSize(model.dimensions);
        map_box.getCenter(model.center);

        model.width = model.dimensions.x;
        model.height = model.dimensions.y;

        const geometry = new THREE.PlaneGeometry(model.width, model.height, 1, 1);
        const material = new THREE.MeshBasicMaterial({color: 0x36332D, side: THREE.DoubleSide});
        model.map_plane = new THREE.Mesh(geometry, material);

        model.container.rotateX(Math.PI / -2);
        //model.container.position.set(-model.center.x, -0.01, model.center.y-model.map_vertical_deg_offset);
        model.container.add(model.map_plane);

    }
}