const express = require('express');
const mysql = require('mysql');

const router = express.Router();

router.post('/$', function (req, res, next) {
  if (!req.session.isAuthenticated) {
    res.status(400);
    res.send("Log in you goof.");
    return;
  }

  let comment = req.body.comment;
  let postId = req.body.postId;
  if (typeof (postId) !== "number") {
    res.status(400);
    res.send("postId must be a number");
    return;
  }
  let parentCommentId = req.body.parentCommentId; // might be null
  if (
    parentCommentId !== undefined
    && typeof (parentCommentId) !== "number"
    && typeof (parentCommentId) !== "undefined"
  ) {
    res.status(400);
    res.send("parentCommentId must be a number or ommitted");
    return;
  }


  let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let connection = mysql.createConnection(mysqlConfig);
  let sql = "insert into comments values (null," + ((parentCommentId) ? parentCommentId : 'null') + ","
    + mysql.escape(req.session.user) + "," + postId + "," + mysql.escape(comment) + "," + mysql.escape(dateTime) + ")";
  connection.query(sql, function (error, results, fields) {
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

module.exports = {
  prefix: '/comment',
  router
};