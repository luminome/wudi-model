const express = require('express');
const router = express.Router();
const map_service = require('../services/map_getter');
const compressor = require('../compressor');

const process = (res, query, data) => {
    const result = compressor(query, data);
    if(result.data_type === 'json'){
        res.json(result.data);
    }else{
        res.write(result.data);
        res.end();
    }
    console.log(data.query.name, 'api process was called.');
    return true;
}

/* GET quotes listing. */
router.get('/', function (req, res, next) {
    try {
        const data = map_service.get_all(req.query);
        return process(res, req.query, data);
    } catch (err) {
        res.json(err.message);
        console.error(`Error while getting what `, err.message);
        next(err);
    }
});

router.post('/', (req, res) => {
    try {
        const data = map_service.get_all(req.body);
        return process(res, req.body, data);
    } catch (err) {
        res.json(err.message);
        console.error(`Error while getting what `, err.message);
    }
});


module.exports = router;
