var express = require('express');
var expressSession = require('express-session');
// app.use(expressSession({secret: 'random secret', saveUninitialized: false, resave: false,}));
var router = express.Router();
var fs = require('fs');

var mysql = require('mysql');
mysqlCredentials = JSON.parse(fs.readFileSync('mysqlCredentials.json', 'utf8'));
mysqlHost = mysqlCredentials.host;
mysqlUser = mysqlCredentials.user;
mysqlPassword = mysqlCredentials.password;

router.get('/', function(req, res, next) {
    res.render('index');
});

router.get('/login/', function(req, res, next) {
	res.render('login');
});

router.post('/login/', function(req, res, next) {

});


router.get('/signup/', function(req, res, next) {

});


router.post('/signup/', function(req, res, next) {

});


router.get('/upload/*', function(req, res, next) {

});

router.post('/upload/*', function(req, res, next) {

});

router.post('/TEMPORARY/', function(req, res, next) {
    console.log(req.body.title);
    console.log(req.body.description);
    // console.log(req.body.imgData);
    res.status(400);
    res.send({title:'too long', description: 'wow', file: 'oops'});
});

module.exports = router;
