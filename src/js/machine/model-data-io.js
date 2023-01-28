import {loader, post_loader} from './loader.js';
import * as window_config from '../../window-config';
import jsConfig from '../../model-js-config';
import * as util from "./util";
import timer from "./timer";

const DATA = {};
const SELECTOR = {
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
    if(window_config.debug) {
        console.log(DATA);
    }
    return true;
}


const req = {
    queue_length:0,
    bytes_loaded:0,
    delta_time: null,
    complete(resource){
        resource.map(r=>{
            req.bytes_loaded += r.size;
        });
        const message = `(${resource.length}) files. (${util.formatBytes(req.bytes_loaded)}) completed in ${util.formatMs(req.delta_time.stop())}`;
        modelDataIo.init_vars.trace.log(message);
        data_callback(resource);
    },
    progress_callback(count, obj){
        if(count === -1){
            const message = `${obj.name} (${util.formatBytes(obj.size)}) ${util.formatMs(obj.timer.stop())}`;
            modelDataIo.init_vars.trace.log(message);
        }
        if(count === 0){
            //error!
            const message = `${obj.name} ${obj.url} caused an error:"${obj.error}" ${util.formatMs(obj.timer.stop())}`;
            modelDataIo.init_vars.trace.log(message);
        }
    },
    async load(obj_array){
        obj_array.map(r=>{
            r.timer = timer(r.name).start();
        });
        req.queue_length = obj_array.length;
        req.delta_time = timer('loader').start();
        return await loader(obj_array, req.progress_callback);
    },
    async post_method_load(obj_array){
        obj_array.map(r=>{
            r.timer = timer(r.name).start();
        });
        req.queue_length = obj_array.length;
        req.delta_time = timer('loader').start();
        return await post_loader(obj_array, req.progress_callback);
    }
}

export const modelDataIo = {
    model: null,
    init(model, init_vars){
        modelDataIo.model = model;
        modelDataIo.init_vars = init_vars;
        if(window_config.debug) {
            const test_on = [{url: '/data/data_test.json', type: 'json', name:'test', size:0}];
            modelDataIo.req.load(test_on).then(r => modelDataIo.req.complete(r));
        }
        //console.log(jsConfig);
        modelDataIo.req.load(jsConfig.static_data).then(r => modelDataIo.req.complete(r));
        modelDataIo.req.post_method_load(jsConfig.database_queries).then(r => modelDataIo.req.complete(r));
    },
    DATA,
    SELECTOR,
    req,
}