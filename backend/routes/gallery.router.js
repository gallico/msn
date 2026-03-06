const express = require("express");
const router = express.Router();
const { getGalleryItems } = require("../controllers/gallery.controller");

router.get("/items", getGalleryItems);

module.exports = router;
