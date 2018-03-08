const bodyParser = require('body-parser');
const request = require('request');

const unfurl = require('../unfurls');
const commands = require('../commands');
const oauth = require('./oauth');
const importer = require('./importer');
const uninstall = require('./uninstall');
const middleware = require('./../middleware');

module.exports = (robot) => {
  const router = robot.route('/slack');

  // Make robot available
  router.use((req, res, next) => {
    res.locals.robot = robot;
    next();
  });

  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));

  router.post('/interact', function (req, res) {

    var payload = JSON.parse(req.body.payload);

    delete payload.token;
    delete payload.response_url;
    delete payload.trigger_id;

    request({
      uri: 'https://slackcoin.ngrok.io/api/notify',
      method: 'POST',
      json: true,
      body: {
        type: payload.callback_id,
        payload: payload
      }
    });

    return res.sendStatus(200);

  });

  // Set up slash commands
  commands(robot);

  // Set up OAuth
  router.get('/oauth/login', oauth.login);
  router.get('/oauth/callback', oauth.callback);

  // Set up event handlers
  router.use('/events', middleware.validate);
  router.use('/events', middleware.urlVerification);
  router.use('/events', middleware.routeEvent);

  router.post('/events.link_shared', unfurl.handler);
  router.post('/events.config_migration', importer);
  router.post('/events.app_uninstalled', uninstall);
};
