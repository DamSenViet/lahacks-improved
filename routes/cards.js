const express = require('express');
const mysql = require('mysql');

const router = express.Router();

router.post('/$', function (req, res, next) {
  let cardsOffset = req.body.cardsOffset;
  if (typeof (cardsOffset) !== "string") {
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
    + " where at < " + mysql.escape(cardsOffset)
    + " group by category"
    + " order by at desc"
    + " limit 10";

  connection.query(sql, function (error, results, fields) {
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

module.exports = {
  prefix: '/cards',
  router
};