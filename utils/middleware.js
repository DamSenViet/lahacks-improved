const mysql = require('mysql');
const request = require('request');

// http://expressjs.com/en/4x/api.html#app.use
// express accepts chaining middleware calls in series

const verifyCategory = function (req, res, next) {
  // to support history states
  let urlRemovedQuery = req.url.split("?")[0];

  let unmodifiedCategoryName = urlRemovedQuery.split("/")[1];
  let categoryName = unmodifiedCategoryName.replace(/_/g, " ");
  let connection = mysql.createConnection(mysqlConfig);

  res.locals.unmodifiedCategoryName = unmodifiedCategoryName;
  res.locals.categoryName = categoryName;
  res.locals.connection = connection;

  let sql = "select name from categories where name=" + mysql.escape(categoryName);
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    if (results.length !== 1) {
      res.status(404);
      res.send("Category '" + categoryName + "' does not exist.");
      return;
    }
    next();
  });
};

const verifyCaptcha = function (req, res, next) {
  // check for recaptcha first
  let captchaResponse = req.body.captchaResponse;
  if (!captchaResponse) {
    res.status(403);
    res.send("Please verify reCaptcha before submitting.");
    return;
  }

  // verify captcha token on google's servers
  let captchaSecret = "6LdIU70UAAAAAF83RjUca3tdbmQRL5r2Xh-5XJhH";
  let captchaURL = "https://www.google.com/recaptcha/api/siteverify?"
    + "secret=" + encodeURIComponent(captchaSecret) + "&"
    + "response=" + encodeURIComponent(captchaResponse) + "&"
    + "remoteip" + encodeURIComponent(req.connection.remoteAddress);
  request(captchaURL, function (error, response, body) {
    // https://developers.google.com/recaptcha/docs/verify
    // console.log("grecaptcha verification: " + body);
    // body holds the json reply
    // send error message if not correct


    if (!JSON.parse(body).success) {
      res.status(403);
      res.send("reCaptcha was invalid, try again.");
      return;
    }
    // verified reCaptcha
    next();
  });
};

module.exports = {
  verifyCaptcha,
  verifyCategory,
}