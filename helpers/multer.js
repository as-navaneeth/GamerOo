const multer = require("multer");
const path = require("path");const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
    const dirs = [
        path.join(__dirname, '../public/uploads/products'),
        path.join(__dirname, '../public/uploads/brands')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
};

createUploadDirs();

// File filter for images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only .jpeg, .jpg and .png files are allowed!'), false);
    }
};

// Product upload configuration
const productUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = path.join(__dirname, '../public/uploads/products');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 3 // Maximum 3 files
    }
}).array('productImages', 3); // Field name 'productImages', max 3 files

// Wrapper function to handle multer errors
const handleProductUpload = (req, res, next) => {
    productUpload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 3 images allowed'
                });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: 'File too large. Maximum size is 5MB'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }
        next();
    });
};

// Brand upload configuration
const brandUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, path.join(__dirname, '../public/uploads/brands'));
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 7 * 1024 * 1024 
    }
});



module.exports = {
    productUpload,
    brandUpload,
    handleProductUpload,
};