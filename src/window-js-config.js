const windowJsConfig = {
    debug: true,
    colors: {
        down_welling:'#0000FF',
        up_welling:'#FF0000',
        mpa_s_designated:'#00FF00',
        mpa_s_proposed:'#00CC00',
        places:'#FFFF00',
        iso_bath:'#CCCCCC',
        info_bk_opacity: 0.85,
        window: '#1D2733',
        window_overlay: '#1D2733CC',
        view_elements: '#666666',
        contours: {
            select: [0x4444CC, 0x4444CC]
        },
        eco_regions:{
            select: [0xFFFFFF, 0x000000]
        },
        wudi:{
            select: [0x660066, 0xFF00FF]
        }
    },
    bounds_bottom_offset: 20,
    graph_obj_height: 120,
    dom_references:{
        "q-nav-bar": {
            on: false,
            name: 'nav'
        },
        "graph-obj-bar": {
            on: true,
            name: 'graph'
        },
        "title-bar": {
            on: true,
            name: 'title'
        },
        "times-bar": {
            on: true,
            name: 'times'
        },
    },
    months_str: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

}

export default windowJsConfig

