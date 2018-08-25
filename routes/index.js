var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var mysql = require('mysql');
var bcrypt = require('bcrypt');

// NOTE: ATTEMPTING ASYNC IMPLEMENTATION

router.get('/', function(req, res, next) {
	req.session.lastPage = "/";
  res.render('index');
});

router.get('/login/', function(req, res, next) {
	// prevent logging in once logged in (flow control)
	if (req.session.isAuthenticated) {
		res.redirect((req.session.lastPage)? req.session.lastPage: "/");
		return;
	}
	res.render('login');
	return;
});

router.post('/login/', function(req, res, next) {
	// check for recaptcha first
	let captchaResponse = req.body.captchaResponse;
	// if (!captchaResponse) {
	// 	res.status(400);
	// 	res.send("Please verify reCaptcha before submitting.");
	// 	return;
	// }

	// verify captcha token on google's servers
	let captchaSecret = "6LcOdlEUAAAAAN1LqTRe3CpXdRX5JdwAEgfwCKZI";
	let captchaURL = "https://www.google.com/recaptcha/api/siteverify?"
	+ "secret=" + encodeURIComponent(captchaSecret) + "&"
	+ "response=" + encodeURIComponent(captchaResponse) + "&"
	+ "remoteip" + encodeURIComponent(req.connection.remoteAddress);
	request(captchaURL, function(error, response, body) {
		// body holds the json reply
		// https://developers.google.com/recaptcha/docs/verify
		console.log("grecaptcha verification: " + body);
		// send error message if not correct
		// if (!JSON.parse(body).success) {
		// 	res.status(400);
		// 	res.send("Please verify reCaptcha once more.");
		// }
		// verified reCaptcha
		// prevent logged in users from logging in (flow control)
		let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
		if (req.session.isAuthenticated) {
			res.status(200);
			res.send({lastPage: lastPage});
			return;
		}

		let username = req.body.username;
		let password = req.body.password;

		// START ERROR CHECK
		let errors = {};
		if (!username) {
			errors.username = "missing";
		}
		if (!password) {
			errors.password = "missing";
		}

		if (Object.keys(errors).length > 0) {
			res.status(400);
			res.send(errors);
			return;
		}

		let connection = mysql.createConnection(mysqlConfig);
		let sql = "select password from users where username="+mysql.escape(username);
		connection.query(sql, function(error, results, fields) {
			connection.end();
			if (error) throw error;

			// user doesn't exist, output generic message to deter hackers
			if (results.length !== 1) {
				errors["error-message"] = "invalid username or password";
				res.status(400);
				res.send(errors);
				return;
			}

			console.log(results);
			bcrypt.compare(password, results[0].password, function(error, isCorrect) {
				if (!isCorrect) {
					errors['error-message'] = "invalid username or password";
					res.status(400);
					res.send(errors);
					return;
				}

				// correct password entered
				req.session.isAuthenticated = true;
				req.session.user = username;
				res.status(200);
				res.send({lastPage: lastPage});
				return;
			});
		});
	});
});

router.get('/signup/', function(req, res, next) {
	// prevent signing up once logged in (flow control)
	if (req.session.isAuthenticated) {
		res.redirect((req.session.lastPage)? req.session.lastPage: "/");
		return;
	}
	res.render('signup');
	return;
});

router.post('/signup/', function(req, res, next) {
	// check for recaptcha first
	let captchaResponse = req.body.captchaResponse;
	// if (!captchaResponse) {
	// 	res.status(400);
	// 	res.send("Please verify reCaptcha before submitting.");
	// 	return;
	// }

	// verify captcha token on google's servers
	let captchaSecret = "6LcOdlEUAAAAAN1LqTRe3CpXdRX5JdwAEgfwCKZI";
	let captchaURL = "https://www.google.com/recaptcha/api/siteverify?"
	+ "secret=" + encodeURIComponent(captchaSecret) + "&"
	+ "response=" + encodeURIComponent(captchaResponse) + "&"
	+ "remoteip" + encodeURIComponent(req.connection.remoteAddress);
	request(captchaURL, function(error, response, body) {
		// body holds the json reply
		// https://developers.google.com/recaptcha/docs/verify
		console.log("grecaptcha verification: " + body);
		// send error message if not correct
		// if (!JSON.parse(body).success) {
		// 	res.status(400);
		// 	res.send("Please verify reCaptcha once more.");
		// }

		// verified reCaptcha
		// prevent logged in users from signing up (flow control)
		let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
		if (req.session.isAuthenticated) {
			res.status(200);
			res.send({lastPage: lastPage});
			return;
		}

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

		if (Object.keys(errors).length > 0) {
			// stop sql connection if errors
			res.status(400);
			res.send(errors);
			return;
		}

		// CHECK USERNAME IN USE QUERY
		let connection = mysql.createConnection(mysqlConfig);
		let sql = "select username from users where username="+mysql.escape(username);
		connection.query(sql, function(error, results, fields) {
			if (error) throw error;

			if (results.length !== 0) {
				errors.username = "already in use";
				res.status(400);
				res.send(errors);
				return;
			}

			// ADD USER INSERT QUERY
			// hash out password first
			bcrypt.hash(password, 10, function(error, hash) {
				sql = "insert into users values ("+mysql.escape(username)+","+mysql.escape(hash)+")";
				connection.query(sql, function(error, results, fields) {
					connection.end();
					if (error) throw error;
					// set session
					req.session.isAuthenticated = true;
					req.session.user = username;

					res.status(200);
					res.send({lastPage: lastPage});
					return;
				});
			});
		});
	});
});

router.get('/create/', function(req, res, next) {
	// prevent anonymous users from creating categories (flow control)
	if (!req.session.isAuthenticated) {
		res.redirect('/signup');
		return;
	};

	return;
});

router.get('/upload/*', function(req, res, next) {
	// prevent anonymous users from creating uploads (flow control)
	if (!req.session.isAuthenticated) {
		res.redirect('/signup');
		return;
	};

	res.render('upload');
	return;
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

router.get('/logout', function(req, res, next) {
	let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
	req.session.destroy(function(error) {
		res.redirect(lastPage);
	});
});

module.exports = router;
