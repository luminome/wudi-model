import * as THREE from "three";
import * as util from "./machine/util";
import timer from './machine/timer.js';
import * as config from '../model-config';
import windowJsConfig from "../window-js-config";
import jsConfig from '../model-js-config';




const objects = {
    hexagonal_shape(scale = 1.0) {
        const v = new Float32Array(21);
        let int = ((Math.PI * 2) / 6);
        for (let i = 0; i < v.length; i += 3) {
            v[i] = (Math.cos((i / 3) * int)) * scale;
            v[i + 1] = (Math.sin((i / 3) * int)) * scale;
            v[i + 2] = 0.0;
        }
        const a_geometry = new THREE.BufferGeometry();
        a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
        a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);
        a_geometry.rotateZ(Math.PI/2);
        return a_geometry;
    }
}

/*
const wudi_selector = {
    object: new THREE.Group(),
    line_material: new THREE.LineBasicMaterial({color: vars.colors.dub_selecta}),
    buff: new Float32Array([1,0,0,-1,0,0]),
    geom: null,
    mark: [],
    dub_line: null,
    dub_box: null,
    dub_pos: new THREE.Vector3(),
    make: (e) => {
        wudi_dub_selecta.geom = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wudi_dub_selecta.buff, 3));
        // wudi_dub_selecta.dub_line = new THREE.LineSegments(wudi_dub_selecta.geom, wudi_dub_selecta.line_material);
        // for(let c=0;c<2;c++) {
        //     const ref_geom = make_hexagonal_shape(0.01);
        //     const ref_mat = new THREE.MeshBasicMaterial({color: vars.colors.dub_selecta});
        //     ref_marker = new THREE.Mesh(ref_geom, ref_mat);
        //     ref_marker.rotateX(Math.PI / -2);
        //     wudi_dub_selecta.mark.push(ref_marker);
        //     wudi_dub_selecta.object.add(ref_marker);
        // }

        //const box_geometry = new THREE.BoxBufferGeometry(1, vars.bar_scale_width, 1);

        // const presto = new Float32Array([
        //     -0.1,0,0,
        //     -0.1,0,1.1,
        //     1.1,0,1.1,
        //     1.1,0,0,
        //     -0.1,0,0
        // ]);

        // const presto = new Float32Array([
        //     -0.5,0.1,-0.5,
        //     0.5,0.1,-0.5,
        //     0.5,0.1,0.5,
        //     -0.5,0.1,0.5,
        //     -0.4,0.1,-0.4,
        //     0.4,0.1,-0.4,
        //     0.4,0.1,0.4,
        //     -0.4,0.1,0.4,
        //     -0.5,-0.1,-0.5,
        //     0.5,-0.1,-0.5,
        //     0.5,-0.1,0.5,
        //     -0.5,-0.1,0.5,
        //     -0.4,-0.1,-0.4,
        //     0.4,-0.1,-0.4,
        //     0.4,-0.1,0.4,
        //     -0.4,-0.1,0.4
        // ]);

        // const ref_mat = new THREE.PointsMaterial({color: vars.colors.dub_selecta, size:0.05});
        // const box_geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(presto, 3));
        // const ref_mat = new THREE.LineBasicMaterial({color: vars.colors.dub_selecta, linewidth:10});
        // const box_geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(presto, 3));
        //box_geometry.translate(0.5, 0.0, 0.5);
        const ref_mat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.5,
            blending: THREE.NormalBlending,  //SubtractiveBlending,//AdditiveBlending, //AdditiveBlending, //THREE.NormalBlending, //
            depthWrite: false,
            depthTest: false
        });
        const box_geometry = new THREE.BoxBufferGeometry(1, vars.bar_scale_width, 1);
        box_geometry.deleteAttribute('uv');
        box_geometry.deleteAttribute('normal');
        box_geometry.translate(0.5, 0.0, 0.5);
        // wudi_dub_selecta.dub_box = new THREE.Line(box_geometry, wudi_dub_selecta.line_material);
        wudi_dub_selecta.dub_box = new THREE.Mesh(box_geometry, ref_mat);
        // wudi_dub_selecta.dub_box = new THREE.Points(box_geometry, ref_mat);
        // wudi_dub_selecta.dub_box = new THREE.Mesh(box_geometry, ref_mat);
        // before doing any updates, ensure the local matrix is set from postion/quaternion/scale:
        wudi_dub_selecta.dub_box.updateMatrix();
        wudi_dub_selecta.dub_box.userData.originalMatrix = wudi_dub_selecta.dub_box.matrix.clone();

        map_container.add(wudi_dub_selecta.dub_box);

        // wudi_dub_selecta.object.add(wudi_dub_selecta.dub_line);
        wudi_dub_selecta.dub_box.visible = false;

        // scene.add(wudi_dub_selecta.object);
    },
    rescale:(index, up, down) =>{
        const wudi_up = scene.getObjectByName('wudi_up');
        wudi_up.getMatrixAt(index, mu);
        mu.decompose(vw, qu, vu);
        wudi_dub_selecta.dub_box.position.set(vw.x, vw.y, down*-1);
        wudi_dub_selecta.dub_box.setRotationFromQuaternion(qu);
        wudi_dub_selecta.dub_box.scale.set(vu.x,vu.y,up+down);
        wudi_dub_selecta.dub_box.geometry.attributes.position.needsUpdate = true;
        wudi_dub_selecta.dub_box.geometry.computeBoundingBox();
        wudi_dub_selecta.dub_box.geometry.computeBoundingSphere();
    },
    // set: (p1, p2) =>{
    //
    //     const position = wudi_dub_selecta.geom.getAttribute('position');
    //     position.setXYZ(0, p1.x,p1.y,p1.z);
    //     position.setXYZ(1, p2.x,p2.y,p2.z);
    //     wudi_dub_selecta.geom.attributes.position.needsUpdate = true;
    //     wudi_dub_selecta.dub_line.geometry.computeBoundingSphere();
    //     for(let c=0;c<2;c++) {
    //         wudi_dub_selecta.mark[c].position.set(position.array[c * 3], position.array[c * 3 + 1], position.array[c * 3 + 2]);
    //     }
    // },
    set_from_point: (pid) =>{
        wudi_dub_selecta.dub_box.visible = true;
        const t_ref = scene.getObjectByName('ref_mark');
        t_ref.visible = false;
        const ref_point = vars.data.wudi_index.indexOf(pid);

        const wudi_down = scene.getObjectByName('wudi_down');
        wudi_down.getMatrixAt(ref_point, mu);
        mu.decompose(vw, qu, vu);
        const down = vu.z;

        const wudi_up = scene.getObjectByName('wudi_up');
        wudi_up.getMatrixAt(ref_point, mu);
        mu.decompose(vw, qu, vu);
        const up = vu.z;

        wudi_dub_selecta.dub_box.position.set(vw.x, vw.y, down*-1);
        wudi_dub_selecta.dub_box.setRotationFromQuaternion(qu);
        wudi_dub_selecta.dub_box.scale.set(vu.x,vu.y,up+down);

        const pt = vars.data.wudi_points.raw.data[ref_point];

        vw.set(pt[1],pt[0],0.0);
        vk.set(pt[5],pt[4],0.0);
        vu.subVectors(vk,vw);
        vc.crossVectors(vu,z_in).normalize().multiplyScalar(-0.1);
        vc.add(vu.multiplyScalar(0.5).add(vw));
        //
        map_container.localToWorld(vc);
        // t_ref.position.copy(vc);
        // t_ref.visible = true;
        map_container.localToWorld(vw);
        map_container.localToWorld(vk);

        vw.set(pt[3],pt[2],0.0);
        vu.copy(vw);
        map_container.localToWorld(vu);
        wudi_dub_selecta.dub_pos.copy(vw);

        return [vc.clone(), vw.clone()];
    },
}
*/

const map_sectors = {

}

const layers = {
    u:{
        mat: new THREE.Matrix4(),
        vct: new THREE.Vector3(),
        vct2: new THREE.Vector3(),
        qua: new THREE.Quaternion(),
        color: new THREE.Color()
    },
    make:{
        generic_instance_mesh(datum){
            const geometry = objects.hexagonal_shape(jsConfig.point_scale);
            geometry.deleteAttribute('uv');
            geometry.deleteAttribute('normal');

            const material = new THREE.ShaderMaterial({
                uniforms: {
                  level: {
                    value: 0.5,
                  },
                  color: {
                    value: new THREE.Color().fromArray(datum.color[0]),
                  }
                },
                vertexShader: document.getElementById('legend-vertex-Shader').textContent,
                fragmentShader: document.getElementById('legend-fragment-Shader').textContent,
                side: THREE.FrontSide,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,
            });

            material.needsUpdate = true;
            material.uniformsNeedUpdate = true;

            const instance = new THREE.InstancedMesh(geometry, material, datum.len);
            instance.geometry.computeBoundingSphere();
            instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            instance.name = datum.name;
            instance.userData.type = 'scaled_point';
            instance.userData.td = datum;
            instance.interactive = true;

            return instance;
        },
        wudi_points_instance(DATA){
            const temp_color = new THREE.Color();
            layers.wudi_points =  new THREE.Group();
            layers.wudi_points.name = 'wudi';

            //create internal index list
            const data = DATA.SD.wudi_points;
            DATA.CONF.wudi_index = data.map(v => v.rowid - 1);

            //create internal groups of points per geo region
            const geo_regions_assoc = {};
            data.map(v => {
                const g = 'g-'+v.geo;
                if(!geo_regions_assoc.hasOwnProperty(g)) geo_regions_assoc[g] = [];
                geo_regions_assoc[g].push(v.rowid - 1);
            });
            DATA.CONF.geo_regions = geo_regions_assoc;

            const bar_instances = [
                {name: 'wudi_down', len: data.length, base_color: windowJsConfig.colors.down_welling, visible: true, sign: -1},
                {name: 'wudi_up', len: data.length, base_color: windowJsConfig.colors.up_welling, visible: true, sign: 1}
            ];

            const bar_attributes = ['color', 'position', 'mid_position', 'rotation', 'scale', 'value', 'raw', 'index', 'color_default'];

            for (let bar of bar_instances) {
                for (let a of bar_attributes) bar[a] = [];
                const color = temp_color.set(bar.base_color).toArray();

                for (let i = 0; i < data.length; i++) {
                    const A = new THREE.Vector3(data[i].A_lon, data[i].A_lat, 0.0);
                    const B = new THREE.Vector3(data[i].B_lon, data[i].B_lat, 0.0);
                    const M = new THREE.Vector3(data[i].M_lon, data[i].M_lat, 0.0);
                    const angle = Math.atan2(B.y - A.y, B.x - A.x);
                    bar.position.push([A.x, A.y, A.z]);
                    bar.mid_position.push([M.x, M.y, M.z]);
                    bar.rotation.push(angle.toFixed(5));
                    bar.scale.push(A.distanceTo(B));
                    bar.color.push(color);
                    bar.value.push(0.005);
                    bar.raw.push(0.0);
                    bar.index.push(data[i].rowid - 1);
                    bar.color_default.push({color: null, selected: false});
                }
            }

            const bar_geometry = new THREE.BoxBufferGeometry(1, jsConfig.bar_scale_width, 1);
            bar_geometry.translate(0.5, 0.0, 0.5);
            bar_geometry.deleteAttribute('uv');
            bar_geometry.deleteAttribute('normal');

            const bar_material = new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                depthTest: false,
            });

            for (let bar of bar_instances) {
                const instance = new THREE.InstancedMesh(bar_geometry, bar_material, bar.len);
                instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                instance.name = bar.name;
                instance.userData.td = bar;
                instance.userData.type = 'bar';
                instance.visible = bar.visible;
                instance.interactive = true;
                layers.wudi_points.add(instance);
            }

            layers.wudi_points.position.set(-model.center.x,-model.center.y,0.0);
            layers.draw.wudi_points();

            layers.wudi_points.updateMatrix();
            layers.wudi_points.updateMatrixWorld(true); //force this for first run.

            model.container.add(layers.wudi_points);
            model.container.updateMatrix();
            //return CONF;
        },
        places(DATA){

            const data = DATA.SD.places;

            DATA.CONF.places_index = {};
            data.map((p,i) => {
                DATA.CONF.places_index[p.place_id] = i;
            });

            const datum = {
                name: 'places',
                len: data.length,
                color: [],
                position: [],
                sample_raw: Array(data.length).fill(1.0)
            }

            const pop = util.find_scale(data, 'population');
            for (let i = 0; i < datum.len; i++) {
                const place = data[i];
                datum.color.push(layers.u.color.set(windowJsConfig.colors.places).toArray());
                datum.position.push([place.lon, place.lat, 0.0]);

                let pop_norm = util.norm_val(place.population, pop.min, pop.avg);
                if (pop_norm > 5.0) pop_norm = 5;
                if (pop_norm < 1.0) pop_norm = 1.0;
                datum.sample_raw[i] = pop_norm;
            }

            layers.places = layers.make.generic_instance_mesh(datum);// new THREE.Group();
            layers.places.position.set(-model.center.x,-model.center.y,0.0);
            layers.draw.generic_instance_mesh(layers.places);

            layers.places.updateMatrix();
            layers.places.updateMatrixWorld(true); //force this for first run.

            model.container.add(layers.places);
            model.container.updateMatrix();

        },
        protected_areas(DATA){

            const data = DATA.SD.protected_areas;

            const datum = {
                name: 'protected_areas',
                len: data.length,
                color: [],
                position: [],
                sample_raw: Array(data.length).fill(1.0)
            }

            const area = util.find_scale(data, 'REP_AREA');

            for (let i = 0; i < data.length; i++) {
                const pro_area = data[i];
                datum.color.push(layers.u.color.set(windowJsConfig.colors.mpa_s_designated).toArray());
                datum.position.push([pro_area.CENTROID[0], pro_area.CENTROID[1], 0.0]);
                let norm =  util.norm_val(pro_area.REP_AREA, area.min, area.avg);
                if (norm > 4.0) norm = 4.0;
                if (norm < 1.0) norm = 1.0;
                datum.sample_raw[i] = norm;
            }

            layers.protected_areas = layers.make.generic_instance_mesh(datum);// new THREE.Group();
            layers.protected_areas.position.set(-model.center.x,-model.center.y,0.0);
            layers.draw.generic_instance_mesh(layers.protected_areas);

            layers.protected_areas.updateMatrix();
            layers.protected_areas.updateMatrixWorld(true); //force this for first run.

            model.container.add(layers.protected_areas);
            model.container.updateMatrix();

        },
        iso_bath(DATA){
            layers.iso_bath = new THREE.Group();
            const raw_data = DATA.RAW.iso_bath.raw;
            const data = raw_data.slice(1, raw_data.length);

            const material = new THREE.LineBasicMaterial({
                color: layers.u.color.set(windowJsConfig.colors.iso_bath).clone(),
                opacity: jsConfig.iso_bath_opacity,
                transparent: true
            });

            for(let i=0;i<data.length;i++){
                const l_obj = data[i];
                const batch = util.coords_from_array(l_obj, -100 / jsConfig.depth_max);
                for (let vertices of batch) {
                    if (vertices.length > 9) {
                        const geometry = new THREE.BufferGeometry();
                        geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                        const element = new THREE.Line(geometry, material);
                        element.name = 'iso_bath';
                        element.geometry.computeBoundingBox();
                        element.geometry.computeBoundingSphere();
                        element.userData.index = i;
                        element.interactive = true;
                        layers.iso_bath.add(element);
                    }
                }
            }

            layers.iso_bath.position.set(-model.center.x,-model.center.y,0.0);
            layers.iso_bath.updateMatrix();
            layers.iso_bath.updateMatrixWorld(true); //force this for first run.

            model.container.add(layers.iso_bath);
            model.container.updateMatrix();


            //console.log('iso_bath raw', data);



            //
            // vars.data[obj.name].raw.forEach((l_obj, i) => {
            //
            // }
            // if (obj.style === 'multi_line') {
            //         const material = new THREE.LineBasicMaterial({
            //             color: utility_color.fromArray(vars.colors[obj.name]).clone(),
            //             opacity:vars.colors[obj.name][3],
            //             transparent: true
            //         });
            //         let element;
            //         const batch = coords_from_array(l_obj, -100 / vars.depth_max);//.flat(1);
            //         for (let vertices of batch) {
            //             if (vertices.length > 9) {
            //                 const geometry = new THREE.BufferGeometry();
            //                 geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
            //                 element = new THREE.Line(geometry, material);
            //                 element.name = obj.name;
            //                 element.geometry.computeBoundingBox();
            //                 element.userData.index = i;
            //                 group.add(element);
            //             }
            //         }
            //     }
        }
    },
    draw: {
        wudi_points() {
            const temp = new THREE.Object3D();
            for (let i_mesh of layers.wudi_points.children) {
                for (let i = 0; i < i_mesh.userData.td.len; i++) {
                    temp.scale.setScalar(1.0);
                    temp.position.fromArray(i_mesh.userData.td.position[i]);
                    temp.rotation.z = i_mesh.userData.td.rotation[i];
                    temp.scale.x = i_mesh.userData.td.scale[i];
                    temp.scale.z = i_mesh.userData.td.sign;
                    temp.updateMatrix();
                    layers.u.color.fromArray(i_mesh.userData.td.color[i], 0);
                    i_mesh.setColorAt(i, layers.u.color);
                    i_mesh.setMatrixAt(i, temp.matrix);
                }
                i_mesh.instanceColor.needsUpdate = true;
                i_mesh.instanceMatrix.needsUpdate = true;
            }
        },
        generic_instance_mesh(i_mesh) {
            const temp = new THREE.Object3D();
            for (let i = 0; i < i_mesh.userData.td.len; i++) {
                temp.scale.setScalar(1.0);
                temp.position.fromArray(i_mesh.userData.td.position[i]);
                temp.scale.x = i_mesh.userData.td.sample_raw[i];
                temp.scale.y = i_mesh.userData.td.sample_raw[i];
                temp.updateMatrix();
                layers.u.color.fromArray(i_mesh.userData.td.color[i], 0);
                i_mesh.setColorAt(i, layers.u.color);
                i_mesh.setMatrixAt(i, temp.matrix);
            }
            i_mesh.instanceColor.needsUpdate = true;
            i_mesh.instanceMatrix.needsUpdate = true;
        }
    },
    update: {
        wudi_points(DATA, cam_obj) {
            //#// PERVY make based on distance to camera as well.
            const test = layers.wudi_points.children[0].userData.td;
            const visible = {set: [], wudi_up: [], wudi_down: []};
            let in_view_index = 0;

            for (let c = 0; c < test.position.length; c++) {
                const data_index = DATA.CONF.wudi_index[c];
                layers.u.vct.fromArray(test.mid_position[c]);
                layers.wudi_points.localToWorld(layers.u.vct);

                if (cam_obj.frustum.containsPoint(layers.u.vct)) {
                    visible.set.push([c, data_index, in_view_index]);
                    visible.wudi_up.push([DATA.TD.current[data_index][3]]);
                    visible.wudi_down.push([DATA.TD.current[data_index][4]]);
                    in_view_index++;
                }
            }

            const lim = [Math.max(...visible.wudi_up), Math.min(...visible.wudi_down)];
            lim.push(lim[0]+Math.abs(lim[1]));

            for (let v of visible.set) {
                //all on both
                for (let i_mesh of layers.wudi_points.children) {
                    const sign = i_mesh.userData.td.sign;
                    i_mesh.getMatrixAt(v[0], layers.u.mat);
                    layers.u.mat.decompose(layers.u.vct, layers.u.qua, layers.u.vct2);

                    const wv = visible[i_mesh.name][v[2]][0];
                    const value = lim[2] === 0 || wv === 0 ? (0.0001) : (wv / lim[2]*sign);
                    const color_value = lim[0] === 0 || wv === 0 ? (0.0001) : (wv / lim[0]*sign);

                    layers.u.vct2.setZ(value * jsConfig.bar_scale);
                    layers.u.vct2.setY((1 - cam_obj.camera_scale) * jsConfig.bar_scale_width);
                    layers.u.mat.compose(layers.u.vct, layers.u.qua, layers.u.vct2);
                    i_mesh.setMatrixAt(v[0], layers.u.mat);

                    if (!i_mesh.userData.td.color_default[v[0]].selected) {
                        layers.u.color.set(i_mesh.userData.td.base_color).multiplyScalar(Math.abs(color_value));
                        i_mesh.setColorAt(v[0], layers.u.color.clone());
                        i_mesh.userData.td.color_default[v[0]].color = layers.u.color.toArray();
                    }
                }
            }

            for (let i_mesh of layers.wudi_points.children) { //wudi_up, wudi_down;
                i_mesh.instanceMatrix.needsUpdate = true;
                i_mesh.instanceColor.needsUpdate = true;
            }
        },
        places(cam_obj){
            layers.places.material.uniforms.level.value = (1.0-(cam_obj.camera_scale*0.8));
        },
        protected_areas(cam_obj){
            layers.protected_areas.material.uniforms.level.value = (1.0-(cam_obj.camera_scale*0.8));
        }
    }
}

const model = {
    layers: layers,
    width: null,
    height: null,
    container: new THREE.Group(),
    natural_bounds: jsConfig.bounds,
    degree_scale: jsConfig.sector_degree_scale,
    map_vertical_deg_offset: jsConfig.sector_degree_scale,
    dimensions: null,
    center: null,
    camera_map_local: new THREE.Vector3(),
    model_position(origin) {
        origin.x = model.natural_bounds[0] + ((model.width / 2) + origin.x);
        origin.z = model.natural_bounds[1] + ((model.height / 2) - origin.z);
    },
    init(init_vars) {

        const map_min = new THREE.Vector2(jsConfig.bounds[0], jsConfig.bounds[1]);
        const map_max = new THREE.Vector2(jsConfig.bounds[2], jsConfig.bounds[3]);
        model.dimensions = new THREE.Vector2();
        model.center = new THREE.Vector2();
        const map_box = new THREE.Box2(map_min, map_max);

        map_box.getSize(model.dimensions);
        map_box.getCenter(model.center);

        model.width = model.dimensions.x;
        model.height = model.dimensions.y;

        if(jsConfig.show_ground_plane_box) {
            const geometry = new THREE.BoxGeometry(model.width, model.height, 1);
            geometry.translate(0, 0, -0.5);

            const material = new THREE.MeshStandardMaterial({
                color: 0x330000,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 0.25
            });

            model.map_plane = new THREE.Mesh(geometry, material);
            model.container.add(model.map_plane);
        }


        model.container.rotateX(Math.PI / -2);
        model.container.position.set(0,0,0);
        model.container.updateMatrix();
        model.container.updateMatrixWorld(true);

    }
}

export default model;