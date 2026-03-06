const { getMediaFromDir } = require("../services/gallery.service");

// NEW: async/await
const getGalleryItems = async (req, res) => {
    try {
        const dir = req.query.dir || ".";
        const items = await getMediaFromDir(dir);
        res.json({ items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list media" });
    }
};

module.exports = { getGalleryItems };
