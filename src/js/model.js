import * as THREE from "three";
import * as util from "./machine/util";
import jsConfig from './config';
import label_maker from "./machine/ui-labels";
import {controls as CTL} from "./machine/ui-controls";

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
    },
    position_mark(radius) {
        const curve = new THREE.EllipseCurve(
            0, 0,            // ax, aY
            radius, radius,           // xRadius, yRadius
            0, 2 * Math.PI,  // aStartAngle, aEndAngle
            true,            // aClockwise
            0                 // aRotation
        );

        curve.updateArcLengths();

        const points = curve.getPoints(201);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineDashedMaterial({
            color: 0x00FF00,
            linewidth: 1,
            scale: 1,
            dashSize: radius * 0.1,
            gapSize: radius * 0.1,
        });

        // Create the final object to add to the scene
        const line = new THREE.Line(geometry, material);
        line.userData.radius = radius;
        line.computeLineDistances();
        //line.rotateX(Math.PI / 2);
        return line;
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

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
}

const layers = {
    u:{
        mat: new THREE.Matrix4(),
        vct: new THREE.Vector3(),
        vct2: new THREE.Vector3(),
        qua: new THREE.Quaternion(),
        color: new THREE.Color()
    },
    data:{
        wudi_point: {
            color_adaptive: {
                wudi_up: [],
                wudi_down: [],
            },
            color_mod: [],
            color_processed(index, base_color, amt){
                const offset = layers.data.wudi_point.color_mod[index]; //0,1, or 2
                layers.u.color.set(base_color);
                if(offset !== 0){
                    const b = {};
                    layers.u.color.getHSL(b);
                    const tgt_l = 0.5 + (0.125*offset);
                    layers.u.color.setHSL(b.h, b.s, tgt_l);
                }else{
                    layers.u.color.multiplyScalar(amt);
                }
                return layers.u.color.toArray();
            },
            update(index, value){
                layers.data.wudi_point.color_mod[index] = value
                for (let i_mesh of layers.wudi_points.children) {
                    const c = layers.data.wudi_point.color_adaptive[i_mesh.name][index];
                    layers.u.color.fromArray(layers.data.wudi_point.color_processed(index, i_mesh.userData.td.base_color, c));
                    i_mesh.setColorAt(index, layers.u.color.clone());
                    i_mesh.instanceColor.needsUpdate = true;
                }

            }
        }
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

            const data = DATA.SD.wudi_points;

            DATA.CONF.wudi_index_reverse = {};

            if(jsConfig.data_source_masked_indices){
                DATA.CONF.wudi_index = data.map(v => v.pid);
                data.map(v => {
                    DATA.CONF.wudi_index_reverse[v.pid] = v.rowid - 1;
                });

                //DATA.CONF.wudi_index_reverse = data.map(v => v.pid);

            }else{
                DATA.CONF.wudi_index = data.map(v => v.rowid - 1);
            }

            console.log(DATA.CONF.wudi_index_reverse);


            layers.data.wudi_point.color_adaptive.wudi_up = Array(data.length).fill(0);
            layers.data.wudi_point.color_adaptive.wudi_down = Array(data.length).fill(0);
            layers.data.wudi_point.color_mod = Array(data.length).fill(0);
            //create internal groups of points per geo region
            const geo_regions_assoc = {};
            data.map(v => {
                const g = 'g-'+v.geo;
                if(!geo_regions_assoc.hasOwnProperty(g)) geo_regions_assoc[g] = [];
                geo_regions_assoc[g].push(v.rowid - 1);
            });
            DATA.CONF.geo_regions = geo_regions_assoc;

            const bar_instances = [
                {name: 'wudi_down', len: data.length, base_color: jsConfig.colors.down_welling, visible: true, sign: -1},
                {name: 'wudi_up', len: data.length, base_color: jsConfig.colors.up_welling, visible: true, sign: 1}
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
                // instance.instanceColor.setUsage(THREE.DynamicDrawUsage);
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
                place_id: [],
                sample_raw: Array(data.length).fill(1.0)
            }

            const pop = util.find_scale(data, 'population');
            //console.log(pop);

            for (let i = 0; i < datum.len; i++) {
                const place = data[i];
                datum.color.push(layers.u.color.set(jsConfig.colors.places).toArray());
                datum.position.push([place.lon, place.lat, 0.0]);
                let pop_norm = util.norm_val(place.population, pop.min, pop.avg);
                if (pop_norm > 5.0) pop_norm = 5;
                if (pop_norm < 0.25) pop_norm = 0.25;
                datum.sample_raw[i] = pop_norm;
                //datum.sample_raw[i] = pop_norm;
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
                datum.color.push(layers.u.color.set(jsConfig.colors.mpa_s_designated).toArray());
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
                color: layers.u.color.set(jsConfig.colors.iso_bath).clone(),
                opacity: jsConfig.iso_bath_opacity,
                // depthTest: false,
                // depthWrite: false,
                transparent: true
            });

            for(let i=0;i<data.length;i++){
                const l_obj = data[i];
                const batch = util.coords_from_array(l_obj, -200 / jsConfig.depth_max);

                const a = 0.00125
                for (let vertices of batch) {
                    if (vertices.length > 9) {
                        const sub_vertices = [];
                        for (let i = 0; i < vertices.length / 3; i++) {
                            const v3 = new THREE.Vector3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);
                            sub_vertices.push(v3);
                        }

                        for (let i = 0; i < sub_vertices.length - 1; i++) {
                            vc.a.subVectors(sub_vertices[i], sub_vertices[i + 1]);
                            vc.b.crossVectors(vc.up, vc.a);
                            vc.c.addVectors(sub_vertices[i], vc.b.normalize().multiplyScalar(a))
                            util.set_buffer_at_index(vertices, i, vc.c.toArray());

                            if (i === sub_vertices.length - 2) { //next last element
                                vc.a.subVectors(sub_vertices[i], sub_vertices[i + 1]);
                                vc.b.crossVectors(vc.up, vc.a);
                                vc.c.addVectors(sub_vertices[i], vc.b.normalize().multiplyScalar(a))
                                util.set_buffer_at_index(vertices, i + 1, vc.c.toArray());

                                vc.d.fromArray(util.get_buffer_at_index(vertices, 0));
                                const kd = vc.c.distanceTo(vc.d);
                                if (kd < 0.05) vertices.push(...util.get_buffer_at_index(vertices, 0));
                            }
                        }


                        const geometry = new THREE.BufferGeometry();
                        geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                        geometry.translate(0, 0, a);
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

            //const z = -200/jsConfig.depth_max;
            layers.iso_bath.position.set(-model.center.x,-model.center.y, 0.00);
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
        wudi_points(DAT, cam_obj) {
            //#// PERVY make based on distance to camera as well.
            const test = layers.wudi_points.children[0].userData.td;
            const visible = {set: [], wudi_up: [], wudi_down: []};
            let in_view_index = 0;

            for (let c = 0; c < test.position.length; c++) {
                const data_index = c;//DAT.DATA.CONF.wudi_index[c];
                layers.u.vct.fromArray(test.mid_position[c]);
                layers.wudi_points.localToWorld(layers.u.vct);

                if (cam_obj.frustum.containsPoint(layers.u.vct)) {
                    visible.set.push([c, data_index, in_view_index]);
                    visible.wudi_up.push([DAT.DATA.TD.current[data_index][3]]);
                    visible.wudi_down.push([DAT.DATA.TD.current[data_index][4]]);
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

                    let color_value = lim[0] === 0 || wv === 0 ? (0.0001) : (wv / lim[0]*sign);
                    layers.data.wudi_point.color_adaptive[i_mesh.name][v[0]] = color_value;
                    layers.u.color.fromArray(layers.data.wudi_point.color_processed(v[0], i_mesh.userData.td.base_color, color_value));
                    i_mesh.setColorAt(v[0], layers.u.color.clone());

                    layers.u.vct2.setZ(value * jsConfig.bar_scale);
                    layers.u.vct2.setY((1 - cam_obj.camera_scale) * jsConfig.bar_scale_width);
                    layers.u.mat.compose(layers.u.vct, layers.u.qua, layers.u.vct2);
                    i_mesh.setMatrixAt(v[0], layers.u.mat);
                }
            }

            for (let i_mesh of layers.wudi_points.children) { //wudi_up, wudi_down;
                i_mesh.instanceMatrix.needsUpdate = true;
                i_mesh.instanceColor.needsUpdate = true;
            }
        },
        places(DAT, cam_obj){
            if(jsConfig.active_layers.places) layers.places.material.uniforms.level.value = (1.0-(cam_obj.camera_scale*0.8));

            let places = [];
            const data = layers.places.userData.td;
            const scale_d = model.position_marker.scale.x*1.5;

            for (let c = 0; c < layers.places.count; c++) {
                layers.u.vct.fromArray(data.position[c]);
                layers.places.localToWorld(layers.u.vct);
                if (cam_obj.frustum.containsPoint(layers.u.vct)) {
                    //vc.a.copy(cam_obj.pos);//model.container.position);//.projected);//pos);
                    // vc.a.copy(model.position_marker.position);
                    // layers.places.localToWorld(vc.a);
                    //const d = vc.a.sub(layers.u.vct).length();
                    const d = layers.u.vct.length();
                    if(d < scale_d) places.push({'id':c, 'd':d, 'pop':data.sample_raw[c]});
                }
            }


            places.sort((a, b) => a.pop > b.pop ? -1 : 1);

            for(let i = 0; i < 10; i++){
                if(i < places.length){
                    const place = places[i];
                    layers.u.vct.fromArray(data.position[place.id]);
                    //layers.places.localToWorld(layers.u.vct);
                    //model.place_labels[i].line_height = place.d*2.30;//((1-(1/place.d))*48);
                    //model.place_labels[i].text = DAT.DATA.SD.places[place.id].name; //place.d.toFixed(1)+' '+
                    model.place_labels[i].object.index = place.id;

                    model.place_labels[i].object.position.set(
                        layers.u.vct.x-model.center.x,
                        layers.u.vct.y-model.center.y,
                        0.0
                        );
                    model.place_labels[i].state = true;

                    let raw_name = DAT.DATA.SD.places[place.id].name;
                    if(raw_name.indexOf('/') !== -1) raw_name = raw_name.split('/');

                    model.place_labels[i].text = Array.isArray(raw_name) ? util.title_case(raw_name[0]) : util.title_case(raw_name);
                    //place.d.toFixed(1) + ' ' +
                    model.place_labels[i].size = 10.0+(place['pop']*1.5);
                    const stem = ((place['pop'])/5.0)*0.25;
                    model.place_labels[i].stem = stem;

                    //model.place_labels[i].marker_a.position.copy(model.place_labels[i].object.position).setZ(stem);


                }else{
                     model.place_labels[i].state = false;
                }

                model.place_labels[i].update(cam_obj, model.container);// layers.places);




                //copy(layers.u.vct);//set(-layers.u.vct.x, layers.u.vct.z, 0.0);//copy(layers.u.vct);//set(layers.u.vct.x,layers.u.vct.z,layers.u.vct.y);//set(data.position[place.id].x,data.position[place.id].y,0.0);
                // model.place_labels[i].object.children[1].scale.setScalar(1.0);
                // model.place_labels[i].object.children[1].quaternion.copy(cam_obj.camera.quaternion);//lookAt(cam_obj.pos);
                // model.place_labels[i].object.children[1].updateMatrix();
                // model.place_labels[i].object.children[1].updateMatrixWorld();
                //
                // vc.a.copy(model.place_labels[i].markers[0].position);
                // model.place_labels[i].object.children[1].localToWorld(vc.a);
                // vc.a.project(cam_obj.camera);
                //
                // vc.a.x = ( (   vc.a.x + 1 ) * model.width  / 2 );
                // vc.a.y = ( ( - vc.a.y + 1 ) * model.height / 2 );
                // vc.a.z = 0;
                //
                // vc.b.copy(model.place_labels[i].markers[1].position);
                // model.place_labels[i].object.children[1].localToWorld(vc.b);
                // vc.b.project(cam_obj.camera);
                //
                // vc.b.x = ( (   vc.b.x + 1 ) * model.width  / 2 );
                // vc.b.y = ( ( - vc.b.y + 1 ) * model.height / 2 );
                // vc.b.z = 0;
                //
                // const rd = vc.a.distanceTo(vc.b);
                //
                // model.place_labels[i].text = rd.toFixed(2);// + DAT.DATA.SD.places[place.id].name;
                // // if(place.d/sco < 1.0){
                // //
                // model.place_labels[i].object.children[1].scale.setScalar(1.0/rd);//0.5);//*rd);
                // model.place_labels[i].object.children[1].updateMatrix();
                // model.place_labels[i].object.children[1].updateMatrixWorld();
                // //
                // // }
                //


                //model.place_labels[i].object.children[1].scale.setScalar(0.5-(1/place.d));
            }

            //console.log(places[0], places.length);
            // const test = layers.wudi_points.children[0].userData.td;
            // const visible = {set: [], wudi_up: [], wudi_down: []};
            // let in_view_index = 0;
            //
            // for (let c = 0; c < test.position.length; c++) {
            //     const data_index = c;//DAT.DATA.CONF.wudi_index[c];
            //     layers.u.vct.fromArray(test.mid_position[c]);
            //     layers.wudi_points.localToWorld(layers.u.vct);
            //
            //     if (cam_obj.frustum.containsPoint(layers.u.vct)) {
            //         visible.set.push([c, data_index, in_view_index]);
            //         visible.wudi_up.push([DAT.DATA.TD.current[data_index][3]]);
            //         visible.wudi_down.push([DAT.DATA.TD.current[data_index][4]]);
            //         in_view_index++;
            //     }
            // }






        },
        protected_areas(cam_obj){
            if(jsConfig.active_layers.protected_areas) layers.protected_areas.material.uniforms.level.value = (1.0-(cam_obj.camera_scale*0.8));
        }
    }
}

const model = {
    outliner: null,
    position_marker: objects.position_mark(1.0),
    labels_dom: document.getElementById('model-labels'),
    layers: layers,
    place_labels: [],
    width: null,
    height: null,
    container: new THREE.Group(),
    natural_bounds: jsConfig.bounds,
    degree_scale: jsConfig.sector_degree_scale,
    map_vertical_deg_offset: jsConfig.sector_degree_scale,
    dimensions: null,
    center: null,
    camera_map_local: new THREE.Vector3(),
    // init_vars: null,
    model_position(origin) {
        origin.x = model.natural_bounds[0] + ((model.width / 2) + origin.x);
        origin.z = model.natural_bounds[1] + ((model.height / 2) - origin.z);
    },

    init(init_vars) {
        // model.init_vars = init_vars;
        for(let i = 0; i< 10; i++){
            const label = label_maker.dom_label('test-'+i, 'B', model.labels_dom);
            label.line_height = 96; //#//default
            label.init();
            label.object.rotateX(Math.PI / 2);
            model.container.add(label.object);
            // model.container.add(label.marker_a);
            // model.container.add(label.marker_b);

            model.place_labels.push(label);
        }

        const hex_shape = objects.hexagonal_shape(0.05);
        hex_shape.deleteAttribute('uv');
        hex_shape.deleteAttribute('normal');

        model.outliner = new THREE.Group();
        model.outliner.userData.active = [];
        const ref_mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
        const ref_mesh = new THREE.Mesh(hex_shape, ref_mat);

        model.outliner.marker = ref_mesh;
        model.outliner.marker.visible = false;
        model.outliner.add(ref_mesh);
        model.container.add(model.outliner);


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

        model.container.add(model.position_marker);
        model.position_marker.visible = false;

        model.container.updateMatrix();
        model.container.updateMatrixWorld(true);

    }
}

export default model;