var express = require('express');
var router = express.Router();
// file system
var fs = require('fs');
// http request (server side)
var request = require('request');
// mysql driver
var mysql = require('mysql');
// password encryption
var bcrypt = require('bcrypt');
// image compression
var sharp = require('sharp');

// NOTE: ATTEMPTING ASYNC IMPLEMENTATION


// http://expressjs.com/en/4x/api.html#app.use
// express accepts chaining middleware calls in series
// MIDDLEWARE FUNCTION
var verifyCaptcha = function(req, res, next) {
	// check for recaptcha first
	let captchaResponse = req.body.captchaResponse;
	// if (!captchaResponse) {
	// 	res.status(403);
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
		// https://developers.google.com/recaptcha/docs/verify
		// console.log("grecaptcha verification: " + body);
		// body holds the json reply
		// send error message if not correct


		// if (!JSON.parse(body).success) {
		// 	res.status(403);
		// 	res.send("reCaptcha was invalid, try again.");
		// 	return;
		// }
		// verified reCaptcha
		next();
	});
};

// MIDDLEWARE FUNCTION
var verifyCategory = function(req, res, next) {
	let unmodifiedCategoryName =  req.url.split("/")[2];
	let categoryName = unmodifiedCategoryName.replace(/_/g, " ");
	let connection = mysql.createConnection(mysqlConfig);

	res.locals.unmodifiedCategoryName = unmodifiedCategoryName;
	res.locals.categoryName = categoryName;
	res.locals.connection = connection;

	let sql = "select name from categories where name="+mysql.escape(categoryName);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		if (results.length !== 1) {
			res.status(404);
			res.send("Category '"+categoryName+"' does not exist.");
			return;
		}

		next();
	});
};

// get list of categories using existing connection
var getCategories = function(connection, callback) {
	let sql = "select name from categories order by name asc";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();

		let categories = [];
		for (let i = 0; i < results.length; ++i) {
			categories.push({
				name: results[i].name,
				unmodifiedName: results[i].name.replace(/ /g, "_")
			});
		}
		callback(categories);
		return;
	});
};

router.get('(/$)', function(req, res, next) {
	req.session.lastPage = "/";
	let connection = mysql.createConnection(mysqlConfig);

	getCategories(connection, function(categories) {
		// NOTE: can use variables in outer scope
		// e.g. don't need to pass in req, res, next
		res.render('index', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	});
});

router.get('/cards$', function(req, res, next) {

});

router.get('/login$', function(req, res, next) {
	// prevent logging in once logged in (flow control)
	if (req.session.isAuthenticated) {
		res.redirect((req.session.lastPage)? req.session.lastPage: "/");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		res.render('login', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	});
});

router.post('/login$', verifyCaptcha, function(req, res, next) {
	// prevent logged in users from logging in (flow control)
	let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
	if (req.session.isAuthenticated) {
		res.status(200);
		res.send({lastPage: lastPage});
		return;
	}

	let username = req.body.username.trim().toLowerCase();
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

router.get('/signup$', function(req, res, next) {
	// prevent signing up once logged in (flow control)
	if (req.session.isAuthenticated) {
		res.redirect((req.session.lastPage)? req.session.lastPage: "/");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		res.render('signup', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	})
});

router.post('/signup$', verifyCaptcha, function(req, res, next) {
	// prevent logged in users from signing up (flow control)
	let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
	if (req.session.isAuthenticated) {
		res.status(200);
		res.send({lastPage: lastPage});
		return;
	}

	let username = req.body.username.trim().toLowerCase();
	let password = req.body.password;


	// START ERROR CHECK
	let errors = {};
	if (username.length < 4) {
		errors.username = "too short";
	} else if (username.length > 20) {
		errors.username = "too long";
	}

	if (!/[a-z0-9_]/.test(username)) {
		errors.username = "special characters not allowed";
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

router.get('/create$', function(req, res, next) {
	// prevent anonymous users from creating categories (flow control)
	if (!req.session.isAuthenticated) {
		req.session.lastPage = '/create'
		res.redirect('/login');
		return;
	};

	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		res.render('create', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	});
});

router.post('/create$', verifyCaptcha, function(req, res, next) {
	// prevent un-authenticated users from creating categories
	if (!req.session.isAuthenticated) {
		res.status(400);
		res.send("Log in you goof.");
		return;
	};

	let categoryName = req.body.categoryName.trim().toLowerCase();

	// START ERROR CHECK
	let errors = {};
	if (!categoryName) {
		errors['category-name'] = "missing";
		res.status(400);
		res.send(errors);
		return;
	}

	if (!/^[a-z ]+$/.test(categoryName)) {
		errors['category-name'] = "must only be letters";
		res.status(400);
		res.send(errors);
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	sql = "select name from categories where name="+mysql.escape(categoryName);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		if (results.length !== 0) {
			errors['category-name'] = "already exists";
			res.status(400);
			res.send(errors);
			return;
		}

		sql = "insert into categories values ("+mysql.escape(categoryName)+")";
		connection.query(sql, function(error, results, fields) {
			if (error) throw error;
			connection.end();

			fs.mkdir("./public/pictures/" + categoryName.replace(/ /g, "_"), function(error) {
				if (error) throw error;

				res.status(200);
				res.send({newCategoryPage: "/category/" + categoryName.replace(/ /g, "_")});
				return;
			});
		});
	});
});

router.get('/category/[a-z_]+$', verifyCategory, function(req, res, next) {
	let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
	let categoryName = res.locals.categoryName;
	let connection = res.locals.connection;

	req.session.lastPage = "/category/" + unmodifiedCategoryName;

	getCategories(connection, function(categories) {
		res.render('category', {
			categories: categories,
			unmodifiedCategoryName: unmodifiedCategoryName,
			categoryName: categoryName,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	});
});


router.post('/category/[a-z_]+/cards$', verifyCategory, function(req, res, next){
	let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
	let categoryName = res.locals.categoryName;
	let connection = res.locals.connection;

	// post structure = postId, postTitle, imageLink, liked, author, description
	let cardsOffset = req.body.cardsOffset;
	if (typeof(cardsOffset) !== "number") {
		res.status(400);
		res.send("cardsOffset must be a number");
		return;
	}


	// need to get all top results then left join that on
	// need to select where on category
	let sql = "select postId, title, description, username,"
	+ " exists(select * from postLikes where postLikes.username = "+mysql.escape(req.session.user)+")"
	+ " as liked from posts where category = "+mysql.escape(categoryName)+" order by at desc limit 10";
	sql += " offset " + cardsOffset;
	// table columns looks like this
	// | postId | title | description | username | category | liked (by user) |
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		// console.log(results);


		// get necessary information on the card
		let cards = [];
		for (let i = 0; i < results.length; ++i) {
			let card = {};
			card.postId = results[i].postId;
			card.postTitle = results[i].title;
			card.imageLink = "/pictures/"+unmodifiedCategoryName+"/"+results[i].postId;
			card.description = results[i].description;
			card.author = results[i].username;
			card.liked = (results[i].liked === 0)? false: true;
			cards.push(card);
		}

		res.status(200);
		res.send(cards);
		return;
	});
});

router.get('/category/[a-z_]+/upload$', verifyCategory, function(req, res, next) {
	let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
	let categoryName = res.locals.categoryName;
	let connection = res.locals.connection;

	// prevent anonymous users from uploading (flow control)
	if (!req.session.isAuthenticated) {
		req.session.lastPage = "/category/" + unmodifiedCategoryName + "/upload";
		res.redirect('/login');
		return;
	};

	getCategories(connection, function(categories) {
		res.render('upload', {
			categories: categories,
			unmodifiedCategoryName: unmodifiedCategoryName,
			categoryName: categoryName,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user
		});
		return;
	});
});

router.post('/category/[a-z_]+/upload$', verifyCategory, function(req, res, next) {
	let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
	let categoryName = res.locals.categoryName;
	let connection = res.locals.connection;

	// make authenticated users self-redirect to index
	if (!req.session.isAuthenticated) {
		res.status(400);
		res.send("Log in you goof.");
		return;
	};

	let title = req.body.title;
	let description = req.body.description;
	let imgData = req.body.imgData;
	// console.log(imgData);
	// imgData {id, name, type, size, metadata, data (64base string)}

	let errors = {};

	if (!title) {
		errors.title = "missing";
	} else if (title.length > 100) {
		errors.title = "too long";
	}


	if (description !== undefined && description !== null) {
		if (description.length > 140) {
			errors.description = "too long";
		}
	}


	if (Object.keys(errors).length > 0) {
		res.status(400);
		res.send(errors);
		return;
	}


	// perform insert first, if success save file
	let sql = "insert into posts values ("
	+ "null,"+mysql.escape(title)+","+mysql.escape(description)+","+mysql.escape(req.session.user)+","+mysql.escape(categoryName)+","
	+ " default)";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		// need to perform compression here
		let imgBuffer = Buffer.from(imgData.data, 'base64');
		sharp(imgBuffer)
		.resize(700, null)
		.toFile(("./public/pictures/"+unmodifiedCategoryName+"/"+results.insertId), function(error, info) {
			// successs
			res.status(200);
			res.send({});
			return;
		});
	});
});

router.get('/logout$', function(req, res, next) {
	let lastPage = (req.session.lastPage)? req.session.lastPage : "/";
	req.session.destroy(function(error) {
		res.redirect(lastPage);
	});
});

// get list of categories?
router.get('/profile/[a-z0-9_]+$', function(req, res, next) {
	let connection = mysql.createConnection(mysqlConfig);


	let sql = "";
	connection.query(sql, function(error, results, fields) {
	});
});

router.post('/comment$', function(req, res, next) {
	res.send(200);
	res.send("");
});

router.post('/like$', function(req, res, next) {
	if (!req.session.isAuthenticated) {
		res.status(400);
		res.send("Log in you goof.");
		return;
	}

	let postId = req.body.postId;
	let liked = req.body.liked;

	console.log(postId);
	console.log(liked);

	if (typeof(postId) !== "number") {
		res.status(400);
		res.send("postId needs to be a number");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	// make sure that both do not throw errors
	let sql;
	if (liked) {
		// insert
		sql = "insert into postLikes values ("+mysql.escape(req.session.user)+","+postId+", default)";
	} else {
		// delete
		sql = "delete from postLikes where username="+mysql.escape(req.session.user)+" and postId=" + postId;
	}
	connection.query(sql, function(error, results, fields) {
		if (error) {
			// ignore attmpted duplicate entry but block the insert
			if (error.code !== "ER_DUP_ENTRY") {
				throw error;
			}
		};

		res.status(200);
		res.send("");
		return;
	});
});

module.exports = router;
