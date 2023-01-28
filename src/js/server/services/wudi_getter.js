const db = require('../services/wudi_db');

/*
//"tim, pid, u_tl, d_tl, raw, e_ct, e_ls
*/

function get_all(query = null) {
    try {
        if (query.table === 'turn_table') {
            const meta = {};
            const data = db.query(`SELECT *, rowid
                                   FROM wudi_points
                                   WHERE eco != 0`, []);
            return {
                data,
                meta,
                query
            }

        }else if (query.table === 'assoc') {
            const meta = {};
            const data = db.query(`SELECT *
                                   FROM wudi_assoc_att`, []);
            return {
                data,
                meta,
                query
            }

        } else {
            const fields = ["u_tl", "d_tl", "e_ct", "e_ls"];
            const fields_daily = ["rowid", "pid", "raw"];
            //const fields_daily = ["raw", "evt"];
            //if (query.tim === '40') fields.pop();
            let data = {none: null};
            let meta = {none: null};

            if (query.tim) {

                if (query.special) {
                    //#pid IN (58,59,60) AND tim LIKE '______15'
                    let req_a = query.special;
                    if (!Array.isArray(req_a)) req_a = req_a.split(',');
                    //console.log(req_a, req_a.join(','));

                    if (query.tim === 'all') { //ALL TIME
                        data = db.query(`SELECT tim, u_tl, d_tl
                                         FROM wudi_derivative
                                         WHERE pid IN (${req_a.join(',')})
                                         AND length(tim) = 4
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];

                    } else if (query.tim.length < 5) { //YEAR
                        data = db.query(`SELECT tim, u_tl, d_tl
                                         FROM wudi_derivative
                                         WHERE pid IN (${req_a.join(',')})
                                         AND tim LIKE '${query.tim}__'
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];

                    } else if (query.tim.length < 7) { //MONTH
                        data = db.query(`SELECT tim, raw
                                         FROM wudi_daily
                                         WHERE pid IN (${req_a.join(',')})
                                         AND tim LIKE '${query.tim}__'
                                         ORDER BY pid`,[]);
                        meta = [{len:data.length}];
                    }

                    //console.log(req_a, req_a[1]);

                } else {


                    if (query.tim.length < 7) {
                        data = db.query(`SELECT ${fields.join(',')}
                                         FROM wudi_derivative
                                         WHERE tim = ${query.tim} `, []);
                        meta = db.query(`SELECT *
                                         FROM wudi_derivative_meta
                                         WHERE tim = ${query.tim} `, []);
                    } else {
                        data = db.query(`SELECT ${fields_daily.join(',')}
                                         FROM wudi_daily
                                         WHERE tim = ${query.tim} `, []);
                        meta = db.query(`SELECT *
                                         FROM wudi_derivative_meta
                                         WHERE tim = ${query.tim.substring(0, 6)} `, []);
                    }
                }
                return {
                    data,
                    meta,
                    query
                }

            } else {
                const data = {error: ['wudi_db', 'no tim(e) specified.']};
                return {
                    data,
                    query
                }
            }
        }


    } catch (err) {
        //console.error(`Error while getting what `, err.message);
        const data = {error: ['wudi_db', err.message]};
        return {
            data,
            query
        }
    }
}

module.exports = {
    get_all
}

