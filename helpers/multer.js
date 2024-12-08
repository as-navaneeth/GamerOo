const multer = require("multer");
const path = require("path");

// Configure multer storage for products
const productStorage = multer.memoryStorage();

// Configure multer storage for brands
const brandStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads/brands"));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

// Create multer upload instances
const brandUpload = multer({
    storage: brandStorage,
    fileFilter: imageFileFilter
});

const productUpload = multer({
    storage: productStorage,
    fileFilter: imageFileFilter
});

module.exports = {
    brandUpload,
    productUpload
};