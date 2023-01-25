export const logger = (target) => {

    function nice_time(t){
        let h,m,s;
        h = Math.floor(t/1000/60/60);
        m = Math.floor((t/1000/60/60 - h)*60);
        s = Math.floor(((t/1000/60/60 - h)*60 - m)*60);
        // to get time format 00:00:00
        s = `${s < 10 ? '0': ''}${s}`;
        m = `${m < 10 ? '0': ''}${m}`;
        h = `${h < 10 ? '0': ''}${h}`;
        return `${h}:${m}:${s}.${t}`;
    }

    function get_lex(output, list){
        if(list.hasOwnProperty('callee')){
            //then it is an arguments list to log()
            for (let i = 0; i < list.length; i++) {
                if (Array.isArray(list[i])) {
                    output.push(...list[i]);
                } else if (typeof list[i] === 'object') {
                    output.push(...Object.entries(list[i]).map(kv => `${kv[0]}:${kv[1].toFixed(2)}`));
                } else {
                    output.push(list[i]);
                }
            }
        }else{
            const k_list = Object.entries(list);
            ///console.log(k_list);
            for (let i = 0; i < k_list.length; i++) {
                if (Array.isArray(k_list[i][1])) {
                    output.push([`${k_list[i][0]}:`, ...k_list[i][1]]);
                } else if (typeof k_list[i][1] === 'object') {
                    const obj = [...Object.entries(k_list[i][1]).map(kv => `${kv[0]}:${kv[1].toFixed(2)}`)];
                    output.push([`${k_list[i][0]}:`, ...obj]);//`${k_list[i][0]}:${obj}`);
                } else {
                    output.push([`${k_list[i][0]}:`, k_list[i][1]]);
                }
            }
            //
            //
            // output.push(...Object.entries(list).map(kv => `${kv[0]}:${kv[1]}`));
        }
    }

    function update(){
        const output = [];
        get_lex(output, L.watched);
        L.log_full = [];
        L.log_full.push(...output);
        L.log_full.push(['----']);
        L.log_full.push(...L.stack);
    }

    function log() {
        L.log_time = new Date() - L.start_time;
        const output = [`${nice_time(L.log_time)}`];
        get_lex(output, arguments);
        L.stack.push(output);
        if(L.callback) L.callback();
    }

    const L = {
        callback: null,
        watched: {},
        log_full: [],
        stack: [],
        log_time: null,
        start_time: new Date(),
        target: target,
        update,
        log
    }

    return L;
}