const multer = require("multer");
const path = require("path");

// File filter for images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

// Product upload configuration
const productUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'public/uploads/products');
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: fileFilter
});

// Brand upload configuration
const brandUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "public/uploads/brands");
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: fileFilter
});

module.exports = {
    productUpload,
    brandUpload
};