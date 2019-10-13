const express = require('express');
const mysql = require('mysql');
const {
	getCategories
} = require('../utils/helper');

const router = express.Router();

router.get('(/$)', function (req, res, next) {
	req.session.lastPage = "/";
	let connection = mysql.createConnection(mysqlConfig);

	getCategories(connection, function (categories) {
		connection.end();

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


// aggregate routers

module.exports = [
	{ prefix: '/' , router},
	require('./cards'),
	require('./category'),
	require('./create'),
	require('./comment'),
	require('./inner_comments'),
	require('./outer_comments'),
	require('./like'),
	require('./login'),
	require('./logout'),
	require('./profile'),
	require('./search'),
	require('./signup'),
];