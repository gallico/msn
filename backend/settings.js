const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || __dirname;
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const DEFAULT_BASE_FOLDER = path.join(__dirname, "assets");

function getSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) return { baseFolder: DEFAULT_BASE_FOLDER };
    try {
        const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
        return { baseFolder: DEFAULT_BASE_FOLDER, ...data };
    } catch {
        return { baseFolder: DEFAULT_BASE_FOLDER };
    }
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

module.exports = { getSettings, saveSettings };
