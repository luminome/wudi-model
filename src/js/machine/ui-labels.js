import * as THREE from "three";
import * as util from "./util";
import {controls as CTL} from "./ui-controls";

const objects = {
    hexagonal_shape(scale = 1.0) {
        const v = new Float32Array(21);
        let int = ((Math.PI * 2) / 6);
        for (let i = 0; i < v.length; i += 3) {
            v[i] = (Math.cos((i / 3) * int)) * scale;
            v[i + 1] = (Math.sin((i / 3) * int)) * scale;
            v[i + 2] = 0.0;
        }
        const a_geometry = new THREE.BufferGeometry();
        a_geometry.setAttribute('position', new THREE.BufferAttribute(v, 3));
        a_geometry.setIndex([0, 1, 2, 2, 3, 0, 3, 4, 5, 5, 0, 3]);
        a_geometry.rotateZ(Math.PI / 2);
        return a_geometry;
    },
}

const vc = {
    a: new THREE.Vector3(0, 0, 0),
    b: new THREE.Vector3(0, 0, 0),
    c: new THREE.Vector3(0, 0, 0),
    d: new THREE.Vector3(0, 0, 0),
    e: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 0, 1),
}

const label_maker = {

    dom_label(text, tick, dom){
        function init(){
            L.dom_element.style['position'] = 'absolute';
            L.dom_element.style['color'] = '#FFFF00CC';
            L.dom_element.style.pointerEvents = 'none';
            L.dom_element.innerHTML = L.text;
            L.dom_element.style.display = 'none';
            dom.appendChild(L.dom_element);

            //const ref_geom = objects.hexagonal_shape(0.01);///object.level);
            const ref_mat = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity:0.0,
                color: 0xFFFF00,
                depthWrite: false,
                depthTest: false,
            });

            const pl_geom = new THREE.PlaneGeometry(1,1);
            L.marker_c = new THREE.Mesh(pl_geom, ref_mat);
            L.object.add(L.marker_c);

            const k_flo = [0,0.0,0,0,L.stem,0];
            const line_pos = Float32Array.from(k_flo);//, z => z*0.5);
            const t_geometry = new THREE.BufferGeometry();
            t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
            const t_material = new THREE.LineBasicMaterial({
                color: 0xFFFF00
            });

            L.line = new THREE.Line(t_geometry, t_material);
            L.object.add(L.line);

            L.line.interactive = true;
            L.marker_c.interactive = true;

            L.line.name = 'place_label';
            L.marker_c.name = 'place_label';

            L.state = false;

        }

        function update(cam_obj, layer){
            L.object.visible = L.state;
            L.dom_element.style.display = ['none','block'][+L.state];
            L.marker_c.quaternion.copy(cam_obj.camera.quaternion);

            if(L.state) {
                util.set_buffer_at_index(L.line.geometry.attributes.position.array, 1, [0, L.stem, 0]);
                L.line.geometry.attributes.position.needsUpdate = true;
                L.marker_c.position.set(0.0,L.stem,0.0);

                vc.a.copy(L.object.position).setZ(L.stem);
                const w = cam_obj.model_view_bounds.w;
                const h = cam_obj.model_view_bounds.h;

                layer.localToWorld(vc.a);
                util.projected(vc.a, cam_obj.camera, w, h);

                L.dom_element.innerHTML = L.text;
                L.dom_element.style.fontSize = L.size + 'px';
                const rect = L.dom_element.getBoundingClientRect();

                vc.b.set(vc.a.x - (rect.width / 2), vc.a.y, vc.a.z);
                vc.c.set(vc.a.x, vc.a.y - (rect.height / 2), vc.a.z);

                L.dom_element.style.left = (vc.a.x - (rect.width / 2)) + 'px';
                L.dom_element.style.top = (vc.a.y - (rect.height / 2)) + 'px';

                vc.a.unproject(cam_obj.camera);
                vc.b.unproject(cam_obj.camera);
                vc.c.unproject(cam_obj.camera);

                const skx = vc.a.distanceTo(vc.b);
                const sky = vc.a.distanceTo(vc.c);
                L.marker_c.scale.set((skx/(w/2))*2.2, (sky/(h/2))*2.2, 1.0);
            }
            // L.dom_element.style.left = vc.a.x +'px';
            // L.dom_element.style.top = vc.a.y +'px';

        }

        const L = {
            object:new THREE.Group(),
            mesh:null,
            text:text,
            tick: null,
            stem: 0.25,
            size: 12,
            texture: null,
            marker: null,
            state: true,
            dom_element: document.createElement('div'),
            line_height: 48,
            init,
            update
        }
        return L
    },


    label(text, tick=null){
        function update(){
            const g = L.canvas.getContext('2d');
            L.canvas.width = 512;
            L.canvas.height = 512;
            g.fillStyle = '#000000';
            g.fillRect(0, 0, L.canvas.width, L.canvas.height);
            g.font = `${L.line_height}px Helvetica`;
            g.fillStyle = 'white';

            const wid = g.measureText(L.text).width;
            const asc = g.measureText(L.text).actualBoundingBoxAscent;
            const hgt = asc+g.measureText(L.text).actualBoundingBoxDescent;

            g.fillText(L.text, L.canvas.width/2 - wid/2, L.canvas.height/2 + hgt/2);

            if(L.texture) L.texture.needsUpdate = true;

            //#// nice canvas-based ticks here
            /*
            if(L.tick !== null) {
                const t_x = [0.0, 0.0];
                const t_y = [0.0, 0.0];
                const px = L.canvas.width / 2;
                const py = L.canvas.height / 2;

                switch (L.tick) {
                    case 'L':
                        t_x[0] = 0.0;
                        t_y[0] = py;
                        t_x[1] = (px - wid/2) - (L.line_height / 6.0);
                        t_y[1] = py;
                        break;
                    case 'R':
                        t_x[0] = (px + wid/2) + (L.line_height / 6.0);
                        t_y[0] = py;
                        t_x[1] = L.canvas.width;
                        t_y[1] = py;
                        break;
                    case 'T':
                        t_x[0] = px;
                        t_y[0] = (py - asc) - (L.line_height / 6.0);
                        t_x[1] = px;
                        t_y[1] = 0.0;
                        break;
                    case 'B':
                        t_x[0] = px;
                        t_y[0] = (py + hgt / 2) + (L.line_height / 6.0);
                        t_x[1] = px;
                        t_y[1] = L.canvas.height;
                        break;
                }


                g.strokeStyle = 'white';
                g.lineWidth = 2.5;
                // draw a red line
                g.beginPath();
                g.moveTo(t_x[0], t_y[0]);
                g.lineTo(t_x[1], t_y[1]);
                g.stroke();
            }
            */
        }
        function init(){

            L.update();
            L.object = new THREE.Group();
            //L.object_mesh = new THREE.Group();
            //#//Vector line based ticks handler;
            if(L.tick !== null) {
                let k_flo;

                switch (L.tick) {
                    case 'L':
                        k_flo = [-2.0,0,0,-1,0,0];
                        break;
                    case 'R':
                        k_flo = [1.0,0,0,2.0,0,0];
                        break;
                    case 'T':
                        k_flo = [0,1.0,0,0,2.0,0];
                        break;
                    case 'B':
                        k_flo = [0,-1.0,0,0,-2.0,0];
                        break;
                    case 'I':
                        k_flo = [0,0.0,-1.0,0,0,-2.0];
                        break;
                    case 'O':
                        k_flo = [0,0.0,1.0,0,0,2.0];
                        break;
                }

                const line_pos = Float32Array.from(k_flo, z => z*0.5);
                const t_geometry = new THREE.BufferGeometry();
                t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
                const t_material = new THREE.LineBasicMaterial({
                    color: 0x666666
                });

                L.line = new THREE.Line(t_geometry, t_material);
                L.object.add(L.line);
            }

            // const kn = [[0,0.1,0.0], [0,-0.1,0.0]];
            // for(let n=0; n < 2; n++){
            //     //const label = label_depth.labels[n];
            //     //console.log(label_depth.d, label[0], label[1]);
            //     //console.log(label_depth.d, label[0], label[1]);
            //     const ref_geom = objects.hexagonal_shape(0.1);///object.level);
            //     const ref_mat = new THREE.MeshBasicMaterial({
            //         transparent: true,
            //         opacity:0.7,
            //         color: 0xFF0000,
            //         depthWrite: false,
            //         depthTest: false,
            //     });
            //     const ref_marker = new THREE.Mesh(ref_geom, ref_mat);
            //     ref_marker.position.set(kn[n][0],kn[n][1],kn[n][2]);//copy(map.vc.a);
            //     L.markers.push(ref_marker);
            //     //contours.add(ref_marker);
            //     L.object_mesh.add(ref_marker);
            // }


            L.texture = new THREE.Texture(L.canvas);
            L.texture.needsUpdate = true;

            const l_geometry = new THREE.PlaneGeometry(2,2);
            const l_material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                blending: THREE.AdditiveBlending,
                map: L.texture,
                depthTest: true,
                depthWrite: false,
                opacity:1.0
            });

            L.mesh = new THREE.Mesh(l_geometry, l_material);
            // L.object_mesh.add(L.mesh);
            L.object.add(L.mesh);

        }
        const L = {
            object:null,
            mesh:null,
            text:text,
            tick: tick,
            texture: null,
            markers: [],
            canvas: document.createElement('canvas'),
            line_height: 48,
            init,
            update
        }
        return L
    }

}

export default label_maker;




// const labels = {
//     init: false,
//     all: [],
//     axes:{
//         x:[],
//         y:[],
//         z:[]
//     },
//     bounds:{
//         x:[-360,0],
//         z:[-90,90],
//         y:[0,100]
//     },
//     object: new THREE.Group(),
//     label(text, tick=null){
//         function update(){
//             const g = L.canvas.getContext('2d');
//             L.canvas.width = 256;
//             L.canvas.height = 256;
//             g.fillStyle = '#000000';
//             g.fillRect(0, 0, L.canvas.width, L.canvas.height);
//             g.font = `${L.line_height}px Helvetica`;
//             g.fillStyle = 'white';
//
//             const wid = g.measureText(L.text).width;
//             const asc = g.measureText(L.text).actualBoundingBoxAscent;
//             const hgt = asc+g.measureText(L.text).actualBoundingBoxDescent;
//
//             g.fillText(L.text, L.canvas.width/2 - wid/2, L.canvas.height/2 + hgt/2);
//
//             if(L.texture) L.texture.needsUpdate = true;
//
//             //#// nice canvas-based ticks here
//             /*
//             if(L.tick !== null) {
//                 const t_x = [0.0, 0.0];
//                 const t_y = [0.0, 0.0];
//                 const px = L.canvas.width / 2;
//                 const py = L.canvas.height / 2;
//
//                 switch (L.tick) {
//                     case 'L':
//                         t_x[0] = 0.0;
//                         t_y[0] = py;
//                         t_x[1] = (px - wid/2) - (L.line_height / 6.0);
//                         t_y[1] = py;
//                         break;
//                     case 'R':
//                         t_x[0] = (px + wid/2) + (L.line_height / 6.0);
//                         t_y[0] = py;
//                         t_x[1] = L.canvas.width;
//                         t_y[1] = py;
//                         break;
//                     case 'T':
//                         t_x[0] = px;
//                         t_y[0] = (py - asc) - (L.line_height / 6.0);
//                         t_x[1] = px;
//                         t_y[1] = 0.0;
//                         break;
//                     case 'B':
//                         t_x[0] = px;
//                         t_y[0] = (py + hgt / 2) + (L.line_height / 6.0);
//                         t_x[1] = px;
//                         t_y[1] = L.canvas.height;
//                         break;
//                 }
//
//
//                 g.strokeStyle = 'white';
//                 g.lineWidth = 2.5;
//                 // draw a red line
//                 g.beginPath();
//                 g.moveTo(t_x[0], t_y[0]);
//                 g.lineTo(t_x[1], t_y[1]);
//                 g.stroke();
//             }
//             */
//         }
//         function init(){
//
//             L.update();
//             L.object = new THREE.Group();
//             //#//Vector line based ticks handler;
//             if(L.tick !== null) {
//                 let k_flo;
//
//                 switch (L.tick) {
//                     case 'L':
//                         k_flo = [-2.0,0,0,-1,0,0];
//                         break;
//                     case 'R':
//                         k_flo = [1.0,0,0,2.0,0,0];
//                         break;
//                     case 'T':
//                         k_flo = [0,1.0,0,0,2.0,0];
//                         break;
//                     case 'B':
//                         k_flo = [0,-1.0,0,0,-2.0,0];
//                         break;
//                     case 'I':
//                         k_flo = [0,0.0,-1.0,0,0,-2.0];
//                         break;
//                     case 'O':
//                         k_flo = [0,0.0,1.0,0,0,2.0];
//                         break;
//                 }
//
//                 const line_pos = Float32Array.from(k_flo, z => z*0.5);
//                 const t_geometry = new THREE.BufferGeometry();
//                 t_geometry.setAttribute('position', new THREE.BufferAttribute(line_pos, 3));
//                 const t_material = new THREE.LineBasicMaterial({
//                     color: 0x666666
//                 });
//
//                 L.line = new THREE.Line(t_geometry, t_material);
//                 L.object.add(L.line);
//             }
//
//             L.texture = new THREE.Texture(L.canvas);
//             L.texture.needsUpdate = true;
//
//             const l_geometry = new THREE.PlaneGeometry(2,2);
//             const l_material = new THREE.MeshBasicMaterial({
//                 color: 0xffffff,
//                 transparent: true,
//                 blending: THREE.AdditiveBlending,
//                 map: L.texture,
//                 depthTest: true,
//                 depthWrite: false,
//                 opacity:1.0
//             });
//
//             L.mesh = new THREE.Mesh(l_geometry, l_material);
//             L.object.add(L.mesh);
//
//         }
//         const L = {
//             object:null,
//             mesh:null,
//             text:text,
//             tick: tick,
//             texture: null,
//             canvas: document.createElement('canvas'),
//             line_height: 48,
//             init,
//             update
//         }
//         return L
//     },
//     render(axis, interval, origin, tick, is_range, do_look=true, faces=null){
//         if(is_range === true) {
//             for (let n = labels.bounds[axis][0]; n <= labels.bounds[axis][1]; n += interval) {
//                 const label = labels.label(n, tick);
//                 label.init();
//                 const interval_n = Math.abs(labels.bounds[axis][0]) + n;
//                 const interval_scale = labels.bounds[axis][0] === 0 ? labels.bounds[axis][1] / df.model.bounds[axis] : Math.abs(labels.bounds[axis][0]) / df.model.bounds[axis];
//                 label.look = do_look;
//                 label.object.position.copy(origin);
//                 label.object.position[axis] = interval_n / interval_scale;
//                 labels.object.add(label.object);
//                 labels.all.push(label);
//             }
//         }else{
//             const label = labels.label(is_range, tick);
//             label.init();
//             label.look = do_look;
//             if(faces!==null){
//                 vc.e.copy(directions[faces]);
//                 label.mesh.lookAt(vc.e);
//             }
//             label.object.position.copy(origin);
//             labels.object.add(label.object);
//             labels.all.push(label);
//             return label;
//         }
//     },
//     make_label_object(text){
//
//         labels.bounds.y[1] = df.model.data_max;
//
//         vc.a.set(0.0,0.0,(df.model.bounds.z*2.0)+1.0);
//         labels.render('x', 30.0, vc.a, 'I', true);
//
//         vc.a.set(-1.0,0.0,0.0);
//         labels.render('z', 15.0, vc.a, 'R', true);
//
//         vc.a.set(df.model.bounds.x+1.0,0.0,(df.model.bounds.z*2.0));
//         labels.render('y', 20.0, vc.a, 'L', true);
//
//         vc.a.set(df.model.bounds.x,df.model.bounds.y+1.0,0.0);
//         labels.render(null, null, vc.a, 'B', 'GMT');
//
//         vc.a.set(0.0,df.model.bounds.y+1.0,0.0);
//         labels.render(null, null, vc.a, 'B', 'GMT+24');
//
//         vc.a.set(df.model.bounds.x+1.0, 0.0, df.model.bounds.z);
//         labels.render(null, null, vc.a, 'L', 'EQUATOR', false, 'up');
//
//         vc.a.set((df.model.bounds.x/2.0),df.model.bounds.y+1.0,0.0);
//         labels.render(null, null, vc.a, 'B', 'NORTH', false);
//
//         vc.a.set((df.model.bounds.x/2.0),0.0,(df.model.bounds.z*2.0)+2.0);
//         labels.render(null, null, vc.a, null, 'ºEAST', false, 'up');
//
//         vc.a.set(df.model.bounds.x+2.0,df.model.bounds.y/2.0,(df.model.bounds.z*2.0));
//         labels.render(null, null, vc.a, null, 'CTIPe', false);
//
//         df.model.world_bounds.add(labels.object);
//
//         labels.init = true;
//     },
// }
