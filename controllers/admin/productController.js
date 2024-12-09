const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require("path");
const sharp = require("sharp");

const getProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        // Fetch all products with pagination
        const productData = await Product.find()
            .limit(limit)
            .skip((page - 1) * limit)
            .populate("category")
            .populate("brand")
            .exec();

        // Count the total number of products
        const count = await Product.countDocuments();

        // Fetch categories and brands
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        // Render the products page
        if (categories && brands) {
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: categories,
                brand: brands,
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error in getProduct:", error);
        res.status(500).send("An error occurred while fetching products.");
    }
};



const getAddProduct = async (req, res) => {
    try {
        //Fetch categories and brands for the dropdown
        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        res.render('addProduct', { categories, brands, message: '' });
    } catch (error) {
        console.error('Error in getAddProduct:', error);
        res.status(500).send("Error loading add product page");
    }
}


const addProduct = async (req, res) => {
    try {
        const { regularPrice, salePrice, ...productData } = req.body;

        // Validate prices
        if (salePrice && parseFloat(salePrice) >= parseFloat(regularPrice)) {
            return res.status(400).json({
                success: false,
                message: 'Sale price must be less than regular price'
            });
        }

        // Process uploaded images
        const processedImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const filename = `${Date.now()}-${file.originalname}`;
                await sharp(file.buffer)
                    .resize(800, 800, { fit: 'inside' })
                    .toFile(path.join(__dirname, '../../public/uploads/products', filename));
                processedImages.push(filename);
            }
        }

        // Create new product
        const product = new Product({
            ...productData,
            regularPrice: parseFloat(regularPrice),
            salePrice: salePrice ? parseFloat(salePrice) : undefined,
            images: processedImages
        });

        await product.save();

        res.status(200).json({
            success: true,
            message: 'Product added successfully'
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding product'
        });
    }
};


//edit product
const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId)
            .populate('category')
            .populate('brand');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const categories = await Category.find({ isListed: true });
        const brands = await Brand.find({ isBlocked: false });

        res.render('editProduct', {
            product,
            categories,
            brands
        });
    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).send('An error occurred while editing the product.');
    }
};


const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const { productName, brand, category, regularPrice, salePrice, stock } = req.body;
        const images = req.files ? req.files.map(file => file.filename) : [];

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Update product details
        product.name = productName;
        product.brand = brand;
        product.category = category;
        product.regularPrice = regularPrice;
        product.salePrice = salePrice;
        product.stock = stock;

        // Update images if new ones are uploaded
        if (images.length > 0) {
            const fs = require('fs');
            const path = require('path');

            // Delete old images
            product.productImage.forEach(image => {
                const imagePath = path.join(__dirname, '../../public/uploads/products', image);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
            product.productImage = images;
        }

        await product.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error in updateProduct:', error);
        res.status(500).send('An error occurred while updating the product.');
    }
};



module.exports = {
    getProduct,
    getAddProduct,
    addProduct,
    editProduct,
    updateProduct,
}