var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/login', function(req, res, next) {
    res.render('index', null);
    console.log(req.body);
})


router.get('/something', function(req, res, next) {
	res.render('anything', {thing: 'this'});
})

module.exports = router;
