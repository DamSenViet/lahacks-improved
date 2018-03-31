var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log(req.body + "this was it");
  res.render('index', { title: 'Express' });
});

/* GET login page */
router.get('/login', function(req, res, next) {
    res.render('login', null);
    console.log(req.body);
});

/* POST login information */
// attemps a login
//  opens userdata json
//      try:
//          username
//          password
//      catch:
//          set response to fail, with code 500
//          return
//      set response to username
//      set code 200
//      set cookie pixstersess = token
//      add token: username to session.json
router.post('/login', function(req, res, next) {

});


/* GET profile page */
// check if user has pixstersess cookie
// if not then send them to login page (this means that they're not logged in)
//
//
router.get('/profile', function(req, res, next) {

});

/* GET general category page */
// this page lists all categories
router.get('/category/', function(req, res, next) {
    console.log("this")
});

/* GET specific category page */
// this page lists category and all its photos
router.get('/category/.*', function(req, res, next) {
    console.log("test");
    res.render('index', null)
});

/* GET photo from category */
router.get('/category/photo', function(req, res, next) {

});


module.exports = router;
