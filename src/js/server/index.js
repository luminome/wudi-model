const express = require('express');
const app = express();
const config = require('./config');
const port = process.env.PORT || config.default_port;

app.use(express.static('dist'));
app.use(express.static('static'));
//app.use(express.static('/Users/sac/Sites/wudi-model-update/data/static-build-products'));

const pack = require('../../../package.json');

const map_router = require('./routes/obs-map');
const wudi_router = require('./routes/obs-wudi');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/map', map_router);
app.use('/wudi', wudi_router);

app.listen(port, () => {
  console.log(`${pack.name} app listening at http://localhost:${port}`);
});