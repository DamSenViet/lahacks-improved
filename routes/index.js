var express = require('express');
var router = express.Router();
var fs = require('fs');



function getAllCategories() {
    temp = [];

    baseUrl = process.cwd();
    allCat = fs.readdirSync(baseUrl + '/public/pictures/');

    for (let i = 0; i < allCat.length; ++i) {
        temp.push(allCat[i]);
    }

    return temp;
}

function getSessionId(req) {
    console.log("cookie: " + req.cookies["sessionid"]);
    tempid = null;
    if (req.cookies.hasOwnProperty('sessionid')) {
        tempid = req.cookies["sessionid"];
    }
    return tempid;
}

/* GET home page. */
router.get('/', function(req, res, next) {

    baseUrl = process.cwd();
    picUrl = baseUrl + '/public/pictures/';

    allTop = {};
    allCat = fs.readdirSync(picUrl);

    // for each category
    for (let i = 0; i < allCat.length; ++i) {
        var bestPhotoPath = null;
        var bestPhotoVotes = 0;

        let data = fs.readFileSync(picUrl + "/" + allCat[i] + "/data.json");
        json = JSON.parse(data);

        photoData = Object.keys(json);
        for (let j = 0; j < photoData.length; ++j) {
            if (json[photoData[j]]["votes"] >= bestPhotoVotes) {
                    bestPhotoPath = photoData[j];
                    bestPhotoVotes = json[photoData[j]]["votes"];
            }
        }

        allTop[allCat[i]] = bestPhotoPath;
    }
    console.log(allTop);


    res.render('index', {best: allTop, allCat: getAllCategories(), sessionid: getSessionId(req)});
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

    // ASYNCHRONOUS, DON'T USE THIS SINCE
    // ERRORS WILL NOT BE CAUGHT
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
        if (json.hasOwnProperty(username)) throw "username already exists";

        json[username] = {"password": password, "uploads" : [], "upvotes" : {}};

        fs.writeFile(baseUrl + '/public/userdata.json', JSON.stringify(json));

    } catch (err) {
        console.log("login attempt failed");
        res.status(401);
        res.send({});
        return;
    }

    console.log("success");
    res.cookie('sessionid', username, {});
    res.send({"success": true});
});

/* GET login page */
router.get('/login/', function(req, res, next) {
    res.render('login', {allCat: getAllCategories(), sessionid: getSessionId(req)});
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

    username = req.body.username;
    password = req.body.password;

    baseUrl = process.cwd();
    console.log(baseUrl);

    try {
        let data = fs.readFileSync(baseUrl + "/public/userdata.json");
        let json = JSON.parse(data);

        // if username does not exist
        if (!json.hasOwnProperty(username)) throw "username does not exist";
        if (json[username]["password"] != password) throw "wrong password";

    } catch (err) {
        console.log("login attempt failed");
        res.status(401);
        res.send({});
        return;
    }

    console.log("success");
    res.cookie('sessionid', username, {});
    res.send({"success": true});
});


router.get('/logout', function(req, res, next) {
    res.clearCookie('sessionid');
    res.redirect('/');
});


router.get('/createcategory/', function(req, res, next) {
    
});


router.post('/createcategory/*/', function(req, res, next) {
    if (getSessionId(req) == null) {
        res.redirect('/login');
    }

    var url = req.url.split("/");
    var category_name = url[2];

    baseUrl = process.cwd();

    if (!fs.existsSync(baseUrl + "/public/pictures/" + category_name)) {
        fs.mkdirSync(baseUrl + "/public/pictures/" + category_name);
        fs.writeFile(baseUrl + "/public/pictures/" + category_name + "/data.json", JSON.stringify({}));

        // set success

    } else {

        // set 401 category already exists

    }
});

/* GET profile page */
// check if user has session cookie
// if not then send them to login page (this means that they're not logged in)
//
router.get('/profile/*', function(req, res, next) {
    res.render('profile', {allCat: getAllCategories(), sessionid: getSessionId(req)});
});

/* GET general category page */
// this page lists all categories
router.get('/category/', function(req, res, next) {
    res.render('category', {allCat: getAllCategories(), sessionid: getSessionId(req)});
});


/* GET specific category page */
// this page lists specific category and all its photos
// if category doesn't exist, return an error
router.get('/category/*/', function(req, res, next) {
    let category_name = req.url.split("/")[2];
    console.log(category_name);

    baseUrl = process.cwd();

    let data = fs.readFileSync(baseUrl + '/public/pictures/' + category_name + '/data.json');
    var temp = JSON.parse(data);


    let userdata = fs.readFileSync(baseUrl + '/public/userdata.json');
    var userjson = JSON.parse(userdata);


    var tempid = getSessionId(req);
    if (tempid == null) {
        res.render('category_specific', {
            allCat: getAllCategories(),
            sessionid: tempid,
            allPhotos: temp,
            category: category_name,
            upvotes: null
        })
    } else {
        res.render('category_specific',
        {
            allCat: getAllCategories(),
            sessionid: getSessionId(req),
            allPhotos: temp,
            category: category_name,
            upvotes: userjson[tempid]["upvotes"]
        });
    }
});


/* upload page for the category */
router.get('/upload/*/', function(req, res, next) {
    // need to give it category name, upload should only be available on category

    // redirect if user isn't logged in
    if (!req.cookies.hasOwnProperty('sessionid')) {
        res.redirect('/login');
    }
    res.render('upload', {allCat: getAllCategories(), sessionid: getSessionId(req)});
});



router.post('/upload/*/', function(req, res, next) {


    var category = req.url.split('/')[2];
    console.log(category);


    console.log(req.body.filename);

    baseUrl = process.cwd().replace(/\\/g, "/");
    console.log("base " + baseUrl);

    saveUrl = baseUrl + '/public/pictures/' + category + "/" + req.body.filename;

    fs.writeFile(saveUrl, req.body.img, 'base64', function(err) {
        // console.log(err);
    });


    // add voting data to category
    let data = fs.readFileSync(baseUrl + "/public/pictures/" + category
     + "/data.json");
     let json = JSON.parse(data);
     json[req.body.filename] = {"votes": 0};
     fs.writeFile(baseUrl + "/public/pictures/" + category
      + "/data.json", JSON.stringify(json));


      // add uploaded information to user
      let userdata = fs.readFileSync(baseUrl + "/public/userdata.json");
      let userjson = JSON.parse(userdata);

      if (!userjson[req.cookies["sessionid"]]["uploads"].contains("/pictures/" + category + "/" + req.body.filename)) {
          userjson[req.cookies["sessionid"]]["uploads"].push("/pictures/" + category + "/" + req.body.filename);
      }
      fs.writeFile(baseUrl + "/public/userdata.json", JSON.stringify(userjson));
});


// upvote api
router.post('/upvote/', function(req, res, next) {
    var category = req.body.category;
    var photo = req.body.photo;
    console.log(category + "    " + photo);

    var baseUrl = process.cwd().replace(/\\/g, "/");
    sessionid = getSessionId(req);


    console.log("made it this far");
    console.log(baseUrl + "/public/userdata.json");

    var userdata = fs.readFileSync(baseUrl + "/public/userdata.json");
    var userjson = JSON.parse(userdata);

    if (userjson[sessionid]["upvotes"].hasOwnProperty(category + "/" + photo)) {
        // user already upvoted
    } else {
        userjson[sessionid]["upvotes"][category + "/" + photo] = null;
        fs.writeFile(baseUrl + "/public/userdata.json", JSON.stringify(userjson));

        console.log("wrote to userdata");

        var data = fs.readFileSync(baseUrl + "/public/pictures/" + category + "/data.json");
        var json = JSON.parse(data);
        json[photo]["votes"] += 1;
        fs.writeFile(baseUrl + "/public/pictures/" + category + "/data.json", JSON.stringify(json));
    }


    res.send({message: "success"});
});

router.post('/removevote/', function(req, res, next) {
    var category = req.body.category;
    var photo = req.body.photo;
    console.log(category + "    " + photo);

    var baseUrl = process.cwd().replace(/\\/g, "/");
    sessionid = getSessionId(req);


    console.log("made it this far");
    console.log(baseUrl + "/public/userdata.json");

    var userdata = fs.readFileSync(baseUrl + "/public/userdata.json");
    var userjson = JSON.parse(userdata);

    if (userjson[sessionid]["upvotes"].hasOwnProperty(category + "/" + photo)) {
        // user already upvoted, remove vote
        delete userjson[sessionid]["upvotes"][category + "/" + photo];

        fs.writeFile(baseUrl + "/public/userdata.json", JSON.stringify(userjson));

        console.log("wrote to userdata");

        var data = fs.readFileSync(baseUrl + "/public/pictures/" + category + "/data.json");
        var json = JSON.parse(data);
        --json[photo]["votes"];
        console.log(json);
        fs.writeFile(baseUrl + "/public/pictures/" + category + "/data.json", JSON.stringify(json));
    } else {
    }

    res.send({message: "success"});
});

/* GET specific photos from category */
router.get('/single/category/*/photo/*/', function(req, res, next) {
    var url = req.url.split("/");
    var category_name = url[3];
    var img_path = url[5];

    console.log("THIS ONE HERE");
    console.log(category_name + " " + img_path);

    res.render('photo', {
        allCat: getAllCategories(),
        sessionid: getSessionId(req),
        category: category_name,
        photo: img_path
    });
});

module.exports = router;
