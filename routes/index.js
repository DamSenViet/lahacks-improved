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
	if (!captchaResponse) {
		res.status(403);
		res.send("Please verify reCaptcha before submitting.");
		return;
	}

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


		if (!JSON.parse(body).success) {
			res.status(403);
			res.send("reCaptcha was invalid, try again.");
			return;
		}
		// verified reCaptcha
		next();
	});
};



// MIDDLEWARE FUNCTION
var verifyCategory = function(req, res, next) {

	// to support history states
	let urlRemovedQuery = req.url.split("?")[0];

	let unmodifiedCategoryName =  urlRemovedQuery.split("/")[2];
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
		connection.end();
		// NOTE: can use variables in outer scope
		// e.g. don't need to pass in req, res, next

		// do not let chrome cache pages that get cards
		res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
		res.render('index', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user,
		});
		return;
	});
});

router.post('/cards$', function(req, res, next) {
	let cardsOffset = req.body.cardsOffset;
	if (typeof(cardsOffset) !== "string") {
		res.status(400);
		res.send("cardsOffset must be a datetime formatted string");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);

	// query selects the post with the highest vote count from each category
	// if there are no posts in a category, that category is not included (b/c there would be no image)
	let sql = "select max(likes), postID, name as category, at"
	+ " from ("
		+ " select count(likes) as likes, postID, category"
		+ " from ("
			// select postLikes.postID b/c every row included is a like for that post, will use this to count posts
			// also helps because we right join to create null values to include posts who have 0 likes with right join
			+ " select"
				+ " postLikes.postID as likes,"
				+ " posts.postID as postID,"
				+ " posts.category as category,"
				+ " posts.at as at"
			+ " from postLikes right join posts on postLikes.postID = posts.postID"
		+ ") A"
		+ " group by postID"
	+ ") B"
	+ " inner join categories"
	+ " on categories.name = category"
	+ " where at < "+mysql.escape(cardsOffset)
	+ " group by category"
	+ " order by at desc"
	+ " limit 10";

	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();

		// console.log(results);

		let cards = [];
		for (let i = 0; i < results.length; ++i) {
			let card = {};
			card.categoryTitle = results[i].category;
			let unmodifiedCategoryName = results[i].category.replace(/ /g, "_");
			card.unmodifiedCategoryName = unmodifiedCategoryName;
			let postId = results[i].postID;
			card.imageLink = "/pictures/" + unmodifiedCategoryName + "/" + postId;
			cards.push(card);
		}

		let newCardsOffset;
		if (results.length > 0) {
			newCardsOffset = results[results.length - 1].at;
		}

		res.status(200);
		res.send({
			cards: cards,
			newCardsOffset: newCardsOffset
		});
		return;
	});
});

router.get('/login$', function(req, res, next) {
	// prevent logging in once logged in (flow control)
	if (req.session.isAuthenticated) {
		res.redirect((req.session.lastPage)? req.session.lastPage: "/");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		connection.end();

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
		if (error) throw error;
		connection.end();

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
		connection.end();
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

	if (!/^[a-z0-9_]+$/.test(username)) {
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
			sql = "insert into users values ("
				+ mysql.escape(username) + ","
				+ mysql.escape(hash)
			+ ")";
			connection.query(sql, function(error, results, fields) {
				if (error) throw error;
				connection.end();
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
		req.session.lastPage = '/create';
		res.redirect('/login');
		return;
	};

	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		connection.end();
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
	let dateTime = req.body.currentDateTime;

	// START ERROR CHECK
	let errors = {};
	if (!categoryName) {
		errors['category-name'] = "missing";
		res.status(400);
		res.send(errors);
		return;
	}

	if (!/^[a-z0-9 ]+$/.test(categoryName)) {
		errors['category-name'] = "must only be letters";
		res.status(400);
		res.send(errors);
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	let sql = "select name from categories where name="+mysql.escape(categoryName);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		if (results.length !== 0) {
			errors['category-name'] = "already exists";
			res.status(400);
			res.send(errors);
			return;
		}

		sql = "insert into categories values ("
			+ mysql.escape(categoryName)+","
			+ mysql.escape(dateTime)
		+ ")";
		connection.query(sql, function(error, results, fields) {
			if (error) throw error;
			connection.end();

			fs.mkdir("./public/pictures/" + categoryName.replace(/ /g, "_"), function(error) {
				if (error && error.code !== "EEXIST") throw error;
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
		connection.end();
		res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
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
	if (typeof(cardsOffset) !== "string") {
		res.status(400);
		res.send("cardsOffset must be a datetime formatted string");
		return;
	}


	// need to get all top results then left join that on
	// need to select where on category
	let sql = "select postId, title, description, username, at,"
	+ " exists("
		+ " select *"
		+ " from postLikes"
		+ " where postLikes.username = "+mysql.escape(req.session.user)
		+ " and postLikes.postID = posts.postID"
		+ ") as liked"
	+ " from posts"
	+ " where category = "+mysql.escape(categoryName)
	+ " and at < "+mysql.escape(cardsOffset)
	+ " order by at desc limit 10";
	// table columns looks like this
	// | postId | title | description | username | category | at | liked (by user) |
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();

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

		let newCardsOffset;
		if (results.length > 0) {
			newCardsOffset = results[results.length - 1].at;
		}

		res.status(200);
		res.send({
			cards: cards,
			newCardsOffset: newCardsOffset
		});
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
		connection.end();
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

	let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
	// perform insert first, if success save file
	let sql = "insert into posts values ("
		+ "null,"
		+ mysql.escape(title) + ","
		+ mysql.escape(description) + ","
		+ mysql.escape(req.session.user) + ","
		+ mysql.escape(categoryName) + ","
		+ mysql.escape(dateTime)
	+ ")";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();

		// need to perform compression here
		let imgBuffer = Buffer.from(imgData.data, 'base64');
		sharp(imgBuffer)
		.resize(1000, null)
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
	let url = req.url;
	let profileUser = req.url.split("/")[2];
	profileUser = profileUser.toLowerCase();

	let connection = mysql.createConnection(mysqlConfig);
	// check if user exists in database
	let sql = "select username"
	+ " from users"
	+ " where username = " + mysql.escape(profileUser);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		/// user doesn't exist
		if (results.length === 0) {
			res.status(404);
			res.send("User " + profile + " does not exist.");
			return;
		}

		getCategories(connection, function(categories) {
			connection.end();
			res.status(200);
			// profile template is a copy of category modified to fit profile
			res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
			res.render('profile', {
				categories: categories,
				isAuthenticated: req.session.isAuthenticated,
				username: req.session.user,
				profileUser: profileUser
			});
			return;
		});
	});
});

router.post('/profile/[a-z0-9_]+/cards$', function(req, res, next) {
	let url = req.url;
	let profileUser = req.url.split("/")[2];
	profileUser = profileUser.toLowerCase();

	let connection = mysql.createConnection(mysqlConfig);
	// check if user exists in database
	let sql = "select username"
	+ " from users"
	+ " where username = " + mysql.escape(profileUser);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;

		if (results.length === 0) {
			res.status(400);
			res.send("User " + profile + " does not exist.");
			return;
		}

		// post structure = postId, postTitle, imageLink, liked, author, description
		let cardsOffset = req.body.cardsOffset;
		if (typeof(cardsOffset) !== "string") {
			res.status(400);
			res.send("cardsOffset must be a datetime formatted string");
			return;
		}

		// need to get all top results then left join that on
		// need to select where on category
		sql = "select *,"
		+ " exists("
			+ " select *"
			+ " from postLikes"
			+ " where postLikes.username = "+mysql.escape(req.session.user)
			+ " and postLikes.postID = posts.postID"
		+ ") as liked"
		+ " from posts"
		+ " where username = " + mysql.escape(profileUser)
		+ " and at < " + mysql.escape(cardsOffset)
		+ " order by at desc"
		+ " limit 10";
		connection.query(sql, function(error, results, fields) {
			if (error) throw error;
			connection.end();

			// get necessary information on the card
			let cards = [];
			for (let i = 0; i < results.length; ++i) {
				let card = {};
				card.postId = results[i].postID;
				card.postTitle = results[i].title;
				let categoryName = results[i].category;
				let unmodifiedCategoryName = categoryName.replace(/ /g, "_");
				card.imageLink = "/pictures/"+unmodifiedCategoryName+"/"+results[i].postID;
				card.description = results[i].description;
				card.author = results[i].username;
				card.liked = (results[i].liked === 0)? false: true;
				cards.push(card);
			}

			let newCardsOffset;
			if (results.length > 0) {
				newCardsOffset = results[results.length - 1].at;
			}

			res.status(200);
			res.send({
				cards: cards,
				newCardsOffset: newCardsOffset
			});
			return;
		});
	});
});


router.get('/outer_comments$', function(req, res, next) {
	let postId = req.query.postId;
	let outerCommentsOffset = req.query.outerCommentsOffset;

	if (isNaN(postId)) {
		res.status(400);
		res.send("postId must be a number");
		return;
	}

	let connection = mysql.createConnection(mysqlConfig);
	let sql = "select *, ("
		+ " select count(*)"
		+ " from comments as c2"
		+ " where c2.parentID = c1.commentID"
	+ ") as replies"
	+ " from comments as c1"
	+ " where c1.parentID is null"
	+ " and postID = " + postId
	+ " and at < " + mysql.escape(outerCommentsOffset)
	+ " order by at desc limit 10";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();
		// console.log(results);

		let comments = [];
		for (let i = 0; i < results.length; ++i) {
			// console.log(results[i]);
			let comment = {};
			comment.commentId = results[i].commentID;
			comment.author = results[i].username;
			comment.content = results[i].content;
			comment.replies = results[i].replies;
			comments.push(comment);
		}
		let newOuterCommentsOffset;
		if (results.length > 0) {
			newOuterCommentsOffset = results[results.length - 1].at;
		}

		res.status(200);
		res.send({
			comments: comments,
			newOuterCommentsOffset: newOuterCommentsOffset
		});
		return;
	});
});

router.get('/inner_comments$', function(req, res, next) {
	let commentId = req.query.commentId;
	let innerCommentsOffset = req.query.innerCommentsOffset;

	if (isNaN(commentId)) {
		res.status(400);
		res.send("commentId must be a number");
		return;
	}


	let connection = mysql.createConnection(mysqlConfig);
	let sql = "select *"
	+ " from comments"
	+ " where parentID = " + commentId
	+ " and at < " + mysql.escape(innerCommentsOffset)
	+ " order by at desc limit 10";
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();
		// console.log(results);

		let comments = [];

		for (let i = 0; i < results.length; ++i) {
			let comment = {};
			comment.commentId = results[i].commentID;
			comment.author = results[i].username;
			comment.content = results[i].content;
			comments.push(comment);
		}

		let newInnerCommentsOffset;
		if (results.length > 0) {
			newInnerCommentsOffset = results[results.length - 1].at;
		}

		res.status(200);
		res.send({
			comments: comments,
			newInnerCommentsOffset: newInnerCommentsOffset
		});
		return;
	});
});


router.post('/comment$', function(req, res, next) {
	if (!req.session.isAuthenticated) {
		res.status(400);
		res.send("Log in you goof.");
		return;
	}

	let comment = req.body.comment;
	let postId = req.body.postId;
	if (typeof(postId) !== "number") {
		res.status(400);
		res.send("postId must be a number");
		return;
	}
	let parentCommentId = req.body.parentCommentId; // might be null
	if (
			parentCommentId !== undefined
			&& typeof(parentCommentId) !== "number"
			&& typeof(parentCommentId) !== "undefined"
		) {
		res.status(400);
		res.send("parentCommentId must be a number or ommitted");
		return;
	}


	let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
	let connection = mysql.createConnection(mysqlConfig);
	let sql = "insert into comments values (null,"+ ((parentCommentId)? parentCommentId : 'null') +","
	+ mysql.escape(req.session.user)+","+postId+","+mysql.escape(comment)+","+mysql.escape(dateTime)+")";
	connection.query(sql, function(error, results, fields) {
		if (error) {
			console.log(error);
			console.log(results);
			throw error;
		};
		connection.end();

		res.status(200);
		res.send("" + results.insertId);
		return;
	});
});

router.post('/like$', function(req, res, next) {
	if (!req.session.isAuthenticated) {
		res.status(400);
		res.send("Log in you goof.");
		return;
	}

	let postId = req.body.postId;
	let liked = req.body.liked;

	// console.log(postId);
	// console.log(liked);

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
		sql = "insert into postLikes"
		+ " values ("+mysql.escape(req.session.user)+","+postId+", default)";

	} else {
		// delete
		sql = "delete"
		+ " from postLikes"
		+ " where username="+mysql.escape(req.session.user)
		+ " and postId=" + postId;
	}
	connection.query(sql, function(error, results, fields) {
		if (error) {
			// ignore attmpted duplicate entry but block the insert
			if (error.code !== "ER_DUP_ENTRY") {
				throw error;
			}
		}
		connection.end();

		res.status(200);
		res.send("");
		return;
	});
});


router.get('/search', function(req, res, next) {
	let searchQuery = req.query.searchQuery.trim().toLowerCase();
	let connection = mysql.createConnection(mysqlConfig);
	getCategories(connection, function(categories) {
		connection.end();

	 	res.status(200);
		res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
	 	res.render('search', {
			categories: categories,
			isAuthenticated: req.session.isAuthenticated,
			username: req.session.user,
			searchQuery: searchQuery
		});
		return;
	});
});

router.post('/search/cards$', function(req, res, next) {
	let cardsOffset = req.body.cardsOffset;
	if (isNaN(cardsOffset)) {
		res.status(400);
		res.send("cardsOffset must be a number");
		return;
	}

	let searchQuery = req.body.searchQuery.trim().toLowerCase();
	let queryParts = searchQuery.split(" "); // array
	let matchConditions = "";
	for (let i = 0; i < queryParts.length; ++i) {
		// all search results must have all parts to the query

		// indexing doesn't occur on any WORDS less than 4 letters, need
		// can't require a word less than 4 letters
		// can change this in sql settings
		if (queryParts[i].length >= 4) {
			matchConditions += "+" + queryParts[i];
		} else {
			matchConditions += queryParts[i];
		}

		// if not the last one, add a space
		if (i !== queryParts.length - 1) {
			matchConditions += " ";
		}
	}

	let connection = mysql.createConnection(mysqlConfig);
	let sql = "select *,"
	+ " exists("
		+ " select *"
		+ " from postLikes"
		+ " where postLikes.username = " + mysql.escape(req.session.user)
		+ " and postLikes.postID = posts.postID"
	+ ") as liked"
	+ " from posts "
	+ " where match (posts.title, posts.description)"
		+ " against (" + mysql.escape(matchConditions) + " in boolean mode)"
	+ " limit 10"
	+ " offset " + cardsOffset;
	console.log(sql);
	connection.query(sql, function(error, results, fields) {
		if (error) throw error;
		connection.end();
		// console.log(results);

		let cards = [];
		for (let i = 0; i < results.length; ++i) {
			let card = {};
			card.postId = results[i].postID;
			card.postTitle = results[i].title;
			let categoryName = results[i].category;
			let unmodifiedCategoryName = categoryName.replace(/ /g, "_");
			card.imageLink = "/pictures/"+unmodifiedCategoryName+"/"+results[i].postID;
			card.description = results[i].description;
			card.author = results[i].username;
			card.liked = (results[i].liked === 0)? false: true;
			cards.push(card);
		}
		res.status(200);
		res.send({
			cards : cards
		});
		return;
	});
});

module.exports = router;
