module.exports = function (app) {
  app.get("/box", (req, res) => {
    res.send("周賀寶箱頁面測試成功");
  });
};
