// get list of categories using existing connection
const getCategories = function (connection, callback) {
  let sql = "select name from categories order by name asc";
  connection.query(sql, function (error, results, fields) {
    if (error) throw error;

    let categories = [];
    for (let i = 0; i < results.length; ++i) {
      categories.push({
        name: results[i].name,
        unmodifiedName: results[i].name.replace(/ /g, "_")
      });
    }
    callback(categories);
    return;
  });
};

module.exports = {
  getCategories
}