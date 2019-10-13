const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql');
const {
  getCategories
} = require('../utils/helper');
const {
  verifyCaptcha
} = require('../utils/middleware');

const router = express.Router();


router.get('/$', function (req, res, next) {
  // prevent signing up once logged in (flow control)
  if (req.session.isAuthenticated) {
    res.redirect((req.session.lastPage) ? req.session.lastPage : "/");
    return;
  }

  let connection = mysql.createConnection(mysqlConfig);
  getCategories(connection, function (categories) {
    connection.end();
    res.render('signup', {
      categories: categories,
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.user
    });
    return;
  })
});

router.post('/$', verifyCaptcha, function (req, res, next) {
  // prevent logged in users from signing up (flow control)
  let lastPage = (req.session.lastPage) ? req.session.lastPage : "/";
  if (req.session.isAuthenticated) {
    res.status(200);
    res.send({ lastPage: lastPage });
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
  let sql = "select username from users where username=" + mysql.escape(username);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    if (results.length !== 0) {
      errors.username = "already in use";
      res.status(400);
      res.send(errors);
      return;
    }

    // ADD USER INSERT QUERY
    // hash out password first
    bcrypt.hash(password, 10, function (error, hash) {
      sql = "insert into users values ("
        + mysql.escape(username) + ","
        + mysql.escape(hash)
        + ")";
      connection.query(sql, function (error, results, fields) {
        if (error) throw error;
        connection.end();
        // set session
        req.session.isAuthenticated = true;
        req.session.user = username;

        res.status(200);
        res.send({ lastPage: lastPage });
        return;
      });
    });
  });
});

module.exports = {
  prefix: '/signup',
  router
};