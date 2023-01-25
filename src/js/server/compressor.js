const compressor = (query, result) => {
    const types = ['text', 'json', 'json-ser'];
    const mode = types.includes(query.type) ? query.type : 'null';
    const compressed = {data_type: mode, data: null};

    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const get_size = (str) => Math.ceil(Buffer.byteLength(str, 'utf8')/1000)+'k';
    const rep_filter = (value) => {
        //if(value === null) return value;//'';
        if(typeof value === 'string'){
            if(value.indexOf(",") !== -1) return value.split(",").map((v) => {
                if(isNaN(v)) return v;
                return v;
            });
            if(!value.length) return null;
        }

        // if(!isNaN(value)) return parseFloat(value)
        return value;
    }

    if(result.data.error){  //hasOwnProperty('error')){
        compressed.data = result.data;
        compressed.data_type = 'json';
        return compressed;
    }

    if(mode === 'text'){
        const items = result.data;
        const header = Object.keys(items[0])
        const csv = [
            header.map(h => `'${h}'`).join(','), // header row first
            ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
        ].join(',')
        console.log('text', get_size(csv));
        compressed.data = csv;
        return compressed;
    }

    if(mode === 'json'){
        compressed.data = result;
        compressed.data.size = get_size(JSON.stringify(result));
        return compressed;
    }

    if(mode === 'json-ser'){
        const items = result.data;
        const header = Object.keys(items[0])
        const ser = {
            'data': {
                'keys': header,
                'data': items.map(row => header.map(fieldName => rep_filter(row[fieldName]))),
                'meta': result.meta[0],
                'query': query
            }
        }
        ser.data.size = get_size(JSON.stringify(ser));
        compressed.data_type = 'json';
        compressed.data = ser;
        return compressed;
    }

    compressed.data_type = 'json';
    compressed.data = { message:'unknown type:'+query.type };
    return compressed;
}

module.exports = compressor;