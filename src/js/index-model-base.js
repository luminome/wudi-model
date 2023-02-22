import * as THREE from "three";
import {events as EVT} from "./machine/ui-events";
import {controls as CTL} from "./machine/ui-controls";
import {environment as RUN} from "./machine/three-env";
import {uiCameraDolly as CAM} from "./machine/ui-camera-dolly";
import {modelDataIo as DAT} from "./machine/model-data-io";
import model, {default as MDL} from "./model.js";
import {default as MAP} from "./map.js";
import jsConfig from './config';

import graph from "./graph.js";

import {logger as LOG} from "./machine/logger.js";
import timer from './machine/timer.js';
import * as util from './machine/util.js';
import jsConfig from "./config";

const runtime_timer = timer('main-initialization-loop').start();
const obs = document.getElementById('obs');
const obs_css = ['none', 'block'];
const display_inline_array = ['none', 'inline-block'];
const display_array = ['none', 'block'];


// {
//   const error = console.error.bind(console)
//   console.error = (...args) => {
//     error('My Console!!!')
//     error(...args)
//   }
// }
//
// window.addEventListener('unhandledrejection', function (e) {
//     const message = `(${e.reason.message}) ${e.reason.stack}`;
//     console.warn('ERROR', e);
//     alert("Error occurred: " + message);
// })
//
// window.addEventListener('error', function (e) {
//   //It Will handle JS errors
//     const message = `(${e.lineno}) ${e.error.stack}`;
//     console.warn('ERROR', e);
//     alert("Error occurred: " + message);
// })

const init_vars = {
    READY: false,
    trace: LOG(obs),
    view:{
        width: window.innerWidth,
        height: window.innerHeight,
        scene_width: 20,
        colors:{
            window_background: jsConfig.colors.window,
            view_elements: jsConfig.colors.view_elements,
        },
        features:{
            default_view_z: 30.0,
            axes_helper: false,
            helper_grid:{
                on: false,
                width:20,
            },
            grid_marks:{
                on: false,
                distance: 25.0,
                width: 25,
                pitch: 2.0,
                shape_length: 10.0,
                shape_scale: 0.005,
                color: jsConfig.colors.view_elements,
            },
            center_line:{
                on: false,
            },
            tools:{
                on: false,
            },
            position_lines:{
                on: false,
            },
            beautiful_position_lines:{
                on: true,
                size: 40.0,
                weight: 1,
                color: jsConfig.colors.view_elements,
                opacity: 0.5,
                limit: 30.0
            }
        }
    },
    action: 'none',
    model: new THREE.Group(),
    map_model: new THREE.Group(),
    wudi_model: new THREE.Group(),
    frame: null,
    animation(a){
        init_vars.frame = a;
        CAM.animate(a);
    }
}

const download_component = {
    download_link(content, mimeType, filename){
        const a = document.createElement('a') // Create "a" element
        const blob = new Blob([content], {type: mimeType}) // Create a blob (file-like object)
        const url = URL.createObjectURL(blob) // Create an object URL from blob
        a.setAttribute('href', url) // Set "a" element link
        a.setAttribute('download', filename) // Set download filename
        a.setAttribute('size', blob.size.toString()) // Set download filename
        a.classList.add('download-link');
        //a.click() // Start downloading
        a.innerHTML = `download ${filename}`;
        return a;
    },
    output(block){
        console.log(block);

        //fail;

        const wudi_textual_output = [];
        const wudi_geodata_output = [];
        const wudi_temporal_output = [];
        const point_data = DAT.DATA.SD.wudi_points;//.raw;

        const re_mapped_points = DAT.SELECTOR.point.data.selected.map(s =>{
            return DAT.DATA.SD.wudi_points[s].pid;
        })

        // const point_ids_selected =
        const point_selection = jsConfig.data_source_masked_indices ? re_mapped_points : DAT.SELECTOR.point.data.selected;
        const time_selection = DAT.SELECTOR.time.data.selected;

        const output_text = view.download_output_dom;

        output_text.innerHTML = '';

        const geodata_header = ['point_id','A_lat','A_lon','B_lat','B_lon','M_lat','M_lon'];//Object.keys(point_data[0]).slice(0,6);

        wudi_geodata_output.push(geodata_header);

        //console.log(block, point_data[0], geodata_header);



        const temporal_header_equiv = {
            all: ['time', 'point_id', 'up_days', 'down_days'],
            year: ['time', 'point_id', 'up_days', 'down_days'],
            month: ['time', 'point_id', 'wudi_value', 'qualifies']
        }

        let wudi_data_header = null;
        let point_traces = [];

        for (let point of block) {

            if(!point_traces.includes(point.id) && point.id !== 'AVG'){
                //const values = point_data.data[point.id].slice(0,6);
                const values = ['A_lat','A_lon','B_lat','B_lon','M_lat','M_lon'].map(v => point_data[point.id][v]);
                values.unshift(point.id);
                point_traces.push(point.id);
                wudi_geodata_output.push(values);
            }

            if(!wudi_data_header){
                wudi_data_header = temporal_header_equiv[point.style];
                wudi_temporal_output.push(wudi_data_header);
            }

            if(time_selection.length <= 1 && point_selection.length === 1 && point.id === 'AVG') continue;

            for(let pt of point.ref_data.data){
                let pt_lex = null;
                let qual = null;

                if(point.style === 'month'){
                    if(pt[1] > jsConfig.wudi_UPWthr) qual = 'up';
                    if(pt[1] < jsConfig.wudi_DNWthr) qual = 'down';
                    pt_lex = [pt[0], point.id, pt[1], qual];
                }else{
                    pt_lex = [pt[0], point.id, pt[1], Math.abs(pt[2])];
                }
                wudi_temporal_output.push(pt_lex);
            }
        }

        const date = new Date(Date.now()).toISOString().slice(0, 19).replace('T', ' ');

        wudi_textual_output.push('Wind-based Upwelling & Downwelling Index (WUDI) data base for Mediterranean shorelines (Bensoussan N., Pinazo C., Rossi V. (2022)).');
        wudi_textual_output.push(`Accessed on ${date}`);
        wudi_textual_output.push(`Data points selected: ${point_traces.map(p =>'Nº'+p)}`);
        wudi_textual_output.push(`Temporal series selected: ${view.title_dom.innerHTML}`);

        function make_html_table(table_data){
            const shlex = [];
            for(let row of table_data){
                const parts = row.map(r => `<div class="output-cell">${r}</div>`);
                shlex.push(`<div class="output-row">${parts.join('')}</div>`);
            }
            return `<div class="output-table">${shlex.join('\n')}</div>`
        }

        const wudi_textual = wudi_textual_output.join('\n');
        const wudi_geodata = wudi_geodata_output.join('\n');
        const wudi_timeseries = wudi_temporal_output.join('\n');

        const download_textual_button = download_component.download_link(wudi_textual, 'data:text/plain;charset=utf-8', 'wudi-points-readme.txt');
        const download_geodata_button = download_component.download_link(wudi_geodata, 'data:text/plain;charset=utf-8', 'wudi-points-geodata.csv');
        const download_temporal_button = download_component.download_link(wudi_timeseries, 'data:text/plain;charset=utf-8', 'wudi-points-timeseries.csv');

        const dl_buttons = [
            download_textual_button,
            download_geodata_button,
            download_temporal_button
        ];

        const output_sections = [
            ['selected wudi points information', wudi_textual, 'raw-text', download_textual_button],
            ['selected wudi points geodata', make_html_table(wudi_geodata_output), '', download_geodata_button],
            ['selected wudi points information', make_html_table(wudi_temporal_output), '', download_temporal_button],
        ];



        function get_download(){
            [...document.querySelectorAll('.download-link')].map(a =>{
                a.click();
            });
        }

        function get_download_button(){
            const dl = document.createElement('div');
            dl.classList.add('output-section');
            dl.classList.add('output-download-link');

            let bytes = 0;
            dl_buttons.map(a =>{
                bytes += parseInt(a.getAttribute('size'));
            })

            const al = document.createElement('a');
            al.setAttribute('href','#');
            al.innerHTML = 'download selected point data ('+(bytes/1000).toFixed(2)+'k)';
            al.addEventListener('mouseup', get_download);

            dl.appendChild(al);
            return dl
        }

        output_text.appendChild(get_download_button());

        output_sections.map(outs =>{
            const section = document.createElement('div');
            section.classList.add('output-section');
            section.appendChild(outs[3]);
            section.innerHTML += `<div class="output-section-title">${outs[0]}</div>`;
            section.innerHTML += `<div class="output-section-content ${outs[2]}">${outs[1]}</div>`;
            output_text.appendChild(section);
        })


    },
}

const graph_component = {
    active: false,
    dom: document.getElementById("graph-obj-bar"),
    run() {
        const style_current = graph_component.dom.style.display;
        // test
        // console.log('DAT.SELECTOR.time.data.selected', DAT.SELECTOR.time.data.selected);
        // console.log('DAT.SELECTOR.point.data.selected', DAT.SELECTOR.point.data.selected);
        // Object.keys(DAT.DATA.TD.point_cache).map(k => {
        //     console.log(k, DAT.DATA.TD.point_cache[k]);
        // });

        if(DAT.SELECTOR.point.data.selected.length) {
            const times_list = DAT.SELECTOR.time.data.selected.length === 0 ? ['all'] : DAT.SELECTOR.time.data.selected;
            console.warn(DAT.SELECTOR.time.data);


            const diagonal = times_list.map(t => {
                return Math.max(...DAT.SELECTOR.point.data.selected.map(p => DAT.DATA.TD.point_cache[`${p}-${t}`].meta));
            });

            //console.log('selected points', DAT.SELECTOR.point.data.selected);

            const cache_for_output = [];
            const max_len = Math.max(...diagonal);
            const aggregate = [];
            let mean = [0, 0];
            for(let g=0; g<max_len; g++) aggregate.push([0,0]);
            let res_count = 0;
            let ref_style = null;

            const time_keys = [];

            for (let t of times_list) {
                for (let p of DAT.SELECTOR.point.data.selected) {
                    const time_slot = `${p}-${t}`;
                    const reference = DAT.DATA.TD.point_cache[time_slot];
                    // console.log(time_slot, DAT.DATA.TD.point_cache);

                    //const point_pid = DAT.DATA.SD.wudi_points[p].pid;

                    ref_style = reference.style;

                    reference.data.map((d, i) => {
                        if(reference.style === 'month'){
                            aggregate[i][0] += d[1];
                            mean[0] += d[1];
                        }else{
                            aggregate[i][0] += d[1];
                            mean[0] += d[1];
                            aggregate[i][1] += d[2];
                            mean[1] += d[2];
                        }

                        time_keys.push(d[0]);
                    });
                    res_count++;
                    cache_for_output.push({id:p, tid:time_slot, ref_data:reference, style:ref_style});
                }
            }



            mean[0] /= res_count;
            mean[1] /= res_count;

            const aggregate_avg = [0,0];
            aggregate_avg[0] = aggregate.map(a => Math.round((a[0] / res_count) * 10000) / 10000);
            aggregate_avg[1] = aggregate.map(a => Math.round((a[1] / res_count) * 10000) / 10000);

            const style_offsets = {'year':0,'month':1,'day':0};

            if(DAT.SELECTOR.point.data.selected.length > 0){
                const r_dat = [];
                for(let ac = 0; ac < aggregate.length; ac++){
                    const t_avg = (ac+style_offsets[ref_style]).toString().padStart(time_keys[ac].toString().length,'0');
                    r_dat.push([t_avg, aggregate_avg[0][ac], aggregate_avg[1][ac]]);
                    //r_dat.push([time_keys[ac], aggregate_avg[0][ac], aggregate_avg[1][ac]]);
                }
                cache_for_output.push({id:'AVG', tid:0, ref_data:{data:r_dat, id:'all'}, style:ref_style});
            }

            download_component.output(cache_for_output);

            const up_col = jsConfig.colors.up_welling;//utility_color.fromArray(vars.colors.upwelling).getHex();
            const dn_col = jsConfig.colors.down_welling;//utility_color.fromArray(vars.colors.downwelling).getHex();

            let y_limits = [];
            if(mean[1] === 0){
                y_limits = [Math.min(...aggregate_avg[0]), Math.max(...aggregate_avg[0])];
            }else{
                y_limits = [Math.min(...aggregate_avg[1]), Math.max(...aggregate_avg[0])];
            }

            const graph_obj = {
                xlim: [0, max_len],
                ylim: y_limits,
                mean: [[mean[0] / max_len], [mean[1] / max_len]],
                data: aggregate_avg,
                up_color: up_col+'CC', //vars.colors.hex_css(up_col,0.5),
                up_color_text: jsConfig.colors.up_welling_text, //vars.colors.hex_css(up_col,0.5),
                up_color_select: up_col,
                down_color: dn_col+'CC',
                down_color_text: jsConfig.colors.down_welling_text,
                down_color_select: dn_col,
                x_range_start: ref_style === 'all' ? 1978 : 1,
                graph_style: ref_style,
                wudi_th_up: jsConfig.wudi_UPWthr,
                wudi_th_down: jsConfig.wudi_DNWthr,
                main_title: view.title_dom.innerHTML
            }

            //console.log(graph_obj, vars.selecta.wudi);

            // const re_mapped_points = DAT.SELECTOR.point.data.selected.map(s =>{
            //     return DAT.DATA.SD.wudi_points[s].pid;
            // })
            //
            // const point_ids_selected = jsConfig.data_source_masked_indices ? re_mapped_points : DAT.SELECTOR.point.data.selected;


            graph(graph_obj, view.bounds_width, jsConfig.graph_obj_height, DAT.SELECTOR.point.data.selected);

            graph_component.dom.classList.remove('hidden');
            graph_component.dom.style.display = 'block';
            graph_component.dom.style.height = jsConfig.graph_obj_height+'px';
            graph_component.active = true;

        }else{
            graph_component.dom.style.display = 'none';
            graph_component.active = false;
        }

        if(style_current !== graph_component.dom.style.display) view.redraw();

    }
}

const view = {
    READY: false,
    title_dom: document.getElementById('title'),
    download_output_dom: document.getElementById('output-text'),
    vc: {
        a: new THREE.Vector3(0, 0, 0),
        b: new THREE.Vector3(0, 0, 0),
        c: new THREE.Vector3(0, 0, 0),
        d: new THREE.Vector3(0, 0, 0),
        e: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(0x000000),
    },
    plane: null,
    user_position: new THREE.Vector3(0, 0, 0),
    user_map_position: new THREE.Vector3(0, 0, 0),
    user_map_interact_position: new THREE.Vector3(0, 0, 0),
    user_position_round: new THREE.Vector3(0, 0, 0),
    position_marks: {
        x: {
            pos: [0,0,4],
            card:'E',
            mark:null
        },
        z: {
            pos: [4,0,0],
            card:'N',
            mark:null
        },
        y: {
            pos: [0,10,0],
            card:'º',
            mark:null
        },
        d: {
            pos: [0,0,0],
            card:'m',
            mark:null
        }
    },
    UP: new THREE.Vector3(0, 1, 0),
    model_width: null,
    model_height: null,
    bounds_width: null,
    bounds_height: null,
    bounds_bottom_offset: jsConfig.bounds_bottom_offset,
    camera_auto_affine: false,
    max_allowable_zoom: 20.0,
    model_visible_dimensions: null,
    grid_resolution: null,
    axis_planes: [],
    ticks:{
        dom: document.getElementById('model-plot-ticks'),
        color: jsConfig.colors.view_elements_text
    },
    x_major_axis: document.getElementById('x-axis'),
    y_major_axis: document.getElementById('y-axis'),
    x_axis_inset: 10,
    y_axis_inset: 20,
    axis_markers_count: 21,
    axis_dir_x: new THREE.Vector3(0, 0, 1),
    axis_dir_y: new THREE.Vector3(-1, 0, 0),
    mantissas: [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0],
    ui_control:{
        recenter_map(evt=null){
            CTL.cam.base_pos.set(0, 0, view.max_allowable_zoom);
            CTL.cam.pos.set(0, 0, 0);
            CTL.cam.cube.userData.originalMatrix.decompose(CTL.cam.cube.position, CTL.cam.cube.quaternion, CTL.cam.cube.scale);
            CTL.cam.cube.matrix.copy(CTL.cam.cube.userData.originalMatrix);
            CTL.cam.cube.updateMatrix();
            init_vars.model.position.set(0, 0, 0);
            view.redraw();
            view.update();
        },
        camera_auto_rotate(){
            init_vars.model.userData.camera_auto_rotate = !init_vars.model.userData.camera_auto_rotate;
            this.classList.toggle('control-toggle');
        },
        protected_areas_state(){
            init_vars.protected_areas_visible = !init_vars.protected_areas_visible;
            this.classList.toggle('control-toggle');
            if(MAP.object.children.length){
                MAP.object.children.forEach(s => {
                    if(s.sector) s.userData.owner.toggle_attribute('protected_areas', init_vars.protected_areas_visible);
                })
            }
            MDL.layers.protected_areas.visible = init_vars.protected_areas_visible;
        },
        scroll_to_downloads(){
            const box = document.getElementById('output').getBoundingClientRect();
            window.scrollTo({ top: box.top, behavior: 'smooth' });
        },
        graph_close(){
            interactive.selection = null;
            interactive.selection_category = null;

            const pre_delete_chain = [...DAT.SELECTOR.point.data.selected];
            DAT.SELECTOR.point.deselect_all();

            for(let pid of pre_delete_chain){
                const data_index = DAT.DATA.CONF.wudi_index_reverse[pid];
                const element = interactive.hash_info_store['wudi_points-'+data_index];
                interactive.element_update.set_state(element.name, false, true);
            }

            view.ui_control.wudi_point_select.update_selection();
            graph_component.dom.style.display = 'none';
            graph_component.active = false;
            view.redraw();
        },
        wudi_point_select:{
            dom_target: document.getElementById('model'),
            dom_group: {},
            make_element: (pid) => {

                function init(pid){
                    //alert(pid);

                    const ref_point = DAT.DATA.CONF.wudi_index.indexOf(pid);
                    const dt = DAT.DATA.SD.wudi_points[ref_point];
                    el.pid = pid;
                    el.pos = new THREE.Vector3();
                    el.world_pos = new THREE.Vector3();

                    view.vc.a.set(dt.A_lon, dt.A_lat, 0.0);
                    view.vc.b.set(dt.B_lon, dt.B_lat, 0.0);
                    el.world_pos.subVectors(view.vc.b,view.vc.a).multiplyScalar(0.5).add(view.vc.a);

                    // el.world_pos.x += -MDL.center.x;
                    // el.world_pos.y += -MDL.center.y;
                    // MDL.layers.wudi_points.localToWorld(el.world_pos);

                    el.dom_element = document.getElementById('wudi-selection-temp').cloneNode(true);
                    el.dom_element.classList.remove('hidden');
                    el.dom_element.setAttribute('id', 'wudi-selection-'+pid);
                    el.dom_element.setAttribute('data-pid', pid);

                    const el_label = el.dom_element.getElementsByClassName('label')[0];
                    const el_marker = el.dom_element.getElementsByClassName('marker')[0];

                    const point_id = jsConfig.data_source_masked_indices ? dt.pid : el.pid;

                    el_label.style.whiteSpace = 'nowrap';
                    el_label.innerHTML = "Nº"+point_id;

                    const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
                    svg_check_one.setAttribute('id',`check-box-1-${pid}`);
                    svg_check_one.style.verticalAlign = 'text-top';
                    svg_check_one.style.width = '12px';
                    svg_check_one.style.height = '12px';
                    svg_check_one.style.paddingLeft = '2px';
                    svg_check_one.style.display = 'inline-block';
                    svg_check_one.style.fill = 'white';

                    el_label.appendChild(svg_check_one);

                    el.dom_element.addEventListener('mouseup', view.ui_control.wudi_point_select.label_event);
                    el.dom_element.addEventListener('mouseenter', view.ui_control.wudi_point_select.label_event);
                    el.dom_element.style.pointerEvents = 'all';

                    view.ui_control.wudi_point_select.dom_target.appendChild(el.dom_element);
                    view.ui_control.wudi_point_select.dom_group[pid] = el;

                    const dk = el_label.getBoundingClientRect();
                    el_label.style.left = (dk.width/-2)+'px';
                    el_marker.style.height = jsConfig.wudi_selecta_stem_pixels+'px';



                    return el;
                }

                function dom_delete(){
                    view.ui_control.wudi_point_select.dom_target.removeChild(el.dom_element);
                    delete(view.ui_control.wudi_point_select.dom_group[el.pid]);
                }

                function draw(){
                    el.pos.copy(el.world_pos);
                    MDL.layers.wudi_points.localToWorld(el.pos);
                    //el.pos.add(init_vars.model.position);//.negate();
                    util.projected(el.pos, CTL.cam.camera, view.model_width, view.model_height);
                    el.dom_element.style.left = (el.pos.x)+'px';
                    el.dom_element.style.top = (el.pos.y-jsConfig.wudi_selecta_stem_pixels)+'px';
                }

                const el = {
                    pid: null,
                    pos: null,
                    world_pos: null,
                    dom_element: null,
                    dom_delete,
                    draw
                }

                return init(pid);
            },
            update_selection(){
                const k_active = Object.keys(view.ui_control.wudi_point_select.dom_group).map(s => parseInt(s));
                const k_select = DAT.SELECTOR.point.data.selected;
                k_select.map(s=>{
                    if(!k_active.includes(s)) view.ui_control.wudi_point_select.dom_group[s] = view.ui_control.wudi_point_select.make_element(s);
                })
                k_active.map(s=>{
                    if(!k_select.includes(s)) view.ui_control.wudi_point_select.dom_group[s].dom_delete();
                })
            },
            update(){
                for(let el of Object.keys(view.ui_control.wudi_point_select.dom_group)){
                    view.ui_control.wudi_point_select.dom_group[el].draw();
                }
            },
            make(pid){

                const data_index = DAT.DATA.CONF.wudi_index[parseInt(pid)];
                //test
                console.log('ui_control.wudi_point_select.make args:', pid, data_index, interactive.selection);

                DAT.SELECTOR.point.select(data_index);
                view.ui_control.wudi_point_select.update_selection();
                const sta = DAT.SELECTOR.point.data.selected.includes(data_index);

                if(interactive.selection !== null) interactive.element_update.set_state(interactive.selection, sta, true);
                if(!sta) interactive.selection = null;

                MDL.point_selector.top_arr.object.visible = sta;



            },
            label_event(evt_object){
                let index, state, type;
                const label = evt_object.target.closest('.wudi-selection');
                ///console.log();

                type = evt_object.type === 'mouseenter' ? 'hover' : 'click';
                index = label.dataset['pid'];
                state = false;


                const data_index = DAT.DATA.CONF.wudi_index_reverse[index];
                console.warn('label_event', data_index, index, type);


                if(data_index !== undefined){
                    if (type === 'hover') {
                        interactive.check(MDL.point_selector.select('wudi_points', {'index': data_index}, DAT, CTL.cam));
                    }
                    if (type === 'click') {
                        view.ui_control.wudi_point_select.make(data_index);
                    }
                }

                // const element = Object.keys(interactive.hash_info_store).filter(h => interactive.hash_info_store[h].index === data_index);
                // element.definitively_selected = state;

            }
        },
        button_check_box: {
            set_state(id, state){
                const button = document.getElementById(id);
                button.querySelector('#check-box-0').style.display = display_inline_array[+!state];
                button.querySelector('#check-box-1').style.display = display_inline_array[+state];
                button.setAttribute('data-state', state);
            },
            click(e){
                const parent = e.target.closest('.button-check-box');
                const b_state = parent.dataset.state === 'true';
                view.ui_control.button_check_box.set_state(parent.id, !b_state);
                if(parent.dataset.layer){
                    const wudi_layer = init_vars.wudi_model.getObjectByName('wudi_'+parent.dataset.layer);
                    wudi_layer.visible = !b_state;

                    const layers = init_vars.wudi_model.children[0];

                    const sta = (layers.children[0].visible === true && layers.children[1].visible === true);

                    layers.children[2].visible = sta;
                    //init_vars.wudi_model.updateMatrix();
                }
            }
        }
    },
    ui_info:{
        lock_position: new THREE.Vector2(),
        target_lock:false,
        world_position: new THREE.Vector3(),
        screen_position: {
            a: new THREE.Vector2(),
            b: new THREE.Vector2(),
            saved: new THREE.Vector2(),
        },
        dom_element: null,
        dom_selection_element: null,
        text: 'null',
        elements:{
            basic:{
                rect: null,
                stem: null,
                screen_position: {
                    a: new THREE.Vector2(),
                }
            },
            selection:{
                rect: null,
                stem: null,
                screen_position: {
                    a: new THREE.Vector2(),
                }
            }
        },

        init() {
            this.dom_element = document.getElementById('info-field');

            //#TODO: working here
            this.dom_selection_element = this.dom_element.cloneNode(true);
            this.dom_selection_element.setAttribute('id','info-field-super');
            this.dom_element.parentNode.appendChild(this.dom_selection_element);
            this.dom_selection_element.style.backgroundColor = jsConfig.colors.window_overlay;
            this.elements.selection.stem = this.dom_selection_element.querySelector('.info-stem');

            this.display_element_super = this.dom_selection_element.querySelector('.info-body');

            this.display_element = this.dom_element.querySelector('.info-body');
            //this.display_element.style.whiteSpace = 'nowrap';

            this.temp_element = this.dom_element.querySelector('.info-temp');
            this.elements.basic.stem = this.dom_element.querySelector('.info-stem');

            this.dom_element.querySelector('.info-head').innerHTML = this.text.toString();
            this.dom_element.style.backgroundColor = jsConfig.colors.window_overlay;
            this.dom_element.classList.remove('hidden');
            this.elements.basic.rect = this.dom_element.getBoundingClientRect();
        },
        hover(e) {
            this.style.color = '#FFFFFF';
        },
        set_label_color(c) {
            this.dom_element.style.color = c;
        },
        // set_position_lock(){
        //     this.target_lock = true;
        //     this.lock_position.x = this.delegate_position
        // },
        set_position(x, y, element='basic', style = 'default') {

            const in_bounds = (x > view.model_width/-2 && x < view.model_width + view.model_width/2 && y > view.model_height/-2 && y < view.model_height + view.model_height/2);

            const dom_which = element === 'basic' ? this.dom_element : this.dom_selection_element;
            if(this.elements[element].state) dom_which.style.display = in_bounds ? 'block' : 'none';

            if (style === 'default') {
                let px, py, sth, sty, stx;
                const offset = 80;
                const pad = 16;
                const rw = this.elements[element].rect.width;
                const rh = this.elements[element].rect.height;
                px = x - (rw / 2);
                py = y + (offset);
                sty = (y-py);
                sth = (py-y);
                stx = (rw / 2);

                //up/down
                if(py + rh > view.model_height){
                    py = (y - (offset)) - rh;
                    sty = rh;
                    if( py + rh > view.model_height) py = (view.model_height - pad) - rh;
                    if( py + rh + sth > view.model_height) sth = view.model_height - (py + rh);
                }
                //left
                if(px < pad) px = pad;
                if(x < pad + (rw / 2)) stx = x - pad;
                //right
                if(px + rw > view.model_width - pad) px = view.model_width - pad - rw;
                if(x < view.model_width - pad && x > px + stx) stx = rw - (view.model_width - pad - x);

                const bounds_x = ((x > pad) && (x < (view.model_width - pad)));
                this.elements[element].stem.style.display = ['none','block'][+bounds_x];
                this.elements[element].stem.style.left = (stx)+'px';
                this.elements[element].stem.style.top = Math.round(sty)+'px';
                this.elements[element].stem.style.height = Math.round(sth)+'px';

                // if(y - (this.rect.height / 2) < 0){
                //     //too far up
                //     px = x;
                //     py =  y + (this.rect.height / 2) + offset;
                // }else if (y + (this.rect.height / 2) > view.model_height) {
                //     //too far down
                //     px = x;
                //     py = y - (this.rect.height / 2) - offset;
                // }else if (x + this.rect.width + offset > view.model_width) {
                //     //too far right
                //     px = x - (this.rect.width / 2) - offset;
                //     py = y;
                // }else{
                //     px = x + (this.rect.width / 2) + offset;
                //     py = y;
                // }

                this.elements[element].screen_position.a.set(px, py);
                //this.screen_position.b.set(px, py);
            }

            //console.log(style);
            //
            // if (style === 'area') {
            //     const nx = (view.model_width / 2) - x;
            //     const ny = (view.model_height / 2) - y;
            //     const mod = 0.8;
            //     const x_offset = (Math.abs(nx) > (view.model_width / 2) * mod) ? ((view.model_width / 2) / Math.abs(nx)) * mod : 1;
            //     const y_offset = (Math.abs(ny) > (view.model_height / 2) * mod) ? ((view.model_height / 2) / Math.abs(ny)) * mod : 1;
            //
            //     if (x_offset !== 1 || y_offset !== 1) {
            //         this.screen_position.a.set((view.model_width / 2) - (nx * x_offset), (view.model_height / 2) - (ny * y_offset));
            //     } else {
            //         this.screen_position.a.set(x, y);
            //     }
            // } else if (style === 'mouse'){
            //     //default to right center of mouse
            //     //const pos_x = this.rect.width
            //     if(this.target_lock){
            //         this.dom_element.style['pointer-events'] = 'all';
            //         this.dom_element.classList.add('select');
            //         x = this.lock_position.x;
            //         y = this.lock_position.y;
            //     }else{
            //         this.dom_element.classList.remove('select');
            //         this.dom_element.style['pointer-events'] = 'none';
            //     }
            //     let px, py;
            //     const offset = 10;
            //     if(y - (this.rect.height / 2) < 0){
            //         //too far up
            //         px = x;
            //         py =  y + (this.rect.height / 2) + offset;
            //     }else if (y + (this.rect.height / 2) > view.model_height) {
            //         //too far down
            //         px = x;
            //         py = y - (this.rect.height / 2) - offset;
            //     }else if (x + this.rect.width + offset > view.model_width) {
            //         //too far right
            //         px = x - (this.rect.width / 2) - offset;
            //         py = y;
            //     }else{
            //         px = x + (this.rect.width / 2) + offset;
            //         py = y;
            //     }
            //
            //     this.screen_position.a.set(px, py);
            //     this.screen_position.b.set(px, py);
            //
            // } else if (style === 'off-axis'){
            //     //this.rect = this.dom_element.getBoundingClientRect();
            //
            //     if(this.target_lock){
            //         this.dom_element.style['pointer-events'] = 'all';
            //         this.dom_element.classList.add('select');
            //         x = this.lock_position.x;
            //         y = this.lock_position.y;
            //     }else{
            //         this.dom_element.classList.remove('select');
            //         this.dom_element.style['pointer-events'] = 'none';
            //     }
            //
            //     let px, py;
            //     const offset = 10;
            //     px = x - (this.rect.width / 2);
            //     py = (view.model_height - offset) - (this.rect.height);
            //     this.stem.style.left = ((this.rect.width / 2)-0.5).toFixed(1)+'px';
            //     this.stem.style.top = (y-py)+'px';
            //     this.stem.style.height = (py-(y))+'px';
            //     // if(y - (this.rect.height / 2) < 0){
            //     //     //too far up
            //     //     px = x;
            //     //     py =  y + (this.rect.height / 2) + offset;
            //     // }else if (y + (this.rect.height / 2) > view.model_height) {
            //     //     //too far down
            //     //     px = x;
            //     //     py = y - (this.rect.height / 2) - offset;
            //     // }else if (x + this.rect.width + offset > view.model_width) {
            //     //     //too far right
            //     //     px = x - (this.rect.width / 2) - offset;
            //     //     py = y;
            //     // }else{
            //     //     px = x + (this.rect.width / 2) + offset;
            //     //     py = y;
            //     // }
            //
            //     this.screen_position.a.set(px, py);
            //     this.screen_position.b.set(px, py);
            //
            // }
            // // this.dom_element.style.left = (this.screen_position.a.x - (this.rect.width / 2)).toFixed(2) + 'px';
            // // this.dom_element.style.top = (this.screen_position.a.y - (this.rect.height / 2)).toFixed(2) + 'px';


            // this.stem.style.height = (this.rect.width / 2);
            this.update_position(element);
        },
        drag_position(delta_x, delta_y) {
            view.vc.a.set(delta_x, delta_y, 0.0);
            this.screen_position.a.x += view.vc.a.x;
            this.screen_position.a.y += view.vc.a.y;
            // this.dom_element.style.left = (this.screen_position.a.x - (this.rect.width / 2)).toFixed(2) + 'px';
            // this.dom_element.style.top = (this.screen_position.a.y - (this.rect.height / 2)).toFixed(2) + 'px';
            this.screen_position.b.copy(this.screen_position.a);
        },
        set_state(bool, element = 'basic') {
            const dom_which = element === 'basic' ? this.dom_element : this.dom_selection_element;
            dom_which.style.display = bool ? 'block' : 'none';
            this.elements[element].state = bool;
        },
        set_text(text_dict, mode = null) {
            this.display_element.innerHTML = '';
            for (let d of text_dict) {
                const part = this.temp_element.cloneNode(true);
                part.classList.remove('info-temp');
                if(d.hasOwnProperty('table')){
                    part.querySelector('.info-head').innerHTML = d.head;
                    part.querySelector('.info-text').classList.add('info-table');
                    d.table.map(r => {
                        const row = document.createElement('div');
                        r.map(tx => {
                            const txt_div = document.createElement('div');
                            txt_div.className = 'info-cell';
                            txt_div.innerHTML = `<span>${tx}</span>`;
                            row.appendChild(txt_div);
                        });
                        row.className = 'info-row';
                        part.querySelector('.info-text').appendChild(row);
                    })
                }else{
                    [['.info-head', d.head], ['.info-text', d.hasOwnProperty('text') ? d.text : null]].forEach(t => {
                        if (t[1]) part.querySelector(t[0]).innerHTML = Array.isArray(t[1]) ? t[1].map(t_l => {
                            return `<span>${t_l}</span>`
                        }).join(''): t[1].toString();
                        part.querySelector(t[0]).style.display = t[1] ? 'block' : 'none';
                    });
                }
                this.display_element.appendChild(part);
            }
            this.elements.basic.rect = this.dom_element.getBoundingClientRect();
        },
        clone() {
            this.display_element_super.innerHTML = this.display_element.innerHTML;
            this.dom_selection_element.classList.remove('hidden');
            this.dom_selection_element.style.left = (this.elements.selection.screen_position.a.x).toFixed(2) + 'px';
            this.dom_selection_element.style.top = (this.elements.selection.screen_position.a.y).toFixed(2) + 'px';
            this.elements.selection.rect = this.elements.basic.rect;//Object.assign({}, this.elements.basic.rect);
            console.log(this.elements.selection.rect);
            console.log(this.elements.selection.screen_position);
        },
        update_position(element='basic') {
            // if(this.target_lock){
            //     vu.copy(this.lock_position);
            //     projected(vu);
            //     this.screen_position.a.set(vu.x,vu.y);
            // }
            const dom_which = element === 'basic' ? this.dom_element : this.dom_selection_element;
            dom_which.style.left = (this.elements[element].screen_position.a.x).toFixed(2) + 'px';
            dom_which.style.top = (this.elements[element].screen_position.a.y).toFixed(2) + 'px';
            //this.screen_position.b.lerp(this.screen_position.a, 0.3);
            // this.dom_element.style.left = (this.screen_position.b.x - (this.rect.width / 2)).toFixed(2) + 'px';
            // this.dom_element.style.top = (this.screen_position.b.y - (this.rect.height / 2)).toFixed(2) + 'px';
        },
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
        mark.style.color = jsConfig.colors.view_elements_text;//'gray';//vars.colors.hex_css(vars.colors.chart_tick);
        mark.style.backgroundColor = jsConfig.colors.window_overlay;
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
        CTL.cam.max_zoom = view.max_allowable_zoom;
        CTL.cam.camera_scale = 1 - (CTL.cam.distance / view.max_allowable_zoom);
        view.user_map_position.copy(init_vars.model.position).negate();
        MDL.model_position(view.user_map_position);
        view.user_position_round.copy(init_vars.model.position).round().negate();
        view.plane.projectPoint(CTL.cam.pos, view.vc.d);
        CTL.cam.projected.copy(view.vc.d).negate();
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

        // if (axis === 'z') {
        //     if (view.vc.a.dot(CTL.cam.right) < 0) {
        //         view.vc.b.negate();
        //         if (view.vc.b.x !== 0) view.vc.a.x *= -1.0;
        //         if (view.vc.b.z !== 0) view.vc.a.z *= -1.0;
        //     }
        // }
        return tick_n;
    },
    run_ticks() {

        const zg = Math.floor(Math.log(CTL.cam.distance)) + 1;
        view.grid_resolution = view.mantissas[zg];
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

        const ticks = {};

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
                    util.projected(view.vc.c, CTL.cam.camera, view.model_width, view.model_height);

                    if (plane.name === 'x') {
                        ticks.left = (view.vc.c.x - (ticks.rect.width / 2));
                        ticks.top = (view.model_height - view.x_axis_inset) - (ticks.rect.height / 2);
                    } else {
                        ticks.left = (view.y_axis_inset) - (ticks.rect.width / 2);
                        ticks.top = (view.vc.c.y - (ticks.rect.height / 2));
                    }

                    plane.markers_divs[m].style.left = ticks.left + 'px';
                    plane.markers_divs[m].style.top = ticks.top + 'px';

                    // const cas = (ticks.top > view.height || ticks.top < 0 || ticks.left > view.model_width || ticks.left < 0);
                    // plane.markers_divs[m].style.display = cas ? 'none' : 'block';///display_array[+!cas];
                }
            }
        }
        //obs_handler({'F': vars.view.width, 'S': sum});
        //console.log(ticks);
    },
    init(){
        //init the chart style the ticks rendering systems
        document.getElementById('recenter').addEventListener('mouseup', view.ui_control.recenter_map, false);
        document.getElementById('camera_auto_rotate').addEventListener('mouseup', view.ui_control.camera_auto_rotate);
        //document.getElementById('navigation').addEventListener('mouseup', view.ui_control.navigation_state);
        document.getElementById('instructions').addEventListener('mouseup', view.ui_control.instructions_state);
        document.getElementById('protected_areas').addEventListener('mouseup', view.ui_control.protected_areas_state);
        document.getElementById('graph-close').addEventListener('mouseup', view.ui_control.graph_close);
        document.getElementById('graph-download').addEventListener('mouseup', view.ui_control.scroll_to_downloads);

        ['year','month'].map(type => {
            const target = document.getElementById(type + '_container');
            for(let el of target.childNodes){
                el.setAttribute('title',`Select ${el.dataset.type} ${el.dataset.date}`);
                el.addEventListener('mouseup', DAT.SELECTOR.time.select_time);
            }
        });

        const buttons = [...document.querySelectorAll(".button-check-box")];

        buttons.map(b => {
            b.parentNode.addEventListener('mouseup', view.ui_control.button_check_box.click);
            view.ui_control.button_check_box.set_state(b.id, true);
        });

        view.plane = new THREE.Plane(view.UP);

        if(jsConfig.map_axes_active) {
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

        }else{
            view.x_major_axis.style.display = 'none';
            view.y_major_axis.style.display = 'none';
        }

        init_vars.model.add(MDL.container);
        init_vars.model.position.set(0,0,0);
        init_vars.model.updateMatrix();

        init_vars.map_model.matrixAutoUpdate = false;
        init_vars.wudi_model.matrixAutoUpdate = false;
        // init_vars.super_model.rotateX(Math.PI/-2);

        if(init_vars.view.features.beautiful_position_lines.on) {
            ['x','z','y','d'].map(a =>{
                view.position_marks[a].mark = view.make_dom_mark(view.ticks.dom);
            });
        }

        window.addEventListener('resize', view.redraw);

        view.redraw('init');

        init_vars.trace.log('bounds_rect', view.bounds_width, view.bounds_height);

        obs.style.color = jsConfig.colors.view_elements;
        obs.style['background-color'] = jsConfig.colors.window_overlay;
        // obs.onscroll = (event) => {
        //     event.preventDefault();
        // }

        view.ui_info.init();

        CTL.cam.base_pos.z = view.max_allowable_zoom;
    },
    reset_view(){
        if (CTL.cam !== null) {
            CTL.cam.camera.aspect = view.model_width / view.model_height;
            CTL.cam.camera.updateProjectionMatrix();
            RUN.resize(view.model_width, view.model_height);

            const default_view_z = init_vars.view.features.default_view_z;
            view.model_visible_dimensions = RUN.visibleAtZDepth(-default_view_z, CTL.cam.camera);
            view.max_allowable_zoom = ((default_view_z / view.model_visible_dimensions.w) * MDL.width) + 2.0;
            // CTL.cam.base_pos.z = view.max_allowable_zoom;
            CTL.cam.max_zoom = view.max_allowable_zoom;
        }
    },
    redraw(e){


        //

        const bounds = document.getElementById('bounds');
        const model_dom = document.getElementById('model');
        const intro_box_dom = document.getElementById('intro-box');
        const model_controls_dom = document.getElementById('model-controls');

        bounds.style.height = (window.innerHeight-view.bounds_bottom_offset)+'px';

        const bounds_rect = bounds.getBoundingClientRect();

        view.bounds_width = bounds_rect.width;
        view.bounds_height = bounds_rect.height;



        let bars_height = 0;
        const bars = [...document.querySelectorAll('.bar')];

        bars.map(b => {
            if(jsConfig.dom_references.hasOwnProperty(b.id)){
                if(jsConfig.dom_references[b.id].on){
                    const bbox = b.getBoundingClientRect();
                    if(b.style.display !== 'none') {
                        bars_height += bbox.height;
                        b.classList.remove('hidden');
                    }
                }
            }
        });

        const stack_height = view.bounds_height - bars_height;
        view.model_width = view.bounds_width;
        view.model_height = stack_height;


        CTL.cam.model_view_bounds.w = view.model_width;
        CTL.cam.model_view_bounds.h = view.model_height;


        model_dom.style.height = view.model_height + 'px';
        intro_box_dom.style.height = view.model_height + 'px';
        model_controls_dom.style.bottom = (bars_height + view.bounds_bottom_offset) + 'px';
        //h-handle_box.height + 'px';
        //
        // ww = w;
        // wh = ((h - vars.view.bottom_buffer) - bars_height) - handle_box.height;
        //
        // plot.style.width = ww + 'px';
        // plot.style.height = wh + 'px';
        // intro_box_dom.style.height = wh + 'px';


        view.x_major_axis.style.top = (view.model_height-view.x_axis_inset)+'px';
        view.x_major_axis.style.width = view.model_width+'px';

        view.y_major_axis.style.left = (view.y_axis_inset)+'px';
        view.y_major_axis.style.height = view.model_height+'px';

        //console.log(typeof(e));
        //if(e !== null)
        view.reset_view();

        CTL.v.view.width = view.model_width;
        CTL.v.view.height = view.model_height;



        view.update();
    },
    set_position_mark(){
        ['x','z','y','d'].map(a =>{
            const mark = view.position_marks[a];
            const mark_dom = mark.mark;
            //console.log(mark);

            view.vc.a.fromArray(mark.pos).multiplyScalar(1-CTL.cam.camera_scale);//negate();
            util.projected(view.vc.a, CTL.cam.camera, view.model_width, view.model_height);

            if(a === 'y'){
                mark_dom.textContent = `ELEV ${(135.0-util.rad_to_deg(CTL.cam.constrain_angle)).toFixed(2)}${mark.card}`;
                mark_dom.textContent += ` Z ${CTL.cam.camera_scale.toFixed(2)}`;
                mark_dom.textContent += ` D ${CTL.cam.distance.toFixed(2)}`;
                mark_dom.rect = mark_dom.getBoundingClientRect();
                mark_dom.style.left = (view.vc.a.x - (mark_dom.rect.width / 2)) +'px';
                mark_dom.style.top = (20 - (mark_dom.rect.height / 2)) +'px';
            }else if(a === 'd') {
                view.vc.e.set(0,0,0);
                view.vc.b.set(0,-1,0);
                CTL.ray_caster.set(view.vc.e, view.vc.b);
                const intersects = CTL.ray_caster.intersectObjects(MAP.object.children);
                let depth = 0;
                intersects.map(i =>{
                   if(i.object.parent.visible === true && i.object.userData.is_depth_map){
                       depth = i.distance;
                   }
                });

                // const b_lines = RUN.objects.beautiful_position_lines.children[0];
                // util.set_buffer_at_index(b_lines.geometry.attributes.position.array, 5, [0,-depth,0]);
                // b_lines.geometry.attributes.position.needsUpdate = true;
                if(MAP.ray) {
                    //view.vc.b.set(0, -depth, 0);
                    //console.log(view.user_map_position, init_vars.model.position);
                    view.vc.e.set(MDL.center.x-init_vars.model.position.x, MDL.center.y+init_vars.model.position.z, 0);
                    ///view.vc.e.set(init_vars.model.position.x-MDL.center.x, init_vars.model.position.z-MDL.center.y, 0.0);
                    view.vc.b.copy(view.vc.e).setZ(-depth);
                    MAP.ray.set(view.vc.e, view.vc.b);
                }
                // util.set_buffer_at_index(b_lines.geometry.attributes.position.array, 5, [0,-depth,0]);
                // b_lines.geometry.attributes.position.needsUpdate = true;



                mark_dom.textContent = `${Math.round(depth * jsConfig.contours.depth_max)}${mark.card}`;
                mark_dom.rect = mark_dom.getBoundingClientRect();
                mark_dom.style.left = (view.vc.a.x - (mark_dom.rect.width / 2)) +'px';
                mark_dom.style.top = (view.vc.a.y - (mark_dom.rect.height / 2)) +'px';
            }else{
                mark_dom.textContent = `${view.user_map_position[a].toFixed(2)}º${mark.card}`;
                mark_dom.rect = mark_dom.getBoundingClientRect();
                mark_dom.style.left = (view.vc.a.x - (mark_dom.rect.width / 2)) +'px';
                mark_dom.style.top = (view.vc.a.y - (mark_dom.rect.height / 2)) +'px';
            }


            mark_dom.style.display = 'block';
        });

        RUN.objects.beautiful_position_lines.position.copy(init_vars.model.position).negate();//CTL.v.user.mouse.actual).negate();

    },
    update(anything=null){

        if(CAM.mover.is_moving){
            init_vars.model.position.copy(CAM.mover.pos).negate();
        }else{
            //console.log(init_vars.model.position, CAM.mover.pos);
            CAM.mover.pos.copy(init_vars.model.position).negate();
        }

        if(init_vars.view.features.beautiful_position_lines.on) view.set_position_mark();
        if(init_vars.view.features.position_lines.on) RUN.objects.position_lines.position.copy(init_vars.model.position).negate();
        if(init_vars.view.features.tools.on){
            // RUN.objects.tools.mover_marker.position.copy(CAM.mover.pos);
            view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
            RUN.objects.tools.set(CAM.mover.pos, view.vc.a);
        }//nothing

        CTL.cam.run();
        view.run_optics();

        MDL.container.updateMatrix();
        MDL.container.updateMatrixWorld(true);
        init_vars.model.updateMatrix();
        init_vars.model.updateMatrixWorld(true);
        if(jsConfig.map_axes_active) view.run_ticks();

        if(view.READY){
            MDL.position_marker.scale.setScalar((1-CTL.cam.camera_scale) * (MDL.width/2));

            if(interactive.selection === null) {
                view.ui_info.set_state(false, 'selection');
            }else{
                view.vc.a.copy(interactive.selection_origin);//.copy(MDL.point_selector.object.position);MDL.point_selector.object.position);
                MDL.container.localToWorld(view.vc.a);
                util.projected(view.vc.a, CTL.cam.camera, view.model_width, view.model_height);
                view.ui_info.set_position(view.vc.a.x, view.vc.a.y, 'selection');
            }

            if(!CAM.mover.is_moving) {
                view.vc.b.copy(CTL.v.user.mouse.plane_pos);
                MDL.container.worldToLocal(view.vc.b);
                MDL.user_position_marker.position.copy(view.vc.b);
            }

            MDL.layers.update.wudi_points(DAT, CTL.cam);
            MDL.layers.update.places(DAT, CTL.cam);
            MDL.layers.update.protected_areas(CTL.cam);

            view.vc.a.set(-CTL.cam.pos.x, 0.0, -CTL.cam.pos.z);
            MAP.update(CTL.cam, view.vc.a);
            view.ui_control.wudi_point_select.update();
        }

        //

        init_vars.map_model.matrix.copy(init_vars.model.matrix);
        init_vars.wudi_model.matrix.copy(init_vars.model.matrix);
        //init_vars.super_model.position.copy(init_vars.model.position);

    },
    modified_callback(){
        //alert('data modified');
        if(interactive.selection !== null){
            const k_sek_part = interactive.hash_info_store[interactive.selection];
            if(k_sek_part.cat === 'wudi_points') {
                const k_text = interactive.element_info_filter.wudi_points(k_sek_part.index);
                view.ui_info.set_state(true);
                view.ui_info.set_text([k_text]);
                view.ui_info.clone();
                view.ui_info.set_state(false);
            }
        }
        return true;
    },
    post_init(){
        view.run_optics();
        console.error('post_init');
        view.READY = true;
        view.vc.a.copy(init_vars.model.position);
        MDL.position_marker.position.set(-view.vc.a.x, view.vc.a.z, 0.0);
        MDL.position_marker.scale.setScalar((1-CTL.cam.camera_scale) * (MDL.width/2));

        MDL.layers.make.places(DAT.DATA, CTL.cam);
        MDL.layers.make.protected_areas(DAT.DATA, CTL.cam);

        MDL.layers.make.iso_bath(DAT.DATA);
        MDL.layers.make.wudi_points_instance(DAT.DATA);

        MAP.protected_areas = DAT.DATA.SD.protected_areas;
        MAP.init(MDL, init_vars.map_model, CTL.cam);

        MDL.layers.update.wudi_points(DAT, CTL.cam);
        MDL.layers.update.places(DAT, CTL.cam);

        init_vars.trace.log("post_initialization", CTL.cam.camera_scale);

        init_vars.model.userData.camera_auto_rotate = jsConfig.camera_auto_rotate_default;
        init_vars.protected_areas_visible = jsConfig.protected_areas_default;

        view.update();
    },
}

//#set this up so that the clicked-selection is saved
const interactive = {
    element_info_filter_secondary: {
        protected_areas: (index = null) => {
            const p_area = DAT.DATA.SD.protected_areas[index];
            const p_area_name = Array.isArray(p_area.NAME) ? util.title_case(p_area.NAME[0]) : util.title_case(p_area.NAME);
            const readable = jsConfig.keys_table.protected_areas(p_area, null);
            return {
                head: p_area_name,
                table: Object.entries(readable).filter(m => m[1] !== null),
            }
        },
        places: (index = null) => {
            const place = DAT.DATA.SD.places[index];
            const place_name = Array.isArray(place.name) ? util.title_case(place.name[0]) : util.title_case(place.name);
            const place_geo = DAT.DATA.SD.geonames[place.geo-1].geoname || null;
            const readable = jsConfig.keys_table.places(place, place_geo);
            return {
                head: place_name,
                table: Object.entries(readable).filter(m => m[1] !== null),
            }
        }
    },
    element_info_filter: {
        depth_contour: (index = null, obj=null) => {
            //console.log(obj);
            return {
                text: Math.floor(obj.obj.userData.depth) + 'm',
                area: 200000
            }
        },
        plane_line: (index = null, obj=null) => {
            const sector = map_sectors_group.children[index].userData.owner;
            // const plane = scene.getObjectByName('plane_line-' + index);
            // const ske = plane.parent.userData.owner;
            if(jsConfig.GENERAL_DEBUG){
                return {
                    text: sector.test_validate(), ///['plane' + index, plane.userData.level, plane.userData.aux],
                    index: index,
                    name: 'plane_line'+'-'+index
                }
            }else{
                return null;
            }

        },
        protected_areas: (index = null, obj=null) => {
            const pro_area = DAT.DATA.SD.protected_areas[index];
            const name = Array.isArray(pro_area.NAME) ? pro_area.NAME : util.title_case(pro_area.NAME);
            return {
                head: name,
                text: [pro_area.COUNTRY, pro_area.STATUS_ENG+'—'+pro_area.STATUS_YR, pro_area.DESIG_ENG],
                index: index,
                name: 'protected_areas'+'-'+index,
                area: pro_area.REP_AREA ? pro_area.REP_AREA : 2000000,
                type: 'protected_areas'
            }
        },
        iso_bath: (index = null, obj=null) => {
            return {
                text: 'isobath 200m',  // + index,
                index: index,
                name: 'isobath'+'-'+index,
                area: 10000000,
                type: 'isobath'
            }
        },
        wudi_points: (index = null, obj=null) => {
            const data_index = index;//DAT.DATA.CONF.wudi_index[index];
            const wudi_point = DAT.DATA.SD.wudi_points[index];//.slice(6,8);
            //DAT.SELECTOR.point.select(data_index);
            //console.log(wudi_point);

            const times_list = DAT.SELECTOR.time.data.selected.length === 0 ? ['all'] : DAT.SELECTOR.time.data.selected;
            const stats = {'times': times_list, 'days': [], 'up': [], 'down': [], 'events': []};
            const labels = [view.title_dom.innerHTML];//[`(${DAT.DATA.SD.geonames[wudi_point.geo-1].geoname})`, view.title_dom.innerHTML];

            for (let d of times_list) {
                const data_point = DAT.DATA.TD[d].data[data_index];
                stats.days.push(DAT.DATA.TD[d].meta.siz);
                stats.up.push(data_point[0]);
                stats.down.push(Math.abs(data_point[1]));
                stats.events.push(data_point[2])
            }

            for(let u of jsConfig.wudi_type_array){
                const col = jsConfig.colors[u.item+'_text'];
                const stat = util.r_sum(stats[u.label], stats.times.length);
                labels.push(`<span style="font-family:heavy_data_bold, sans-serif; color:${col}">${stat} ${u.label}-days</span>`);
            }

            labels.push(`${util.r_sum(stats.days, stats.times.length)} days.`);
            labels.push(...[`(${DAT.DATA.SD.geonames[wudi_point.geo-1].geoname})`]);

            const point_id = jsConfig.data_source_masked_indices ? wudi_point.pid : data_index;

            return {
                head: 'Nº'+point_id,
                text: labels,
                index: index,
                name: 'wudi_points'+'-'+index,
                area: 0,
                type: 'wudi_points'
            }
        },
        places: (index = null, obj=null) => {
            const place = DAT.DATA.SD.places[index];
            const place_name = Array.isArray(place.name) ? util.title_case(place.name[0]) : util.title_case(place.name);
            const place_geo = DAT.DATA.SD.geonames[place.geo-1].GEONAME || null;
            const region_labels = Array.isArray(place.regionLabels) ? place.regionLabels[0] : place.regionLabels;
            const ref_data = [place.countryLabel];
            ref_data.push(region_labels);
            ref_data.push(`${place.type} pop. ${place.population}`);
            ref_data.push(place_geo);
            return {
                head: place_name,
                text: ref_data.filter(m => m !== null),
                index: index,
                name: 'places'+'-'+index,
                area: place.area ? place.area : 20000000,
                type: 'places'
            }
        }
    },
    element_update: {
        wudi_points(element, flag=false){
            let r_level = element.secondary ? 2 : +element.primary;

            const wudi_index = DAT.DATA.CONF.wudi_index[element.index];
            if(DAT.SELECTOR.point.data.selected.includes(wudi_index)) r_level = 1;

            MDL.layers.data.wudi_point.color_mod[element.index] = r_level;
            MDL.layers.data.wudi_point.update(element.index, r_level);
        },
        protected_areas(element, flag=false){
            const protected_areas_outline = MDL.outliner.getObjectByName(element.name);
            if(protected_areas_outline === undefined && element.primary === true){
                element.obj.parent.parent.children.map(pc=>{
                    if(pc.userData.index === element.index && pc.visible === true){
                        const t_element = new THREE.Group();
                        pc.userData.outline.map(o => {
                            //jsConfig.colors.mpa_s_designated
                            const p_col = new THREE.Color().fromArray(pc.children[0].geometry.attributes.color.array);
                            const pro_mat = new THREE.LineBasicMaterial({color: p_col});
                            const geometry = new THREE.BufferGeometry();
                            geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(o), 3));
                            const p_pline = new THREE.Line(geometry, pro_mat);
                            t_element.add(p_pline);
                        });

                        t_element.name = element.name;
                        const xt = (t_element.position.x - MDL.center.x);
                        const yt = (t_element.position.y - MDL.center.y);
                        t_element.position.set(xt, yt, 0);
                        MDL.outliner.add(t_element);
                    }
                })
            }

            if(protected_areas_outline !== undefined && element.primary === false) {
                protected_areas_outline.removeFromParent();
            }

        },
        places(element, flag=false){
            // turn on or off here.
            const place_outline = MDL.outliner.getObjectByName(element.name);

            if(place_outline === undefined && element.primary === true){
                const place = DAT.DATA.SD.places[element.index];
                const mu = new THREE.Matrix4();
                const p_outlines = new THREE.Group();
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', element.obj.geometry.attributes.position);
                const p_mat = new THREE.LineBasicMaterial({color: jsConfig.colors.places});
                const p_pline = new THREE.Line(geometry, p_mat);
                element.obj.getMatrixAt(element.index, mu);
                p_pline.applyMatrix4(mu);
                const px = place.lon - MDL.center.x;
                const py = place.lat - MDL.center.y;
                p_outlines.name = element.name;
                p_pline.position.set(px,py,0.0);
                p_outlines.add(p_pline);
                MDL.outliner.add(p_outlines);
            }

            if(place_outline !== undefined && element.primary === false) {
                place_outline.removeFromParent();
            }

        },
        set_state(id, state, reset=false){
            const element = interactive.hash_info_store[id];
            if(element.primary === true && state === true) element.secondary = !element.secondary;
            element.primary = state;

            if(reset){
                element.primary = false;
                element.secondary = false;
            }

            if(interactive.element_update.hasOwnProperty(element.cat)){
                if(element.name !== interactive.selection || reset) {
                    interactive.element_update[element.cat](element, reset);
                }
            }
        },
        set_wudi_selection_text(){

        }
    },
    hash: [],
    hash_objects: [],
    info_text: [],
    hash_info_store: {},
    hash_changed: false,
    hash_priority:{
        wudi_point: 10,
        places: 9,
        protected_areas: 8,
        iso_bath: 0,
        plane_line: 0,
        depth_contour: 0
    },
    selection: null,
    selection_category: null,
    selection_origin: new THREE.Vector3(),
    selection_object:{
        object: null,
        point: new THREE.Vector3(),
        id: null,
        depth_select(){

            const base_color = view.vc.color.set(jsConfig.mats.contours.dict.color).toArray();
            const high_color = view.vc.color.set(jsConfig.mats.contours.dict.color).offsetHSL(0,0,0.25).toArray();

            if(MAP.object.children.length){
                MAP.object.children.forEach(s => {
                    if(s.sector){
                        const relevant = s.children.filter(s_sub => (s_sub.userData.type === 'contours' && s_sub.visible));
                        relevant.map(contours => contours.children.map(c=> {
                            if (c.userData.depth) {
                                const k = interactive.selection_object.object === null ? null : interactive.selection_object.object.userData.depth;
                                if (c.userData.depth === k){
                                    c.userData.setColors(high_color);
                                } else {
                                    c.userData.setColors(base_color);
                                }
                            }
                        }))
                    }
                })
            }
        }
    },
    get_screen_pos(source){
        view.vc.a.copy(source.position);
        MDL.container.localToWorld(view.vc.a);
        util.projected(view.vc.a, CTL.cam.camera, view.model_width, view.model_height);
        return view.vc.a;
    },
    clean(intersects, force_wudi=null) {
        //interactive.hash_changed = false;
        const hash = [];
        const limits = [];
        let wudi_polled = false;
        let depth_polled = false;//true;//false;
        interactive.selection_object.object = null;

        for(let i = 0; i < intersects.length; i++){

            let I = intersects[i].object;
            if (I.interactive && (I.parent.visible && I.visible)) {

                if (I.type === 'Line' && limits.includes(I.uuid)) continue;
                if (I.userData.is_depth_map) break;

                if (!limits.includes(I.uuid)){
                    limits.push(I.uuid);
                    interactive.selection_object.object = I;
                    interactive.selection_object.id = I.uuid;
                    interactive.selection_object.point.copy(intersects[i].point);
                }

                let cat_name = I.name;
                let index = intersects[i].instanceId ? intersects[i].instanceId : null;

                let is_depth = cat_name.indexOf('depth_contour') !== -1;

                let is_wudi = cat_name.indexOf('wudi') !== -1;

                //if(is_depth) continue;

                if(I.name === 'place_label'){
                    if(force_wudi !== null) continue;
                    cat_name = 'places';
                    index = I.parent.index;
                    I = MDL.layers.places;
                }

                let natural_name = `${cat_name}-${index}`;

                if (cat_name === 'wudi_up' || cat_name === 'wudi_down') {
                    cat_name = 'wudi_points';
                    natural_name = `wudi_points-${intersects[i].instanceId}`;
                }

                if (cat_name.indexOf('depth_contour') !== -1) {
                    natural_name = `depth_contour-${I.userData.depth}`;
                }

                if (cat_name.indexOf('protected_areas') !== -1) {
                    cat_name = 'protected_areas';
                    index = I.userData.id;// || intersects[i].instanceId; (not used anymore).
                    natural_name = `protected_areas-${index}`;
                }

                if( (is_depth && !depth_polled) || (is_wudi && !wudi_polled) || (!is_wudi && !is_depth) ) {

                    if(is_wudi){
                        if(force_wudi !== null){
                            if(force_wudi === index){
                                wudi_polled = true;
                            }else{
                                continue;
                            }
                        }
                    }

                    if (!hash.includes(natural_name)) hash.push(natural_name);

                    if (!interactive.hash_info_store.hasOwnProperty(natural_name)){
                        interactive.hash_info_store[natural_name] = {
                            cat:cat_name,
                            obj:I,
                            index:index,
                            priority: interactive.hash_priority[cat_name],
                            name: natural_name,
                            primary: false,
                            secondary: false,
                            valid: false
                        };
                    }
                }

                if(is_wudi && force_wudi === null) wudi_polled = true;
                if(is_depth) depth_polled = true;


            }
        }

        return hash;
    },
    check(force_selection=null) {

        if(force_selection !== null) {
            MDL.user_position_marker.position.copy(MDL.point_selector.object.position);
            view.vc.a.copy(MDL.point_selector.object.position);
            MDL.container.localToWorld(view.vc.a).setY(0.5);
            view.vc.e.set(0,-1,0).normalize();
            CTL.ray_caster.set(view.vc.a, view.vc.e);
        }else{
            CTL.ray_caster.setFromCamera(CTL.v.user.mouse.raw, CTL.cam.camera);  //n_pos[1], CTL.cam.camera);
        }

        const intersects = CTL.ray_caster.intersectObjects(init_vars.wudi_model.children);
        intersects.push(...CTL.ray_caster.intersectObjects(MDL.container.children));
        intersects.push(...CTL.ray_caster.intersectObjects(init_vars.map_model.children));

        const current_hash = interactive.clean(intersects, force_selection);
        let delta = false;

        current_hash.map(h_name =>{
            if(!interactive.hash.includes(h_name)){
                interactive.hash.push(h_name);
                interactive.element_update.set_state(h_name, true);
                delta = true;
            }
        });
        // set filter works best here.
        interactive.hash = interactive.hash.filter(h_name => {
            if(!current_hash.includes(h_name)){
                interactive.element_update.set_state(h_name, false); //suppress not in current
                delta = true;
            }else{
                return h_name;
            }
        });

        if(delta && interactive.hash.length){
            interactive.hash_objects = interactive.hash.map(h => {return interactive.hash_info_store[h]});
            interactive.hash_objects.sort((a, b) => a.priority > b.priority ? -1 : 1);
            interactive.info_text = [];
            interactive.hash_objects.map(h =>{
                if(h.name !== interactive.selection){
                    const record = interactive.element_info_filter[h.cat](h.index, h);
                    h.area = record.area ? record.area : 0;
                    interactive.info_text.push(record);
                }
            });

            if(interactive.info_text.length > 0) {
                interactive.info_text.sort((a, b) => a.area < b.area ? -1 : 1);
                interactive.hash_objects.sort((a, b) => a.area < b.area ? -1 : 1);
                init_vars.trace.watched['interactive'] = interactive.hash;
                view.ui_info.set_state(true);
                view.ui_info.set_text(interactive.info_text);
                //test
                //interactive.hash_objects.map((o,i)=>{console.log(i, o.name)});
            }

            if(interactive.selection_object.object !== null){
                view.vc.b.copy(interactive.selection_object.point);
                MDL.container.worldToLocal(view.vc.b);
                MDL.user_position_marker.position.copy(view.vc.b);
                interactive.selection_object.depth_select();
                //MDL.user_position_marker.position.copy(interactive.selection_object.point);
            }

            const top_element = interactive.hash_objects[0];
            if(force_selection === null) {
                if(['wudi_points', 'places', 'protected_areas'].includes(top_element.cat)){
                    MDL.point_selector.select(top_element.cat, {'index': top_element.index}, DAT, CTL.cam);
                    MDL.user_position_marker.position.copy(MDL.point_selector.object.position);
                }
            }

            // if(['wudi_points', 'places', 'protected_areas'].includes(top_element.cat)){
            //     const n_pos = interactive.map_position(force_selection);
            //     view.ui_info.set_position(n_pos[0].x, 0.0, 'off-axis');
            // }else{
            //
            // }
            const ui_pos = interactive.get_screen_pos(MDL.user_position_marker);
            view.ui_info.set_position(ui_pos.x, ui_pos.y);//, 'off-axis');

        }


        if(interactive.hash.length > 0) {
            const top_element = interactive.hash_objects[0];
            const m_evt = EVT.vars.callback['screen'].meta;


            if (m_evt.action === 'click') {
                //have a seconday click here
                if(top_element.name === interactive.selection) {

                    if (top_element.cat === 'wudi_points') {
                        view.ui_control.wudi_point_select.make(top_element.index);
                    }

                    if (top_element.cat === 'places' || top_element.cat === 'protected_areas') {
                        view.ui_info.target_lock = true;
                        //view.ui_info.lock_position = n_pos[0];
                        interactive.info_text = interactive.element_info_filter_secondary[top_element.cat](top_element.index);
                        //view.ui_info.set_state(true);
                        view.ui_info.set_state(true);
                        view.ui_info.set_text([interactive.info_text]);
                        view.ui_info.clone();
                        view.ui_info.set_state(true, 'selection');
                        view.ui_info.set_state(false);

                        MDL.user_position_marker.position.copy(MDL.point_selector.object.position);
                        const ui_pos = interactive.get_screen_pos(MDL.user_position_marker);
                        view.ui_info.set_position(ui_pos.x, ui_pos.y);//, 'off-axis');
                        //view.ui_info.set_position(n_pos[0].x, n_pos[0].y, 'mouse');
                    }

                }else{
                    // deselect previous
                    if(interactive.selection) interactive.element_update.set_state(interactive.selection, false, true);
                    interactive.selection = top_element.name;
                    interactive.selection_category = top_element.cat;
                    obs.innerHTML = interactive.selection;

                    if(top_element.primary) {
                        interactive.selection_origin.copy(MDL.point_selector.object.position);

                        if (top_element.cat === 'wudi_points') {
                            //interactive.element_update.set_state(top_element.name, true);


                            view.ui_info.set_text([interactive.info_text[0]]);
                            view.ui_info.clone();
                            view.ui_info.set_state(false);
                            view.ui_info.set_state(true, 'selection');
                            MDL.point_selector.move_to(CAM);

                            // view.vc.a.copy(MDL.point_selector.object.position);
                            // view.vc.b.set(view.vc.a.x, 0.0, -view.vc.a.y);
                            // //init_vars.model.localToWorld(view.vc.a);
                            // CAM.mover.set_target(CAM.mover.pos, view.vc.b, 2.0);
                            // CAM.mover.set_rotation_target(MDL.point_selector.offset_angle, true);
                            // const data_index = DAT.DATA.CONF.wudi_index[top_element.index];
                            // DAT.SELECTOR.point.select(data_index);
                            // view.ui_control.wudi_point_select.update_selection();
                        }
                        if (top_element.cat === 'places' || top_element.cat === 'protected_areas') {
                            // view.ui_info.target_lock = true;
                            // //view.ui_info.lock_position = n_pos[0];
                            //
                            // const ktx = interactive.element_info_filter_secondary[top_element.cat](top_element.index);
                            // view.ui_info.set_state(true);
                            // view.ui_info.set_text([ktx]);
                            //view.ui_info.set_position(n_pos[0].x, n_pos[0].y, 'mouse');
                            view.ui_info.set_text([interactive.info_text[0]]);
                            view.ui_info.clone();
                            view.ui_info.set_state(false);
                            view.ui_info.set_state(true, 'selection');
                            MDL.point_selector.move_to(CAM);
                        }
                    }

                }
            }

        }else{
            interactive.selection_object.depth_select();
            view.ui_info.target_lock = false;
            view.ui_info.set_state(false);
        }

        return false;
    },
    depth_sweep(){
        init_vars.trace.log('depth_sweep');//['fps'] = RUN.fps;

        for(let a = 0; a < 180; a++){
            view.vc.c.copy(CTL.cam.camera.up).applyAxisAngle(CTL.cam.right, -util.deg_to_rad(a)).normalize();

            CTL.ray_caster.set(CTL.cam.pos, view.vc.c);

            const dsl = CTL.ray_caster.intersectObjects(MDL.container.children);
            //if(dsl.length) init_vars.trace.log('items', dsl.length, dsl[0].object.name, dsl[0].point.z);
            if(dsl.length && dsl[0].object.name === 'depth_contour'){
                view.vc.a.copy(dsl[0].point);//.applyQuaternion(CTL.cam.camera.quaternion);//AxisAngle(CTL.cam.right, Math.PI/2);
                MDL.container.worldToLocal(view.vc.a);
                // view.vc.a.x += MDL.center.x;
                // view.vc.a.z += MDL.center.y;
                //ref_marker.position.set(model.center.x, model.center.y, 0.0);
                MAP.sweeps[a].position.copy(view.vc.a);//set(view.vc.a.x, view.vc.a.z, view.vc.a.y);
            } //console.log(dsl[0]);

        }

        // CTL.ray_caster.set(CTL.cam.pos, view.vc.c);
        //
        // CTL.ray_caster.ray.intersectPlane(view.plane, view.vc.b);

    }
}

//universal event callback
function get_evt_data(source){
    if(source === 'screen') {
        CTL.update(EVT.vars.callback[source].meta, init_vars.model);
        const m_evt = EVT.vars.callback[source].meta;

        // if (m_evt.action === 'click') {
        //     view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
        //     //view.vc.b.copy(init_vars.model.position).negate();
        //     const d = 3.0;// CTL.cam.max_zoom - (view.vc.a.length() / 2);
        //     //init_vars.trace.log('click', d.toFixed(2), CTL.interact_type);
        //     CAM.mover.set_target(CAM.mover.pos, view.vc.a, d);
        // }

        if ((m_evt.action === 'drag' || m_evt.action === 'click') && m_evt.delta_x !== null && m_evt.delta_y !== null) {
            //view.ui_info.set_position(CTL.v.user.mouse.screen.x, CTL.v.user.mouse.screen.y, 'mouse');
            //CAM.mover.cancel();
        }

        //interactive.check();

        if(!CAM.mover.is_moving) {
            interactive.check();  //if(!CAM.mover.is_moving)
            //view.ui_control.wudi_point_select.update();


            //if(!CAM.mover.is_moving)


            const m_evt = EVT.vars.callback[source].meta;
            // init_vars.trace.watched['screen_meta_action'] = m_evt.action;
            // init_vars.trace.watched['user_mouse_actual'] = CTL.v.user.mouse.actual;
            // MDL.model_position(view.user_map_interact_position.copy(CTL.v.user.mouse.plane_pos));
            //
            // init_vars.trace.watched['user_map_pos'] = view.user_map_position;
            // init_vars.trace.watched['user_map_interact_pos'] = view.user_map_interact_position;
            // init_vars.trace.watched['cam_project'] = CTL.cam.projected;


            // if (m_evt.action === 'click') {
            //     //if (init_vars.view.features.tools.on) {
            //         view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
            //         //view.vc.b.copy(init_vars.model.position).negate();
            //         const d = 3.0;// CTL.cam.max_zoom - (view.vc.a.length() / 2);
            //         init_vars.trace.log('click', d.toFixed(2), CTL.interact_type);
            //         CAM.mover.set_target(CAM.mover.pos, view.vc.a, d);
            //         view.vc.c.subVectors(view.vc.a, CAM.mover.pos);
            //         CAM.mover.set_rotation_target(view.vc.c);
            //     //}
            // }



            if (init_vars.view.features.grid_marks.on && RUN.objects.hasOwnProperty('grid_marks')) {
                const pc = CTL.v.user.mouse.actual;
                const p = init_vars.view.features.grid_marks.pitch;
                const x = Math.round(pc.x / p) * p;
                const y = Math.round(pc.z / p) * p;
                RUN.objects.grid_marks.position.set(-x, 0.0, -y);
            }

            view.update(source);
        }
    }
    if(source === 'keys') {
        if(EVT.vars.callback[source].active.includes('KeyQ')){
            init_vars.trace.watched['fps'] = RUN.fps;
            init_vars.trace.watched['frame'] = init_vars.frame;
            log_state();
        }
        if(EVT.vars.callback[source].active.includes('Space')){
            view.ui_control.recenter_map();
            //interactive.depth_sweep();
        }
        if(EVT.vars.callback[source].active.includes('ArrowLeft')){
            interactive.check(MDL.point_selector.select(interactive.selection_category, {'bump':1}, DAT, CTL.cam));
            // const current_index = MDL.point_selector.wudi_index;
            // const wudi_point = DAT.DATA.SD.wudi_points[current_index+1];
            // MDL.point_selector.select('wudi_point', {'bump':1}, DAT, CTL.cam);
            //
            // // ///console.log('element_update force_selection', force_selection);
            // // MDL.point_selector.select(wudi_point, CTL.cam);
            // //
            // // //const current_index = MDL.point_selector.selected_index;
            // // interactive.set_position(current_index+1);
            //
            // interactive.check(current_index+1);//MDL.point_selector.selected_index);
            // return MDL.point_selector.move_to(CAM, 1.0);
        }

        if(EVT.vars.callback[source].active.includes('ArrowRight')){

            interactive.check(MDL.point_selector.select(interactive.selection_category, {'bump':-1}, DAT, CTL.cam));
            //
            // const current_index = MDL.point_selector.selected_index;
            // //
            // // const wudi_point = DAT.DATA.SD.wudi_points[current_index-1];
            // // ///console.log('element_update force_selection', force_selection);
            // // MDL.point_selector.select(wudi_point, CTL.cam);
            // //
            // // //const current_index = MDL.point_selector.selected_index;
            // // interactive.set_position(MDL.point_selector.selected_index);
            // //
            // interactive.set_position(current_index-1);
            // interactive.check(current_index-1);//MDL.point_selector.selected_index);
            // return MDL.point_selector.move_to(CAM, 1.0);
        }
        obs.style.display = obs_css[+EVT.vars.callback.toggle];
    }
}

//handle debug observations
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

//init scene controls
CTL.init(init_vars);
//init three js environment (sets init_vars.dom);
RUN.init(document.getElementById('model'), CTL, init_vars);
//init events handler
EVT.init(init_vars.dom);
EVT.vars.callback.update_function = get_evt_data;
EVT.vars.callback.toggle = jsConfig.DEBUG_TRACE_INITIAL_STATE;

init_vars.trace.log('components loaded', 'ok');

window.addEventListener('DOMContentLoaded', (event) => {
    //console.log('model-base loaded. continuing');
    init_vars.trace.log(runtime_timer.var_name, util.formatMs(runtime_timer.stop()));


    MDL.init(init_vars);


    view.init();

    //initialize CAM, aka ui-camera-dolly with the view loaded=in (initialized).
    CAM.init(init_vars.model, CTL.cam, view.update);

    DAT.init(MDL, view, graph_component, init_vars);

});
