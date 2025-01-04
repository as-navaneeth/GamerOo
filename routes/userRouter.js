const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController")
const productController=require('../controllers/user/productController');
const addressController=require('../controllers/user/addressController');
const cartController=require('../controllers/user/cartController');
const checkoutController=require('../controllers/user/checkoutController');
const orderController = require('../controllers/user/orderController');
const passport=require("passport")
const {userAuth, adminAuth} = require('../middlewares/auth')

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

//Cart Routes
router.get('/cart', userAuth, cartController.getAddtoCart);
router.post('/cart/add',userAuth,cartController.addToCart);
router.delete('/cart/delete/:itemId',userAuth,cartController.deleteCartItem);

router.get('/checkout/validate', userAuth, checkoutController.validateCheckout);
router.get('/checkout', userAuth, checkoutController.getCheckout);
router.post('/checkout/process', userAuth, checkoutController.processCheckout);

module.exports=router;