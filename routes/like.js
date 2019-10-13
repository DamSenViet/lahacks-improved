const express = require('express');
const mysql = require('mysql');

const router = express.Router();

router.post('/$', function (req, res, next) {
  if (!req.session.isAuthenticated) {
    res.status(400);
    res.send("Log in you goof.");
    return;
  }

  let postId = req.body.postId;
  let liked = req.body.liked;

  // console.log(postId);
  // console.log(liked);

  if (typeof (postId) !== "number") {
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
      + " values (" + mysql.escape(req.session.user) + "," + postId + ", default)";

  } else {
    // delete
    sql = "delete"
      + " from postLikes"
      + " where username=" + mysql.escape(req.session.user)
      + " and postId=" + postId;
  }
  connection.query(sql, function (error, results, fields) {
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

module.exports = {
  prefix: '/like',
  router
};