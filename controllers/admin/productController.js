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
        const limit = 7;

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

//Add product

const addProduct = async (req, res) => {
    try {
        const { name, description, category, brand, regularPrice, salePrice, stock } = req.body;

        // Validate prices
        if (salePrice && parseFloat(salePrice) >= parseFloat(regularPrice)) {
            return res.status(400).json({
                success: false,
                message: 'Sale price must be less than regular price'
            });
        }

        // Handle image files
        const productImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                productImages.push(file.filename); // Store just the filename
            }
        }

        // Create new product
        const product = new Product({
            name,
            description,
            category,
            brand,
            regularPrice: parseFloat(regularPrice),
            salePrice: salePrice ? parseFloat(salePrice) : undefined,
            stock,
            productImage: productImages // Use the array of filenames
        });
        

        await product.save();
        return res.status(200).json({success:true,message:"Product added successfully"})

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).send('An error occurred while adding the product: ' + error.message);
    }
};



//edit product
const editProduct = async (req, res) => {
    try {
        const productId=req.params.id;
        const product=await Product.findById(productId); //fetch the details of product
        const categories=await Category.find(); //fetch categories if needed
        const brands=await Brand.find();

        res.render('editProduct',{product,categories,brands})

    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).send('An error occurred while editing the product.');
    }
};




const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Update basic product information
        product.name = req.body.name;
        product.description = req.body.description;
        product.category = req.body.category;
        product.brand = req.body.brand;
        product.regularPrice = req.body.regularPrice;
        product.salePrice = req.body.salePrice;
        product.stock = req.body.stock;

        // Handle image updates if new images are uploaded
        if (req.files && req.files.length > 0) {
            // Delete old images
            if (product.productImage && product.productImage.length > 0) {
                product.productImage.forEach(image => {
                    const imagePath = path.join(__dirname, '../../public/uploads/products', image);
                    if (fs.existsSync(imagePath)) {
                        try {
                            fs.unlinkSync(imagePath);
                        } catch (err) {
                            console.error(`Error deleting old image ${image}:`, err);
                        }
                    }
                });
            }

            // Add new images
            product.productImage = req.files.map(file => file.filename);
        }

        await product.save();
        return res.redirect('/admin/products')

    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
};


//Delete product

const deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Delete associated images
        if (product.productImage && product.productImage.length > 0) {
            product.productImage.forEach(image => {
                const imagePath = path.join(__dirname, '../../public/uploads/products', image);
                if (fs.existsSync(imagePath)) {
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (err) {
                        console.error(`Error deleting image ${image}:`, err);
                    }
                }
            });
        }

        // Delete the product
        await Product.findByIdAndDelete(productId);

        return res.status(200).json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the product'
        });
    }
};

//unlist product
const unlistProduct=async(req,res)=>{
    try {
        const productId=req.params.id;
        const product= await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,message:"Product not found"});
        }

        product.isListed=false;   //evide namal product list chyune block akkum
        await product.save();

        res.status(200).json({
            success:true,
            message:'Product has been unlisted successfully',
        });
    
    } catch (error) {
        console.error("Error unlisting product:",error);
        res.status(500).json({
            success:false,
            message:'Failed to unlist the product',
        })    
    }
}

//listProduct

const listProduct=async(req,res)=>{
    try {
        const productId=req.params.id;
        const product= await Product.findById(productId);

        if(!product){
            return res.status(404).json({success:false,message:'Product not found'});
        }

        product.isListed=true;
        await product.save();

        res.status(200).json({
            success:true,
            message:"Product has been listed successfully"
        })

    } catch (error) {
        console.error("Error listing product:",error);
        res.status(500).json({
            success:false,
            message:"Failed to list the products",
        })
    }
}


module.exports = {
    getProduct,
    getAddProduct,
    addProduct,
    editProduct,
    updateProduct,
    deleteProduct,
    unlistProduct,
    listProduct
}