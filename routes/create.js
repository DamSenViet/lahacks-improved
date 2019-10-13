const fs = require('fs');
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
  // prevent anonymous users from creating categories (flow control)
  if (!req.session.isAuthenticated) {
    req.session.lastPage = '/create';
    res.redirect('/login');
    return;
  };

  let connection = mysql.createConnection(mysqlConfig);
  getCategories(connection, function (categories) {
    connection.end();
    res.render('create', {
      categories: categories,
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.user
    });
    return;
  });
});

router.post('/$', verifyCaptcha, function (req, res, next) {
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
  let sql = "select name from categories where name=" + mysql.escape(categoryName);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    if (results.length !== 0) {
      errors['category-name'] = "already exists";
      res.status(400);
      res.send(errors);
      return;
    }

    sql = "insert into categories values ("
      + mysql.escape(categoryName) + ","
      + mysql.escape(dateTime)
      + ")";
    connection.query(sql, function (error, results, fields) {
      if (error) throw error;
      connection.end();

      fs.mkdir("./public/pictures/" + categoryName.replace(/ /g, "_"), function (error) {
        if (error && error.code !== "EEXIST") throw error;
        res.status(200);
        res.send({ newCategoryPage: "/category/" + categoryName.replace(/ /g, "_") });
        return;
      });
    });
  });
});

module.exports = {
  prefix: '/create',
  router
};