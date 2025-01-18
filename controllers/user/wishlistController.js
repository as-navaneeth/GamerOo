const Wishlist = require('../../models/wishlistSchema');
const Product = require('../../models/productSchema');

// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ user: userId })
            .populate('products.product');

        res.render('wishlist', {
            wishlist: wishlist ? wishlist.products : [],
            
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.redirect('/');
    }
};

// Add product to wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.productId;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Find or create wishlist
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, products: [] });
        }

        // Check if product is already in wishlist
        const existingProduct = wishlist.products.find(
            item => item.product.toString() === productId
        );

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Product already in wishlist'
            });
        }

        // Add product to wishlist
        wishlist.products.push({ product: productId });
        await wishlist.save();

        res.json({
            success: true,
            message: 'Product added to wishlist'
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding to wishlist'
        });
    }
};

// Remove product from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const productId = req.params.productId;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: 'Wishlist not found'
            });
        }

        // Remove product from wishlist
        wishlist.products = wishlist.products.filter(
            item => item.product.toString() !== productId
        );
        await wishlist.save();

        res.json({
            success: true,
            message: 'Product removed from wishlist'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing from wishlist'
        });
    }
};

module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist
};
