const jsConfig = {
    line_strings: {
        limit_distance: 50.0,
    },
    polygons: {
        limit_distance: 50.0,
    },
    contours: {
        depth_max: 5000.0,
        limit_distance: 50.0,
    },
    mats: {
        mapMarkersMaterial: {
            type: 'MeshBasicMaterial',
            dict: {
                color: 0xFF00FF,
                side: 'DoubleSide',
                transparent: true,
                opacity: 1.0
            }
        },
        mpaMaterial: {
            type: 'MeshBasicMaterial',
            dict: {
                color: 0x00FF00,
                side: 'FrontSide',
                transparent: true,
                depthTest: false,
                depthWrite: false,
                opacity: 0.25
            }
        },
        polygonsMaterial: {
            type: 'MeshBasicMaterial',
            dict: {
                color: 0x444444,
                side: 'FrontSide',
            }
        },
        contours: {
            type: 'LineBasicMaterial',
            dict: {
                color: 0x222222
            }
        },
        line_strings: {
            type: 'LineBasicMaterial',
            dict: {
                color: 0x777777
            }
        }
    },
    DEBUG: false,
    levels: 4,
    assets:{
        test:{
            name: 'debug_test_data',
            list: [{url: '/data/data_test.json', type: 'json', name:'test', size:0}]
        },
        database:{
            name: 'database_queries',
            list: [
                {"url": "/map", "table": "places_test", "type": "json-ser", "name": "places_data", "style":"point", "tck": [0, 0, 0], "geom_index": 11},
                {"url": "/map", "table": "protected_regions", "type": "json-ser", "name": "mpa_s", "style":"point", "tck": [0, 0, 0]},
                {"url": "/wudi", "table": "turn_table", "type": "json-ser", "name": "wudi_points", "tck": [0, 0, 0]},
                {"url": "/wudi", "table": "assoc", "type": "json-ser", "name": "wudi_assoc", "tck": [0, 0, 0]},
                {"url": "/wudi", "tim": "40", "type": "json-ser", "name": "wudi_temporal_data", "tck": [0, 0, 40]},
            ],
        },
        static:{
            name: 'static_datasets',
            list: [
                {url: './data/v2-raw-geonames-1.txt', type: 'csv_text', name: 'geonames', columns: 1, size:0, style: 'data', geom_index: 0},
                {url: './data/raw-isobath-100m-1.txt', type: 'csv_text', name: 'iso_bath', columns: 1, size:0, style: 'multi_line', geom_index: 0},
                {url: './data/raw-georegions-11.txt', type: 'csv_text', name: 'georegions', columns: 11, size:0, style: 'data', geom_index: 0}
            ]
        }
    },
    graph_styles: {3:'all', 4:'year', 6:'month', 8:'daily'},
    wudi_selecta_stem_pixels: 50,
	bar_scale: 0.2,
	bar_scale_width: 0.5,
	point_scale: 0.025,
	wudi_point_scale: 0.005,
	wudi_UPWthr: 0.4325,
	wudi_DNWthr: -0.3905,
}

export default jsConfig