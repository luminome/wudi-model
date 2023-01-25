export function keyControls(root_surface, keyAction, kva) {
    let keyMap = [];

    function update_keys(e) {
        kva.keys.map = keyMap;
        keyAction(keyMap, kva);
    }

    function key_down(e) {
        e.preventDefault();
        if (!keyMap.includes(e.code)) {
            keyMap.push(e.code);
        }
        update_keys(e);
    }

    function key_up(e) {
        e.preventDefault();
        if (keyMap.includes(e.code)) {
            keyMap.splice(keyMap.indexOf(e.code), 1);
        }
        update_keys(e);
    }

    //kva.keys = {};
    kva.keys.map = [];
    root_surface.addEventListener('keydown', key_down);
    root_surface.addEventListener('keyup', key_up)
}




