function do_callback(callback, value, args=null){
	if (callback && typeof(callback) === "function") callback(value, args);
}

async function loader(resource_obj_list, prog_callback=null) {
	let container = [];
	const opts = {
	  headers: {
		'mode':'cors'
	  }
	}

	resource_obj_list.forEach(obj => {
		if (prog_callback) do_callback(prog_callback, 1, obj);

		let ref = fetch(obj.url, opts)
		.then(response => {
			obj.size = Number(response.headers.get("content-length"));
			return response.text()
		})
		.then(function (text) {
			if(prog_callback) do_callback(prog_callback, -1, obj);
			return obj.type === 'json' ? JSON.parse(text) : text;
		})
		.catch((error) => {
            if(prog_callback) do_callback(prog_callback, -1, obj);
			console.log(error.status, error);
			return error;
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj_list.forEach((obj,i) => obj.raw = done[i]);
	return resource_obj_list;
}

export {loader};
// as default
