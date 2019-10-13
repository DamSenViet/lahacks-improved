const express = require('express');
const mysql = require('mysql');

const router = express.Router();

router.get('/', function (req, res, next) {
  let searchQuery = req.query.searchQuery.trim().toLowerCase();
  let connection = mysql.createConnection(mysqlConfig);
  getCategories(connection, function (categories) {
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

router.post('/search/cards$', function (req, res, next) {
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
  connection.query(sql, function (error, results, fields) {
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
      card.imageLink = "/pictures/" + unmodifiedCategoryName + "/" + results[i].postID;
      card.description = results[i].description;
      card.author = results[i].username;
      card.liked = (results[i].liked === 0) ? false : true;
      cards.push(card);
    }
    res.status(200);
    res.send({
      cards: cards
    });
    return;
  });
});

module.exports = {
  prefix: '/search',
  router
};