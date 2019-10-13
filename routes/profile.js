const express = require('express');
const mysql = require('mysql');
const {
  getCategories
} = require('../utils/helper');

const router = express.Router();

// get list of categories?
router.get('/[a-z0-9_]+$', function (req, res, next) {
  let profileUser = req.url.split("/")[1];
  profileUser = profileUser.toLowerCase();

  let connection = mysql.createConnection(mysqlConfig);
  // check if user exists in database
  let sql = "select username"
    + " from users"
    + " where username = " + mysql.escape(profileUser);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    /// user doesn't exist
    if (results.length === 0) {
      res.status(404);
      res.send("User " + profile + " does not exist.");
      return;
    }

    getCategories(connection, function (categories) {
      connection.end();
      res.status(200);
      // profile template is a copy of category modified to fit profile
      res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
      res.render('profile', {
        categories: categories,
        isAuthenticated: req.session.isAuthenticated,
        username: req.session.user,
        profileUser: profileUser
      });
      return;
    });
  });
});

router.post('/[a-z0-9_]+/cards$', function (req, res, next) {
  let profileUser = req.url.split("/")[1];
  profileUser = profileUser.toLowerCase();

  let connection = mysql.createConnection(mysqlConfig);
  // check if user exists in database
  let sql = "select username"
    + " from users"
    + " where username = " + mysql.escape(profileUser);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    if (results.length === 0) {
      res.status(400);
      res.send("User " + profileUser + " does not exist.");
      return;
    }

    // post structure = postId, postTitle, imageLink, liked, author, description
    let cardsOffset = req.body.cardsOffset;
    if (typeof (cardsOffset) !== "string") {
      res.status(400);
      res.send("cardsOffset must be a datetime formatted string");
      return;
    }

    // need to get all top results then left join that on
    // need to select where on category
    sql = "select *,"
      + " exists("
      + " select *"
      + " from postLikes"
      + " where postLikes.username = " + mysql.escape(req.session.user)
      + " and postLikes.postID = posts.postID"
      + ") as liked"
      + " from posts"
      + " where username = " + mysql.escape(profileUser)
      + " and at < " + mysql.escape(cardsOffset)
      + " order by at desc"
      + " limit 10";
    connection.query(sql, function (error, results, fields) {
      if (error) throw error;
      connection.end();

      // get necessary information on the card
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
});

module.exports = {
  prefix: '/profile',
  router
};