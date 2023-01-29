import * as THREE from "three";
import * as util from "./machine/util";
import timer from './machine/timer.js';
import * as config from '../model-config';
import windowJsConfig from "../window-js-config";
import jsConfig from '../model-js-config';


function apply_adaptive_scale(inst, v, v_lim, index, sign, a_lim) {

    inst.getMatrixAt(index, mu);
    mu.decompose(vw, qu, vu);
    const value = a_lim === 0 || v === 0 ? (0.0001) : (v / a_lim*sign);
    const color_value = v_lim === 0 || v === 0 ? (0.0001) : (v / v_lim*sign);
    vu.setZ(value * vars.bar_scale);
    vu.setY((1 - camera_scale) * vars.bar_scale_width);
    mu.compose(vw, qu, vu);
    inst.setMatrixAt(index, mu);

    if (!inst.userData.td.color_default[index].selected) {
        utility_color.fromArray(inst.userData.td.base_color).multiplyScalar(Math.abs(color_value));
        inst.setColorAt(index, utility_color.clone());
        inst.userData.td.color_default[index].color = utility_color.toArray();
    }

    return vu.z;
}

function adaptive_scaling_wudi() {
    // return;
    const wudi = scene.getObjectByName('wudi');
    //console.log('adaptive_scaling_wudi', wudi, wudi.children.length);
    if (wudi && wudi.children.length && vars.selecta.wudi.times.selected.length) {
        const wudi_up = scene.getObjectByName('wudi_up');
        const wudi_down = scene.getObjectByName('wudi_down');

        const test = wudi.children[0].userData.td;
        let data_index;
        let cherf = 0;
        const visible = {set: [], up: [], down: []};

        for (let c = 0; c < test.position.length; c++) {
            data_index = vars.data.wudi_index[c];
            //const r_index = wudi_up.userData.td.index.indexOf(index);
            vw.fromArray(test.mid_position[c]);
            map_container.localToWorld(vw);
            //#//TODO make depend on distance from view also.
            //#//ALERT TO HOW u_me vs. u_max is leveraged here.
            if (camera_frustum.containsPoint(vw)) {
                visible.set.push([c, data_index, cherf]);
                visible.up.push([vars.data.wudi_data.current[data_index][3]]);
                visible.down.push([vars.data.wudi_data.current[data_index][4]]);
                cherf++;
            }else{
                if(!mover.is_rotating && vars.selecta.wudi.points.selected.includes(data_index)) vars.selecta.wudi.point_select(data_index);
                // if (wudi_up.userData.td.color_default[c] && wudi_up.userData.td.color_default[c].selected) {
                //     //deselect point!
                //     //console.log(data_index,c);
                //     if(!mover.is_rotating && vars.selecta.wudi.points.selected.includes(data_index)) vars.selecta.wudi.point_select(data_index);
                // }
            }
        }


        const lim = [Math.max(...visible.up), Math.min(...visible.down)];
        lim.push(lim[0]+Math.abs(lim[1]));
        //console.log("visible.set", visible.set);
        // obs_handler({LMS: vars.selecta.wudi.points.hover});

        for (let v of visible.set) {
            //DEBUG /// if (v[0] === 1085) console.log(visible.up[v[2]][0], visible.down[v[2]][0], lim, v[0]);
            const w_up = apply_adaptive_scale(wudi_up, visible.up[v[2]][0], lim[0], v[0], 1.0, lim[2]);
            const w_down = apply_adaptive_scale(wudi_down, visible.down[v[2]][0], lim[1], v[0], -1.0, lim[2]);

            if(v[1] === vars.selecta.wudi.points.canonical_selection[0]){
                wudi_dub_selecta.rescale(v[0],w_up,w_down);
            } //obs_handler({LIM: v});
        }

        //obs_handler({LIM: lim});

        wudi_up.instanceMatrix.needsUpdate = true;
        wudi_up.instanceColor.needsUpdate = true;

        wudi_down.instanceMatrix.needsUpdate = true;
        wudi_down.instanceColor.needsUpdate = true;

    }

    return true;
}


//general map-sector
class Sector {
    // herein lies the changeover to MPA as sectorized data: in "draw()"
    constructor(id, loc, bounds) {
        this.id = id;
        this.name = `Sector-${id}`;
        this.path = `${config.static_path}/${config.degree_scale_str}/${this.name}`;
        this.bounds = bounds;
        this.level = 0;
        this.max_level = 0;
        this.center = new THREE.Vector3();
        this.group = new THREE.Group();
        this.objects = {};
        this.enabled = config.sectors_draw ? config.layers.allow : [];
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
            const bath_o_mat = new THREE.ShaderMaterial({
                uniforms: {
                    depth: {
                        value: jsConfig.contours.limit_distance
                    },
                    color: {
                        value: new THREE.Color(jsConfig.mats.contours.dict.color)
                    },
                    baseColor: {
                        value: new THREE.Color(window_config.colors.window)
                    }
                },
                vertexShader: document.getElementById('bathos-vertex-Shader').textContent,
                fragmentShader: document.getElementById('bathos-fragment-Shader').textContent,
            });

            const contours = new THREE.Group();
            object.raw.map(obj => {
                const contour_depth = new THREE.Group();
                const coord_arrays = util.coords_from_array(obj['line_strings'], obj['d'] / -jsConfig.contours.depth_max);

                for (let vertices of coord_arrays) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(vertices), 3));
                    geometry.deleteAttribute('uv');
                    geometry.deleteAttribute('normal');
                    const contour = new THREE.Line(geometry, bath_o_mat);
                    contour_depth.add(contour);
                }

                contour_depth.name = 'contours';
                contour_depth.userData.depth = obj['d'];
                contour_depth.userData.level = object.level;
                contour_depth.position.set(0, 0, -0.0025);
                contours.add(contour_depth);
            });
            contours.name = 'contours';
            contours.userData.level = object.level;
            contours.userData.enabled = true;
            contours.userData.type = 'contours';
            this.group.add(contours);

        }

        if (object.name === 'mpa_s') {
            const mpa_mat = new THREE[jsConfig.mats.mpaMaterial.type](jsConfig.mats.mpaMaterial.dict);
            mpa_mat.blending = THREE.AdditiveBlending;

            object.raw.map(obj => {
                const this_mpa_s = new THREE.Group();
                const ref = vars.refs.mpa_s[obj['id']];

                obj['line_strings'].map((mpa, n) => {
                    const shape = util.shape_from_array(mpa);
                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    const t_mat = mpa_mat.clone();
                    const t_color = ref.STATUS_ENG === 'Designated' ? vars.colors.mpa_s_designated : vars.colors.mpa_s_proposed;
                    t_mat.color = new THREE.Color().fromArray(t_color);
                    t_mat.opacity = t_color[3];
                    const mesh = new THREE.Mesh(geometry, t_mat);
                    mesh.userData.is_part = true;
                    mesh.name = obj['id'] + '_' + n;
                    this_mpa_s.add(mesh);
                })

                this_mpa_s.userData.mpa_s_outlines = util.coords_from_array([obj['line_strings']]);
                this_mpa_s.userData.area = ref.REP_AREA ? ref.REP_AREA : 0.0;
                this_mpa_s.userData.index = obj['id'];
                this_mpa_s.userData.level = object.level;
                this_mpa_s.name = 'mpa_s-' + obj['id'];
                this_mpa_s.userData.type = 'mpa_s';
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
                        value: new THREE.Color(window_config.colors.window)
                    }
                },
                vertexShader: document.getElementById('map-polygons-vertex-Shader').textContent,
                fragmentShader: document.getElementById('map-polygons-fragment-Shader').textContent,
                side: THREE.FrontSide,
                depthWrite: true,
            });
            const polygons = new THREE.Group();

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
            this.group.add(polygons);
            this.group.position.setZ(-0.001);
        }

        return true;
    }

    self_destruct() {
        this.group.removeFromParent();
        delete this;
    }

    load_meta(obj_list) {
        this.meta = obj_list[0].raw;
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

    load_layers(obj_list) {
        for (let obj of obj_list) {
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
                .filter(k => k[1].hasOwnProperty(this.level) && k[1][this.level] === null && this.enabled.includes(k[0]));

            if (required.length) {
                const objects_list = required.map(k => ({
                    url: `${this.path}/${k[0]}-${this.level}.json`,
                    type: 'json',
                    name: k[0],
                    level: this.level
                }));
                fetchAll(objects_list, loader_notify).then(object_list => this.load_layers(object_list));
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

        if (jsConfig.DEBUG) {
            this.group.add(plane_line);
        }

        this.group.userData.center = this.center;
        this.group.userData.owner = this;
        this.objects.plane = plane_line;

        const meta_json = [{url: `${this.path}/meta.json`, type: 'json', name: 'meta'}];

        model.loader.load(meta_json)
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
            if (jsConfig.DEBUG) {
                this.objects.plane.material.setValues({opacity: (this.level / jsConfig.levels) * 0.125});
                this.objects.plane.userData.level = this.level;
                this.objects.plane.userData.aux = [this.max_level];
            }
            this.check_layers();
            if (c_level) this.update();
        }
    }

    update() {
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

const layers = {
    u:{
        mat: new THREE.Matrix4(),
        vct: new THREE.Vector3(),
        vct2: new THREE.Vector3(),
        qua: new THREE.Quaternion(),
        color: new THREE.Color()
    },
    make:{
        wudi_points_instance(DATA){
            const temp_color = new THREE.Color();
            const wudi_group = new THREE.Group();
            wudi_group.name = 'wudi';

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
                wudi_group.add(instance);
            }

            layers.wudi_points = wudi_group;
            layers.draw.wudi_points();

            wudi_group.position.set(-model.center.x,-model.center.y,0.0);
            model.container.add(wudi_group);
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
        }
    },
    update: {
        wudi_points(DATA, cam_obj) {
            const test = layers.wudi_points.children[0].userData.td;
            const visible = {set: [], up: [], down: []};
            let in_view_index = 0;

            for (let c = 0; c < test.position.length; c++) {
                const data_index = DATA.CONF.wudi_index[c];
                layers.u.vct.fromArray(test.mid_position[c]);
                layers.wudi_points.localToWorld(layers.u.vct);

                if (cam_obj.frustum.containsPoint(layers.u.vct)) {
                    visible.set.push([c, data_index, in_view_index]);
                    visible.up.push([DATA.TD.current[data_index][3]]);
                    visible.down.push([DATA.TD.current.current[data_index][4]]);
                    in_view_index++;
                }
            }

            const lim = [Math.max(...visible.up), Math.min(...visible.down)];
            lim.push(lim[0]+Math.abs(lim[1]));

            for (let v of visible.set) {
                //all on both
                for (let i_mesh of layers.wudi_points.children) {
                    const sign = i_mesh.userData.td.sign;
                    i_mesh.getMatrixAt(v[0], layers.u.mat);
                    layers.u.mat.decompose(layers.u.vct, layers.u.qua, layers.u.vct2);

                    const value = lim[2] === 0 || v === 0 ? (0.0001) : (v / lim[2]*sign);
                    const color_value = lim[0] === 0 || v === 0 ? (0.0001) : (v / lim[0]*sign);

                    layers.u.vct2.setZ(value * jsConfig.bar_scale);
                    layers.u.vct2.setY((1 - cam_obj.scale) * jsConfig.bar_scale_width);
                    layers.u.mat.compose(layers.u.vct, layers.u.qua, layers.u.vct2);
                    i_mesh.setMatrixAt(v[0], layers.u.mat);

                    if (!i_mesh.userData.td.color_default[v[0]].selected) {
                        layers.u.color.fromArray(i_mesh.userData.td.base_color).multiplyScalar(Math.abs(color_value));
                        i_mesh.setColorAt(v[0], layers.u.color.clone());
                        i_mesh.userData.td.color_default[v[0]].color = layers.u.color.toArray();
                    }

                }
            }

            for (let i_mesh of layers.wudi_points.children) { //wudi_up, wudi_down;
                i_mesh.instanceMatrix.needsUpdate = true;
                i_mesh.instanceColor.needsUpdate = true;
            }
        }
    }
}

const model = {
    layers: layers,
    width: null,
    height: null,
    container: new THREE.Group(),
    natural_bounds: config.bounds,
    degree_scale: config.sector_degree_scale,
    map_vertical_deg_offset: config.sector_degree_scale,
    dimensions: null,
    center: null,
    camera_map_local: new THREE.Vector3(),
    model_position(origin) {
        origin.x = model.natural_bounds[0] + ((model.width / 2) + origin.x);
        origin.z = model.natural_bounds[1] + ((model.height / 2) - origin.z);
    },
    init(init_vars) {
        const map_min = new THREE.Vector2(config.bounds[0], config.bounds[1]);
        const map_max = new THREE.Vector2(config.bounds[2], config.bounds[3]);
        model.dimensions = new THREE.Vector2();
        model.center = new THREE.Vector2();
        const map_box = new THREE.Box2(map_min, map_max);

        map_box.getSize(model.dimensions);
        map_box.getCenter(model.center);

        console.log(model.center);

        model.width = model.dimensions.x;
        model.height = model.dimensions.y;

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
        model.container.rotateX(Math.PI / -2);

    }
}

export default model;