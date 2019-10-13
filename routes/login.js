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
  // prevent logging in once logged in (flow control)
  if (req.session.isAuthenticated) {
    res.redirect((req.session.lastPage) ? req.session.lastPage : "/");
    return;
  }

  let connection = mysql.createConnection(mysqlConfig);
  getCategories(connection, function (categories) {
    connection.end();

    res.render('login', {
      categories: categories,
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.user
    });
    return;
  });
});

router.post('/$', verifyCaptcha, function (req, res, next) {
  // prevent logged in users from logging in (flow control)
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
  let sql = "select password from users where username=" + mysql.escape(username);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;
    connection.end();

    // user doesn't exist, output generic message to deter hackers
    if (results.length !== 1) {
      errors["error-message"] = "invalid username or password";
      res.status(400);
      res.send(errors);
      return;
    }

    bcrypt.compare(password, results[0].password, function (error, isCorrect) {
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
      res.send({ lastPage: lastPage });
      return;
    });
  });
});

module.exports = {
  prefix: '/login',
  router
};