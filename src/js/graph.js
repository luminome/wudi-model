import jsConfig from "./config";

const out = document.getElementById('obs');
const dom_source = document.getElementById("graph");
const dom_marker = document.getElementById("graph-mark");
const dom_marker_value = document.getElementById("graph-mark-value");
const dom_title = document.getElementById("graph-title");

let operational_context = null;

const g = {
	selected: null,
	last_selected: null,
    vis: {
        pad:22,
		gutter:{left:32,bottom:24},
        stroke: "#666666",
        stroke_high: "#CCCCCC",
		legend_text: "white",
		stroke_data: "white",
		// mean_color: "#FF00FF",
		// bar_up: "#0000AA",
		// bar_up_select: "#0000FF",
		// bar_down: "#AA0000",
		// bar_down_select: "#FF0000",
        font_siz:12
    },
	data_width:null,
	mants: [0.25, 0.5, 1.0, 5.0, 25.0, 50.0, 100.0],
	log: (og) => {
		out.innerHTML += '</br>graph:</br>';
		Object.entries(og).map(g => out.innerHTML += g+'</br>');
	},
}

class Bar {
	constructor(n, data, x, y, w, h) {
		this.id = n;
		this.data = data;
		this.color = Math.sign(data) > 0 ? g.vis.bar_up : g.vis.bar_down;
		this.color_select = Math.sign(data) > 0 ? g.vis.bar_up_select : g.vis.bar_down_select;
		this.color_text = Math.sign(data) > 0 ? g.vis.bar_up_text : g.vis.bar_down_text;
		this.rect = {x:(x),y:(y),x2:(x+w),y2:(y+h),w:(w-1),h:(h)};
		this.special = null;
		this.updown = Math.sign(data);
		//this.rect = {x:parseInt(x),y:parseInt(y),x2:parseInt(x+w),y2:parseInt(y+h),w:parseInt(w),h:parseInt(h)};
		return this;
	}

	draw = (_ctx, select = null, special = null) => {
		_ctx.lineWidth = 0;
		_ctx.strokeStyle = null;
		_ctx.fillStyle = select || this.special ? this.color_select : this.color;
		_ctx.clearRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
		_ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
		if(this.special !== null){
			_ctx.fillStyle = '#FFFFFF55';
			//_ctx.clearRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
			// if(this.updown === 'down') _ctx.fillRect(this.rect.x, this.rect.y-this.special, this.rect.w, this.rect.h+this.special);
			// if(this.updown === 'up') _ctx.fillRect(this.rect.x, this.rect.y+this.special, this.rect.w, this.rect.h-this.special);
			_ctx.fillRect(this.rect.x, this.rect.y-this.special, this.rect.w, this.rect.h+this.special);
			// _ctx.fillStyle = '#FFFFFF11';
			// _ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, (this.updown*-1)*this.rect.y);
		}


		return this;
	}
}

function get_range(m, axis){
	const diff = (m[1]-m[0]);//*2.0;
	let zg = Math.floor(Math.log(diff));//-1;// + 1;

	const gr = zg < 0 ? g.mants[0] : g.mants[zg];
	let hi = m[1] === 0 ? 0.0 : Math.ceil(m[1]/gr)*gr;
	let lo = m[0] === 0 ? 0.0 : Math.ceil(Math.abs(m[0])*10)/-10;

	if(hi % 2 !== 0 && axis === 'y' && zg > 1) hi+=gr;
	if(lo % 2 !== 0 && axis === 'y' && zg > 1) lo-=gr;

	let range = Math.ceil((hi-lo)/gr);
	//range += (axis === 'y' && range % 2 !== 0) ? 1 : 0;
	//g.log({d:diff, g:gr, z:zg, hi:hi, lo:lo});

	const out_range = [];
	const mxy = Math.ceil(m[1]/gr)*gr;
	const miy = (Math.ceil(Math.abs(m[0])/gr)*gr)*-1;

	// if(axis === 'y') {
	// 	alert(gr+' '+mxy+' '+miy);
	// }

	//

	for(let c = 0; c <= range; c++){
		const mark = Math.round(((hi)-(c*gr))*1000)/1000;
		if(axis === 'y'){
			const cond = (Number.isInteger(mark) && mark % 2 === 0);
			if((mark <= mxy || cond) && mark >= miy){
				out_range.push(mark);
			}

		}else{
			out_range.push(mark);
		}
		//if(m[1])

	}
	return {r:out_range, mant:gr};
}

function make_axes_and_grid(_ctx, data){

	const x_range_arr = get_range(data.xlim, 'x');
	x_range_arr.r.reverse();
	const y_range_arr = get_range(data.ylim, 'y');
	console.log(data);

	g.data_width = x_range_arr.r[x_range_arr.r.length-1];//data.data[0].length;
	// console.log('x_range_arr', x_range_arr, g.data_width);

    const x_range_inc_px = (g.w-((g.vis.pad)+g.vis.gutter.left))/(x_range_arr.r.length-1);
    const y_range_inc_px = (g.h-((g.vis.pad)+g.vis.gutter.bottom))/(y_range_arr.r.length-1);

	let y_zero = null;
	let tick_mant = 1;

	const x_interval_px = Math.round(x_range_inc_px/x_range_arr.mant)*x_range_arr.mant;
	const y_interval_px = Math.round(y_range_inc_px);//y_range_inc_px/y_range_arr.mant)*y_range_arr.mant;

    for(let xva = 0; xva < x_range_arr.r.length-1; xva++) {
        const x_off = xva*x_interval_px;
        _ctx.strokeStyle = g.vis.stroke;
        _ctx.beginPath();
        _ctx.moveTo(g.vis.gutter.left+x_off, g.vis.pad);
        _ctx.lineTo(g.vis.gutter.left+x_off, g.h - g.vis.gutter.bottom);
        _ctx.stroke();

		const metrics = _ctx.measureText(x_range_arr.r[xva]);
		if(Math.round(metrics.width) >= x_interval_px) tick_mant = 2;

		if(xva % tick_mant === 0){
	        _ctx.font = `${g.vis.font_siz}px heavy_data`;
	        _ctx.textAlign = 'left';
	        _ctx.fillStyle = g.vis.legend_text;///"#00ff00";//+ (g.vis.font_siz / 2)
			const label = g.style === 'year' ? jsConfig.months_str[x_range_arr.r[xva]] : g.x_range_start+x_range_arr.r[xva];
	        _ctx.fillText(label, (g.vis.gutter.left+x_off), (g.h-(g.vis.gutter.bottom/2)) + (g.vis.font_siz / 2.0) );
    	}
	}



	tick_mant = 1;
	const intervals = [];
	if(Math.sign(y_range_arr.r[0]) === -1) y_range_arr.r.unshift(0);
    for(let yva = 0; yva < y_range_arr.r.length; yva++) {

        const y_off = yva*y_interval_px;

		if(y_range_arr.r[yva] === 0){
			y_zero = g.vis.pad+y_off;
			_ctx.lineWidth = 2;
			_ctx.strokeStyle = g.vis.stroke_high;
		}else{
			_ctx.lineWidth = 1;
			_ctx.strokeStyle = g.vis.stroke;
		}

		const m = _ctx.measureText(y_range_arr.r[yva]);
		const ht = (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)*0.8;
		//g.log({ht:ht, i:y_interval_px});
		if(ht+2 > y_interval_px) tick_mant = 2;
		//if(y_range_arr.r.length > 10) tick_mant = 4;
		///if(ht+4 > y_interval_px) tick_mant = 3;

		if(yva % tick_mant === 0){
			intervals.push(y_range_arr.r[yva]);
			_ctx.beginPath();
			_ctx.moveTo(g.vis.gutter.left, g.vis.pad+y_off);
			_ctx.lineTo(g.w - g.vis.pad, g.vis.pad+y_off);
			_ctx.stroke();

	        _ctx.font = `${g.vis.font_siz}px heavy_data`;
	        _ctx.textAlign = 'right';

			const kfi = [g.vis.bar_up_text, g.vis.bar_down_text][+(y_range_arr.r[yva] < 0)];

	        _ctx.fillStyle = y_range_arr.r[yva] === 0 ? g.vis.legend_text : kfi;///"#00ff00";
	        _ctx.fillText(g.style === 'month' ? y_range_arr.r[yva]:Math.abs(y_range_arr.r[yva]), g.vis.gutter.left - (g.vis.font_siz / 2.0), (g.vis.pad + y_off) + (g.vis.font_siz / 2.0) );
		}

    }

	console.log(intervals, y_range_arr.r, intervals.includes(0));
	if(!intervals.includes(0)){
		const yva = y_range_arr.r.indexOf(0);
		const y_off = yva*y_interval_px;
		_ctx.lineWidth = 2;
		_ctx.strokeStyle = g.vis.stroke_high;
		_ctx.beginPath();
		_ctx.moveTo(g.vis.gutter.left, g.vis.pad+y_off);
		_ctx.lineTo(g.w - g.vis.pad, g.vis.pad+y_off);
		_ctx.stroke();
	}


    return {
		x0:g.vis.gutter.left,
		y0:y_zero,
		xM:x_range_arr.mant,
		yM:y_range_arr.mant,
		xP:x_interval_px,
		yP:y_interval_px
	};
}

function plot(_ctx, grid, data){
	_ctx.strokeStyle = g.vis.stroke_data;
	_ctx.lineWidth = 2;
	g.bars_array = [];

	///console.log('plot', data);
	//const w_px_inc = Math.floor(g.g_rect.w/data.data[0].length)-2.0;
	//const w_px_inc = (g.g_rect.w/data.data[0].length);
	const limits = {};
	const thr = ['up', 'down'];

	if(g.style === 'month') {
		for (let t of thr) {
			// console.log(g['wudi_th_' + t]);
			limits[t] = ((g['wudi_th_' + t] * grid.yP) / grid.yM);
		}
	}

	// console.log(limits);
	// console.log(data.mean);

	const w_px_inc = Math.floor(grid.xP/grid.xM);//(g.g_rect.w/data.data[0].length);

	for(let p = 0; p < data.data[0].length; p++) {
        const x = Math.floor(grid.x0 + Math.floor((p*grid.xP)/grid.xM));


		if(data.mean[0][0] !== 0) {
			//universal case for month
			const up_y = Math.floor((data.data[0][p] * grid.yP) / grid.yM);
			// console.log('u', up_y);
			const up_bar = new Bar(p, data.data[0][p], x, grid.y0, w_px_inc, -up_y);
			const d_limit = thr[+(up_y < 0)];


			up_bar.special = limits.hasOwnProperty(d_limit) && Math.abs(limits[d_limit]) < Math.abs(up_y) ? limits[d_limit] : null;
			// up_bar.updown = 'up';
			up_bar.draw(_ctx);
			g.bars_array.push(up_bar);

		}

		if(data.mean[1][0] !== 0){
			const dn_y = Math.floor((data.data[1][p] * grid.yP)/grid.yM);
			const dn_bar = new Bar(p, data.data[1][p], x, grid.y0, w_px_inc, -dn_y);
			dn_bar.draw(_ctx);
			g.bars_array.push(dn_bar);
		}
	}

	if(g.style === 'month'){
		for(let t of thr){
			const th = limits[t];
			_ctx.strokeStyle = g.vis['bar_'+t];
			_ctx.lineWidth = 2;
			_ctx.beginPath();
			_ctx.moveTo(grid.x0, grid.y0 - th);
			_ctx.lineTo(g.w-g.vis.pad, grid.y0 - th);
			_ctx.stroke();
		}
	}
	// const mean_y = (data.mean[0]*grid.yP)/grid.yM;
	// _ctx.strokeStyle = g.vis.mean_color;
	// _ctx.lineWidth = 1;
    // _ctx.beginPath();
    // _ctx.moveTo(grid.x0, grid.y0 - mean_y);
    // _ctx.lineTo(g.w-g.vis.pad, grid.y0 - mean_y);
    // _ctx.stroke();
	//
    // _ctx.font = `${g.vis.font_siz}px heavy_data`;
    // _ctx.textAlign = 'right';
    // _ctx.fillStyle = g.vis.mean_color;
    // _ctx.fillText('mean', g.vis.gutter.left, (grid.y0 - mean_y) + (g.vis.font_siz / 2.0) );

	g.last_selected = null;
	return true;
}

function graph_event(e){
    const u_x = e.pageX - e.currentTarget.parentNode.offsetLeft;
	const u_y = e.pageY - e.currentTarget.parentNode.offsetTop;

	if(u_x > g.g_rect.x && u_x < g.g_rect.x2 && u_y > g.g_rect.y && u_y < g.g_rect.y2){
		dom_marker.style.left = u_x+'px';
		dom_marker_value.style.display = 'block';
		const _ctx = dom_source.getContext( "2d" );

		const inter_v = g.grid.xP/g.grid.xM;
		//
		// const interval_px = g.g_rect.w/g.data_width;

		const rx = Math.floor((u_x-g.g_rect.x) / inter_v);
		g.selected = rx;


		if(g.selected !== g.last_selected){
			if(g.last_selected !== null) {
				g.bars_array.filter(b => b.id === g.last_selected).map(b=>{
					b.draw(_ctx);
				});
			}
			g.last_selected = g.selected;
		}


		let kf = '';
		g.bars_array.filter(b => b.id === rx).map(b=>{
			if(b.data) kf += `<div style="color:${b.color_text}">${g.style === 'month' ? b.data:Math.abs(b.data)}</div>`; //
			b.draw(_ctx,'selected');
			//kf += `<span>${b.rect.w}</span>`;
		})

		//kf += `<span>${g.g_rect.w}</span></br><span>${u_x-g.g_rect.x}</span>`;

		dom_marker_value.innerHTML = (g.style === 'year' ? jsConfig.months_str[rx] : (g.x_range_start+rx)) + kf;
		const dk = dom_marker_value.getBoundingClientRect();
		dom_marker_value.style.top = u_y-(dk.height)+'px';
		dom_marker_value.style.left = u_x-(dk.width/2)+'px';






		// for(let b of g.bars_array){
		// 	if(u_x > b.rect.x && u_x < b.rect.x2){
		// 		dom_marker_value.innerHTML = (b.data);
		// 		const dk = dom_marker_value.getBoundingClientRect();
		// 		dom_marker_value.style.top = u_y-(dk.height)+'px';
		// 		dom_marker_value.style.left = u_x-(dk.width/2)+'px';
		// 		g.selected = b.id;
		// 	}
		// }
		//
		// if(g.selected !== g.last_selected){
		// 	if(g.last_selected !== null) g.bars_array[g.last_selected].draw(_ctx);
		// 	g.last_selected = g.selected;
		// }else{
		// 	if(g.selected !== null) g.bars_array[g.selected].draw(_ctx,'red');
		// }

	}else{
		dom_marker_value.style.display = 'none';
	}


}

function graph(graph_obj, w, h, context){
	//operational_context = context;
    g.w = w;
    g.h = h;

	g.g_rect = {
		x:g.vis.gutter.left,
		y:g.vis.pad,
		x2:g.w - g.vis.pad,
		y2:g.h - g.vis.gutter.bottom,
		w:(g.w - g.vis.pad)-g.vis.gutter.left,
		h:(g.h - g.vis.gutter.bottom)-g.vis.pad
	};

	g.vis.bar_up = graph_obj.up_color;
	g.vis.bar_up_select = graph_obj.up_color_select;
	g.vis.bar_up_text = graph_obj.up_color_text;
	g.vis.bar_down = graph_obj.down_color;
	g.vis.bar_down_select = graph_obj.down_color_select;
	g.vis.bar_down_text = graph_obj.down_color_text;

	g.x_range_start = graph_obj.x_range_start;
	g.wudi_th_up = graph_obj.wudi_th_up;
	g.wudi_th_down = graph_obj.wudi_th_down;
	g.style = graph_obj.graph_style;

	dom_marker.style.height = g.g_rect.h+'px';
	dom_marker.style.width = '1px';
	dom_marker.style.top = g.g_rect.y+'px';
	dom_marker.style.left = (g.w/2)+'px';

    dom_source.width = g.w;
    dom_source.height = g.h;

	dom_source.parentNode.style.height = g.h+'px';

	//TODO// DAYS PER/x
	const points_lex = context.map(se => 'Nº'+se);
	const is_multi = context.length;

	dom_title.innerHTML = `point${is_multi > 1 ? 's':''} `+points_lex+' ';

	const figure_title_equiv = {
		all: 'days per year ',
		year: 'days per month ',
		month: 'daily WUDI values for ',
	}

	dom_title.innerHTML += figure_title_equiv[g.style];

	dom_title.innerHTML += graph_obj.main_title + (is_multi > 1 ? ' (daily average)' : '');

    const ctx = dom_source.getContext( "2d", { alpha: false });
    ctx.clearRect( 0, 0, g.w, g.h );
    ctx.fillStyle = 'black';
    ctx.fillRect( 0, 0, g.w, g.h );

    const grid = make_axes_and_grid(ctx, graph_obj);
	g.grid = grid;
	//console.log(grid);

	plot(ctx, grid, graph_obj);

	dom_source.addEventListener('mousemove', graph_event);

	// dom_close.addEventListener('mouseup', operational_context.points_deselect);

}

export default graph