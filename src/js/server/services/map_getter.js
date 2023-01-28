const db = require('../services/map_db');

function get_all(query=null) {
	try {
		const meta = {}
		const data = db.query(`SELECT * FROM ${query.table}`,[]);
		return {
			data,
			meta,
			query
		}
    } catch (err) {
        //console.error(`Error while getting what `, err.message);
		const data = {error: ['map_db', err.message]};
		return {
			data,
			query
		}
    }
}

module.exports = {
	get_all
}


