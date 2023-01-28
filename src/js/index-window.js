// import * as util from './util';
import * as config from '../window-config';

const display_array = ['none', 'block'];

const page_handle = document.getElementById("page-handle-icon");
const model_controls = document.getElementById('model-controls');
const bounds = document.getElementById('bounds');
const bounds_overlay = document.getElementById('bounds-overlay');
const intro_box = document.getElementById('intro-box');
const instructions_slide = document.getElementById('intro-instructions');
const intro_slide = document.getElementById('intro');

//#// object to handle html page-context functions.
const page = {
    instructions_active: false,
    interaction_state: false,
    started_interaction: false,
    init_events(){
        // document.getElementById('recenter').addEventListener('mouseup', control_recenter_map);
        // document.getElementById('camera-motion').addEventListener('mouseup', control_camera_behavior);
        // document.getElementById('navigation').addEventListener('mouseup', control_navigation_state);
        document.getElementById('instructions').addEventListener('mouseup', page.toggle_instructions);
        document.getElementById('instructions').param = 'instructions-control';
        // document.getElementById('mpa_s').addEventListener('mouseup', control_mpa_s_state);

        window.onscroll = page.scroll;

        page_handle.addEventListener('mouseup', page.handle_interaction, false);
        bounds_overlay.addEventListener('mouseup', page.handle_interaction, false);

        page.intro_button.addEventListener('mouseup', page.state_control);
        page.instructions_button.addEventListener('mouseup', page.state_control);

    },
    init_dom(){
        const buttons = [...document.querySelectorAll(".button")];
        buttons.map(b => {
            const svg_check_zero = document.getElementById("check-box-0").cloneNode(true);
            const svg_check_one = document.getElementById("check-box-1").cloneNode(true);
            b.insertBefore(svg_check_one, b.firstChild);
            b.insertBefore(svg_check_zero, b.firstChild);
            const r_col = config.colors[b.id];
            b.style.fill = r_col;
            b.style.color = r_col;
        });

        const graph_controls_items = {
            'graph-close': 'check-box-1',
            'graph-download': 'download-icon'
        }

        Object.entries(graph_controls_items).map(kv => {
            const el = document.getElementById(kv[0]);
            const legend_mark = document.getElementById(kv[1]);
            const kma = legend_mark.cloneNode(true);
            kma.removeAttribute('id');
            el.appendChild(kma);
        });

        const legend_elements = {
            'places':'basic-hexagon',
            'mpa_s_designated':'mpa-shape',
            'mpa_s_proposed':'mpa-shape',
            'isobath':'isobath-shape'
        };

        Object.entries(legend_elements).map(kv => {
            const el = document.getElementById(kv[0]);
            const legend_mark = document.getElementById(kv[1]);
            const kma = legend_mark.cloneNode(true);
            kma.removeAttribute('id');
            kma.style.width = '24px';
            kma.style.height = '24px';
            kma.style.fill = config.colors[kv[0]];
            el.appendChild(kma);
        });

        [...model_controls.querySelectorAll('.control-button')].map(cd =>{
            const control_item = cd.cloneNode(true);
            const target = instructions_slide.querySelectorAll('.icon-'+control_item.id)[0];
            control_item.className = "";
            control_item.classList.add('instructions-icon');
            control_item.removeAttribute('id');
            target.prepend(control_item);
        });

        [{t:'up',s:'none'},{t:'down',s:'block'}].map(t=>{
            const page_handle_svg = document.getElementById('h-bar-'+t.t);
            page_handle_svg.style.display = t.s;
            page_handle.appendChild(page_handle_svg);
        });

        page.intro_button = document.getElementById('intro-button');
        page.intro_button.param = 'intro';

        page.instructions_button = document.getElementById('instructions-button');
        page.instructions_button.param = 'instructions';

        [...document.querySelectorAll('.is-overlay')].map(wp => {
            wp.style.backgroundColor = config.colors.window_overlay;
        });

    },
    init(){
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const w = window.innerWidth;
        const h = window.innerHeight;
        const handle_box = page_handle.getBoundingClientRect();
        bounds.style.height = h-handle_box.height + 'px';
        intro_box.style.height = h-handle_box.height + 'px';
        page.init_dom();
        page.init_events();

        if(config.debug) page.state_open();
    },
    interaction_pause(state=false){
        page.interaction_state = state;
        const s = bounds_overlay.style;
        s.display = display_array[+state];
    },
    toggle_instructions(override=false){
        if(typeof override !== "boolean"){
            console.log(override);
            if(this.id === 'instructions' && !page.started_interaction) return page.state_control(override);
            this.classList.toggle('control-toggle');
            page.instructions_active = !page.instructions_active;
        }else{
            page.instructions_active = override;
        }
        instructions_slide.style.display = display_array[+page.instructions_active];
        page.interaction_pause(page.instructions_active);
    },
    handle_icon_update(state){
        const states = ['down','up'];
        const t_s = states[+state];
        states.map(t=>{
            const page_handle_svg = document.getElementById('h-bar-'+t);
            page_handle_svg.style.display = t === t_s ? 'block' : 'none';
        });
    },
    scroll(evt){
        evt.preventDefault();
        const h_state = window.scrollY > 0;
        page.interaction_state = h_state;
        page.handle_icon_update(h_state);
        if(page.started_interaction && !page.instructions_active) page.interaction_pause(h_state);
    },
    handle_interaction(evt){
        evt.preventDefault();
        if(evt.target.id === 'bounds-overlay' && !page.started_interaction) return;
        const h_state = window.scrollY === 0;
        if(!h_state){
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }else{
            const handle_box = page_handle.getBoundingClientRect();
            window.scrollTo({ top: handle_box.top, behavior: 'smooth' });
        }
    },
    state_open(){
        intro_slide.style.display = 'none';
        model_controls.classList.remove('hidden');
        instructions_slide.style.display = 'none';
        const instructions_control = document.getElementById('instructions');
        instructions_control.classList.remove('active');
        page.instructions_button.style.display = 'none';
        page.interaction_pause(false);
        page.started_interaction = true;
    },
    state_control(evt){
        const from_control = evt.target.hasOwnProperty('param') ? evt.target : evt.target.closest('.control-button');
        console.log(from_control,from_control.param);

        if(from_control.param === 'intro'){
            intro_slide.style.display = 'none';
            instructions_slide.style.display = 'block';
            model_controls.classList.remove('hidden');

        }else if(from_control.param === 'instructions' || from_control.param === 'instructions-control'){
            page.state_open();
        }
    },
    scroll_to_downloads(){
        const box = document.getElementById('output').getBoundingClientRect();
        window.scrollTo({ top: box.top, behavior: 'smooth' });
    }
}


window.addEventListener('DOMContentLoaded', (event) => {
    console.log('dom loaded. continuing');
    page.init();
});
