const express = require('express');
const mysql = require('mysql');
const router = express.Router();

router.get('/$', function (req, res, next) {
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
  connection.query(sql, function (error, results, fields) {
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

module.exports = {
  prefix: '/outer_comments',
  router
};