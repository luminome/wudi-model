const timer = (var_name) => {
    // function init(){
    //     T.timers[T.var_name] = null;
    //     return this;
    // }

    function start(){
        T.T1 = Date.now();
        return this;
    }

    function stop(){
        T.T2 = Date.now() - T.T1;
        return T.T2;
    }

    const T = {
        var_name: var_name,
        T1: 0.0,
        T2: 0.0,
        start,
        stop,
        //init
    }

    return T
}

export default timer;