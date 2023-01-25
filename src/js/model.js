import * as THREE from "three";
import * as config from '../window-config';

const axis_markers_count = 21;
const axis_dir_x = new THREE.Vector3(0, 0, 1);
const axis_dir_y = new THREE.Vector3(-1, 0, 0);
const z_mants = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0];


const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0)
}


export const model = {
    max_allowable_zoom: 10.0,
    grid_resolution: null,
    axis_planes: [],
    ticks_dom: document.getElementById('model-plot-ticks'),
    make_position_mark(radius) {
        const curve = new THREE.EllipseCurve(
            0, 0,            // ax, aY
            radius, radius,           // xRadius, yRadius
            0, 2 * Math.PI,  // aStartAngle, aEndAngle
            true,            // aClockwise
            0                 // aRotation
        );

        curve.updateArcLengths();

        const points = curve.getPoints(201);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        const material = new THREE.LineDashedMaterial({
            color: 0x00FF00,
            linewidth: 1,
            scale: 1,
            dashSize: radius * 0.1,
            gapSize: radius * 0.1,
        });

        // Create the final object to add to the scene
        const line = new THREE.Line(geometry, material);
        line.userData.radius = radius;
        line.computeLineDistances();
        line.rotateX(Math.PI / 2);
        return line;
    },
    make_ticks_divs() {
        const marks = [];
        for (let i = 0; i < axis_markers_count; i++) {
            const mark = document.createElement('div');
            mark.classList.add('dmark');
            mark.innerHTML = '0.0';
            mark.style.color = 'gray';//vars.colors.hex_css(vars.colors.chart_tick);
            mark.style.backgroundColor = config.colors.window_overlay;
            //document.body.appendChild(mark);
            model.ticks_dom.appendChild(mark);
            marks.push(mark);
        }
        return marks;
    },
    run_optics(camObj){
        camObj.camera_scale = 1 - (camObj.distance / model.max_allowable_zoom);
        const zg = Math.floor(Math.log(camObj.distance)) + 1;
        model.grid_resolution = z_mants[zg];
    },
    run_ticks_axes(axis, tick_index, swap = null) {
        const basis = {x: 'x', z: 'z'};
        const axes = [axis_dir_x, axis_dir_y];

        if (swap) {
            basis.x = 'z';
            basis.z = 'x';
        }

        const tick_n = Math.round((user_position.round[basis[axis]]) / grid_resolution) * grid_resolution + ((tick_index - ((axis_markers_count - 1) / 2)) * grid_resolution);

        if (basis[axis] === 'x') {
            vw.set(tick_n, 0, -30 * Math.sign(axes[0].z));
            vk.set(0, 0, axes[0].z);
        } else {
            vw.set(-30 * Math.sign(axes[1].x), 0, tick_n);
            vk.set(axes[1].x, 0, 0);
        }

        if (axis === 'z') {
            if (vw.dot(cam_right) < 0) {
                vk.negate();
                if (vk.x !== 0) vw.x *= -1.0;
                if (vk.z !== 0) vw.z *= -1.0;
            }
        }
        return tick_n;
    },
    run_ticks(camObj) {
        //for wudi points handling
        vars.selecta.wudi.points.dom_handles.map(dh => {
            dh.draw();
        })

        let swap = false;
        vw.set(0, 0, Math.sign(camera_projected.z));
        vk.set(Math.sign(camera_projected.x), 0, 0);

        if (camera_projected.angleTo(vk) < camera_projected.angleTo(vw)) {
            swap = true;
        }

        if (Math.abs(camera_projected.x) < 0.01 || Math.abs(camera_projected.z) < 0.01) {
            axis_dir_y.set(-Math.sign(cam_dot_z), 0, 0).normalize();
            axis_dir_x.set(0, 0, Math.sign(cam_dot_x)).normalize();
        } else {
            axis_dir_y.set(-1 * Math.sign(camera_projected.x), 0, 0);
            axis_dir_x.set(0, 0, -1 * Math.sign(camera_projected.z));
        }

        //if(vars.helpers_active) arrow_helper_4.setDirection(cam_right);

        for (let plane of axis_planes) {
            if (swap) {
                ticks.card = plane.name === 'x' ? 'N' : 'E';
            } else {
                ticks.card = plane.name === 'x' ? 'E' : 'N';
            }
            for (let m = 0; m < axis_markers_count; m++) {
                //plane.markers_geoms.children[m].position.set(0, 1, 0);
                ticks.n = run_ticks_axes(plane.name, m, swap);

                ray_caster.set(vw, vk);
                ticks.res = ray_caster.ray.intersectPlane(plane.plane, vu);
                plane.markers_divs[m].style.display = ticks.res === null ? 'none' : 'block';

                if (ticks.res !== null) {
                    projected(vu);
                    ticks.offset = ticks.card === 'E' ? vars.map.offset.x : -vars.map.offset.y+vars.view.map_vertical_deg_offset;

                    plane.markers_divs[m].innerHTML = `${(ticks.n + ticks.offset).toFixed(grid_resolution < 1 ? 2 : 0)}º ${ticks.card}`;

                    ticks.rect = plane.markers_divs[m].getBoundingClientRect();
                    if (plane.name === 'x') {
                        ticks.left = (vu.x - (ticks.rect.width / 2));
                        ticks.top = (vars.view.height - vars.view.x_axis_inset) - (ticks.rect.height / 2);
                    } else {
                        ticks.left = vars.view.y_axis_inset;
                        ticks.top = (vu.y - (ticks.rect.height / 2));
                    }
                    plane.markers_divs[m].style.left = ticks.left + 'px';
                    plane.markers_divs[m].style.top = ticks.top + 'px';

                    const cas = (ticks.top > vars.view.height || ticks.top < 0 || ticks.left > vars.view.width || ticks.left < 0);
                    plane.markers_divs[m].style.display = display_array[+!cas];
                }
            }
        }
        //obs_handler({'F': vars.view.width, 'S': sum});
    }

}