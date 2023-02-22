import * as THREE from "three";
import * as util from "./machine/util";
import jsConfig from './config';
import label_maker from "./machine/ui-labels";
import * as shaders from "./machine/shaders";

import {controls as CTL} from "./machine/ui-controls";
import {controls as CTL} from "./machine/ui-controls";
import {uiCameraDolly as CAM} from "./machine/ui-camera-dolly";
import {legend_instanced} from "./machine/shaders";




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
    },
    ray(){
        const pts = [
            0,0,0,
            0,0,0
        ];
        const line_pos = Float32Array.from(pts);//, z => z*0.5);
        const t_geometry = new THREE.BufferGeometry();
        t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
        const t_material = new THREE.LineBasicMaterial({
            color: 0xFFFF00
        });
        return new THREE.Line(t_geometry, t_material);
    },
    squid(){
        const o = 0.5;
        const n = jsConfig.bar_scale_width*o;
        const kvc = [
            0,1,
            1,2,
            2,3,
            3,0,
            4,5,
            5,6,
            6,7,
            7,4,
            0,4,
            1,5,
            2,6,
            3,7
        ]

        const pvc = [
            -o,n,1,
            o,n,1,
            o,-n,1,
            -o,-n,1,
            -o,n,-1,
            o,n,-1,
            o,-n,-1,
            -o,-n,-1,
        ]

        const prc = [];
        for(let i = 0; i < kvc.length; i += 2){
            prc.push(pvc[kvc[i]*3], pvc[kvc[i]*3+1], pvc[kvc[i]*3+2], pvc[kvc[i+1]*3], pvc[kvc[i+1]*3+1], pvc[kvc[i+1]*3+2]);
        }

        const line_pos = Float32Array.from(prc);
        const t_geometry = new THREE.BufferGeometry();
        t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
        const t_material = new THREE.LineBasicMaterial({
            transparent: true,
            opacity:0.35,
            color: 0xFFFFFF,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
        });
        return {
            object: new THREE.LineSegments( t_geometry, t_material ),
            vertices: pvc,
            indices: kvc
        };
    },
    ray_special(){
        const vertices = [
            -1,0,0,
            1,0,0,
        ]

        function init(){
            const material = new THREE.LineBasicMaterial({color: 0x00FFFF});
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.BufferAttribute( new Float32Array(R.vertices), 3 ) );
            R.ray = new THREE.LineSegments( geometry, material );
            R.object.add(R.ray);
            return R;
        }

        function set(a,b){
            R.vectors.a.copy(a);
            R.vectors.b.copy(b);
            util.set_buffer_at_index(R.ray.geometry.attributes.position.array, 0, a.toArray());
            util.set_buffer_at_index(R.ray.geometry.attributes.position.array, 1, b.toArray());
            R.ray.geometry.attributes.position.needsUpdate = true;
            R.ray.geometry.computeBoundingSphere();
        }

        const R = {
            vectors:{
                a:new THREE.Vector3(),
                b:new THREE.Vector3()
            },
            ray: null,
            object: new THREE.Object3D(),
            vertices: vertices,
            init,
            set
        }


        return R
    },
}


function point_selector(){

    function init(){
        P.object.add(P.marker);
        P.object.add(P.ray);
        P.object.add(P.offest_ray);
        P.object.add(P.top_arr.object);
        P.label.init();
        P.object.add(P.label.object);
        P.set();

        P.top_arr.object.visible = false;
        P.marker.visible = true;
        P.ray.visible = false;
        P.offest_ray.visible = false;
        P.label.object.visible = false;
        return P
    }

    function set(dir = null, offset = null, pos = null){
        if(dir !== null) P.direction.copy(dir);
        if(offset !== null) P.offset_direction.copy(offset);
        if(pos !== null) P.object.position.set(pos.x-model.center.x, pos.y-model.center.y, pos.z);

        util.set_buffer_at_index(P.ray.geometry.attributes.position.array, 1, P.direction.toArray());
        P.ray.geometry.attributes.position.needsUpdate = true;
        util.set_buffer_at_index(P.offest_ray.geometry.attributes.position.array, 1, P.offset_direction.toArray());
        P.offest_ray.geometry.attributes.position.needsUpdate = true;
    }

    function update(){
        const new_points = [];
        const index = P.selection.wudi_points;
        if(!index) return;
        //down_welling
        model.layers.wudi_points.children[1].getMatrixAt(index, P.mat);
        P.mat.decompose(P.utl, P.quat, P.sca);
        for(let t = 0; t < 4; t++){
            vc.a.fromArray(util.get_buffer_at_index(P.top_arr.vertices, t));
            vc.a.set(vc.a.x*P.sca.x,vc.a.y*P.sca.y,vc.a.z*P.sca.z);
            vc.a.applyQuaternion(P.quat);
            new_points.push(vc.a.toArray());
        }

        //up_welling
        model.layers.wudi_points.children[0].getMatrixAt(index, P.mat);
        P.mat.decompose(P.utl, P.quat, P.sca);
        for(let t = 4; t < 8; t++){
            vc.a.fromArray(util.get_buffer_at_index(P.top_arr.vertices, t));
            vc.a.set(vc.a.x*P.sca.x,vc.a.y*P.sca.y,vc.a.z*P.sca.z);
            vc.a.applyQuaternion(P.quat);
            new_points.push(vc.a.toArray());
        }

        P.top_arr.indices.map((i, n) =>{
            util.set_buffer_at_index(P.top_arr.object.geometry.attributes.position.array, n, new_points[i]);
        })

        P.top_arr.object.geometry.attributes.position.needsUpdate = true;
        P.top_arr.object.geometry.computeBoundingSphere();
        P.top_arr.object.geometry.computeBoundingBox();
    }

    function select(type, dict, DAT, cam_obj){
        if(dict.bump && P.selection[type]){
            if(type === 'wudi_points'){
                const current_selection = DAT.DATA.SD[type][P.selection[type]];
                const geo_loop = DAT.DATA.CONF.wudi_geo_lookup[current_selection.geo-1];
                //console.log(geo_loop, geo_loop.points.indexOf(current_selection.rowid-1));
                const current_index = geo_loop.points.indexOf(P.selection[type]);
                const next_index = geo_loop.points.indexOf(P.selection[type] + dict.bump);
                console.log(P.selection[type], current_index, next_index, geo_loop.points.length);

                if(next_index === -1){
                    if(current_index === 0){
                        P.selection[type] = geo_loop.points[geo_loop.points.length-1];
                    } else {
                        P.selection[type] = geo_loop.points[0];
                    }
                }else{
                    P.selection[type] = geo_loop.points[next_index];
                }
                console.log(P.selection[type]);
            }else{
                P.selection[type] += dict.bump;
            }
        }

        //if(dict.bump && P.selection[type]) P.selection[type] += dict.bump;
        if(dict.index) P.selection[type] = dict.index;
        const point = DAT.DATA.SD[type][P.selection[type]];

        if(type === 'wudi_points'){
            P.top_arr.object.visible = true;
            vc.a.set(point.A_lon, point.A_lat, 0.0);
            vc.b.set(point.B_lon, point.B_lat, 0.0);
            vc.c.subVectors(vc.a, vc.b).multiplyScalar(0.5).add(vc.b);
            vc.d.subVectors(vc.a, vc.b);
            vc.e.crossVectors(vc.d, vc.up);
            vc.a.copy(cam_obj.pos).sub(cam_obj.camera.up);
            vc.b.set(-vc.a.x, vc.a.z, 0.0).normalize().negate();
            vc.a.crossVectors(vc.b, vc.up);
            P.set(vc.e, vc.b, vc.c);
            P.offset_angle = P.direction.angleTo(vc.b)*Math.sign(vc.a.dot(vc.e));
            P.update();

        }else{
            P.top_arr.object.visible = false;
            if(type === 'protected_areas') vc.a.set(point.CENTROID[0] * 1.0, point.CENTROID[1] * 1.0, 0.0);
            if(type === 'places') vc.a.set(point.lon * 1.0, point.lat * 1.0, 0.0);
            vc.b.set(vc.a.x - model.center.x, vc.a.y - model.center.y, 0.0);
            vc.c.copy(vc.a);
            vc.a.set(-model.container.parent.position.x, model.container.parent.position.z, 0.0);
            vc.e.copy(vc.b).negate().add(vc.a);
            vc.a.copy(cam_obj.pos).sub(cam_obj.camera.up);
            vc.b.set(-vc.a.x, vc.a.z, 0.0).normalize().negate();
            vc.a.crossVectors(vc.b, vc.up);
            P.set(vc.e, vc.b, vc.c);
            P.offset_angle = P.direction.angleTo(vc.b) * Math.sign(vc.a.dot(vc.e));
        }

        P.label.text = util.rad_to_deg(P.offset_angle).toFixed(2)+'º';
        P.label.update();

        return P.selection[type];
    }

    function move_to(dolly_obj, z = 1.0){
        vc.a.copy(P.object.position);
        vc.b.set(vc.a.x, 0.0, -vc.a.y);
        dolly_obj.mover.set_target(dolly_obj.mover.pos, vc.b, z);
        dolly_obj.mover.set_rotation_target(P.offset_angle, true);
        return true;
    }

    const P = {
        selection:{},
        selected_index: null,
        mat: new THREE.Matrix4(),
        quat: new THREE.Quaternion(),
        sca: new THREE.Vector3(),
        utl: new THREE.Vector3(),
        top_arr: objects.squid(),
        offset_angle: 0.0,
        label: label_maker.label('hello'),
        direction: new THREE.Vector3(0,2,0),
        offset_direction: new THREE.Vector3(0,2,0),
        marker: objects.position_mark(0.5),
        ray: objects.ray(),
        offest_ray: objects.ray(),
        object: new THREE.Object3D(),
        init,
        set,
        select,
        update,
        move_to
    }

    return P
}

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
        vct3: new THREE.Vector3(),
        qua: new THREE.Quaternion(),
        color: new THREE.Color(),
        temp: new THREE.Object3D()
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
                layers.data.wudi_point.color_mod[index] = value;
                for (let c = 0; c<2; c++){
                    const i_mesh = layers.wudi_points.children[c];
                    const kc = layers.data.wudi_point.color_adaptive[i_mesh.name][index];
                    layers.u.color.fromArray(layers.data.wudi_point.color_processed(index, i_mesh.userData.td.base_color, kc));
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

            const material = shaders.legend_instanced.clone();
            //material.uniforms.color.value = new THREE.Color().fromArray(datum.color[0]);

            material.needsUpdate = true;
            material.uniformsNeedUpdate = true;

            const instance = new THREE.InstancedMesh(geometry, material, datum.len);
            instance.geometry.computeBoundingSphere();
            instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            instance.name = datum.name;
            instance.userData.type = 'scaled_point';
            instance.userData.td = datum;
            if(datum.interactive) instance.interactive = true;

            return instance;
        },
        wudi_points_instance(DATA){
            const temp_color = new THREE.Color();
            layers.wudi_points =  new THREE.Group();
            layers.wudi_points.name = 'wudi';


            const data = DATA.SD.wudi_points;

            DATA.CONF.wudi_index_reverse = {};
            DATA.CONF.wudi_geo_lookup = [...DATA.SD.geonames];
            DATA.CONF.wudi_geo_lookup.map(g =>{g.points = []});//

            if(jsConfig.data_source_masked_indices){
                DATA.CONF.wudi_index = data.map(v => v.pid);
                data.map(v => {
                    DATA.CONF.wudi_index_reverse[v.pid] = v.rowid - 1;
                    DATA.CONF.wudi_geo_lookup[v.geo-1].points.push(v.rowid - 1);
                });
            }else{
                DATA.CONF.wudi_index = data.map(v => v.rowid - 1);
            }
            console.log('DATA.CONF.wudi_geo_lookup', DATA.CONF.wudi_geo_lookup);
            console.log('DATA.CONF.wudi_index_reverse', DATA.CONF.wudi_index_reverse);


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
                {name: 'wudi_up', len: data.length, base_color: jsConfig.colors.up_welling, visible: true, sign: 1},
            ];

            const hybrid = {name: 'wu_di_hybrid', len: data.length, base_color: jsConfig.colors.hybrid_welling, visible: true, sign: 1};


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

            for (let a of bar_attributes) hybrid[a] = [];
            hybrid.position = [...bar_instances[0].position];
            hybrid.rotation = [...bar_instances[0].rotation];
            hybrid.scale = [...bar_instances[0].scale];
            hybrid.color = [...bar_instances[0].color];
            hybrid.color_default = [...bar_instances[0].color_default];


            const bar_geometry = new THREE.BoxBufferGeometry(1, jsConfig.bar_scale_width, 1);
            const plane_geometry = new THREE.PlaneGeometry(1, jsConfig.bar_scale_width);

            bar_geometry.translate(0.5, 0.0, 0.5);
            plane_geometry.translate(0.5, 0.0, 0.0);
            //bar_geometry.deleteAttribute('uv');
            //bar_geometry.deleteAttribute('normal');

            const bar_material = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                side: THREE.FrontSide,
                // emissive: 0x010101,
                // flatShading: true,
                // roughness: 0.5,
                // metalness: 0.0,
                // wireframe: true,
                //transparent: true,
                //opacity: 1.0,
                // blending: THREE.NormalBlending,
                depthWrite: true,
                depthTest: true,
            });

            const plane_material = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                side: THREE.FrontSide,
                // emissive: 0x010101,
                // flatShading: true,
                // roughness: 0.5,
                // metalness: 0.0,
                // wireframe: true,
                transparent: true,
                opacity: 0.5,
                // blending: THREE.NormalBlending,
                depthWrite: true,
                depthTest: true,
            });


            const visiblilty = Array(data.length).fill(1);
            for (let i = 0; i < data.length; i++) {
                if(i % 2 === 0) visiblilty[i] = 1;
            }
            bar_geometry.setAttribute( 'visible', new THREE.InstancedBufferAttribute( new Uint8Array( visiblilty ), 1 ) ); // visibility attribute



            for (let bar of bar_instances) {

                const instance = new THREE.InstancedMesh(bar_geometry, shaders.wudi, bar.len);
                instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
                instance.name = bar.name;
                instance.userData.td = bar;
                instance.userData.type = 'bar';
                instance.visible = bar.visible;
                instance.interactive = true;
                layers.wudi_points.add(instance);
            }

            const plane_visiblilty = Array(hybrid.len).fill(1);

            for (let i = 0; i < data.length; i++) {
                if(i % 2 === 0) plane_visiblilty[i] = 1;
            }
            plane_geometry.setAttribute( 'visible', new THREE.InstancedBufferAttribute( new Uint8Array( plane_visiblilty ), 1 ) ); // visibility attribute

            const hybrid_instance = new THREE.InstancedMesh(plane_geometry, shaders.wudi, hybrid.len);
            hybrid_instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            hybrid_instance.name = hybrid.name;
            hybrid_instance.userData.td = hybrid;
            hybrid_instance.userData.type = 'hybrid';
            hybrid_instance.visible = hybrid.visible;
            // hybrid_instance.position.setZ(0.01);

            //hybrid_instance.interactive = false;
            layers.wudi_points.add(hybrid_instance);





            // layers.wudi_points.position.set(-model.center.x,-model.center.y,0.0);
            layers.draw.wudi_points();
            //
            // layers.wudi_points.updateMatrix();
            // layers.wudi_points.updateMatrixWorld(true); //force this for first run.
            //
            // model.container.add(layers.wudi_points);

            layers.wudi_points.rotateX(Math.PI/-2);
            layers.wudi_points.position.set(-model.center.x, 0.0, model.center.y);
            layers.wudi_points.updateMatrix();
            layers.wudi_points.updateMatrixWorld(true); //force this for first run.

            model.init_vars.wudi_model.add(layers.wudi_points);
            // layers.iso_bath.renderOrder = 2;
            layers.wudi_points.renderOrder = 10;

            // model.init_vars.wudi_model.updateMatrix();
            //return CONF;
        },
        places(DATA, cam_obj){

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
                sample_raw: Array(data.length).fill(1.0),
                interactive: true
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
            layers.places.material.uniforms.full_d.value = cam_obj.max_zoom;

            layers.places.position.set(-model.center.x,-model.center.y,0.0);
            layers.draw.generic_instance_mesh(layers.places);


            layers.places.updateMatrix();
            layers.places.updateMatrixWorld(true); //force this for first run.

            model.container.add(layers.places);

            layers.places.renderOrder = 19;

            model.container.updateMatrix();

        },
        protected_areas(DATA, cam_obj){

            const data = DATA.SD.protected_areas;

            const datum = {
                name: 'protected_areas',
                len: data.length,
                color: [],
                position: [],
                sample_raw: Array(data.length).fill(1.0),
                interactive: false
            }

            const area = util.find_scale(data, 'REP_AREA');

            for (let i = 0; i < data.length; i++) {
                const pro_area = data[i];

                const mpa_color = pro_area.STATUS_ENG === 'Designated' ? new THREE.Color(jsConfig.colors.mpa_s_designated) : new THREE.Color(jsConfig.colors.mpa_s_proposed);

                datum.color.push(mpa_color.toArray());



                datum.position.push([pro_area.CENTROID[0], pro_area.CENTROID[1], 0.0]);
                let norm =  util.norm_val(pro_area.REP_AREA, area.min, area.avg);
                if (norm > 4.0) norm = 4.0;
                if (norm < 1.0) norm = 1.0;
                datum.sample_raw[i] = norm;
            }

            layers.protected_areas = layers.make.generic_instance_mesh(datum);// new THREE.Group();
            layers.protected_areas.material.uniforms.full_d.value = cam_obj.max_zoom;

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
            // layers.iso_bath.position.set(-model.center.x,-model.center.y, 0.00);


            layers.iso_bath.rotateX(Math.PI/-2);
            layers.iso_bath.position.set(-model.center.x, 0.0, model.center.y);
            layers.iso_bath.updateMatrix();
            layers.iso_bath.updateMatrixWorld(true); //force this for first run.

            model.init_vars.map_model.add(layers.iso_bath);
            layers.iso_bath.renderOrder = 2;
            //model.container.updateMatrix();


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
                    //if(i_mesh.userData.td.sign === -1) temp.position.setZ(-1.0);
                    temp.rotation.z = i_mesh.userData.td.rotation[i];
                    temp.scale.x = i_mesh.userData.td.scale[i];
                    temp.scale.z = Math.abs(i_mesh.userData.td.sign);
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
                layers.u.color.fromArray(i_mesh.userData.td.color[i]);
                i_mesh.setColorAt(i, layers.u.color);
                i_mesh.setMatrixAt(i, temp.matrix);
            }
            i_mesh.instanceColor.needsUpdate = true;
            i_mesh.instanceMatrix.needsUpdate = true;
        }
    },
    update: {
        wudi_points(DAT, cam_obj) {
            //return;
            //#make based on distance to camera as well.
            const test = layers.wudi_points.children[0].userData.td;
            const visible = {set: [], wudi_up: [], wudi_down: []};
            let in_view_index = 0;

            for (let c = 0; c < test.position.length; c++) {
                const data_index = c;
                layers.u.vct.fromArray(test.mid_position[c]);
                //model.init_vars.wudi_model.localToWorld(layers.u.vct);
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
                const hybrid_mesh = layers.wudi_points.children[2];
                const hybrid_color = [];
                let total_value = 0;

                for (let c = 0; c<2; c++){
                    const i_mesh = layers.wudi_points.children[c];

                    const sign = i_mesh.userData.td.sign;
                    i_mesh.getMatrixAt(v[0], layers.u.mat);
                    layers.u.mat.decompose(layers.u.vct, layers.u.qua, layers.u.vct2);

                    const wv = visible[i_mesh.name][v[2]][0];
                    let value = lim[2] === 0 || wv === 0 ? (0.0001) : (wv / (lim[2]*sign));
                    let color_value = lim[0] === 0 || wv === 0 ? (0.0001) : (wv / (lim[0]*sign));

                    layers.data.wudi_point.color_adaptive[i_mesh.name][v[0]] = color_value;

                    layers.u.color.fromArray(layers.data.wudi_point.color_processed(v[0], i_mesh.userData.td.base_color, color_value));

                    hybrid_color.push(layers.u.color.clone());

                    i_mesh.setColorAt(v[0], layers.u.color.clone());


                    //i//f(Math.round(Math.abs(value)*2000)/2000 === 0){
                    if(wv === 0){
                        //i_mesh.geometry.attributes.visible.array[v[0]] = 0;
                        // value = Math.sign(value);
                    }else{
                        //i_mesh.geometry.attributes.visible.array[v[0]] = 1;
                        total_value += 1;
                    }
                    //
                    //
                    // i_mesh.geometry.attributes.visible.array[v[0]] = 0;


                    layers.u.vct2.setZ(Math.abs(value) * jsConfig.bar_scale);

                    layers.u.vct2.setY((1 - cam_obj.camera_scale) * jsConfig.bar_scale_width);

                    if(sign === -1) layers.u.vct.setZ(value * -jsConfig.bar_scale);

                    layers.u.mat.compose(layers.u.vct, layers.u.qua, layers.u.vct2);

                    i_mesh.setMatrixAt(v[0], layers.u.mat);

                    if(sign === 1) {
                        layers.u.vct3.copy(layers.u.vct);
                        layers.u.vct3.setZ((value * jsConfig.bar_scale)+0.0001);
                        layers.u.mat.compose(layers.u.vct3, layers.u.qua, layers.u.vct2);
                        hybrid_mesh.setMatrixAt(v[0], layers.u.mat);
                    }
                    //hybrid_mesh.setMatrixAt(v[0], layers.u.mat);
                }


                //const del_col = hybrid_color[0].multiply(hybrid_color[1]);
                //layers.u.color.setRGB(hybrid_color[1].r, 0.5, hybrid_color[0].b);

                layers.wudi_points.children[0].geometry.attributes.visible.array[v[0]] = +(total_value > 0);
                hybrid_mesh.geometry.attributes.visible.array[v[0]] = +(total_value > 0);

                layers.u.color.addColors(hybrid_color[1], hybrid_color[0]);
                hybrid_mesh.setColorAt(v[0], layers.u.color);
            }

            for (let i_mesh of layers.wudi_points.children) { //wudi_up, wudi_down;
                //console.log('test', i_mesh);
                i_mesh.geometry.attributes.visible.needsUpdate = true;
                i_mesh.instanceMatrix.needsUpdate = true;
                i_mesh.instanceColor.needsUpdate = true;
            }

            model.point_selector.update();
        },
        places(DAT, cam_obj){
            // if(jsConfig.active_layers.places) layers.places.material.uniforms.full_d.value = cam_obj.max_zoom;//(1.0-(cam_obj.camera_scale*0.9));

            let places = [];
            const data = layers.places.userData.td;
            const scale_d = model.position_marker.scale.x*1.5;

            for (let c = 0; c < layers.places.count; c++) {
                layers.u.vct.fromArray(data.position[c]);
                layers.u.temp.scale.setScalar(1.0);
                const ko = data.sample_raw[c]*(1-(0.75*cam_obj.camera_scale));
                layers.u.temp.scale.x = ko;
                layers.u.temp.scale.y = ko;
                layers.u.temp.position.copy(layers.u.vct);
                layers.u.temp.updateMatrix();
                layers.places.setMatrixAt(c, layers.u.temp.matrix);




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

            layers.places.instanceMatrix.needsUpdate = true;

            places.sort((a, b) => a.pop > b.pop ? -1 : 1);

            for(let i = 0; i < 10; i++){
                if(i < places.length){
                    const place = places[i];
                    layers.u.vct.fromArray(data.position[place.id]);
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
                    model.place_labels[i].size = 10.0+(place['pop']*1.5);
                    const stem = ((place['pop'])/5.0)*0.25;
                    model.place_labels[i].stem = stem;

                }else{
                     model.place_labels[i].state = false;
                }

                model.place_labels[i].update(cam_obj, model.container);
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
            //if(jsConfig.active_layers.protected_areas) layers.protected_areas.material.uniforms.level.value = (1.0-(cam_obj.camera_scale*0.8));
            const data = layers.protected_areas.userData.td;
            for (let c = 0; c < layers.protected_areas.count; c++) {
                layers.u.vct.fromArray(data.position[c]);
                layers.u.temp.scale.setScalar(1.0);
                const ko = data.sample_raw[c]*(1-(0.85*cam_obj.camera_scale));
                layers.u.temp.scale.x = ko;
                layers.u.temp.scale.y = ko;
                layers.u.temp.position.copy(layers.u.vct);
                layers.u.temp.updateMatrix();
                layers.protected_areas.setMatrixAt(c, layers.u.temp.matrix);
            }
            layers.protected_areas.instanceMatrix.needsUpdate = true;
        }
    }
}



const model = {
    ray: objects.ray_special().init(),
    point_selector: point_selector().init(),
    outliner: null,
    user_position_marker: objects.position_mark(0.1),
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
        model.init_vars = init_vars;

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

        model.container.add(model.point_selector.object);
        model.point_selector.object.visible = true;


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

        model.container.add(model.ray.object);
        model.ray.object.visible = false;

        model.container.add(model.position_marker);
        model.position_marker.visible = false;

        model.container.add(model.user_position_marker);
        model.user_position_marker.visible = true;

        model.container.updateMatrix();
        model.container.updateMatrixWorld(true);

    }
}

export default model;