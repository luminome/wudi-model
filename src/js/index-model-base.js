import * as THREE from "three";
import {events as EVT} from "./machine/ui-events.js";
import {controls as CTL} from "./machine/ui-controls.js";
import {environment as RUN} from "./machine/three-env.js";
import {model as MDL} from "./model.js";

import {logger as LOG} from "./machine/logger.js";
import {loader} from './machine/loader.js';
import timer from './machine/timer.js';
import * as util from './machine/util.js';

const runtime_timer = timer('main-initialization-loop').start();
const obs = document.getElementById('obs');
const obs_css = ['none', 'block'];

const up = new THREE.Vector3(0,1,0);

const init_vars = {
    trace: LOG(obs),
    view:{
        width: window.innerWidth,
        height: window.innerHeight,
        scene_width: 20,
        colors:{
            window_background: 0x333333,
            helpers: 0x999999,
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
                distance: 100.0,
                width: 20,
                pitch: 10.0,
                shape_length: 10.0,
                shape_scale: 0.02,
            },
            center_line:{
                on: true,
            }
        }
    },
    action: 'none',
    model: new THREE.Group()
}

function get_evt_data(source){

    // console.log(source, EVT.vars.callback[source]);
    if(source === 'screen') {
        const m_evt = EVT.vars.callback[source].meta;
        init_vars.trace.watched['screen_meta_action'] = m_evt.action;
        init_vars.trace.watched['user_mouse_actual'] = CTL.v.user.mouse.actual;

        if(m_evt.action === 'click') init_vars.trace.log('click');
        CTL.update(EVT.vars.callback[source].meta, init_vars.model);
        if(init_vars.view.features.grid_marks.on && RUN.objects.hasOwnProperty('grid_marks')){
            const pc = CTL.v.user.mouse.actual;
            const p = init_vars.view.features.grid_marks.pitch;
            const x = Math.round(pc.x/p)*p;
            const y = Math.round(pc.z/p)*p;
            RUN.objects.grid_marks.position.set(-x, 0.0, -y);
        }

        MDL.run_optics(CTL.cam);
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


function model_init_dom_elements(){

    // document.getElementById('recenter').addEventListener('mouseup', control_recenter_map);
    // document.getElementById('camera-motion').addEventListener('mouseup', control_camera_behavior);
    // document.getElementById('navigation').addEventListener('mouseup', control_navigation_state);
    // document.getElementById('instructions').addEventListener('mouseup', control_instructions_state);
    // document.getElementById('mpa_s').addEventListener('mouseup', control_mpa_s_state);

    MDL.axis_planes.push({
        name: 'x',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(0, -1, 0),
        up: new THREE.Vector3(),
        mark: MDL.make_position_mark(1.0),
        markers_divs: MDL.make_ticks_divs()
    });

    MDL.axis_planes.push({
        name: 'z',
        plane: new THREE.Plane(),
        position: new THREE.Vector3(-1, 0, 0),
        up: new THREE.Vector3(),
        mark: MDL.make_position_mark(1.0),
        markers_divs: MDL.make_ticks_divs()
    });

}


model_init_dom_elements();

init_vars.trace.log(runtime_timer.var_name, util.formatMs(runtime_timer.stop()));