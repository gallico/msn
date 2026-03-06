// backend/routes/fsBrowser.router.js
const express = require("express");
const router = express.Router();
const { browseDir } = require("../controllers/fsBrowser.controller");

router.get("/browse", browseDir);

module.exports = router;
