var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log(req.body + "this was it");
  res.render('index', { title: 'Express' });
});

/* GET login page */
router.get('/login/', function(req, res, next) {
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
//      set cookie session = token
//      add token: username to session.json
router.post('/login/*/*/', function(req, res, next) {
    console.log("made it to login");
    console.log(req.body.username);
    console.log(req.body.password);


});


router.post('/createcategory/', function(req, res, next) {

});

/* GET profile page */
// check if user has session cookie
// if not then send them to login page (this means that they're not logged in)
//
//
router.get('/profile/', function(req, res, next) {

});

/* GET general category page */
// this page lists all categories
// build json of all photo links
router.get('/category/', function(req, res, next) {
    res.render('category', null);
});

/* GET specific category page */
// this page lists specific category and all its photos
// if category doesn't exist, return an error
router.get('/category/*/', function(req, res, next) {
    let url = req.url.split("/");
    console.log(url[2]);

    // res.render('login', null);
});

/* GET photo from category */
router.get('/category/*/photo/*/', function(req, res, next) {

});


module.exports = router;
