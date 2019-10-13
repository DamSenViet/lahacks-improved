const express = require('express');
const mysql = require('mysql');
const sharp = require('sharp');
const {
  getCategories
} = require('../utils/helper');
const {
  verifyCategory
} = require('../utils/middleware');

const router = express.Router();

router.get('/[a-z_]+$', verifyCategory, function (req, res, next) {
  let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
  let categoryName = res.locals.categoryName;
  let connection = res.locals.connection;

  req.session.lastPage = "/category/" + unmodifiedCategoryName;

  getCategories(connection, function (categories) {
    connection.end();
    res.setHeader('Cache-Control', 'no-cache, no-store'); // Added no-store
    res.render('category', {
      categories: categories,
      unmodifiedCategoryName: unmodifiedCategoryName,
      categoryName: categoryName,
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.user
    });
    return;
  });
});

router.post('/[a-z_]+/cards$', verifyCategory, function (req, res, next) {
  let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
  let categoryName = res.locals.categoryName;
  let connection = res.locals.connection;

  // post structure = postId, postTitle, imageLink, liked, author, description
  let cardsOffset = req.body.cardsOffset;
  if (typeof (cardsOffset) !== "string") {
    res.status(400);
    res.send("cardsOffset must be a datetime formatted string");
    return;
  }


  // need to get all top results then left join that on
  // need to select where on category
  let sql = "select postId, title, description, username, at,"
    + " exists("
    + " select *"
    + " from postLikes"
    + " where postLikes.username = " + mysql.escape(req.session.user)
    + " and postLikes.postID = posts.postID"
    + ") as liked"
    + " from posts"
    + " where category = " + mysql.escape(categoryName)
    + " and at < " + mysql.escape(cardsOffset)
    + " order by at desc limit 10";
  // table columns looks like this
  // | postId | title | description | username | category | at | liked (by user) |
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;
    connection.end();

    // get necessary information on the card
    let cards = [];
    for (let i = 0; i < results.length; ++i) {
      let card = {};
      card.postId = results[i].postId;
      card.postTitle = results[i].title;
      card.imageLink = "/pictures/" + unmodifiedCategoryName + "/" + results[i].postId;
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

router.get('/[a-z_]+/upload$', verifyCategory, function (req, res, next) {
  let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
  let categoryName = res.locals.categoryName;
  let connection = res.locals.connection;

  // prevent anonymous users from uploading (flow control)
  if (!req.session.isAuthenticated) {
    req.session.lastPage = "/category/" + unmodifiedCategoryName + "/upload";
    res.redirect('/login');
    return;
  };

  getCategories(connection, function (categories) {
    connection.end();
    res.render('upload', {
      categories: categories,
      unmodifiedCategoryName: unmodifiedCategoryName,
      categoryName: categoryName,
      isAuthenticated: req.session.isAuthenticated,
      username: req.session.user
    });
    return;
  });
});

router.post('/[a-z_]+/upload$', verifyCategory, function (req, res, next) {
  let unmodifiedCategoryName = res.locals.unmodifiedCategoryName;
  let categoryName = res.locals.categoryName;
  let connection = res.locals.connection;

  // make authenticated users self-redirect to index
  if (!req.session.isAuthenticated) {
    res.status(400);
    res.send("Log in you goof.");
    return;
  };

  let title = req.body.title;
  let description = req.body.description;
  let imgData = req.body.imgData;
  // console.log(imgData);
  // imgData {id, name, type, size, metadata, data (64base string)}

  let errors = {};

  if (!title) {
    errors.title = "missing";
  } else if (title.length > 100) {
    errors.title = "too long";
  }


  if (description !== undefined && description !== null) {
    if (description.length > 140) {
      errors.description = "too long";
    }
  }

  if (Object.keys(errors).length > 0) {
    res.status(400);
    res.send(errors);
    return;
  }

  let dateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  // perform insert first, if success save file
  let sql = "insert into posts values ("
    + "null,"
    + mysql.escape(title) + ","
    + mysql.escape(description) + ","
    + mysql.escape(req.session.user) + ","
    + mysql.escape(categoryName) + ","
    + mysql.escape(dateTime)
    + ")";
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;
    connection.end();

    // need to perform compression here
    let imgBuffer = Buffer.from(imgData.data, 'base64');
    sharp(imgBuffer)
      .resize(1000, null)
      .toFile(("./public/pictures/" + unmodifiedCategoryName + "/" + results.insertId), function (error, info) {
        // successs
        res.status(200);
        res.send({});
        return;
      });
  });
});

module.exports = {
  prefix: '/category',
  router
};