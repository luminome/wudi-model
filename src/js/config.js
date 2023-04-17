const path_prefix = '/data/'; ///Users/sac/Sites/wudi-model-update/data/static-build-products/'
const jsConfig = {
    colors: {
        up_welling:'#0000FF',
        down_welling:'#FF0000',
        hybrid_welling:'#FFFFFF',
        up_welling_text:'#6666FF',
        down_welling_text:'#FF6666',
        mpa_s_designated:'#009900',
        mpa_s_proposed:'#00AAFF',
        places:'#FFFF00',
        iso_bath:'#CCCCCC',
        info_bk_opacity: 0.85,
        window: '#1D2733',
        window_overlay: '#1D2733CC',
        view_elements: '#CCCCCC',
        view_elements_text: '#888888',
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
    graph_obj_height: 140,
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
    line_strings: {
        limit_distance: 10.0,
    },
    polygons: {
        limit_distance: 20.0,
    },
    contours: {
        depth_max: 5000.0,
        limit_distance: 20.0, //20.0,
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
        depthMeshMaterial: {
            type: 'MeshBasicMaterial', //'MeshStandardMaterial', //MeshBasicMaterial
            dict: {
                // transparent: true,
                // opacity:1.0,
                // color: 0x222222,
                side: 'FrontSide',
                // depthTest: false,
                // depthWrite: true,
                // wireFrame: true,
                // flatShading: true,
                // metalness: 0.0,
                // roughness: 0.85,

            }
        },
        polygonsMaterial: {
            type: 'MeshBasicMaterial',
            dict: {
                color: 0x222222,
                side: 'FrontSide',
                depthTest: true,
                depthWrite: true
            }
        },
        contours: {
            type: 'LineBasicMaterial',
            dict: {
                color: 0x333366,  //222222
            }
        },
        line_strings: {
            type: 'LineBasicMaterial',
            dict: {
                color: 0x777777
            }
        }
    },
    levels: 4,
    depth_max: 5000.0,
    assets:{
        test:{
            name: 'debug_test_data',
            list: [{url: path_prefix+'data_test.json', type: 'json', name:'test', size:0}]
        },
        database:{
            name: 'database_queries',
            list: [
                {"url": "/map", "table": "places", "type": "json-ser", "name": "places", "style":"point", "tck": [0, 0, 0], "geom_index": 11},
                {"url": "/map", "table": "protected_areas", "type": "json-ser", "name": "protected_areas", "style":"point", "tck": [0, 0, 0]},
                {"url": "/map", "table": "geo_associations", "type": "json-ser", "name": "wudi_assoc", "tck": [0, 0, 0]},
                {"url": "/wudi", "table": "wudi_points", "type": "json-ser", "name": "wudi_points", "tck": [0, 0, 0]},
                {"url": "/wudi", "tim": "40", "type": "json-ser", "name": "wudi_temporal_data", "tck": [0, 0, 40]},
            ],
        },
        static:{
            // map-eco-regions-11.txt
            // map-geo-names-2.txt
            // map-iso-bath-200-1.txt

            name: 'static_datasets',
            list: [
                {url: path_prefix+'map-geo-names-2.txt', type: 'csv_text', name: 'geonames', columns: 2, size:0, style: 'data', geom_index: 0},
                //{url: './data/raw-isobath-100m-1.txt', type: 'csv_text', name: 'iso_bath', columns: 1, size:0, style: 'multi_line', geom_index: 0},
                {url: path_prefix+'map-iso-bath-200-1.txt', type: 'csv_text', name: 'iso_bath', columns: 1, size:0, style: 'multi_line', geom_index: 0},
                {url: path_prefix+'map-eco-regions-11.txt', type: 'csv_text', name: 'georegions', columns: 11, size:0, style: 'data', geom_index: 0}
            ]
        }
    },
    graph_styles: {3:'all', 4:'year', 6:'month', 8:'daily'},
    wudi_type_array: [{item:'up_welling',label:'up'}, {item:'down_welling',label:'down'}],
    wudi_selecta_stem_pixels: 50,
	bar_scale: 0.2,
	bar_scale_width: 0.5,
	point_scale: 0.025,
	wudi_point_scale: 0.005,
	wudi_UPWthr: 0.4325,
	wudi_DNWthr: -0.3905,
    show_ground_plane_box: false,
    iso_bath_opacity: 0.5,
    bounds: [-7.0, 29.0, 37.0, 49.0],
    sector_degree_scale: 2.0,
    degree_scale_str: 'deg_2',
    static_path: path_prefix, //"/data",
    map_sectors_layers: {
        draw: true,
        allow: ['polygons', 'depth_maps', 'protected_areas'], ///  'line_strings', 'depth_maps'], //'meshes'], //, ''contours', mpa_s'], //, 'meshes'] 'polygons', 'line_strings',
    },
    GENERAL_DEBUG: true,
    MAP_DEBUG: false,
    DEBUG_TRACE_INITIAL_STATE: false,
    map_axes_active: true,
    keys_table:{
		places: (d, ref) => {
			return {
				'name': d.townLabel,
				'lon': d.lon,
				'lat': d.lat,
				'population': d.population,
				'country': d.countryLabel,
				'region': d.regionLabels,
				'georegion': ref,
				'water': d.waterLabels,
				'area': d.area ? d.area+'km sq.' : null,
				'type': d.type,
				'openstreet': d.node ? `<a class="darklink" href="https://www.openstreetmap.org/node/${d.node}" target="new">${d.node}</a>` : null,
				'wikidata': d.source ? `<a class="darklink" href="https://www.wikidata.org/wiki/${d.source}" target="new">${d.source}</a>` : null,
				'is capital': d.capital === 'yes' ? d.capital : null
			}
		},
		protected_areas: (d, ref=null) => {
			return{
				'website': d.WEBSITE ? `<a class="darklink" href="${d.WEBSITE}" target="new">${d.WEBSITE}</a>` : null,
				'lon': d.CENTROID[0],
				'lat': d.CENTROID[1],
				'year': d.STATUS_YR,
				'status': d.STATUS_ENG,
				'country': d.COUNTRY,
				'region': d.MED_REGION,
				'mapamed id': d.MAPAMED_ID,
				'site type': d.SITE_TYPE_ENG,
				'designation': d.DESIG_ENG,
				'IUCN category': d.IUCN_CAT_ENG,
				'area': d.REP_AREA ? d.REP_AREA+'km sq.' : null
			}
		}
	},
    months_str: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    active_layers: {
        wudi_points: true,
        places: true,
        protected_areas: false,
        iso_bath: false
    },
    data_source_masked_indices: true,
    camera_auto_rotate_default: true,
    protected_areas_default: true,
    places_default: true,
    contours_default: true,
}


export default jsConfig