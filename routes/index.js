var express = require('express');
var router = express.Router();
var fs = require('fs');


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('upload');
});

router.post('/TEMPORARY', function(req, res, next) {
    console.log(req.body.title);
    console.log(req.body.description);
    // console.log(req.body.imgData);
    res.send({message: "success"});
});

module.exports = router;
