import {loader, post_loader} from './loader.js';
import jsConfig from '../config';
import * as util from "./util";
import timer from "./timer";

const DATA = {
    temporal_data_process:{
        average(caller = null) {
            const points_count = DATA.TD.points_count;///vars.data.wudi_data.points_count;
            console.warn('average points_count', points_count,'called by', caller);

            const times_count = SELECTOR.time.data.selected.length;//vars.selecta.wudi.times.selected.length;

            const new_normals = []; //averaged normals values for all points
            const new_aggregated = []; //combined up/down values for all points

            if (points_count === 0) return false;

            const times_list = times_count === 0 ? ['all'] : SELECTOR.time.data.selected;

            for (let i = 0; i < points_count; i++) {
                new_normals.push([0.0, 0.0, 0.0, 0.0, 0.0]);
                new_aggregated.push([0.0, 0.0, 0.0, 0.0, 0.0, []]);
            }
            const meta_avg = {siz: 0, u_me: 0, d_me: 0, u_mx: 0, d_mx: 0};

            for (let t = 0; t < times_list.length; t++) {
                const tn = times_list[t].toString();
                console.log(tn, DATA.TD[tn]);

                const data = DATA.TD[tn].data;
                const meta = DATA.TD[tn].meta;



                Object.entries(meta).map((k) => meta_avg[k[0]] += k[1]);
                for (let i = 0; i < points_count; i++) {
                    for (let d = 0; d < 3; d++) new_aggregated[i][d] += data[i][d];
                    new_aggregated[i][3] += data[i][0];
                    new_aggregated[i][4] += data[i][1];
                    if (Array.isArray(data[i][3])) {
                        for (let ed of data[i][3]) {
                            if (ed) new_aggregated[i][5].push(tn + ed);
                        }
                    } else {
                        if (data[i][3]) new_aggregated[i][5].push(tn + data[i][3]);
                    }
                }
            }
            Object.keys(meta_avg).map(k => meta_avg[k] = Math.round(meta_avg[k] / times_list.length));
            const rel_meta = [meta_avg.u_mx, meta_avg.d_mx, 1, meta_avg.u_me, meta_avg.d_me];
            //const rel_meta = [meta_avg.u_me, meta_avg.d_me, 1, meta_avg.u_mx, meta_avg.d_mx];

            for (let i = 0; i < points_count; i++) {
                for (let d = 0; d < 5; d++) {
                    new_aggregated[i][d] = Math.round(new_aggregated[i][d] / times_list.length);
                    new_normals[i][d] = (Math.round((new_aggregated[i][d] / rel_meta[d]) * 10000) / 10000) * Math.sign(rel_meta[d]);
                }
                new_aggregated[i].splice(3, 2);
            }

            DATA.TD.current = new_normals;
            DATA.TD.aggregate = new_aggregated;

            //console.log(DATA.TD.aggregate);
            modelDataIo.init_vars.trace.log('temporal_data_process recalculated', caller);
        }
    },
    temporal_data_acquire:{
        get(){
            SELECTOR.time.data.required = SELECTOR.time.data.selected.filter(s => DATA.TD[s] === undefined);
            console.log('temporal_data_acquire get required', SELECTOR.time.data.required);

            if(SELECTOR.time.data.required.length === 0){
                if(modelDataIo.graph.active) modelDataIo.graph.run();
                DATA.temporal_data_process.average('temporal_data_acquire get');
                modelDataIo.view.update();
                modelDataIo.view.modified_callback();
                return;
            }

            const post_obj = {
                name:"wudi_temporal",
                list: SELECTOR.time.data.required.map(t=>{
                    return {"url": "/wudi", "tim": `${t}`, "type": "json-ser", "name": "wudi_temporal_data", "tck": [0, 0, t]}
                })
            }
            modelDataIo.REQ.post_method_load(post_obj).then(r => modelDataIo.REQ.complete(r));
        },
        set(resource){
            resource.list.forEach(obj => {
                const time_slot = obj.tim === '40' ? 'all' : obj.tim.toString();
                SELECTOR.time.data.loaded.push(time_slot);
                const data = obj.raw.data;
                DATA.RAW[obj.name] = data;
                DATA.TD.points_count = data.length;
                DATA.TD[time_slot] = {'data': data, 'meta': obj.raw.meta};
            });
            //run averager here:
            DATA.temporal_data_process.average('temporal_data_acquire set');
            if (SELECTOR.point.data.selected.length > 0) DATA.temporal_data_acquire.get_points();
            modelDataIo.view.update();
            modelDataIo.view.modified_callback();
        },
        get_points(){
            const post_obj = {
                name: "wudi_point_temporal",
                list: []
            }

            const times_list = [...SELECTOR.time.data.selected];
            times_list.push(...SELECTOR.time.data.year);
            if(!times_list.includes('all')) times_list.unshift('all');
            //const times_list = SELECTOR.time.data.selected.length === 0 ? ['all'] : SELECTOR.time.data.selected;

            for (let t of times_list) {
                const request_points_selected = [];
                for (let p of SELECTOR.point.data.selected) {
                    const time_slot = `${p}-${t}`;
                    if (!DATA.TD.point_cache.hasOwnProperty(time_slot)) {
                        DATA.TD.point_cache[time_slot] = 'waiting';
                        request_points_selected.push(p);
                    }
                }
                if (request_points_selected.length) {
                    post_obj.list.push({
                        "url": "/wudi", "tim": `${t}`, "type": "json-ser", "name": "wudi_daily", "special": request_points_selected
                    });
                }
            }

            SELECTOR.time.data.required = SELECTOR.time.data.selected.filter(s => DATA.TD[s] === undefined);

            // console.log('get_points', ...post_obj.list);
            //
            // Object.keys(DATA.TD.point_cache).map(t=>{
            //     console.log(t);
            // })


            if (post_obj.list.length > 0) {
                modelDataIo.REQ.post_method_load(post_obj).then(r => modelDataIo.REQ.complete(r));
            } else if(SELECTOR.time.data.required.length > 0) {
                console.log('ERROR point_data_acquire get required', SELECTOR.time.data.required);
                //DATA.temporal_data_acquire.get();
            } else {
                //proceed directly to graph because the points are loaded.? #// but what about the metas?
                //wudi_graph_chart_daily();
                DATA.temporal_data_process.average('point_data_acquire get');
                modelDataIo.view.update();
                modelDataIo.view.modified_callback();
                modelDataIo.graph.run();
            }

        },
        set_points(resource){
            resource.list.forEach(obj => {
                // console.log('set_points', obj);

                const request_length = obj.special.length; ///number of points per time.
                const asset_raw_length = obj.raw.data.length;
                const general_length = asset_raw_length / request_length;
                const subset_arrays = array_collide(obj.raw.data, general_length);

                subset_arrays.map((v, n) => {
                    const time_slot = `${obj.special[n]}-${obj.tim}`;
                    DATA.TD.point_cache[time_slot] = {
                        'data': v,
                        'meta': v.length,
                        'id': obj.special[n],
                        'style': jsConfig.graph_styles[obj.tim.length]
                    };
                })
            });
            modelDataIo.graph.run();
            //wudi_graph_chart_daily();
            //const p_hover = vars.selecta.wudi.points.canonical_selection[0];
            //if(vars.selecta.wudi.points.selected.includes(p_hover)) move_to_point(p_hover);
        }
    },
    SD:{
        wudi_points: {},
    },
    TD:{
        point_cache:{},
        current:[],
        aggregate:[],
    },
    RAW:{

    },
    CONF:{

    }
};

const SELECTOR = {
    time: {
        data: {year: [], month: [], selected: [], loaded: [], required: []},
        update_selection(){
            SELECTOR.time.data.selected = [];
            for (let y of SELECTOR.time.data.year) {
                if(SELECTOR.time.data.month.length === 0){
                    // if(!SELECTOR.time.data.selected.includes(y))
                    SELECTOR.time.data.selected.push(y);

                }else{
                    for (let m of SELECTOR.time.data.month) {
                        const timestamp = Number(`${y}${m}`);
                        //if(!SELECTOR.time.data.selected.includes(timestamp))
                        SELECTOR.time.data.selected.push(timestamp);
                    }
                }
            }

            if (SELECTOR.time.data.selected.length > 0) {
                const years_grp = [...SELECTOR.time.data.year];
                const months_grp = [...SELECTOR.time.data.month];
                const n_months = util.to_lexical_range(months_grp, jsConfig.months_str, 'mo');
                modelDataIo.view.title_dom.innerHTML = n_months[0] !== undefined ? n_months + ' ' + util.to_lexical_range(years_grp) : util.to_lexical_range(years_grp);
            }else{
                modelDataIo.view.title_dom.innerHTML = '1979 to 2020';
            }

            //if(modelDataIo.graph.active) modelDataIo.graph.run();

            SELECTOR.time.data.required = SELECTOR.time.data.selected.filter((t) => !SELECTOR.time.data.loaded.includes(t));

            console.log('SELECTOR.time.data', SELECTOR.time.data);

            DATA.temporal_data_acquire.get();
        },
        clear_selection(time_type){
            const target = document.getElementById(time_type + '_container');
            for(let t of target.childNodes){
                t.dataset.selected = 'false';
                t.classList.remove('selected');
            }
            const all_element = document.querySelector(`.time-element[data-type=${time_type}][data-date="all"]`);
            all_element.dataset.selected = 'true';
            all_element.classList.add('selected');
            SELECTOR.time.data[time_type] = [];
            SELECTOR.time.data.selected = [];
        },
        set_month_state(visible){
            const month = document.getElementById('month_container');
            if(visible){
                month.style.display = 'flex';
                month.classList.remove('hidden');
            }else{
                month.style.display = 'none';
                month.classList.add('hidden');
                SELECTOR.time.clear_selection('month');
            }
            modelDataIo.view.redraw();
        },
        select_time(evt) {
            const element = evt.target;
            const select_all = element.dataset.date === 'all';
            const target = document.getElementById(element.dataset.type + '_container');
            const all_selector = document.querySelector(`.time-element[data-type=${element.dataset.type}][data-date="all"]`);

            if(!select_all){
                const isTrueSet = (element.dataset.selected === 'true');
                element.dataset.selected = (!isTrueSet).toString();
                element.classList.toggle('selected');

                all_selector.dataset.selected = 'false';
                all_selector.classList.remove('selected');

                const validator = [...target.childNodes].filter(t => t.dataset.selected === 'true' && t.dataset.date !== 'all');
                if(element.dataset.type === 'year') SELECTOR.time.set_month_state(validator.length > 0);
                if(validator.length === 0) SELECTOR.time.clear_selection(element.dataset.type);
                SELECTOR.time.data[element.dataset.type] = validator.map(t=>t.dataset.date);
            }else{
                if(element.dataset.type === 'year') SELECTOR.time.set_month_state(false);
                SELECTOR.time.clear_selection(element.dataset.type);
            }

            SELECTOR.time.update_selection();

        },
    },
    point:{
        data: {
            selected: [],
        },
        deselect_all(){
            SELECTOR.point.data.selected = [];
        },
        select(pid) {
            const pos = SELECTOR.point.data.selected.indexOf(pid);

            if (pos === -1) {
                SELECTOR.point.data.selected.push(pid);
            }else{
                SELECTOR.point.data.selected.splice(pos, 1);
            }

            DATA.temporal_data_acquire.get_points();
            modelDataIo.init_vars.trace.log('point selection', SELECTOR.point.data.selected);
        }
    },
};

// —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

function SET_DATA_SD(obj, custom_length=null){

    function set(dt, keys, values){
        for(let i=0; i<keys.length;i++){
            dt[keys[i]] = values[i];
        }
        return dt;
    }

    DATA.SD[obj.name] = [];
    let keys, data, count;

    if(custom_length){
        keys = obj.raw[0];
        data = obj.raw.slice(1, obj.raw.length);
        count = obj.raw.length-1;
    }else{
        keys = obj.raw.keys;
        data = obj.raw.data;
        count = obj.raw.data.length;
    }

    for (let i = 0; i < count; i++) {
        const dt = {};//id:i
        //DATA.SD[obj.name].push(set(dt, keys, data[i]));
        DATA.SD[obj.name].push(set(dt, keys, data[i]));
    }


    obj = null;
}

// —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const array_auto = (str) => (new Function(`return [${str}];`)());

const array_collide = (data, len) => {
    const ret = []
    while (data.length) {
        ret.push(data.splice(0, len))
    }
    return ret
}

const request_data_callback = (resource) => {
    if(resource.name === 'wudi_temporal') return DATA.temporal_data_acquire.set(resource);
    if(resource.name === 'wudi_point_temporal') return DATA.temporal_data_acquire.set_points(resource);
    //if(resource.name === 'wudi_point_temporal') return DATA.temporal_data_acquire.set_points(resource);

    resource.list.forEach(obj => {
        if(obj.hasOwnProperty('error')){
            //console.log(obj.error);
        }else {
            switch (obj.type) {
                case 'csv_text':
                    obj.raw = array_collide(array_auto(obj.raw), obj.columns);
                    if (obj.style === 'data') {
                        SET_DATA_SD(obj, obj.columns);
                    } else if (obj.style === 'multi_line') {
                        //save as RAW
                        DATA.RAW[obj.name] = obj;
                    }
                    break;
                case 'json':
                    //save as RAW
                    DATA.RAW[obj.name] = obj;
                    break;
                case 'json-ser':
                    if (obj.name === 'places' || obj.name === 'protected_areas') {
                        console.log(obj);
                        SET_DATA_SD(obj);
                    }
                    if (obj.name === 'wudi_points') {
                        SET_DATA_SD(obj);
                    }
                    if (obj.name === 'wudi_assoc') {
                        SET_DATA_SD(obj);
                    }
                    if (obj.name === 'wudi_temporal_data') {
                        //only used on initial load of "all";
                        DATA.temporal_data_acquire.set({list:[obj]});
                    }
                    if (obj.name === 'wudi_daily') {
                        DATA.temporal_data_acquire.set_points(obj);
                    }
                    break;
                default:
                    const message = `data_callback found no data of type ${obj.type}`;
                    modelDataIo.init_vars.trace.log(message);
                //console.log();
            }
        }
    });
    return true;
}

const REQ = {
    queue_length:0,
    bytes_loaded:0,
    delta_time: null,
    complete(resource){
        resource.list.map(r=>{
            resource.bytes_loaded += r.size;
        });
        const message = `${resource.name} (${resource.list.length}) files. (${util.formatBytes(resource.bytes_loaded)}) completed in ${util.formatMs(resource.delta_time.stop())}`;
        modelDataIo.init_vars.trace.log(message);
        request_data_callback(resource);

        modelDataIo.bytes_loaded_total += resource.bytes_loaded;
        modelDataIo.load_segments.actual ++;
        if(modelDataIo.load_segments.actual === modelDataIo.load_segments.total){
            modelDataIo.init_with_data();
        }
        return true;
    },
    progress_callback(count, obj, obj_asset=null){
        if(count === -1){
            const message = `${obj_asset} ${obj.name} (${util.formatBytes(obj.size)}) ${util.formatMs(obj.timer.stop())}`;
            modelDataIo.init_vars.trace.log(message);
        }
        if(count === 0){ // ⛔️ error!
            const message = `${obj_asset} ${obj.name} ${obj.url} caused an error:"${obj.error}" ${util.formatMs(obj.timer.stop())}`;
            modelDataIo.init_vars.trace.log(message);
        }
    },
    async load(asset_obj){
        asset_obj.list.map(r=>{
            r.timer = timer(r.name).start();
            console.log(r);
        });
        asset_obj.bytes_loaded = 0;
        asset_obj.queue_length = asset_obj.list.length;
        asset_obj.delta_time = timer('loader').start();
        return await loader(asset_obj, REQ.progress_callback);
    },
    async post_method_load(asset_obj){
        asset_obj.list.map(r=>{
            r.timer = timer(r.name).start();
            console.log(r);
        });
        asset_obj.bytes_loaded = 0;
        asset_obj.queue_length = asset_obj.list.length;
        asset_obj.delta_time = timer('loader').start();
        return await post_loader(asset_obj, REQ.progress_callback);
    }
}

export const modelDataIo = {
    model: null,
    graph: null,
    view: null,
    bytes_loaded_total:0,
    load_segments: {
        total:jsConfig.GENERAL_DEBUG ? 3 : 2,
        actual:0
    },
    // 👉️  PHASE ONE
    init(model, view, graph, init_vars){
        modelDataIo.delta_time = timer('modelDataIo init -> init_with_data').start();
        modelDataIo.view = view;
        modelDataIo.graph = graph;
        // modelDataIo.model = model;
        modelDataIo.init_vars = init_vars;

        if(jsConfig.GENERAL_DEBUG) modelDataIo.REQ.load(jsConfig.assets.test).then(r => modelDataIo.REQ.complete(r));

        modelDataIo.REQ.load(jsConfig.assets.static).then(r => modelDataIo.REQ.complete(r));
        modelDataIo.REQ.post_method_load(jsConfig.assets.database).then(r => modelDataIo.REQ.complete(r));
        return true;
    },
    // 👉️ PHASE TWO
    init_with_data(){
        const message = `${modelDataIo.delta_time.var_name} ${util.formatBytes(modelDataIo.bytes_loaded_total)} ${util.formatMs(modelDataIo.delta_time.stop())}`;
        modelDataIo.init_vars.trace.log(message);
        if(jsConfig.GENERAL_DEBUG) {
            console.log(DATA.SD);
            console.log(DATA.TD);
            console.log(DATA.RAW);
        }
        modelDataIo.view.post_init();
        return true;
    },
    DATA,
    SELECTOR,
    REQ,
}