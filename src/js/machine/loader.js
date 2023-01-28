function do_callback(callback, value, args=null, args2= null){
	if (callback && typeof(callback) === "function") callback(value, args, args2);
}

async function post_loader(resource_obj, prog_callback=null) {
	let container = [];
	resource_obj.list.forEach(obj => {
		if (prog_callback) do_callback(prog_callback, 1, obj, resource_obj.name);
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
			if (prog_callback) do_callback(prog_callback, -1, obj, resource_obj.name);
			return data
		})
		.catch((error) => {
			//return Promise.reject();
			obj.error = error.toString();
			if(prog_callback) do_callback(prog_callback, 0, obj, resource_obj.name);
			return error
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj.list.forEach((obj,i) => obj.raw = done[i].data);
	return resource_obj;
}

async function loader(resource_obj, prog_callback=null) {
	let container = [];
	const opts = {
	  headers: {
		'mode':'cors'
	  }
	}

	resource_obj.list.forEach(obj => {
		if (prog_callback) do_callback(prog_callback, 1, obj, resource_obj.name);

		let ref = fetch(obj.url, opts)
		.then(response => {
			if (!response.ok) {
				throw new Error(`${response.status} ${response.statusText}`);
			}
			obj.size = Number(response.headers.get("content-length"));
			return response.text()
		})
		.then(function (text) {
			if(prog_callback) do_callback(prog_callback, -1, obj, resource_obj.name);
			return obj.type === 'json' ? JSON.parse(text) : text;
		})
		.catch((error) => {
			obj.error = error;
            if(prog_callback) do_callback(prog_callback, 0, obj, resource_obj.name);
			return error;
		})
		container.push(ref);
	});

	const done = await Promise.all(container);
	resource_obj.list.forEach((obj,i) => obj.raw = done[i]);
	return resource_obj;
}

export {loader, post_loader};
// as default
