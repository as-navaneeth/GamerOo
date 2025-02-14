const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const mongoose=require('mongoose');

//Product page 

const loadProductPage = async (req, res, next) => {

    try {
        const productId = req.params.id;

        if (!productId) {
            return res.status(400).render('page-404',{message:'Invalid Product ID'});
        }

        if(!mongoose.Types.ObjectId.isValid(productId)){
            return res.status(404).render('page-404',{message:'Invalid product ID'});
        }

        // Increment view count
        await Product.findByIdAndUpdate(productId, { $inc: { views: 1 } });

        const product = await Product.findById(productId).populate('category');

        const similarProducts = await Product.find({ isListed: true, category: product.category._id }).limit(4)

        if (!product) {
            return res.status(404).render('page-404',{message:'Product not found'});
        }

        res.render('productDetail', {
            product,
            similarProducts,
        })

    } catch (error) {
        next(error);
    }
}

module.exports = {
    loadProductPage,
}