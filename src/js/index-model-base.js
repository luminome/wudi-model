import * as THREE from "three";
import {events as EVT} from "./machine/ui-events.js";
import {controls as CTL} from "./machine/ui-controls.js";
import {environment as RUN} from "./machine/three-env.js";
import {model as MDL} from "./model.js";

import {logger as LOG} from "./machine/logger.js";
import {loader} from './machine/loader.js';
import timer from './machine/timer.js';
import * as util from './machine/util.js';
import * as config from "../window-config";

const runtime_timer = timer('main-initialization-loop').start();
const obs = document.getElementById('obs');

const init_vars = {
    trace: LOG(obs),
    view:{
        width: window.innerWidth,
        height: window.innerHeight,
        scene_width: 20,
        colors:{
            window_background: config.colors.window,
            view_elements: config.colors.view_elements,
        },
        features:{
            default_view_z: 30.0,
            axes_helper: false,
            helper_grid:{
                on: false,
                width:20,
            },
            grid_marks:{
                on: true,
                distance: 25.0,
                width: 25,
                pitch: 2.0,
                shape_length: 10.0,
                shape_scale: 0.01,
                color: config.colors.view_elements,
            },
            center_line:{
                on: true,
            },
            position_lines:{
                on: true,
            },
            beautiful_position_lines:{
                on: true,
                size: 40.0,
                weight: 1,
                color: config.colors.view_elements,
                opacity: 0.5,
                limit: 60.0
            }
        }
    },
    action: 'none',
    model: new THREE.Group()
}

const view = {
    vc: {
        a: new THREE.Vector3(0, 0, 0),
        b: new THREE.Vector3(0, 0, 0),
        c: new THREE.Vector3(0, 0, 0),
        d: new THREE.Vector3(0, 0, 0),
        e: new THREE.Vector3(0, 0, 0)
    },
    plane: null,
    user_position: new THREE.Vector3(0, 0, 0),
    user_map_position: new THREE.Vector3(0, 0, 0),
    user_position_round: new THREE.Vector3(0, 0, 0),
    position_marks: {
        x: {
            pos: [0,0,2],
            card:'E',
            mark:null
        },
        z: {
            pos: [2,0,0],
            card:'N',
            mark:null
        },
        y: {
            pos: [0,10,0],
            card:'º',
            mark:null
        }
    },
    UP: new THREE.Vector3(0, 1, 0),
    width: null,
    height: null,
    bounds_bottom_offset: 20,
    camera_auto_affine: false,
    max_allowable_zoom: 20.0,
    grid_resolution: null,
    axis_planes: [],
    ticks:{
        dom: document.getElementById('model-plot-ticks'),
    },
    x_major_axis: document.getElementById('x-axis'),
    y_major_axis: document.getElementById('y-axis'),
    x_axis_inset: 10,
    y_axis_inset: 10,
    axis_markers_count: 21,
    axis_dir_x: new THREE.Vector3(0, 0, 1),
    axis_dir_y: new THREE.Vector3(-1, 0, 0),
    mantissas: [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0],
    ui_control:{
        recenter_map(){
            CTL.cam.base_pos.set(0, 0, view.max_allowable_zoom);
            CTL.cam.pos.set(0, 0, 0);
            init_vars.model.position.set(0, 0, 0);
            view.user_position.set(0, 0, 0);
            view.user_map_position.set(0, 0, 0);
            CTL.cam.cube.userData.originalMatrix.decompose(CTL.cam.cube.position, CTL.cam.cube.quaternion, CTL.cam.cube.scale);
            CTL.cam.cube.matrix.copy(CTL.cam.cube.userData.originalMatrix);

            CTL.cam.run();

            view.run_optics();
            //adaptive_scaling_wudi();
            view.run_ticks();
            //refresh_sectors();
            if(init_vars.view.features.beautiful_position_lines.on) view.set_position_mark();

            init_vars.trace.log('recenter_map', 'ui_control');
        },
        camera_behavior(){
            vars.view.camera_auto_affine = !vars.view.camera_auto_affine;
            this.classList.toggle('control-toggle');
        },
        navigation_state(){
            vars.view.navigation_active = !vars.view.navigation_active;
            this.classList.toggle('control-toggle');
            q_nav_bar.style.display = 'block';
            window_redraw();
        },
        instructions_state(){
            vars.view.instructions_active = !vars.view.instructions_active;
            this.classList.toggle('control-toggle');
            const instructions_slide = document.getElementById('intro-instructions');
            instructions_slide.style.display = display_array[+vars.view.instructions_active];//'block';
        },
        mpa_s_state(){
            vars.mpa_s_visible = !vars.mpa_s_visible;
            this.classList.toggle('control-toggle');
            control_appearance_sectors('mpa_s', vars.mpa_s_visible );
        }
    },
    make_position_mark(radius) {
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
        line.rotateX(Math.PI / 2);
        return line;
    },
    make_dom_mark(dom_target){
        const mark = document.createElement('div');
        mark.classList.add('dmark');
        mark.innerHTML = '0.0';
        mark.style.color = config.colors.view_elements;//'gray';//vars.colors.hex_css(vars.colors.chart_tick);
        mark.style.backgroundColor = config.colors.window_overlay;
        dom_target.appendChild(mark);
        return mark;
    },
    make_ticks_divs() {
        const marks = [];
        for (let i = 0; i < view.axis_markers_count; i++) {
            const mark = view.make_dom_mark(view.ticks.dom);
            marks.push(mark);
        }
        return marks;
    },
    run_optics(){
        CTL.cam.camera_scale = 1 - (CTL.cam.distance / view.max_allowable_zoom);
        const zg = Math.floor(Math.log(CTL.cam.distance)) + 1;
        view.grid_resolution = view.mantissas[zg];
        view.user_map_position.copy(init_vars.model.position).negate();
        MDL.model_position(view.user_map_position);
        view.user_position_round.copy(init_vars.model.position).round().negate();
        view.plane.projectPoint(CTL.cam.pos, view.vc.d);
        CTL.cam.projected.copy(view.vc.d).negate();

        for (let plane of view.axis_planes) {
            view.vc.a.copy(plane.position);
            view.vc.a.unproject(CTL.cam.camera);
            view.vc.c.subVectors(view.vc.a, CTL.cam.pos).normalize();
            CTL.ray_caster.set(CTL.cam.pos, view.vc.c);
            CTL.ray_caster.ray.intersectPlane(view.plane, view.vc.b);

            if (plane.name === 'x') {
                plane.plane.set(CTL.cam.pos, 0);
            } else {
                //crucial bit of kung-fu
                plane.plane.set(CTL.cam.frustum.planes[1].normal, 0);
            }
            plane.plane.translate(view.vc.b);
        }

        if(init_vars.view.features.beautiful_position_lines.on){
            view.set_position_mark();
        }

        if(init_vars.view.features.position_lines.on){
            RUN.objects.position_lines.position.copy(init_vars.model.position).negate();
        }
    },
    run_ticks_axes(axis, tick_index, swap = null) {
        const basis = {x: 'x', z: 'z'};
        const axes = [view.axis_dir_x, view.axis_dir_y];

        if (swap) {
            basis.x = 'z';
            basis.z = 'x';
        }

        let tick_n = Math.round((view.user_position_round[basis[axis]]) / view.grid_resolution) * view.grid_resolution + ((tick_index - ((view.axis_markers_count - 1) / 2)) * view.grid_resolution);

        if (basis[axis] === 'x') {
            tick_n += init_vars.model.position.x;
            view.vc.a.set(tick_n, 0, -30 * Math.sign(axes[0].z));
            view.vc.b.set(0, 0, axes[0].z);
        } else {
            tick_n += init_vars.model.position.z;
            view.vc.a.set(-30 * Math.sign(axes[1].x), 0, tick_n);
            view.vc.b.set(axes[1].x, 0, 0);
        }

        if (axis === 'z') {
            if (view.vc.a.dot(CTL.cam.right) < 0) {
                view.vc.b.negate();
                if (view.vc.b.x !== 0) view.vc.a.x *= -1.0;
                if (view.vc.b.z !== 0) view.vc.a.z *= -1.0;
            }
        }
        return tick_n;
    },
    run_ticks() {
        const ticks = {};
        //for wudi points handling
        // vars.selecta.wudi.points.dom_handles.map(dh => {
        //     dh.draw();
        // })

        view.vc.a.set(0, 0, Math.sign(CTL.cam.projected.z)); //vw
        view.vc.b.set(Math.sign(CTL.cam.projected.x), 0, 0); //vk

        const swap = (CTL.cam.projected.angleTo(view.vc.b) < CTL.cam.projected.angleTo(view.vc.a));

        if (Math.abs(CTL.cam.projected.x) < 0.01 || Math.abs(CTL.cam.projected.z) < 0.01) {
            view.axis_dir_y.set(-Math.sign(CTL.cam.dot_z), 0, 0).normalize();
            view.axis_dir_x.set(0, 0, Math.sign(CTL.cam.dot_x)).normalize();
        } else {
            view.axis_dir_y.set(-1 * Math.sign(CTL.cam.projected.x), 0, 0);
            view.axis_dir_x.set(0, 0, -1 * Math.sign(CTL.cam.projected.z));
        }

        //if(vars.helpers_active) arrow_helper_4.setDirection(cam_right);

        for (let plane of view.axis_planes) {
            ticks.number = null;
            if (swap) {
                ticks.card = plane.name === 'x' ? 'N' : 'E';
            } else {
                ticks.card = plane.name === 'x' ? 'E' : 'N';
            }
            for (let m = 0; m < view.axis_markers_count; m++) {
                //plane.markers_geoms.children[m].position.set(0, 1, 0);
                ticks.n = view.run_ticks_axes(plane.name, m, swap);
                CTL.ray_caster.set(view.vc.a, view.vc.b); /// vw,vk set by run_ticks_axes;
                ticks.res = CTL.ray_caster.ray.intersectPlane(plane.plane, view.vc.c);
                plane.markers_divs[m].style.display = ticks.res === null ? 'none' : 'block';

                if (ticks.res !== null) {
                    if (ticks.card === 'E') {
                        ticks.number = ticks.n + ((-init_vars.model.position.x) + MDL.center.x);
                    }else{
                        ticks.number = -(ticks.n + ((-init_vars.model.position.z) - MDL.center.y));
                    }

                    plane.markers_divs[m].innerHTML = `${(ticks.number).toFixed(view.grid_resolution < 1 ? 2 : 0)}º ${ticks.card}`;
                    ticks.rect = plane.markers_divs[m].getBoundingClientRect();
                    util.projected(view.vc.c, CTL.cam.camera, view.width, view.height);

                    if (plane.name === 'x') {
                        ticks.left = (view.vc.c.x - (ticks.rect.width / 2));
                        ticks.top = (view.height - view.x_axis_inset) - (ticks.rect.height / 2);
                    } else {
                        ticks.left = (view.y_axis_inset);
                        ticks.top = (view.vc.c.y - (ticks.rect.height / 2));
                    }

                    plane.markers_divs[m].style.left = ticks.left + 'px';
                    plane.markers_divs[m].style.top = ticks.top + 'px';

                    const cas = (ticks.top > view.height || ticks.top < 0 || ticks.left > view.width || ticks.left < 0);
                    plane.markers_divs[m].style.display = cas ? 'none' : 'block';///display_array[+!cas];
                }
            }
        }
        //obs_handler({'F': vars.view.width, 'S': sum});
        //console.log(ticks);
    },
    init(){ //init the chart style the ticks rendering systems
        document.getElementById('recenter').addEventListener('mouseup', view.ui_control.recenter_map);
        document.getElementById('camera-motion').addEventListener('mouseup', view.ui_control.camera_behavior);
        document.getElementById('navigation').addEventListener('mouseup', view.ui_control.navigation_state);
        document.getElementById('instructions').addEventListener('mouseup', view.ui_control.instructions_state);
        document.getElementById('mpa_s').addEventListener('mouseup', view.ui_control.mpa_s_state);

        view.axis_planes.push({
            name: 'x',
            plane: new THREE.Plane(),
            position: new THREE.Vector3(0, -1, 0),
            up: new THREE.Vector3(),
            mark: view.make_position_mark(1.0),
            markers_divs: view.make_ticks_divs()
        });

        view.axis_planes.push({
            name: 'z',
            plane: new THREE.Plane(),
            position: new THREE.Vector3(-1, 0, 0),
            up: new THREE.Vector3(),
            mark: view.make_position_mark(1.0),
            markers_divs: view.make_ticks_divs()
        });

        view.x_major_axis.style['border-color'] = view.ticks.color;//vars.colors.hex_css(vars.colors.chart_tick);
        view.x_major_axis.style.opacity = '0.25';
        view.x_major_axis.style.left = '0px';
        view.x_major_axis.style.height = '1px';

        view.y_major_axis.style['border-color'] = view.ticks.color;//vars.colors.hex_css(vars.colors.chart_tick);
        view.y_major_axis.style.opacity = '0.25';
        view.y_major_axis.style.top = '0px';
        view.y_major_axis.style.width = '1px';

        view.plane = new THREE.Plane(view.UP);

        MDL.container.renderOrder = 12;
        init_vars.model.add(MDL.container);

        if(init_vars.view.features.beautiful_position_lines.on) {
            ['x','z','y'].map(a =>{
                view.position_marks[a].mark = view.make_dom_mark(view.ticks.dom);
            });
        }

        window.addEventListener('resize', view.redraw);
        view.redraw();
        init_vars.trace.log('bounds_rect', view.width, view.height);

        obs.style.color = config.colors.view_elements;
        obs.style['background-color'] = config.colors.window_overlay;
    },
    redraw(){
        const bounds = document.getElementById('bounds');
        bounds.style.height = (window.innerHeight-view.bounds_bottom_offset)+'px';

        const bounds_rect = bounds.getBoundingClientRect();
        view.width = bounds_rect.width;
        view.height = bounds_rect.height;

        view.x_major_axis.style.top = (view.height-view.x_axis_inset)+'px';
        view.x_major_axis.style.width = view.width+'px';

        view.y_major_axis.style.left = (view.y_axis_inset)+'px';
        view.y_major_axis.style.height = view.height+'px';

        if (CTL.cam !== null) {

            CTL.cam.camera.aspect = view.width / view.height;
            CTL.cam.camera.updateProjectionMatrix();
            RUN.resize(view.width, view.height);

            const default_view_z = init_vars.view.features.default_view_z;
            view.visible_dimensions = RUN.visibleAtZDepth(-default_view_z, CTL.cam.camera);
            view.max_allowable_zoom = ((default_view_z / view.visible_dimensions.w) * MDL.width) + 2.0;
            CTL.cam.base_pos.z = view.max_allowable_zoom;

            CTL.cam.run();
            view.run_optics();
            view.run_ticks();
            view.set_position_mark();
        }


    },
    set_position_mark(){
        ['x','z','y'].map(a =>{
            const mark = view.position_marks[a];
            const mark_dom = mark.mark;
            //console.log(mark);

            view.vc.a.fromArray(mark.pos);//copy(CTL.v.user.mouse.actual).multiplyScalar(-1.0);//negate();
            util.projected(view.vc.a, CTL.cam.camera, view.width, view.height);

            if(a === 'y'){
                mark_dom.textContent = `ELEV ${(135.0-util.rad_to_deg(CTL.cam.constrain_angle)).toFixed(2)}${mark.card}`;//"hello";
                mark_dom.textContent += ` Z ${CTL.cam.camera_scale.toFixed(2)}`;//"hello";
                mark_dom.textContent += ` D ${CTL.cam.distance.toFixed(2)}`;//"hello";
                mark_dom.rect = mark_dom.getBoundingClientRect();
                mark_dom.style.left = (view.vc.a.x - (mark_dom.rect.width / 2)) +'px';
                mark_dom.style.top = (20 - (mark_dom.rect.height / 2)) +'px';
            }else{
                mark_dom.textContent = `${view.user_map_position[a].toFixed(2)}º${mark.card}`;//"hello";
                mark_dom.rect = mark_dom.getBoundingClientRect();
                mark_dom.style.left = (view.vc.a.x - (mark_dom.rect.width / 2)) +'px';
                mark_dom.style.top = (view.vc.a.y - (mark_dom.rect.height / 2)) +'px';
            }


            mark_dom.style.display = 'block';
        });

        RUN.objects.beautiful_position_lines.position.copy(init_vars.model.position).negate();//CTL.v.user.mouse.actual).negate();



    }
}




//universal event callback:
function get_evt_data(source){

    // console.log(source, EVT.vars.callback[source]);
    if(source === 'screen') {
        const m_evt = EVT.vars.callback[source].meta;
        init_vars.trace.watched['screen_meta_action'] = m_evt.action;
        init_vars.trace.watched['user_mouse_actual'] = CTL.v.user.mouse.actual;
        init_vars.trace.watched['cam_project'] = CTL.cam.projected;

        if(m_evt.action === 'click') init_vars.trace.log('click');


        CTL.update(EVT.vars.callback[source].meta, init_vars.model);


        if(init_vars.view.features.grid_marks.on && RUN.objects.hasOwnProperty('grid_marks')){
            const pc = CTL.v.user.mouse.actual;
            const p = init_vars.view.features.grid_marks.pitch;
            const x = Math.round(pc.x/p)*p;
            const y = Math.round(pc.z/p)*p;
            RUN.objects.grid_marks.position.set(-x, 0.0, -y);
        }



        view.run_optics();
        view.run_ticks();
    }
    if(source === 'keys') {
        if(EVT.vars.callback[source].active.includes('KeyQ')){
            init_vars.trace.watched['fps'] = RUN.fps;
            log_state();
        }
        obs.style.display = obs_css[+EVT.vars.callback.toggle];
    }
}

function log_state(){
    if(EVT.vars.callback.toggle){
        init_vars.trace.update();
        obs.textContent = '';
        init_vars.trace.log_full.map(L => {
            obs.textContent += L.join(' ')+'\n';
        });
    }
}

init_vars.trace.callback = log_state;

CTL.init(init_vars); //init scene controls
RUN.init(document.getElementById('model'), CTL, init_vars); //init three js environment (sets init_vars.dom);
EVT.init(init_vars.dom); //init events handler
EVT.vars.callback.update_function = get_evt_data;

init_vars.trace.log('components loaded', 'ok');

/*
load the model scaffolding
load the data
prepare dom from data
user interact (run)
 */


window.addEventListener('DOMContentLoaded', (event) => {
    console.log('model-base loaded. continuing');
    init_vars.trace.log(runtime_timer.var_name, util.formatMs(runtime_timer.stop()));
    MDL.init();
    view.init();
});



///model_init_dom_elements();

