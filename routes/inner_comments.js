const express = require('express');
const mysql = require('mysql');

const router = express.Router();

router.get('/$', function (req, res, next) {
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
  connection.query(sql, function (error, results, fields) {
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

module.exports = {
  prefix: '/inner_comments',
  router
};