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
}

export default {jsConfig}