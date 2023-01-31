import * as THREE from "three";
import {loader} from './machine/loader';
import windowJsConfig from '../window-js-config';
import jsConfig from '../model-js-config';
import * as util from "./machine/util";
import model from "./model";


const map_loader = {
    notify(count, obj, parent_obj){
        //console.log(count, obj, parent_obj);
    }
}
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
        this.group = new THREE.Group();
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
            const bath_o_mat = new THREE.ShaderMaterial({
                uniforms: {
                    depth: {
                        value: jsConfig.contours.limit_distance
                    },
                    color: {
                        value: new THREE.Color(jsConfig.mats.contours.dict.color)
                    },
                    baseColor: {
                        value: new THREE.Color(windowJsConfig.colors.window)
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
                const ref = map.protected_areas[obj['id']];
                //console.log(ref);
                obj['line_strings'].map((mpa, n) => {
                    const shape = util.shape_from_array(mpa);
                    const geometry = new THREE.ShapeBufferGeometry(shape);
                    const t_mat = mpa_mat.clone();
                    const t_color = ref.STATUS_ENG === 'Designated' ? windowJsConfig.colors.mpa_s_designated : windowJsConfig.colors.mpa_s_proposed;
                    t_mat.color = new THREE.Color(t_color);
                    t_mat.opacity = 0.25;
                    const mesh = new THREE.Mesh(geometry, t_mat);
                    mesh.userData.is_part = true;
                    mesh.name = 'protected_areas_sector' + obj['id'] + '_' + n;
                    mesh.userData.id = obj['id'];
                    mesh.interactive = true;
                    this_mpa_s.add(mesh);
                })

                this_mpa_s.userData.mpa_s_outlines = util.coords_from_array([obj['line_strings']]);
                this_mpa_s.userData.area = ref.REP_AREA ? ref.REP_AREA : 0.0;
                this_mpa_s.userData.index = obj['id'];
                this_mpa_s.userData.level = object.level;
                // this_mpa_s.name = 'protected_areas-' + obj['id'];
                // this_mpa_s.userData.type = 'mpa_s';
                //this_mpa_s.interactive = true;
                this.group.add(this_mpa_s);
                //this.group.computeBoundingSphere();
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
                        value: new THREE.Color(windowJsConfig.colors.window)
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
                .filter(k => k[1].hasOwnProperty(this.level) && k[1][this.level] === null && this.enabled.includes(k[0]));

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
        e: new THREE.Vector3(0, 0, 0)
    },
    protected_areas: null,
    sector_count: 0,
    object: new THREE.Group(),
    update(cam_obj, user_position){
        if(!jsConfig.map_sectors_layers.draw) return;
        map.object.children.forEach(sector => {
            map.vc.a.copy(sector.userData.center);
            map.object.localToWorld(map.vc.a);
            map.vc.b.copy(user_position).sub(cam_obj.projected);

            const figuration = Math.floor(Math.pow(cam_obj.camera_scale, jsConfig.levels)*(jsConfig.levels+1));
            const L = map.vc.a.distanceTo(map.vc.b);

            if (L < jsConfig.levels * jsConfig.sector_degree_scale) {
                let LV = figuration - Math.floor((L/(jsConfig.levels * jsConfig.sector_degree_scale))*jsConfig.levels);
                if (LV > 4) LV = 4;
                if (LV < 0) LV = 0;
                sector.userData.owner.set_level(LV);
            }
        });
    },
    init(model){
        if(!jsConfig.map_sectors_layers.draw) return;
        const map_deg = jsConfig.sector_degree_scale;
        map.sector_count = (model.dimensions.x * (1 / map_deg) * (model.dimensions.y * (1 / map_deg)));

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
        }

        console.log('map contains', map.sector_count, `${map_deg}º sectors`);
        map.object.position.set(-model.center.x, -model.center.y, 0.0);
        model.container.add(map.object);
    }

}

export default map;