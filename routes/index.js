var express = require('express');
var expressSession = require('express-session');
// app.use(expressSession({secret: 'random secret', saveUninitialized: false, resave: false,}));
var router = express.Router();
var fs = require('fs');

var mysql = require('mysql');
mysqlCredentials = JSON.parse(fs.readFileSync('./mysqlCredentials.json', 'utf8'));
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
	res.render('signup');
});


router.post('/signup/', function(req, res, next) {
	let username = req.body.username;
	let password = req.body.password;

	// START ERROR CHECK
	let errors = {};

	if (username.trim().length < 4) {
		errors.username = "too short";
	} else if (username.trim().length > 16) {
		errors.username = "too long";
	}

	if (password.length < 4) {
		errors.password = "too short";
	}

	let connection = mysql.createConnection({
		host: mysqlHost,
		user: mysqlUser,
		password: mysqlPassword,
		database: 'lahacks'
	});

	// CHECK USERNAME IN USE QUERY
	let sql = "select username from users where username=" + mysql.escape(username) + " limit 1";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		if (results.length != 0) {
			errors.username = "already in use";
		}

		if (Object.keys(errors).length > 0) {
			res.status(400);
			res.send(errors);
		} else {
			// INSERT QUERY
			sql = "insert into users values ("+mysql.escape(username)+","+mysql.escape(password)+")";
			connection.query(sql, function(error, results, fields) {if (error) throw error;});
			connection.end();

			// set session
			res.status(200);
			res.send({});
			return;
		}
	});
});


router.get('/upload/*', function(req, res, next) {
	res.render('upload');
});

router.post('/upload/*', function(req, res, next) {

});

router.post('/TEMPORARY/', function(req, res, next) {
  // console.log(req.body.title);
  // console.log(req.body.description);
	console.log(req.body);
  // console.log(req.body.imgData);
  res.status(400);
  res.send({title:'too long', description: 'wow', file: 'oops'});
});

module.exports = router;
