const express = require('express');

const router = express.Router();

router.get('/$', function (req, res, next) {
  let lastPage = (req.session.lastPage) ? req.session.lastPage : "/";
  req.session.destroy(function (error) {
    res.redirect(lastPage);
  });
});

module.exports = {
  prefix: '/logout',
  router
};