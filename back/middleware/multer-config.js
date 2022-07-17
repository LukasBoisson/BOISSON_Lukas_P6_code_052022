const multer = require("multer");

const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// configuration object for multer (destination + filename)
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "images");
  },
  filename: (req, file, callback) => {
    // keep the file name but replace spaces with '_'
    const name = file.originalname.split(".")[0];
    const extension = MIME_TYPES[file.mimetype];
    // add a time stamp
    callback(null, name + "-" + Date.now() + "." + extension);
  },
});

//single = single file
module.exports = multer({ storage }).single("image");

