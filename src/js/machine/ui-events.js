import {dragControls} from './drags-lite-beta.js';
import {keyControls} from './drags-lite-keys-beta.js';


const evt_reactivity = 200;
const touch = {
    x: null,
    y: null,
    last: {
        x: 0,
        y: 0
    },
    delta: {
        x: 0,
        y: 0
    },
    origin: {
        x: 0,
        y: 0
    },
    origin_last: {
        x: 0,
        y: 0
    },
    origin_delta: {
        x: 0,
        y: 0
    }
}

function keys_event(raw_keys_arr, o){
    o.keys.active = [...raw_keys_arr];
    if (o.keys.active.includes('Tab')) {
        if (!o.keys.previous.includes('Tab')) {
            o.toggle = !o.toggle;
        }
    }
    o.keys.previous = [...o.keys.active];
    if(o.update_function !== null) o.update_function('keys');
}

function screen_event(type, o){
    const m = o.screen;

    m.meta.delta_x = false;
    m.meta.delta_y = false;
    m.meta.roto_x = false;
    m.meta.roto_y = false;
    m.meta.scale_z = false;
    m.meta.pos_x = false;
    m.meta.pos_y = false;
    m.meta.action = false;

    if (m.pointer.event_type === 'touch') {
        m.meta.action = m.pointer.action;
        const primary = m.pointer.touches[0];
        if (m.pointer.touches.length > 1) {
            const secondary = m.pointer.touches[1];
            const x_o = primary.x - secondary.x;
            const y_o = primary.y - secondary.y;
            touch.last.x = touch.x;
            touch.last.y = touch.y;
            touch.x = primary.x - (x_o / 2);
            touch.y = primary.y - (y_o / 2);
            touch.delta.x = touch.last.x === null ? 0 : touch.x - touch.last.x;
            touch.delta.y = touch.last.y === null ? 0 : touch.y - touch.last.y;

            if (m.pointer.action === 'secondary-down') {
                touch.origin.x = touch.x;
                touch.origin.y = touch.y;
            }

            touch.origin_delta.x = touch.origin_last.x - (touch.origin.x - touch.x);
            touch.origin_delta.y = touch.origin_last.y - (touch.origin.y - touch.y);
            touch.origin_last.x = touch.origin.x - touch.x;
            touch.origin_last.y = touch.origin.y - touch.y;

            m.meta.roto_x = m.pointer.angle_delta;
            m.meta.roto_y = touch.origin_delta.y / 100.0;
            m.meta.pos_x = touch.x;
            m.meta.pos_y = touch.y;
            m.meta.delta_x = touch.delta.x;
            m.meta.delta_y = touch.delta.y;
            m.meta.scale_z = 1.0 + m.pointer.dist_delta;

        } else if (m.pointer.touches.length === 1) {
            m.meta.pos_x = primary.x;
            m.meta.pos_y = primary.y;
            m.meta.delta_x = primary.x_d;
            m.meta.delta_y = primary.y_d;
            touch.x = null;
            touch.y = null;
        } else {
            m.meta.pos_x = m.pointer.x;
            m.meta.pos_y = m.pointer.y;
        }

    }

    if (m.pointer.event_type === 'mouse') {

        m.meta.pos_x = m.pointer.actual.x;
        m.meta.pos_y = m.pointer.actual.y;

        m.meta.action = type;

        if (m.pointer.down === true) {
            if (m.pointer.button === 2 || o.keys.active.includes('ShiftLeft') || o.keys.active.includes('ShiftRight')) {
                m.meta.roto_x = m.pointer.delta.x / evt_reactivity;
                m.meta.roto_y = m.pointer.delta.y / evt_reactivity;
            } else {
                m.meta.delta_x = m.pointer.delta.x;
                m.meta.delta_y = m.pointer.delta.y;
            }
        }

        if (m.meta.action === 'scroll') {
            m.meta.scale_z = 1 + (m.pointer.wheel_delta.y / evt_reactivity);
        }
    }

    if(o.update_function !== null) o.update_function('screen');

}

export const events = {
    vars:{
        callback:{
            update_function: null,
            toggle: false,
            keys:{
                active: [],
                previous: []
            },
            screen:{
                meta:{
                    action: false,
                    roto_x: false,
                    roto_y: false,
                    pos_x: false,
                    pos_y: false,
                    delta_x: false,
                    delta_y: false,
                    scale_z: false
                },
                pointer:{

                }
            },
            report(data){
                console.log(data);
            }
        },
    },
    init(dom_element = document.body) {
        dragControls(dom_element, screen_event, events.vars.callback);
        keyControls(window, keys_event, events.vars.callback);
    }
}



