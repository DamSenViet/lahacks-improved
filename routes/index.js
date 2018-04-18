var express = require('express');
var router = express.Router();
var fs = require('fs');


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('upload');
});

router.get('/login/', function(req, res, next) {

});


router.post('/login/', function(req, res, next) {

});


router.get('/signup/', function(req, res, next) {

});


router.post('/signup/', function(req, res, next) {

});


router.get('/upload/*', function(req, res, next) {

});

router.post('/upload/*', function(req, res, next) {

});

router.post('/TEMPORARY/', function(req, res, next) {
    console.log(req.body.title);
    console.log(req.body.description);
    // console.log(req.body.imgData);
    res.status(400);
    res.send({title:'too long', file: 'oops'});
});

module.exports = router;
