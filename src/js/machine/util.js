import * as THREE from "three";

export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1000; // 1024
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
export function formatMs(ms, decimals = 2) {
    if (!+ms) return '0 ms';
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['ms', 's', 'm'];
    const scales = [1, 1000, 60000];
    let i = 0;
    if(ms >= 1000) i = 1;
    if(ms >= 60000) i = 2;
    return `${i === 0 ? ms : (ms/scales[i]).toFixed(dm)} ${sizes[i]}`;
}
export const average = array => array.reduce((a, b) => a + b) / array.length;
export const deg_to_rad = deg => deg*Math.PI/180;
export const rad_to_deg = rad => rad*180/Math.PI;
export const color_to_hex = color => Number(`0x${color.toString().slice(1,color.length)}`);
export function obj_to_download(content, filename, automatic=false) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(content));
    const a = document.createElement('a') // Create "a" element
    a.setAttribute("href", dataStr);
    a.setAttribute("download", filename);
    a.setAttribute("title", filename);
    a.innerHTML = `download ${filename}`;
    if(automatic!==false){
        a.click(); ///automates
        return false;
    }else{
        return a;
    }
}
export const get_buffer_at_index = (obj, index) => {
    return [
        obj[index*3],
        obj[index*3+1],
        obj[index*3+2]
    ]
}
export const set_buffer_at_index = (obj, index, array) => {
    obj[index*3] = array[0];
    obj[index*3+1] = array[1];
    obj[index*3+2] = array[2];
}

export const v3_from_buffer = (obj, i, v) => {
    v.set(obj[i*3], obj[i*3+1], obj[i*3+2]);
}

export const point_in_poly = (point, pX, pY) => {
    //#//poly is special
    let x = point.x;
    let y = point.y;
    let j = pX.length - 1;
    let odd = false;

    for (let i = 0; i < pX.length; i++) {
        if ((pY[i] < y && pY[j] >= y || pY[j] < y && pY[i] >= y) && (pX[i] <= x || pX[j] <= x)) {
            odd ^= (pX[i] + (y - pY[i]) * (pX[j] - pX[i]) / (pY[j] - pY[i])) < x;
        }
        j = i;
    }
    return odd;
}

export const split_buffer = (s, n) => {
    const output = [];
    for (let i = 0; i < s.length/3; i++) {
        output.push(s.slice(i*3, i*3+n));
    }
    return(output);
}

export const polar_mapper = {
    cartesian2polar: function (position) {
        let r = Math.sqrt(position.x * position.x + position.z * position.z + position.y * position.y);
        let x = Math.round(position.x * 10000) / 10000,
            z = Math.round(position.z * 10000) / 10000;

        if (x === -0) {
            x = 0;
        }
        if (z === -0) {
            z = 0;
        }

        return ({
            r: r,
            phi: Math.acos(position.y / r),
            theta: Math.atan2(z, x)
        });
    },
    polar2canvas: function (polarPoint) {
        return ({
            y: polarPoint.phi / Math.PI,
            x: (polarPoint.theta + Math.PI) / (2 * Math.PI)
        })
    }
}

export const gauss = {
    makeGaussKernel(sigma){
        const GAUSS_KERN = 6.0;
        const dim = ~~(Math.max(3.0, GAUSS_KERN * sigma));
        const sqrtSigmaPi2 = Math.sqrt(Math.PI * 2.0) * sigma;
        const s2 = 2.0 * sigma * sigma;
        let sum = 0.0;

        const kernel = new Float32Array(dim - !(dim & 1)); // Make it odd number
        const half = ~~(kernel.length / 2);
        for (let j = 0, i = -half; j < kernel.length; i++, j++) {
            kernel[j] = Math.exp(-(i * i) / (s2)) / sqrtSigmaPi2;
            sum += kernel[j];
        }
        // Normalize the gaussian kernel to prevent image darkening/brightening
        for (let i = 0; i < dim; i++) {
            kernel[i] /= sum;
        }
        return kernel;
    },
    gauss_internal(data_object, kernel, ch, gray) {
        const data = data_object.data;
        const w = data_object.w;
        const h = data_object.h;
        const buff = new Uint8Array(w * h);
        const mk = Math.floor(kernel.length / 2);
        const kl = kernel.length;

        // First step process columns
        for (let j = 0, hw = 0; j < h; j++, hw += w) {
            for (let i = 0; i < w; i++) {
                let sum = 0;
                for (let k = 0; k < kl; k++) {
                    let col = i + (k - mk);
                    col = (col < 0) ? 0 : ((col >= w) ? w - 1 : col);
                    sum += data[(hw + col)] * kernel[k];
                }
                buff[hw + i] = sum;
            }
        }
        // Second step process rows
        for (let j = 0, offset = 0; j < h; j++, offset += w) {
            for (let i = 0; i < w; i++) {
                let sum = 0;
                for (let k = 0; k < kl; k++) {
                    let row = j + (k - mk);
                    row = (row < 0) ? 0 : ((row >= h) ? h - 1 : row);
                    sum += buff[(row * w + i)] * kernel[k];
                }
                data[(j * w + i)] = sum;
            }
        }
    },
    filter(grid, sigma){
        let raw = new Float32Array(grid.length*grid[0].length);

        for (let i=0;i<grid.length;i++){
            for (let j=0;j<grid[i].length;j++) {
                raw[i*grid[0].length+j] = grid[i][j];
            }
        }

        const data_object = {
            data: raw,
            w:grid[0].length,
            h:grid.length
        }

        const kernel = gauss.makeGaussKernel(sigma);
        gauss.gauss_internal(data_object, kernel, 0, false);
        return data_object;
    }
}

export const projected = (v, camObj, vw, vh) => {
    v.project(camObj);
    v.setX((v.x + 1) * (vw / 2));
    v.setY((v.y - 1) * (vh / -2));
}

export const coords_from_array = (array, add_z = 0.0) => {
    const build_coords = (coords_flat) => {
        let buffer = [];
        if(Array.isArray(coords_flat)) {
            for (let i = 0; i < coords_flat.length; i += 2) {
                buffer.push(coords_flat[i], coords_flat[i + 1], add_z);
            }
        }
        return buffer;
    }

    let coords = [];
    for (let a of array) {
        if (a.length === 1) {
            coords.push(build_coords(a[0]));
        } else {
            for (let b of a) {
                coords.push(build_coords(b));
            }
        }
    }
    return coords;
}

export const shape_from_array = (array) =>{
    const exterior_points = [];
    for (let p = 0; p < array.length; p += 2) {
        exterior_points.push(new THREE.Vector2(array[p]*1.0, array[p + 1]*1.0));
    }
    return new THREE.Shape(exterior_points);
}

export const to_lexical_range = (numbers, months_str, type=null) => {
	//http://jsfiddle.net/sandro_paganotti/4zx73csv/1/
    const sorted = numbers.sort(function(a,b){return a-b;});
    const first = sorted.shift();
    return sorted.reduce(function(ranges, num){
        if(num - ranges[0][1] <= 1){
            ranges[0][1] = num;
        } else {
            ranges.unshift([num, num]);
        }
        return ranges;
    },[[first,first]]).map(function(ranges){
		if(ranges[0] === ranges[1]){
			return type ? months_str[ranges[1]-1] : ranges[0].toString();
		}else{
			return type ? ranges.map(r => months_str[r-1]).join('-') : ranges[0]+'-'+ranges[1].toString().substr(2,2);
		}
    }).reverse();
}