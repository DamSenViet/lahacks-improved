var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {
    console.log(req.body + "this was it");
  res.render('index', { title: 'Express' });
});


router.get('/signup/', function(req, res, next) {
    res.render('signup', null);
});


router.post('/signup/*/*/', function(req, res, next) {
    console.log("made it to signup");
    console.log(req.body.username);
    console.log(req.body.password);

    username = req.body.username;
    password = req.body.password;

    baseUrl = process.cwd();
    console.log(baseUrl);

    // ASYNCHRONOUS
    // DOESN'T CATCH ERRORS IN TIME
    // fs.readFile(baseUrl + '/public/userdata.json', function(err, data) {
    //     if (err) throw err;
    //     // console.log("")
    //     var json = JSON.parse(data);
    //
    //     // add new username
    //     // TODO: throw error if username exists
    //
    //     if (json.hasOwnProperty(username)) {
    //         failSignUp(req, res, next);
    //         res.end();
    //         return;
    //     }
    //
    //     json[username] = {"password": password};
    //
    //     fs.writeFile(baseUrl + '/public/userdata.json', JSON.stringify(json));
    // });

    try {
        let data = fs.readFileSync(baseUrl + "/public/userdata.json");
        let json = JSON.parse(data);

        // if username already exists
        if (json.hasOwnProperty(username)) {
            throw "username already exists";
        }

        json[username] = {"password": password};

        fs.writeFile(baseUrl + '/public/userdata.json', JSON.stringify(json));
    } catch (err) {
        console.log("login attempt failed");
        res.status(401);
        res.send({});
        return;
    }

    res.cookie();
    res.redirect('/');
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
    // successs
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