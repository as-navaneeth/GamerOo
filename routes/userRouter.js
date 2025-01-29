const express = require("express");
const router = express.Router();
const Razorpay = require('razorpay');
require('dotenv').config();

const userController = require("../controllers/user/userController");
const productController = require('../controllers/user/productController');
const addressController = require('../controllers/user/addressController');
const cartController = require('../controllers/user/cartController');
const checkoutController = require('../controllers/user/checkoutController');
const orderController = require('../controllers/user/orderController');
const wishlistController = require('../controllers/user/wishlistController');
const paymentController = require('../controllers/user/paymentController');
const couponController = require('../controllers/user/couponController');
const walletController = require('../controllers/user/walletController');

const passport = require("passport");
const { userAuth, adminAuth } = require('../middlewares/auth');

router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomePage)

router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.get("/verifyOtp",userController.loadVerifyOtp);
router.post("/verifyOtp",userController.verifyOtp);
router.post("/resendOtp",userController.resendOtp);
//google authentification routes
router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});
//User login and logout
router.get("/login",userController.loadLogin);
router.post("/login",userController.login);
router.get("/logout",userController.logout);

//shop page
router.get('/shop',userController.loadShoppingPage);

// Temporary route to check categories
router.get('/check-categories', async (req, res) => {
    const Category = require('../models/categorySchema');
    const categories = await Category.find({});
    res.json(categories);
});

//user product page
router.get('/productDetails/:id',userAuth,productController.loadProductPage);


//UserProfileSection
router.get('/userProfile',userAuth,userController.getUserProfile);
router.post('/userProfile/update-profile', userAuth, userController.updateProfile);
//change password
router.get('/userProfile/change-password',userAuth,userController.getChangePassword);
router.post('/userProfile/change-password',userAuth,userController.postChangePassword);

// Order Routes
router.get('/orders', userAuth, orderController.getMyOrders);
router.get('/orders/:orderId', userAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', userAuth, orderController.cancelOrder);
router.get('/order/invoice/:orderId',userAuth,orderController.downloadInvoice);

// Return order routes
router.post('/orders/:orderId/return', userAuth, orderController.requestReturn);
router.get('/orders/:orderId/return-status', userAuth, orderController.getReturnStatus);

// Order routes
router.get('/userProfile/orders', userAuth, userController.getOrders);
router.get('/userProfile/order/:orderId', userAuth, userController.getOrderDetails);
router.get('/userProfile/order/:orderId/invoice', userAuth, userController.downloadInvoice);   //look after sometimes



//Address routes
router.get('/manageAddress', userAuth, addressController.getAddress);
router.get('/manageAddress/addAddress',userAuth,addressController.getAddAddress);
router.post('/manageAddress/addAddress',userAuth,addressController.postaddAddress)
router.get('/manageAddress/editAddress/:id',userAuth,addressController.getEditAddress);
router.post('/manageAddress/editAddress/:id',userAuth,addressController.updateAddress);
router.get('/manageAddress/setDefault/:id',userAuth,addressController.setDefaultAddress);
router.delete('/manageAddress/deleteAddress/:id',userAuth,addressController.deleteAddress);
// New address routes for checkout page
router.post('/save-address', userAuth, addressController.saveAddress);
router.post('/update-selected-address', userAuth, addressController.updateSelectedAddress);

//Cart Routes
router.get('/cart', userAuth, cartController.getAddtoCart);
router.post('/cart/add',userAuth,cartController.addToCart);
router.delete('/cart/delete/:itemId',userAuth,cartController.deleteCartItem);
router.patch('/cart/update-quantity/:itemId', userAuth, cartController.updateCartQuantity);

//checkout controller
router.get('/checkout/validate', userAuth, checkoutController.validateCheckout);
router.get('/checkout', userAuth, checkoutController.getCheckout);
router.post('/checkout/process', userAuth, checkoutController.processCheckout);

// Wishlist routes
router.get('/wishlist', userAuth, wishlistController.getWishlist);
router.post('/wishlist/add/:productId', userAuth, wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', userAuth, wishlistController.removeFromWishlist);


// Wallet routes
router.get('/wallet', userAuth, walletController.getWallet);
router.post('/wallet/create-order', userAuth, walletController.createRazorpayOrderForWallet);
router.post('/wallet/verify-payment', userAuth, walletController.verifyRazorpayPaymentForWallet);


// Payment routes
router.post('/payment/create-order', userAuth, paymentController.createRazorpayOrder);
router.post('/payment/verify', userAuth, paymentController.verifyPayment);
router.post('/payment/wallet',userAuth,paymentController.handleWalletPayment)
router.post('/payment/retry/:orderId', userAuth, paymentController.retryPayment);
// router.post('/payment/cod', userAuth, paymentController.handleCodOrder);

// Coupon routes
router.post('/coupons/apply', userAuth, couponController.applyCoupon);
router.post('/coupons/remove', userAuth, couponController.removeCoupon);
router.get('/coupons/applied', userAuth, couponController.getAppliedCoupon);

// About page
router.get('/about', userController.getAboutPage);

module.exports=router;