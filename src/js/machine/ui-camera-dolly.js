import * as THREE from "three";

// const vk = new THREE.Vector3();
const vw = new THREE.Vector3();
// const vu = new THREE.Vector3();
// const vc = new THREE.Vector3();
const y_up = new THREE.Vector3(0, 1, 0);
// const x_right = new THREE.Vector3(1, 0, 0);
// const z_in = new THREE.Vector3(0, 0, 1);

const mover = {
    name: 'synthetic_displacement',
    d: new THREE.Vector3(),
    d_mem: 0,
    z_amt: 0,
    z_sta: 0,
    ac: new THREE.Vector3(),
    vl: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    del_pos: new THREE.Vector3(),
    tgt: new THREE.Vector3(),
    move_vector: null,
    attenuation: 0.991,///;///99725,//;//75,
    speed: 0.09,
    vd: 0,
    rv: 0,
    is_moving: false,
    is_rotating: false,
    stopped: false,
    update_callback: null,
    roto: {
        object: null,
        control: null,
        position: null,
        offset: new THREE.Vector3(),
        target: new THREE.Vector3(),
        amount: null,
        delta: 0,
        last: 0,
        direction: 1
    },
    ctr: {
        t: 0.0,
        set(at){
            //#//catch att the transforms on user_position.actual.
            //#//why is this blocking?

            if(mover.is_moving){
                mover.ctr.t = at;
                mover.move();
                mover.move_vector.copy(mover.pos);
            }

            if(mover.is_rotating){
                mover.rotate();
            }

            if(!mover.is_rotating && !mover.is_moving && !mover.stopped) {
                mover.stopped = true;
            }

            if(mover.is_rotating || mover.is_moving){
                mover.stopped = false;
                mover.update_callback('screen');
            }

            return mover.stopped;
        }
    },
    cancel(){
        //called by any drag event.
        this.is_moving = false;
        this.is_rotating = false;
        this.d.set(0,0,0);
        this.vl.set(0,0,0);
    },
    set_target(control_vector, target_pos, zoom=null){
        console.log('set_target', mover.pos);

        //mover.pos.copy(control_vector);
        mover.move_vector = control_vector; //inherit
        mover.tgt.copy(target_pos);

        vw.subVectors(mover.tgt, mover.pos);
        mover.d_mem = vw.length();
        mover.speed = 0.015625;//0.0125;/// mover.d_mem/500;

        if(zoom) {
            mover.z_sta = mover.camera.base_pos.z;
            mover.z_amt = mover.z_sta-zoom;
        }else{
            mover.z_sta = null;
        }
        mover.is_moving = true;
    },
    set_rotation_target(target_offset, is_angle=null){
        //console.log(mover.model.camera_auto_rotate);
        if(!mover.model.userData.camera_auto_rotate) return;
        mover.is_rotating = true;
        mover.roto.object = mover.camera.cube;

        if(is_angle === null) {
            let r = mover.camera.projected.angleTo(target_offset);
            mover.roto.direction = (target_offset.dot(mover.camera.right) >= 0) ? -1 : 1;
            mover.roto.amount = r;
        }else{
            mover.roto.direction = Math.sign(target_offset)*-1;
            mover.roto.amount = Math.abs(target_offset);// + mover.roto.last);
        }
        mover.roto.delta = 0;
        mover.roto.last = 0;
    },
    rotate(){
        const m = mover.prog_perc;//d.length();
        const d = (mover.roto.amount*(1-(m/mover.d_mem)));//percentage of distance traveled.
        const r = d - mover.roto.last;
        mover.roto.object.rotateOnWorldAxis(y_up, r*mover.roto.direction);

        mover.roto.last = d;
    },
    move(){
        const t_delta = mover.ctr.t*1000;
        vw.subVectors(mover.tgt, mover.pos);
        mover.d.copy(vw).multiplyScalar(mover.attenuation);
        mover.prog_perc = vw.length();// / mover.d_mem;

        const m = mover.d.length();

        const delta_p = vw.subVectors(mover.del_pos, mover.pos).length(); ///mover.del_pos.distanceTo(mover.pos);

        mover.vd =  delta_p / t_delta;
        const r = 1 - (mover.vd * t_delta) / m;
        mover.ac.copy(mover.d).normalize().multiplyScalar(mover.speed);

        if (r >= 0) mover.vl.add(mover.ac).multiplyScalar(r);
        //mover.vl.multiplyScalar(0.99);
        //##what is stop ?1!
        

        //if (mover.prog_perc < 0.001){ //mover.m < mover.ac.length()){ ///mover.speed/100) {//0.0001){
        //    mover.is_rotating = false;
        //    mover.is_moving = false;
        //    return;
        // }

        mover.del_pos.copy(mover.pos);
        mover.pos.add(mover.vl);


        //if(this.z_sta !== null) mover.camera.base_pos.z = this.z_sta-(this.z_amt*(1-(m/this.d_mem)));
    }
}

export const uiCameraDolly = {
    t:null,
    mover,
    animate(t){
        uiCameraDolly.mover.ctr.set(t);
    },
    init(model, camera, update_callback){
        uiCameraDolly.mover.model = model;
        uiCameraDolly.mover.camera = camera;
        uiCameraDolly.mover.update_callback = update_callback;
        console.log('test', uiCameraDolly.mover.update_callback());
    },
}