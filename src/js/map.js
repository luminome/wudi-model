import * as THREE from "three";
import {loader} from './machine/loader';
import jsConfig from './config';
import * as util from "./machine/util";
import model from "./model";
import * as shaders from "./machine/shaders";

import {set_buffer_at_index, v3_from_buffer} from "./machine/util";


import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

//https://www.npmjs.com/package/delaunay-triangulate
//const triangulate = require("delaunay-triangulate")

const map_loader = {
    notify(count, obj, parent_obj){
        //console.log(count, obj, parent_obj);
    }
}

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

    reference_label(scale = 1.0) {
        // const v = new Float32Array(21);
        // let int = ((Math.PI * 2) / 6);
        // for (let i = 0; i < v.length; i += 3) {
        //     v[i] = (Math.cos((i / 3) * int)) * scale;
        //     v[i + 1] = (Math.sin((i / 3) * int)) * scale;
        //     v[i + 2] = 0.0;
        // }
        const geometry = new THREE.PlaneGeometry( scale*2, scale );
        const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.FrontSide} );
        const plane = new THREE.Mesh( geometry, material );
        // const a_geometry = new THREE.BufferGeometry();
        // a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
        // a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);
        // a_geometry.rotateZ(Math.PI/2);
        return plane;
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
            R.object.name = 'ray';
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
    }
}

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
}

const mpa_mat = shaders.legend.clone();


//general map-sector
class Sector {
    // herein lies the changeover to MPA as sectorized data: in "draw()"
    constructor(id, loc, bounds) {
        this.id = id;
        this.name = `Sector-${id}`;
        this.path = `${jsConfig.static_path}/${jsConfig.degree_scale_str}/${this.name}`;
        this.bounds = bounds;
        this.level = 0;
        this.max_level = 0;
        this.center = new THREE.Vector3();
        this.group = new THREE.Object3D();
        this.objects = {};
        this.enabled = jsConfig.map_sectors_layers.draw ? jsConfig.map_sectors_layers.allow : [];
        this.meta = null;
        this.disabled = [];
        this.init();
    }

    draw(object) {

        if (object.name === 'line_strings') {

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    level: {
                        value: jsConfig.line_strings.limit_distance
                    },
                    color: {
                        value: new THREE.Color(jsConfig.mats.line_strings.dict.color)
                    }
                },
                vertexShader: document.getElementById('map-lines-vertex-Shader').textContent,
                fragmentShader: document.getElementById('map-lines-fragment-Shader').textContent,
                side: THREE.FrontSide,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false,
                depthWrite: false,
            });

            material.needsUpdate = true;
            material.uniformsNeedUpdate = true;

            const lines_group = new THREE.Group();
            const coord_arrays = util.coords_from_array(object.raw);

            for (let vertices of coord_arrays) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                const contour = new THREE.Line(geometry, material);
                lines_group.add(contour);
            }
            lines_group.name = 'line_strings';
            lines_group.userData.level = object.level;
            lines_group.userData.enabled = true;
            lines_group.userData.type = 'line_strings';
            this.group.add(lines_group);
        }

        if (object.name === 'contours') {

            const bath_o_mat = shaders.by_distance;
            bath_o_mat.uniforms.depth.value = jsConfig.contours.limit_distance;
            bath_o_mat.uniforms.color.value = new THREE.Color(jsConfig.mats.contours.dict.color);
            bath_o_mat.uniforms.baseColor.value = new THREE.Color(jsConfig.colors.window);

            //
            // const bath_o_mat = new THREE.ShaderMaterial({
            //     uniforms: {
            //         depth: {
            //             value: jsConfig.contours.limit_distance
            //         },
            //         color: {
            //             value: new THREE.Color(jsConfig.mats.contours.dict.color)
            //         },
            //         baseColor: {
            //             value: new THREE.Color(jsConfig.colors.window)
            //         }
            //     },
            //     vertexShader: document.getElementById('bathos-vertex-Shader').textContent,
            //     fragmentShader: document.getElementById('bathos-fragment-Shader').textContent,
            // });



            const contours = new THREE.Group();
            object.raw.map(obj => {
                const contour_depth = new THREE.Group();
                //const coord_arrays = util.coords_from_array(obj['line_strings'], obj['d'] / -jsConfig.contours.depth_max);
                const coord_arrays = util.coords_from_array(obj['line_strings'], obj['d'] / -jsConfig.contours.depth_max);


                for (let vertices of coord_arrays) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));

                    // geometry.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                    // geometry.deleteAttribute('uv');
                    // geometry.deleteAttribute('normal');
                    geometry.computeVertexNormals();


                    const contour = new THREE.Line(geometry, bath_o_mat);
                    contour.name = 'depth_contour';
                    contour.interactive = true;
                    contour_depth.add(contour);

                    // const t = (vertices.length/3);
                    // const i = Math.floor(Math.random()*t);//t/2);
                    // if(t > 20) {
                    //     util.v3_from_buffer(geometry.attributes.position.array, i, map.vc.a);
                    //
                    //     const ref_geom = objects.hexagonal_shape(0.01/object.level);
                    //     const ref_mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
                    //     const ref_marker = new THREE.Mesh(ref_geom, ref_mat);
                    //     ref_marker.position.copy(map.vc.a);
                    //     contour_depth.add(ref_marker);
                    // }

                }

                contour_depth.name = 'contours';
                contour_depth.userData.depth = obj['d'];
                contour_depth.userData.level = object.level;
                contour_depth.position.set(0, 0, 0);//-0.0025);
                contours.add(contour_depth);

            });
            contours.name = 'contours';
            contours.userData.level = object.level;
            contours.userData.enabled = true;
            contours.userData.type = 'contours';
            this.group.add(contours);

        }

        if (object.name === 'protected_areas') {




            object.raw.map(obj => {
                const this_mpa_s = new THREE.Group();
                const ref = map.protected_areas[obj['id']];

                obj['line_strings'].map((mpa, n) => {
                    const shape = util.shape_from_array(mpa);

                    const mpa_color = ref.STATUS_ENG === 'Designated' ? new THREE.Color(jsConfig.colors.mpa_s_designated) : new THREE.Color(jsConfig.colors.mpa_s_proposed);

                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    geometry.setAttribute('color', new THREE.InstancedBufferAttribute( new Float32Array( mpa_color.toArray() ), 3 ));


                    // const t_mat = mpa_mat.clone();
                    // const t_color = ref.STATUS_ENG === 'Designated' ? jsConfig.colors.mpa_s_designated : jsConfig.colors.mpa_s_proposed;
                    // t_mat.color = new THREE.Color(t_color);
                    // t_mat.opacity = 0.25;
                    const mesh = new THREE.Mesh(geometry, mpa_mat);
                    mesh.userData.is_part = true;
                    mesh.name = 'protected_areas_sector' + obj['id'] + '_' + n;
                    mesh.userData.id = obj['id'];
                    mesh.interactive = true;
                    this_mpa_s.add(mesh);
                })

                this_mpa_s.name = object.name+'-'+obj['id'];
                this_mpa_s.userData.outline = util.coords_from_array([obj['line_strings']]);
                this_mpa_s.userData.area = ref.REP_AREA ? ref.REP_AREA : 0.0;
                this_mpa_s.userData.index = obj['id'];
                this_mpa_s.userData.level = object.level;
                this_mpa_s.userData.type = 'protected_areas';
                this.group.add(this_mpa_s);
            });

            // mpa_s.name = 'mpa_s';//+obj['id'];
            // mpa_s.userData.level = object.level;
            // this.group.add(mpa_s);
        }

        if (object.name === 'polygons') {

            const polygons_material = new THREE.ShaderMaterial({
                uniforms: {
                    level: {
                        value: jsConfig.polygons.limit_distance
                    },
                    auxCameraPosition: {
                        value: model.camera_map_local
                    },
                    color: {
                        value: new THREE.Color(jsConfig.mats.polygonsMaterial.dict.color)
                    },
                    baseColor: {
                        value: new THREE.Color(jsConfig.colors.window)
                    }
                },
                vertexShader: document.getElementById('map-polygons-vertex-Shader').textContent,
                fragmentShader: document.getElementById('map-polygons-fragment-Shader').textContent,
                side: THREE.FrontSide,
                // depthWrite: true,
                // depthTest: false,
            });
            const polygons = new THREE.Object3D();

            object.raw.map(obj => {
                for (let poly of obj) {
                    const shape = util.shape_from_array(poly);
                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    const mesh = new THREE.Mesh(geometry, polygons_material);
                    polygons.add(mesh);
                }
            });

            polygons.userData.level = object.level;
            polygons.userData.enabled = true;
            polygons.userData.type = 'polygons';
            polygons.name = object.name;
            polygons.matrixAutoUpdate = false;

            this.group.add(polygons);
            //polygons.renderOrder = 5;

            this.group.position.setZ(-0.001);
        }

        if (object.name === 'depth_maps') {

            const c_object = object.raw[0];

            const bath_o_mat = shaders.by_distance;
            bath_o_mat.uniforms.depth.value = jsConfig.contours.limit_distance;
            bath_o_mat.uniforms.color.value = new THREE.Color(jsConfig.mats.contours.dict.color);
            bath_o_mat.uniforms.baseColor.value = new THREE.Color(jsConfig.colors.window);

            const vertices = [];
            const contours = new THREE.Object3D();
            const line_color_default = new THREE.Color(jsConfig.mats.contours.dict.color);


            c_object.contour_lines.map(line => {
                const colors = [];
                const line_verts = [];
                for (let n = line.start; n < line.end; n++) {
                    const xyz = [c_object.verts_xy[n * 2], c_object.verts_xy[n * 2 + 1], line.depth / jsConfig.contours.depth_max];
                    line_verts.push(...xyz);
                    vertices.push(...xyz);
                }


                //# this is good, save it.
                const sub_vertices = [];
                for (let i = 0; i < line_verts.length / 3; i++) {
                    const v3 = new THREE.Vector3(line_verts[i * 3], line_verts[i * 3 + 1], line_verts[i * 3 + 2]);
                    sub_vertices.push(v3);
                }

                const a = 0.0015;//0.00125

                for (let i = 0; i < sub_vertices.length - 1; i++) {
                    vc.a.subVectors(sub_vertices[i], sub_vertices[i + 1]);
                    vc.b.crossVectors(vc.up, vc.a);
                    vc.c.addVectors(sub_vertices[i], vc.b.normalize().multiplyScalar(a))
                    util.set_buffer_at_index(line_verts, i, vc.c.toArray());

                    if (i === sub_vertices.length - 2) { //next last element
                        vc.a.subVectors(sub_vertices[i], sub_vertices[i + 1]);
                        vc.b.crossVectors(vc.up, vc.a);
                        vc.c.addVectors(sub_vertices[i], vc.b.normalize().multiplyScalar(a))
                        util.set_buffer_at_index(line_verts, i + 1, vc.c.toArray());

                        vc.d.fromArray(util.get_buffer_at_index(line_verts, 0));
                        const kd = vc.c.distanceTo(vc.d);
                        if (kd < 0.05) line_verts.push(...util.get_buffer_at_index(line_verts, 0));
                    }
                }

                for (let i = 0; i < line_verts.length / 3; i++) {
                    colors.push(...line_color_default.toArray());
                }


                if(line.depth !== 0 && line.depth !== -200) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(line_verts), 3));
                    geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(colors), 3));
                    geometry.computeVertexNormals();
                    geometry.translate(0, 0, a);

                    const contour = new THREE.Line(geometry, bath_o_mat);
                    contour.name = 'depth_contour';
                    contour.userData.depth = line.depth;
                    contour.userData.count = line_verts.length / 3;
                    contour.interactive = true;
                    contour.matrixAutoUpdate = false;

                    contour.userData.setColors = (arr) => {
                        for (let i = 0; i < contour.userData.count; i++) {
                            contour.geometry.attributes.color.array[i*3] = arr[0];
                            contour.geometry.attributes.color.array[i*3+1] = arr[1];
                            contour.geometry.attributes.color.array[i*3+2] = arr[2];
                        }
                        contour.geometry.attributes.color.needsUpdate = true;
                    }

                    contours.add(contour);
                    // contour.renderOrder = 10;

                    // Line2 ( LineGeometry, LineMaterial )
                    // const f_geometry = new LineGeometry();
                    // f_geometry.setPositions( line_verts );
                    // //geometry.setColors( colors );
                    // const matLine = new LineMaterial( {
                    // 	color: 0xffffff,
                    // 	linewidth: 0.005, // in world units with size attenuation, pixels otherwise
                    // 	vertexColors: false,
                    // 	//resolution:  // to be set by renderer, eventually
                    // 	dashed: false,
                    // 	alphaToCoverage: true,
                    // } );
                    //
                    // const f_line = new Line2( f_geometry, matLine );
                    // f_line.computeLineDistances();
                    // f_line.scale.set( 1, 1, 1 );
                    //
                    // contours.add(f_line);
                }
            });

            // const sub_vertices = [];
            // for (let i = 0; i < vertices.length/3; i++) {
            //     const v3 = [vertices[i*3],vertices[i*3+1],vertices[i*3+2]];
            //     sub_vertices.push(v3);
            // }
            //
            // const triangles = triangulate(sub_vertices);
            // console.log(triangles);


            for(let n=0; n<c_object.verts_xyz.length/3; n++){
                const xyz = [c_object.verts_xyz[n*3], c_object.verts_xyz[n*3+1], c_object.verts_xyz[n*3+2] / jsConfig.contours.depth_max];
                vertices.push(...xyz)
            }

            //console.log(vertices);
            //bath_o_mat.clone();//
            const meshes_material = new THREE[jsConfig.mats.depthMeshMaterial.type](jsConfig.mats.depthMeshMaterial.dict);
            meshes_material.color.set(jsConfig.colors.window);
            // meshes_material.uniforms.color.value = new THREE.Color(jsConfig.colors.window);
            // meshes_material.uniforms.depth.value = 4.0;//new THREE.Color(0x000FFF);///jsConfig.colors.window);
            //meshes_material.blending = THREE.NormalBlending;//.set(jsConfig.colors.window);

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
            const k_index = new THREE.BufferAttribute(Uint16Array.from(c_object.indices), 1);
            geometry.setIndex(k_index);
            // geometry.computeVertexNormals();
            geometry.scale(1,1,1);///jsConfig.contours.depth_max);

            const mesh = new THREE.Mesh(geometry, meshes_material);
            mesh.userData.is_depth_map = true;
            mesh.interactive = true;
            mesh.matrixAutoUpdate = false;
            //mesh.position.set(0.0,0.0,-0.01);
        //     object.raw.map(obj => {
        //         //console.log(obj, obj.indices.length, obj.vertices.length/3);
        //         const geometry = new THREE.BufferGeometry();
        //         geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(obj.vertices), 3));
        //         const k_index = new THREE.BufferAttribute(Uint16Array.from(obj.indices), 1);
        //         //console.log(k_index);
        //
        //         geometry.setIndex(k_index);
        //         // geometry.deleteAttribute('uv');
        //         // geometry.deleteAttribute('normal');
        //         //
        //         ///geometry.computeVertexNormals();
        //         geometry.scale(1,1,1/jsConfig.contours.depth_max);
        //
        //         const mesh = new THREE.Mesh(geometry, meshes_material);
        //         meshes.add(mesh);
        //
        //     })
        //     meshes.userData.level = object.level;
        //     meshes.userData.enabled = false;
        //     meshes.userData.type = 'meshes';
        //     meshes.name = object.name;
        //     this.group.add(meshes);



            contours.userData.level = object.level;
            contours.userData.enabled = true;
            contours.userData.type = 'depth_maps'; //'contours';

            contours.add(mesh);
            contours.matrixAutoUpdate = false;

            this.group.add(contours);
            // mesh.renderOrder = 9;



            //  line_stat = {
            //     "depth": depth,
            //     "len": util.value_cleaner(line.length, 5),
            //     "coords": len(line.coords),
            //     "start": start_index,
            //     "end": end_index
            // }
            // "contour_lines": lines_record,
            // "verts_xy": contour_vt_xy.round(4).tolist(),
            // "verts_xyz": depth_vt_xyz.tolist(),
            // "indices": indices.flatten().tolist(),
            // "labels": labels_collection







            //
            // const meshes = new THREE.Group();
            // const meshes_material = new THREE[jsConfig.mats.depthMeshMaterial.type](jsConfig.mats.depthMeshMaterial.dict);
            // object.raw.map(obj => {
            //     //console.log(obj, obj.indices.length, obj.vertices.length/3);
            //     const geometry = new THREE.BufferGeometry();
            //     geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(obj.vertices), 3));
            //     const k_index = new THREE.BufferAttribute(Uint16Array.from(obj.indices), 1);
            //     //console.log(k_index);
            //
            //     geometry.setIndex(k_index);
            //     // geometry.deleteAttribute('uv');
            //     // geometry.deleteAttribute('normal');
            //     //
            //     ///geometry.computeVertexNormals();
            //     geometry.scale(1,1,1/jsConfig.contours.depth_max);
            //
            //     const mesh = new THREE.Mesh(geometry, meshes_material);
            //     meshes.add(mesh);
            //
            // })
            // meshes.userData.level = object.level;
            // meshes.userData.enabled = false;
            // meshes.userData.type = 'meshes';
            // meshes.name = object.name;
            // this.group.add(meshes);
            // meshes.position.set(0.0,0.0,-0.01);
        }


        // if (object.name === 'meshes') {
        //     const meshes = new THREE.Group();
        //     const meshes_material = new THREE[jsConfig.mats.depthMeshMaterial.type](jsConfig.mats.depthMeshMaterial.dict);
        //     object.raw.map(obj => {
        //         //console.log(obj, obj.indices.length, obj.vertices.length/3);
        //         const geometry = new THREE.BufferGeometry();
        //         geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(obj.vertices), 3));
        //         const k_index = new THREE.BufferAttribute(Uint16Array.from(obj.indices), 1);
        //         //console.log(k_index);
        //
        //         geometry.setIndex(k_index);
        //         // geometry.deleteAttribute('uv');
        //         // geometry.deleteAttribute('normal');
        //         //
        //         ///geometry.computeVertexNormals();
        //         geometry.scale(1,1,1/jsConfig.contours.depth_max);
        //
        //         const mesh = new THREE.Mesh(geometry, meshes_material);
        //         meshes.add(mesh);
        //
        //     })
        //     meshes.userData.level = object.level;
        //     meshes.userData.enabled = false;
        //     meshes.userData.type = 'meshes';
        //     meshes.name = object.name;
        //     this.group.add(meshes);
        //     meshes.position.set(0.0,0.0,-0.01);
        // }

        return true;
    }

    self_destruct() {
        this.group.removeFromParent();
        delete this;
    }

    load_meta(obj) {
        this.meta = obj.list[0].raw;
        // console.log(this.meta);
        Object.entries(this.meta).map((k) => {
            if (k[1].length) {
                this.meta[k[0]] = k[1].reduce((a, v) => ({...a, [v]: null}), {});
                this.meta[k[0]].max_loaded = 0;
            } else {
                delete this.meta[k[0]];
            }
        });
        return true;
    }

    test_validate() {
        return this.group.children.filter(r => r.visible).map(res => {
            return res.name + ' ' + res.userData.level;
        });
    }

    load_layers(layer_obj) {
        for (let obj of layer_obj.list) {
            this.draw(obj);
            this.meta[obj.name][obj.level] = 'loaded';
            this.meta[obj.name].max_loaded = obj.level;
            this.max_level = obj.level > this.max_level ? obj.level : this.max_level;
            this.update();
        }
    }

    check_layers() {
        if (this.meta) {
            const required = Object.entries(this.meta)
                .filter(k => k[1].hasOwnProperty(this.level) && k[1][this.level] === null && this.enabled.includes(k[0]) && !this.disabled.includes(k[0]));

            if (required.length) {
                const list = required.map(k => ({
                    url: `${this.path}/${k[0]}-${this.level}.json`,
                    type: 'json',
                    name: k[0],
                    level: this.level
                }));
                const objects_list = {name:'sector', list:list};
                loader(objects_list, map_loader.notify).then(object_list => this.load_layers(object_list));
            }
        }
    }

    init() {
        const material = new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.125, blending: THREE.AdditiveBlending});
        const geometry = new THREE.BufferGeometry().setFromPoints(this.bounds);
        geometry.setIndex([0, 1, 2, 2, 3, 0]);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.boundingBox.getCenter(this.center);

        const plane_line = new THREE.Mesh(geometry, material);
        plane_line.name = 'plane_line';
        plane_line.userData.index = this.id;
        plane_line.userData.center = this.center;

        if (jsConfig.MAP_DEBUG) {
            this.group.add(plane_line);
        }

        this.group.userData.center = this.center;
        this.group.userData.owner = this;
        this.group.name = `Sector-${this.id}-group`;
        this.group.sector = true;

        this.group.matrixAutoUpdate = false;

        this.objects.plane = plane_line;

        const meta_json = {name:'sector', list:[{url: `${this.path}/meta.json`, type: 'json', name: 'meta'}]};

        loader(meta_json)
            .then(object_list => this.load_meta(object_list))
            .then(state => {
                if (state) {
                    this.level = 0;
                    this.check_layers();
                } else {
                    console.log(`Error loading ${this.name} meta-data: ${meta_json[0].url}`);
                }
            });
    }

    set_level(LV = null) {
        if (this.level !== LV) {

            const c_level = this.max_level >= LV;
            this.level = LV;

            if (jsConfig.MAP_DEBUG) {
                this.objects.plane.material.setValues({opacity: (this.level / jsConfig.levels) * 0.125});
                this.objects.plane.userData.level = this.level;
                this.objects.plane.userData.aux = [this.max_level];
            }
            this.check_layers();
            if (c_level) this.update();
        }
    }

    update() {
        //if(this.id !== '75') return;
        this.group.children.forEach(res => {
            if (this.disabled.includes(res.userData.type)) {
                res.visible = false;
                return;
            }
            if (this.meta.hasOwnProperty(res.name) && this.meta[res.name][this.level] === null) return;
            res.visible = (res.userData.level === this.level);
        });
    }

    toggle_attribute(attribute_name, set_state) {
        const pos = this.disabled.indexOf(attribute_name);
        if (pos === -1) {
            this.disabled.push(attribute_name);
        } else {
            this.disabled.splice(pos, 1);
        }
        this.update();
    }
}

const map = {
    vc: {
        a: new THREE.Vector3(0, 0, 0),
        b: new THREE.Vector3(0, 0, 0),
        c: new THREE.Vector3(0, 0, 0),
        d: new THREE.Vector3(0, 0, 0),
        e: new THREE.Vector3(0, 0, 0),
        up: new THREE.Vector3(0, 0, 1)
    },
    ray: objects.ray_special().init(),
    protected_areas: null,
    sector_count: 0,
    object: new THREE.Group(),
    sweeps: [],
    generate_sweep(count, model){
        for (let i = 0; i < count; i++) {
            const ref_geom = objects.hexagonal_shape(0.01);
            const ref_mat = new THREE.MeshBasicMaterial({color: 0xFF0000});
            const ref_marker = new THREE.Mesh(ref_geom, ref_mat);
            //ref_marker.position.copy(map.vc.a);
            model.container.add(ref_marker);
            map.sweeps.push(ref_marker);
            //ref_marker.position.set(model.center.x, model.center.y, 0.0);
            //contour_depth.add(ref_marker);
        }
    },
    update(cam_obj, user_position){
        if(!jsConfig.map_sectors_layers.draw) return;
        const prk = jsConfig.sector_degree_scale*1.5;
        map.object.children.forEach(sector_or_object => {

            if(sector_or_object.sector) {
                map.vc.a.copy(sector_or_object.userData.center);
                map.object.localToWorld(map.vc.a);




                map.vc.b.copy(user_position).sub(cam_obj.projected);

                const figuration = Math.floor(Math.pow(cam_obj.camera_scale, jsConfig.levels) * (jsConfig.levels + 1));

                const L = map.vc.a.distanceTo(map.vc.b);

                if (L < jsConfig.levels * prk) {
                    let LV = figuration - Math.floor((L / (jsConfig.levels * prk)) * jsConfig.levels);
                    if (LV > 4) LV = 4;
                    if (LV < 0) LV = 0;
                    sector_or_object.userData.owner.set_level(LV);
                }
            }
        });
    },
    init(model, target_model, cam_obj){
        if(!jsConfig.map_sectors_layers.draw) return;
        //map.generate_sweep(180, model);

        const map_deg = jsConfig.sector_degree_scale;
        map.sector_count = (model.dimensions.x * (1 / map_deg) * (model.dimensions.y * (1 / map_deg)));
        map.cam_obj = cam_obj;

        mpa_mat.uniforms.full_d.value = map.cam_obj.max_zoom;
        mpa_mat.uniforms.max_alpha.value = 0.3;
        mpa_mat.blending = THREE.AdditiveBlending;

        for (let i = 0; i < map.sector_count; i++) {
            const x = i % (model.dimensions.x * (1 / map_deg));
            const y = Math.floor(i / (model.dimensions.x * (1 / map_deg)));
            const sx = jsConfig.bounds[0] + (x * map_deg);
            const sy = (jsConfig.bounds[3] - map_deg) - (y * map_deg);
            map.vc.a.set(sx, sy + map_deg, 0.0);

            const tile_vertices = [
                map.vc.a.clone(),
                map.vc.a.clone().setY(map.vc.a.y - map_deg),
                map.vc.a.clone().setX(map.vc.a.x + map_deg).setY(map.vc.a.y - map_deg),
                map.vc.a.clone().setX(map.vc.a.x + map_deg)
            ]

            let loc = [sx, sy];
            const new_tile = new Sector(i, loc, tile_vertices);
            map.object.add(new_tile.group);
            new_tile.group.matrixAutoUpdate = false;
            // new_tile.group.renderOrder = 20;
        }

        map.object.add(map.ray.object);
        map.ray.visible = true;

        console.log('map contains', map.sector_count, `${map_deg}º sectors`);
        map.object.rotateX(Math.PI/-2);
        map.object.position.set(-model.center.x, 0.0, model.center.y);


        map.object.renderOrder = 15;

        target_model.add(map.object);



    }
}

export default map;