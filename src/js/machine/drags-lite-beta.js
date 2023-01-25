/*
Custom Reusable Drag Code
Dan Ellis 2020
*/
// import './vendor/modernizr-3.11.2.min.js';

export function dragControls(dome_element, dragAction, kva) {
    //TOUCHES
    const ongoingTouches = [];
    const ongoingTouchesMeta = {};

    const t_meta = {
        buffer: 6.0,
        hover_state: false,
        origin: {x: 0, y: 0},
        delta: {x: 0, y: 0},
        dist: 0,
        delta_dist: 0,
        angle: 0,
        delta_angle: 0,
        dist_delta: 0,
        angle_delta: 0,
        lag: 0,
        set_pos(x,y) {
            t_meta.origin.x = x;
            t_meta.origin.y = y;
        },
        reset() {
            t_meta.delta.x = 0;
            t_meta.delta.y = 0;
            t_meta.dist = 0;
            t_meta.delta_dist = 0;
            t_meta.angle = 0;
            t_meta.delta_angle = 0;
            t_meta.dist_delta = 0;
            t_meta.angle_delta = 0;
            t_meta.hover_state = false;
        }
    }

    // const t_meta = kva.t_meta;

    const alarm = {
        remind(aMessage) {
            t_meta.hover_state = true;
            touch_relay(null,'touch-hover');
            this.timeoutID = undefined;
        },

        setup() {
            if (typeof this.timeoutID === 'number') {
                this.cancel();
            }

            this.timeoutID = setTimeout(function (msg) {
                this.remind(msg);
            }.bind(this), 500, null);
        },

        cancel() {
            clearTimeout(this.timeoutID);
            return false;
        }
    };

    //window.addEventListener('click', () => alarm.setup());

    function get_touch_distance() {
        const d_x = Math.pow((ongoingTouches[0].pageX - ongoingTouches[1].pageX), 2);
        const d_y = Math.pow((ongoingTouches[0].pageY - ongoingTouches[1].pageY), 2);
        return Math.sqrt(d_x + d_y);
    }

    function get_touch_angle() {
        const d_x = (ongoingTouches[0].pageX - ongoingTouches[1].pageX);
        const d_y = (ongoingTouches[0].pageY - ongoingTouches[1].pageY);
        return Math.atan2(d_y, d_x);// * (180 / Math.PI);
    }

    function get_touch_delta(touch, id) {
        const d_x = (touch.pageX - ongoingTouches[id].pageX);
        const d_y = (touch.pageY - ongoingTouches[id].pageY);
        return {x: d_x, y: d_y};
    }

    function copyTouch(touch) {
        return {identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY};
    }

    function ongoingTouchIndexById(idToFind) {
        for (let i = 0; i < ongoingTouches.length; i++) {
            const id = ongoingTouches[i].identifier;
            if (id === idToFind) {
                return i;
            }
        }
        return -1;
    }



    function touch_relay(evt, method = null) {
        //evt.preventDefault();
        //evt.stopPropagation();

        const touches = ongoingTouches.map(t => {
            return {
                id: t.identifier,
                x: t.pageX,
                y: t.pageY,
                x_o: ongoingTouchesMeta[t.identifier].origin.x,
                y_o: ongoingTouchesMeta[t.identifier].origin.y,
                x_d: ongoingTouchesMeta[t.identifier].delta.x,
                y_d: ongoingTouchesMeta[t.identifier].delta.y
            }
        });

        const packet = {
            'event_type': 'touch',
            'touches': touches,
            'dist_delta': t_meta.delta_dist,
            'angle_delta': t_meta.delta_angle,
            'action': method,
            'd': t_meta.dist_delta,
            'a': t_meta.angle_delta,
            'lag': t_meta.lag,
            x: t_meta.origin.x,
            y: t_meta.origin.y,
            'evt':evt
        };

        kva.screen.pointer = packet;
        dragAction('touch', kva);
        return false;
    }

    function touch_move(evt) {
        //

        //evt.preventDefault();
        //evt.stopPropagation();
        const touches = evt.changedTouches;

        for (let i = 0; i < touches.length; i++) {
            const idx = ongoingTouchIndexById(touches[i].identifier);
            ongoingTouchesMeta[touches[i].identifier].delta = get_touch_delta(touches[i], idx);
            ongoingTouches.splice(idx, 1, copyTouch(touches[i], idx));
        }

        if (evt.touches.length === 2) {
            const t_d = (get_touch_distance() / t_meta.dist);
            const t_a = (t_meta.angle - get_touch_angle());
            t_meta.delta_dist = t_meta.dist_delta === 0 ? 0 : t_meta.dist_delta - t_d;
            t_meta.delta_angle = t_meta.angle_delta === 0 ? 0 : t_meta.angle_delta - t_a;
            t_meta.dist_delta = t_d;
            t_meta.angle_delta = t_a;
        }

        if(evt.touches.length === 1){
            const final = evt.touches[0];
            if ((Math.abs(final.pageX - t_meta.origin.x) >= t_meta.buffer) && (Math.abs(final.pageY - t_meta.origin.y) >= t_meta.buffer)) {
                alarm.cancel();
            }
        }

        touch_relay(evt, 'drag');
    }

    function touch_down(evt) {
        alarm.setup();
        //evt.preventDefault();
        //evt.stopPropagation();


        const touches = evt.changedTouches;
        //new Date().toISOString()
        for (let i = 0; i < touches.length; i++) {
            const k_touch = copyTouch(touches[i]);
            ongoingTouches.push(copyTouch(touches[i]));
            ongoingTouchesMeta[touches[i].identifier] = {origin: {x: k_touch.pageX, y: k_touch.pageY}, delta: {x: 0, y: 0}};
        }

        t_meta.lag += 1;

        if (evt.touches.length === 1) {
            t_meta.origin.x = evt.touches[0].pageX;
            t_meta.origin.y = evt.touches[0].pageY;
            touch_relay(evt, 'down');
        } else if (evt.touches.length === 2) {
            t_meta.dist = get_touch_distance();
            t_meta.angle = get_touch_angle();
            touch_relay(evt, 'secondary-down');
        }


    }

    function touch_up(evt) {
        alarm.cancel();
        //evt.preventDefault();
        //evt.stopPropagation();


        const touches = evt.changedTouches;

        for (let i = 0; i < touches.length; i++) {
            let idx = ongoingTouchIndexById(touches[i].identifier);
            delete ongoingTouchesMeta[touches[i].identifier];
            ongoingTouches.splice(idx, 1);
        }

        if (evt.touches.length === 0) {
            const final = touches[0];
            //console.log(evt); this is not in evt but in changedTouches.
            if (!t_meta.hover_state && (Math.abs(final.pageX - t_meta.origin.x) <= t_meta.buffer) && (Math.abs(final.pageY - t_meta.origin.y) <= t_meta.buffer)) {
                t_meta.reset();
                t_meta.set_pos(final.pageX, final.pageY);
                touch_relay(evt, 'touch-click');
            } else {
                t_meta.reset();
                t_meta.set_pos(final.pageX, final.pageY);
                touch_relay(evt, 'up');
            }
        } else {
            t_meta.reset();
            touch_relay(evt, 'secondary-up');
        }
    }

    //MOUSE POINTER

    kva.screen.pointer = {
        event_type: 'mouse',
        button:null,
        down:null,
        actual:{x:null, y:null},
        delta:{x:null, y:null},
        mod_delta:{x:null, y:null},
        origin: {x:null, y:null},
        wheel_delta: {x:null, y:null},
        evt:null
    }

    const pointer = kva.screen.pointer;

    function pointer_relay(evt, mode_flag){
        pointer.evt = evt;
        dragAction(mode_flag, kva);
        return false;
    }



    function pointer_scale(evt) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        pointer.wheel_delta.x = evt.deltaX;
        pointer.wheel_delta.y = evt.deltaY;
        pointer_relay(evt, 'scroll');
        return false;
    }

    function pointer_move(evt) {
        evt.preventDefault();
        pointer.delta.x = evt.clientX-pointer.actual.x;
        pointer.delta.y = evt.clientY-pointer.actual.y;
        pointer.actual.x = evt.clientX;
        pointer.actual.y = evt.clientY;

        //pointer.moved = true;

        if (pointer.down) {
            pointer.mod_delta.x = evt.clientX-pointer.origin.x;
            pointer.mod_delta.y = evt.clientY-pointer.origin.y;
            pointer_relay(evt, 'drag');
        }else{
            pointer_relay(evt, 'move');
        }
        return false;
    }

    function pointer_down(evt) {
        //alarm.setup();

        evt.preventDefault();
        pointer.button = evt.button;
        pointer.down = true;
        pointer.actual.x = evt.clientX;
        pointer.actual.y = evt.clientY;
        pointer.origin.x = evt.clientX;
        pointer.origin.y = evt.clientY;

        //pointer.moved = false;
        pointer_relay(evt, 'down');
        //dragAction('down', {actual: {x: pointer_x, y: pointer_y}, delta: {x: null, y: null}});
        return false;
    }

    function pointer_context(evt){
        evt.preventDefault();
        return false;
    }

    function pointer_up(evt) {
        //alarm.cancel();

        evt.preventDefault();
        let deltaX = pointer.actual.x - pointer.origin.x,
            deltaY = pointer.actual.y - pointer.origin.y;

        const d = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
        let mode_flag = (d < 2.0) ? 'click' : 'up';
        pointer.down = false;
        pointer_relay(evt, mode_flag);
        //dragAction(mode, {actual: {x: pointer_x, y: pointer_y}, delta: {x: null, y: null}});
        return false;
    }

    function pointer_cancel(evt) {
        evt.preventDefault();
        pointer.down = false;
        pointer_relay(evt, 'cancel');
        return false;
    }

    dome_element.disable_wheel = function(){
        dome_element.removeEventListener('wheel', pointer_scale, { capture: false });
    }

    //mouse
    dome_element.addEventListener('wheel', pointer_scale, false);//,  Modernizr.passiveeventlisteners ? {passive: true} : false);
    dome_element.addEventListener('mousemove', pointer_move, false);//, Modernizr.passiveeventlisteners ? {passive: true} : false);
    dome_element.addEventListener('mousedown', pointer_down, false);//, Modernizr.passiveeventlisteners ? {passive: true} : false);
    dome_element.addEventListener('mouseup', pointer_up, false);//, Modernizr.passiveeventlisteners ? {passive: true} : false);
    dome_element.addEventListener('mouseleave', pointer_cancel, false);//, Modernizr.passiveeventlisteners ? {passive: true} : false);
    dome_element.addEventListener('contextmenu', pointer_context, false);//, Modernizr.passiveeventlisteners ? {passive: true} : false);

    // dome_element.addEventListener('wheel', pointer_scale,  Modernizr.passiveeventlisteners ? {passive: true} : false);
    // dome_element.addEventListener('mousemove', pointer_move, Modernizr.passiveeventlisteners ? {passive: true} : false);
    // dome_element.addEventListener('mousedown', pointer_down, Modernizr.passiveeventlisteners ? {passive: true} : false);
    // dome_element.addEventListener('mouseup', pointer_up, Modernizr.passiveeventlisteners ? {passive: true} : false);
    // dome_element.addEventListener('mouseleave', pointer_cancel, Modernizr.passiveeventlisteners ? {passive: true} : false);
    // dome_element.addEventListener('contextmenu', pointer_context, Modernizr.passiveeventlisteners ? {passive: true} : false);

    //touch
    dome_element.addEventListener('touchmove', touch_move, false);
    dome_element.addEventListener('touchstart', touch_down, false);
    dome_element.addEventListener('touchcancel', touch_up, false);
    dome_element.addEventListener('touchend', touch_up, false);

}
