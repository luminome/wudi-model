import {loader, post_loader} from './loader.js';
import windowJsConfig from '../../window-js-config';
import jsConfig from '../../model-js-config';
import * as util from "./util";
import timer from "./timer";

const DATA = {};
const SELECTOR = {
    time: {
        data: {year: ['all'], month: ['all'], has_default: 'all', selected: [], loaded: [], required: []},
        clear_selection(time_type){
            const target = document.getElementById(time_type + '_container');
            for(let t of target.childNodes){
                t.dataset.selected = 'false';
                t.classList.remove('selected');
            }
            const all_element = document.querySelector(`.time-element[data-type=${time_type}][data-date="all"]`);
            all_element.dataset.selected = 'true';
            all_element.classList.add('selected');
        },
        select_time(evt) {
            //#// the amount of code here is awful!
            const element = evt.target;
            const select_all = element.dataset.date === 'all';

            if(!select_all){
                const isTrueSet = (element.dataset.selected === 'true');
                element.dataset.selected = (!isTrueSet).toString();
                element.classList.toggle('selected');
            }else{
                SELECTOR.time.clear_selection('year');
            }

            SELECTOR.time.data.required = [];
            const all_selector = document.querySelector(`.time-element[data-type=${element.dataset.type}][data-date="all"]`);
            const target = document.getElementById(element.dataset.type + '_container');
            const validator = [];

            for(let t of target.childNodes){
                if(select_all){
                    t.dataset.selected = 'false';
                    t.classList.remove('selected');
                }else{
                    if(t.dataset.selected === 'true' && t.dataset.date !== 'all') validator.push(t.dataset.date);
                }
            }

            if(validator.length > 0){
                all_selector.dataset.selected = 'false';
                all_selector.classList.remove('selected');
                if(element.dataset.type === 'year'){
                    document.getElementById('month_container').style.display = 'flex';
                    document.getElementById('month_container').classList.remove('hidden');
                    modelDataIo.view.redraw();
                }
            } else {
                all_selector.dataset.selected = 'true';
                all_selector.classList.add('selected');
                if(element.dataset.type === 'year'){
                    document.getElementById('month_container').style.display = 'none';
                    document.getElementById('month_container').classList.add('hidden');
                    SELECTOR.time.clear_selection('month');
                    modelDataIo.view.redraw();
                }
            }


            console.log(validator);


            /*

            times_select: function (type, element = null) {
            this.times.required = [];
            if (this.times[type].includes(this.times.has_default)) this.times[type] = [];

            if (element) {
                const pos = this.times[type].indexOf(element.data);
                if (pos === -1) {
                    this.times[type].push(element.data);
                } else {
                    this.times[type].splice(pos, 1);
                }
            }

            if (this.times[type].length === 0 && !this.times[type].includes(this.times.has_default)) {
                this.times[type].push(this.times.has_default);
            }

            for (let y of this.times.years) {
                if (y !== 'all' && this.times.months[0] === 'all') this.times.required.push(y.toString());
                for (let m of this.times.months) {
                    const month = y + String(m).padStart(2, '0');
                    if (m !== 'all') this.times.required.push(month);
                }
            }

            this.times.selected = this.times.years[0] === 'all' ? ['all'] : this.times.required;

            this.times.required = this.times.required.filter((t) => !this.times.loaded.includes(t));

            //console.log('this.times', this.times);

            wudi_get_data(this.times.required);

            obs_handler({'T': Object.entries(this.times)});

            vars.dom_time[type].map((y) => y.set_state(this.times[type].includes(y.data)));

            if (this.times.years[0] !== 'all') {
                const years_grp = [...this.times.years];
                const months_grp = [...this.times.months];

                //Y: u/d days per year
                //M: u/d days (August) 2003
                //Ds: daily WUDI values
                //Y: u/d days month of x

                const n_months = util.to_lexical_range(months_grp, 'mo');//.toString();//.trim();
                ///alert(`-${months}-${util.to_lexical_range(years_grp)}`);
                //alert(months.length);
                // console.log(n_months);
                title.innerHTML = n_months[0] !== undefined ? n_months + ' ' + util.to_lexical_range(years_grp) : util.to_lexical_range(years_grp);

                document.getElementById('months_container').style.display = 'flex';
                //document.getElementById('years_container').style.height = '24px';
                //if(vars.view.init_state)
                window_redraw();
            }else{
                title.innerHTML = '1979 to 2020';
                document.getElementById('months_container').style.display = 'none';
                //document.getElementById('years_container').style.height = '48px';
                //if(vars.view.init_state)
                window_redraw();
            }

        },











            //console.log(evt.target);


        }
        */
        },
    },
    wudi:{
        times:{
            loaded:[]
        }
    }
};

class dataClass {
    constructor(pid){
        this.id = pid;
        return this;
    }
    set(keys, values){
        for(let i=0; i<keys.length;i++){
            this[keys[i]] = values[i];
        }
        return this;
    }
}


// —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
function build_data_class_instance(obj, custom_length=null){
    DATA[obj.name] = [];
    let keys, data, count;

    if(custom_length){
        keys = obj.raw.slice(0, custom_length);
        data = obj.raw.slice(0, obj.raw.length-1);
        count = obj.raw.length-1;
    }else{
        keys = obj.raw.keys;
        data = obj.raw.data;
        count = obj.raw.data.length;
    }

    for (let i = 0; i < count; i++) {
        DATA[obj.name].push(new dataClass(i).set(keys, data[i]));
    }
}

function data_to_model(obj) {

}

function wudi_data_to_model(obj) { //wudi_plot

}

function wudi_data_store(obj_list) {
    if (!DATA.hasOwnProperty('wudi_data')) DATA.wudi_data = {points_count: 0, current: []};
    obj_list.forEach(obj => {
        const data = obj.raw.data;
        DATA.wudi_data.points_count = data.length;
        const meta = obj.raw.meta;
        const time_slot = obj.tim === '40' ? 'all' : obj.tim.toString();
        SELECTOR.wudi.times.loaded.push(time_slot);
        DATA.wudi_data[time_slot] = {'data': data, 'meta': meta};
    });
    //run averager here:
    //return wudi_set_data_selection();
}
// —————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————

const array_auto = (str) => (new Function(`return [${str}];`)());

const array_chuk = (data, len) => {
    let ret = []
    while (data.length) {
        ret.push(data.splice(0, len))
    }
    return ret
}

const data_callback = (obj_list) => {
    obj_list.forEach(obj => {
        if(obj.hasOwnProperty('error')){
            //console.log(obj.error);
        }else {
            switch (obj.type) {
                case 'csv_text':
                    obj.raw = array_chuk(array_auto(obj.raw), obj.columns);
                    if (obj.style === 'data') {
                        build_data_class_instance(obj, obj.columns);
                    } else {
                        DATA[obj.name] = obj;
                        data_to_model(obj);
                    }
                    break;
                case 'json':
                    DATA[obj.name] = obj;
                    data_to_model(obj);
                    break;
                case 'json-ser':
                    if (obj.name === 'places_data' || obj.name === 'mpa_s') {
                        DATA[obj.name] = obj;
                        build_data_class_instance(obj);
                        data_to_model(obj);
                    }
                    if (obj.name === 'wudi_points') {
                        DATA[obj.name] = obj;
                        build_data_class_instance(obj);
                        data_to_model(obj);
                    }
                    if (obj.name === 'wudi_assoc') {
                        DATA[obj.name] = obj;
                        build_data_class_instance(obj);
                    }
                    if (obj.name === 'wudi_data') {
                        wudi_data_store([obj]);
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


const req = {
    queue_length:0,
    bytes_loaded:0,
    delta_time: null,
    complete(resource){
        resource.list.map(r=>{
            resource.bytes_loaded += r.size;
        });
        const message = `${resource.name} (${resource.list.length}) files. (${util.formatBytes(resource.bytes_loaded)}) completed in ${util.formatMs(resource.delta_time.stop())}`;
        modelDataIo.init_vars.trace.log(message);
        data_callback(resource.list);

        modelDataIo.bytes_loaded_total += resource.bytes_loaded;
        modelDataIo.load_segments.actual ++;
        if(modelDataIo.load_segments.actual === modelDataIo.load_segments.total){
            modelDataIo.init_with_data();
        }
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
        });
        asset_obj.bytes_loaded = 0;
        asset_obj.queue_length = asset_obj.list.length;
        asset_obj.delta_time = timer('loader').start();
        return await loader(asset_obj, req.progress_callback);
    },
    async post_method_load(asset_obj){
        asset_obj.list.map(r=>{
            r.timer = timer(r.name).start();
        });
        asset_obj.bytes_loaded = 0;
        asset_obj.queue_length = asset_obj.list.length;
        asset_obj.delta_time = timer('loader').start();
        return await post_loader(asset_obj, req.progress_callback);
    }
}

export const modelDataIo = {
    model: null,
    bytes_loaded_total:0,
    load_segments: {
        total:windowJsConfig.debug ? 3 : 2,
        actual:0
    },
    // 👉️  PHASE ONE
    init(model, view, init_vars){
        modelDataIo.delta_time = timer('modelDataIo init -> init_with_data').start();
        modelDataIo.view = view;
        modelDataIo.model = model;
        modelDataIo.init_vars = init_vars;

        if(windowJsConfig.debug) modelDataIo.req.load(jsConfig.assets.test).then(r => modelDataIo.req.complete(r));
        modelDataIo.req.load(jsConfig.assets.static).then(r => modelDataIo.req.complete(r));
        modelDataIo.req.post_method_load(jsConfig.assets.database).then(r => modelDataIo.req.complete(r));
    },
    // 👉️ PHASE TWO
    init_with_data(){
        const message = `${modelDataIo.delta_time.var_name} ${util.formatBytes(modelDataIo.bytes_loaded_total)} ${util.formatMs(modelDataIo.delta_time.stop())}`;
        modelDataIo.init_vars.trace.log(message);
        if(windowJsConfig.debug) {
            console.log(DATA);
        }
    },
    DATA,
    SELECTOR,
    req,
}