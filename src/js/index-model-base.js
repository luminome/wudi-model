import * as THREE from "three";
import {events as EVT} from "./machine/ui-events";
import {controls as CTL} from "./machine/ui-controls";
import {environment as RUN} from "./machine/three-env";
import {uiCameraDolly as CAM} from "./machine/ui-camera-dolly";
import {modelDataIo as DAT} from "./machine/model-data-io";
import {default as MDL} from "./model.js";
import graph from "./graph.js";

import {logger as LOG} from "./machine/logger.js";
import timer from './machine/timer.js';
import * as util from './machine/util.js';
import windowJsConfig from "../window-js-config";
import jsConfig from "../model-js-config";

const runtime_timer = timer('main-initialization-loop').start();
const obs = document.getElementById('obs');
const obs_css = ['none', 'block'];
const display_inline_array = ['none', 'inline-block'];
const display_array = ['none', 'block'];

const init_vars = {
    READY: false,
    trace: LOG(obs),
    view:{
        width: window.innerWidth,
        height: window.innerHeight,
        scene_width: 20,
        colors:{
            window_background: windowJsConfig.colors.window,
            view_elements: windowJsConfig.colors.view_elements,
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
                color: windowJsConfig.colors.view_elements,
            },
            center_line:{
                on: true,
            },
            tools:{
                on: true,
            },
            position_lines:{
                on: true,
            },
            beautiful_position_lines:{
                on: true,
                size: 40.0,
                weight: 1,
                color: windowJsConfig.colors.view_elements,
                opacity: 0.5,
                limit: 60.0
            }
        }
    },
    action: 'none',
    model: new THREE.Group(),
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
        const wudi_textual_output = [];
        const wudi_geodata_output = [];
        const wudi_temporal_output = [];
        const point_data = DAT.DATA.SD.wudi_points.raw;

        const output_text = view.download_output_dom;
        output_text.innerHTML = '';

        const geodata_header = point_data.keys.slice(0,6);
        geodata_header.unshift('point_id');
        wudi_geodata_output.push(geodata_header);

        const temporal_header_equiv = {
            all: ['time', 'point_id', 'up_days', 'down_days'],
            year: ['time', 'point_id', 'up_days', 'down_days'],
            month: ['time', 'point_id', 'wudi_value', 'qualifies']
        }

        let wudi_data_header = null;
        let point_traces = [];

        for (let point of block) {

            if(!point_traces.includes(point.id) && point.id !== 'AVG'){
                const values = point_data.data[point.id].slice(0,6);
                values.unshift(point.id);
                point_traces.push(point.id);
                wudi_geodata_output.push(values);
            }

            if(!wudi_data_header){
                wudi_data_header = temporal_header_equiv[point.style];
                wudi_temporal_output.push(wudi_data_header);
            }

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

        if(DAT.SELECTOR.point.data.selected.length) {

            const times_list = DAT.SELECTOR.time.data.selected.length === 0 ? ['all'] : DAT.SELECTOR.time.data.selected;

            const diagonal = times_list.map(t => {
                return Math.max(...DAT.SELECTOR.point.data.selected.map(p => DAT.DATA.TD.point_cache[`${p}-${t}`].meta));
            });

            console.log('selected points', DAT.SELECTOR.point.data.selected);

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

            if(DAT.SELECTOR.point.data.selected.length > 1){
                const r_dat = [];
                for(let ac = 0; ac < aggregate.length; ac++){
                    r_dat.push([time_keys[ac], aggregate_avg[0][ac], aggregate_avg[1][ac]]);
                }
                cache_for_output.push({id:'AVG', tid:0, ref_data:{data:r_dat, id:'all'}, style:ref_style});
            }

            download_component.output(cache_for_output);

            const up_col = windowJsConfig.colors.up_welling;//utility_color.fromArray(vars.colors.upwelling).getHex();
            const dn_col = windowJsConfig.colors.down_welling;//utility_color.fromArray(vars.colors.downwelling).getHex();

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
                up_color_select: up_col,
                down_color: dn_col+'CC',
                down_color_select: dn_col,
                x_range_start: ref_style === 'all' ? 1978 : 1,
                graph_style: ref_style,
                wudi_th_up: jsConfig.wudi_UPWthr,
                wudi_th_down: jsConfig.wudi_DNWthr,
                main_title: view.title_dom.innerHTML
            }

            ///console.log(graph_obj, vars.selecta.wudi);

            graph(graph_obj, view.bounds_width, windowJsConfig.graph_obj_height, DAT.SELECTOR);

            graph_component.dom.classList.remove('hidden');
            graph_component.dom.style.display = 'block';
            graph_component.dom.style.height = windowJsConfig.graph_obj_height+'px';
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
        e: new THREE.Vector3(0, 0, 0)
    },
    plane: null,
    user_position: new THREE.Vector3(0, 0, 0),
    user_map_position: new THREE.Vector3(0, 0, 0),
    user_map_interact_position: new THREE.Vector3(0, 0, 0),
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
    model_width: null,
    model_height: null,
    bounds_width: null,
    bounds_height: null,
    bounds_bottom_offset: windowJsConfig.bounds_bottom_offset,
    camera_auto_affine: false,
    max_allowable_zoom: 20.0,
    model_visible_dimensions: null,
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

            // CTL.cam.run();
            //
            // view.run_optics();
            // //adaptive_scaling_wudi();
            // view.run_ticks();
            //refresh_sectors();
            if(init_vars.view.features.beautiful_position_lines.on) view.set_position_mark();

            init_vars.trace.log('recenter_map', 'ui_control');

            view.update();
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
            //set previously on page
            // vars.view.instructions_active = !vars.view.instructions_active;
            // this.classList.toggle('control-toggle');
            // const instructions_slide = document.getElementById('intro-instructions');
            // instructions_slide.style.display = display_array[+vars.view.instructions_active];//'block';
        },
        mpa_s_state(){
            vars.mpa_s_visible = !vars.mpa_s_visible;
            this.classList.toggle('control-toggle');
            control_appearance_sectors('mpa_s', vars.mpa_s_visible );
        },
        scroll_to_downloads(){
            const box = document.getElementById('output').getBoundingClientRect();
            window.scrollTo({ top: box.top, behavior: 'smooth' });
        },
        graph_close(){
            DAT.SELECTOR.point.deselect_all();
            graph_component.dom.style.display = 'none';
            graph_component.active = false;
            view.redraw();
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
                    const wudi_layer = MDL.container.getObjectByName('wudi_'+parent.dataset.layer);
                    wudi_layer.visible = !b_state;
                }
            }
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
        mark.style.color = windowJsConfig.colors.view_elements;//'gray';//vars.colors.hex_css(vars.colors.chart_tick);
        mark.style.backgroundColor = windowJsConfig.colors.window_overlay;
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
                    util.projected(view.vc.c, CTL.cam.camera, view.model_width, view.model_height);

                    if (plane.name === 'x') {
                        ticks.left = (view.vc.c.x - (ticks.rect.width / 2));
                        ticks.top = (view.model_height - view.x_axis_inset) - (ticks.rect.height / 2);
                    } else {
                        ticks.left = (view.y_axis_inset);
                        ticks.top = (view.vc.c.y - (ticks.rect.height / 2));
                    }

                    plane.markers_divs[m].style.left = ticks.left + 'px';
                    plane.markers_divs[m].style.top = ticks.top + 'px';

                    const cas = (ticks.top > view.height || ticks.top < 0 || ticks.left > view.model_width || ticks.left < 0);
                    plane.markers_divs[m].style.display = cas ? 'none' : 'block';///display_array[+!cas];
                }
            }
        }
        //obs_handler({'F': vars.view.width, 'S': sum});
        //console.log(ticks);
    },
    init(){
        //init the chart style the ticks rendering systems
        document.getElementById('recenter').addEventListener('mouseup', view.ui_control.recenter_map);
        document.getElementById('camera-motion').addEventListener('mouseup', view.ui_control.camera_behavior);
        document.getElementById('navigation').addEventListener('mouseup', view.ui_control.navigation_state);
        document.getElementById('instructions').addEventListener('mouseup', view.ui_control.instructions_state);
        document.getElementById('mpa_s').addEventListener('mouseup', view.ui_control.mpa_s_state);
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

        init_vars.trace.log('bounds_rect', view.bounds_width, view.bounds_height);

        obs.style.color = windowJsConfig.colors.view_elements;
        obs.style['background-color'] = windowJsConfig.colors.window_overlay;
    },
    redraw(){
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
            if(windowJsConfig.dom_references.hasOwnProperty(b.id)){
                if(windowJsConfig.dom_references[b.id].on){
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

        if (CTL.cam !== null) {
            CTL.cam.camera.aspect = view.model_width / view.model_height;
            CTL.cam.camera.updateProjectionMatrix();
            RUN.resize(view.model_width, view.model_height);
            const default_view_z = init_vars.view.features.default_view_z;
            view.model_visible_dimensions = RUN.visibleAtZDepth(-default_view_z, CTL.cam.camera);
            view.max_allowable_zoom = ((default_view_z / view.model_visible_dimensions.w) * MDL.width) + 2.0;
            CTL.cam.base_pos.z = view.max_allowable_zoom;
            CTL.cam.max_zoom = view.max_allowable_zoom;
        }

        CTL.v.view.width = view.model_width;
        CTL.v.view.height = view.model_height;


        view.update();
    },
    set_position_mark(){
        ['x','z','y'].map(a =>{
            const mark = view.position_marks[a];
            const mark_dom = mark.mark;
            //console.log(mark);

            view.vc.a.fromArray(mark.pos);//copy(CTL.v.user.mouse.actual).multiplyScalar(-1.0);//negate();
            util.projected(view.vc.a, CTL.cam.camera, view.model_width, view.model_height);

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



    },
    update(anything=null){

        CTL.cam.run();
        view.run_optics();
        view.run_ticks();

        if(CAM.mover.is_moving){
            init_vars.model.position.copy(CAM.mover.pos).negate();
        }else{
            CAM.mover.pos.copy(init_vars.model.position).negate();
        }

        if(init_vars.view.features.beautiful_position_lines.on) view.set_position_mark();

        if(init_vars.view.features.position_lines.on) RUN.objects.position_lines.position.copy(init_vars.model.position).negate();

        if(init_vars.view.features.tools.on){
            RUN.objects.tools.mover_marker.position.copy(CAM.mover.pos);
            view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
            RUN.objects.tools.set(CAM.mover.pos, view.vc.a);
        }

        if(view.READY){
            ///alert(anything+ ' ' +view.READY+ ' ' +DAT.DATA.CONF.wudi_index.length);
            MDL.layers.update.wudi_points(DAT.DATA, CTL.cam);

        }
        // return true;
    }
}

//attempt to globalize the general update of things...
/*
so that the idle from the mover (CAM) can run it per-frame
instead of only on event-call from drags-lite
*/
// function update(){
//     CTL.cam.run();
//     view.run_optics();
//     view.run_ticks();
//
//     if(CAM.mover.is_moving){
//         init_vars.model.position.copy(CAM.mover.pos).negate();
//     }else{
//         CAM.mover.pos.copy(init_vars.model.position).negate();
//     }
//
//     if(init_vars.view.features.beautiful_position_lines.on) view.set_position_mark();
//     if(init_vars.view.features.position_lines.on) RUN.objects.position_lines.position.copy(init_vars.model.position).negate();
//
//     if(init_vars.view.features.tools.on){
//         RUN.objects.tools.mover_marker.position.copy(CAM.mover.pos);
//         view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
//         RUN.objects.tools.set(CAM.mover.pos, view.vc.a);
//     }
//
//     if(init_vars.READY) MDL.layers.update.wudi_points(DAT.DATA, CTL.cam);
//     return true;
// }

//universal event callback
function get_evt_data(source){
    // console.log(source, EVT.vars.callback[source]);
    if(source === 'screen') {
        CTL.update(EVT.vars.callback[source].meta, init_vars.model);

        if(!CAM.mover.is_moving) view.update(source);

        const m_evt = EVT.vars.callback[source].meta;
        init_vars.trace.watched['screen_meta_action'] = m_evt.action;
        init_vars.trace.watched['user_mouse_actual'] = CTL.v.user.mouse.actual;
        MDL.model_position(view.user_map_interact_position.copy(CTL.v.user.mouse.plane_pos));

        init_vars.trace.watched['user_map_pos'] = view.user_map_position;
        init_vars.trace.watched['user_map_interact_pos'] = view.user_map_interact_position;
        init_vars.trace.watched['cam_project'] = CTL.cam.projected;

        view.vc.a.subVectors(CTL.v.user.mouse.plane_pos, init_vars.model.position);
        view.vc.b.copy(init_vars.model.position).negate();

        if(m_evt.action === 'click'){
            const d = CTL.cam.max_zoom - (view.vc.a.length()/2);
            init_vars.trace.log('click', d.toFixed(2));
            CAM.mover.set_target(CAM.mover.pos, view.vc.a, d);
            view.vc.c.subVectors(view.vc.a, CAM.mover.pos);
            CAM.mover.set_rotation_target(view.vc.c);
        }

        if(m_evt.action === 'drag' && m_evt.delta_x !== null && m_evt.delta_y !== null){
            CAM.mover.cancel();
        }

        if(init_vars.view.features.grid_marks.on && RUN.objects.hasOwnProperty('grid_marks')){
            const pc = CTL.v.user.mouse.actual;
            const p = init_vars.view.features.grid_marks.pitch;
            const x = Math.round(pc.x/p)*p;
            const y = Math.round(pc.z/p)*p;
            RUN.objects.grid_marks.position.set(-x, 0.0, -y);
        }
        // view.run_optics();
        // view.run_ticks();
    }
    if(source === 'keys') {
        if(EVT.vars.callback[source].active.includes('KeyQ')){
            init_vars.trace.watched['fps'] = RUN.fps;
            init_vars.trace.watched['frame'] = init_vars.frame;
            log_state();
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

CTL.init(init_vars); //init scene controls
RUN.init(document.getElementById('model'), CTL, init_vars); //init three js environment (sets init_vars.dom);
EVT.init(init_vars.dom); //init events handler
EVT.vars.callback.update_function = get_evt_data;

init_vars.trace.log('components loaded', 'ok');

window.addEventListener('DOMContentLoaded', (event) => {
    console.log('model-base loaded. continuing');
    init_vars.trace.log(runtime_timer.var_name, util.formatMs(runtime_timer.stop()));


    //#//MAP INIT PROBLEM
    MDL.init(init_vars);

    view.init();

    //initialize CAM, aka ui-camera-dolly with the view loaded=in (initialized).
    CAM.init(init_vars.model, CTL.cam, view.update);
    DAT.init(MDL, view, graph_component, init_vars);

    CTL.update(EVT.vars.callback['screen'].meta, init_vars.model);
    // CTL.cam.run();
    //view.update('source');
});
