// backend/controllers/fsBrowser.controller.js
const { listDir } = require("../services/fsBrowser.service");

const browseDir = (req, res) => {
    try {
        const relPath = req.query.path || ".";
        const data = listDir(relPath);
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

module.exports = { browseDir };
