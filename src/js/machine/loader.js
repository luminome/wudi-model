function do_callback(callback, value, args=null){
	if (callback && typeof(callback) === "function") callback(value, args);
}

async function post_loader(resource_obj_list, prog_callback=null) {
	let container = [];
	resource_obj_list.forEach(obj => {
		if (prog_callback) do_callback(prog_callback, 1, obj);
		let ref = fetch(obj.url, {
			method: 'POST',
			headers: {
				'mode':'cors',
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(obj)
		})
		.then(response => {
			if (!response.ok) {
				throw new Error(`${response.status} ${response.statusText}`);
			}
			obj.size = Number(response.headers.get("content-length"));
			return response.json()
		})
		.then(function (data) {
			if (prog_callback) do_callback(prog_callback, -1, obj);
			return data
		})
		.catch((error) => {
			//return Promise.reject();
			obj.error = error.toString();
			if(prog_callback) do_callback(prog_callback, 0, obj);
			return error
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj_list.forEach((obj,i) => obj.raw = done[i].data);
	return resource_obj_list;
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
			if (!response.ok) {
				throw new Error(`${response.status} ${response.statusText}`);
			}
			obj.size = Number(response.headers.get("content-length"));
			return response.text()
		})
		.then(function (text) {
			if(prog_callback) do_callback(prog_callback, -1, obj);
			return obj.type === 'json' ? JSON.parse(text) : text;
		})
		.catch((error) => {
			obj.error = error;
            if(prog_callback) do_callback(prog_callback, 0, obj);
			return error;
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj_list.forEach((obj,i) => obj.raw = done[i]);
	return resource_obj_list;
}

export {loader, post_loader};
// as default
