export const hex_css = (c, alpha=null) => {
    return alpha === null ? '#'+c.toString(16) : '#'+c.toString(16)+(Math.round(alpha*255).toString(16))
}

export const rgba_arr_to_css = (arr) => {
    return '#'+arr.map(ap => Math.round(ap*255).toString(16)).join('');
}