const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema");
const User=require('../../models/userSchema');
const fs=require('fs');
const path=require("path");
const sharp=require("sharp");


const getProduct=async(req,res)=>{
    try {
        const products=await Product.find();
        res.render('products',{products})
    } catch (error) {
        res.status(500).send("error");
    }
}


const getAddProduct=async(req,res)=>{
    try {
        //Fetch categories and brands for the dropdown
        const categories=await Category.find({isListed:true});
        const brands=await Brand.find({isBlocked:false});

        res.render('addProduct',{categories,brands,message:''});
    } catch (error) {
        console.error('Error in getAddProduct:', error);
        res.status(500).send("Error loading add product page");
    }
}


const addProduct = async (req, res) => {
    try {
        const {
             regularPrice, salePrice, ...productData } = req.body;
        
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


module.exports={
    getProduct,
    getAddProduct,
    addProduct
}