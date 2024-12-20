const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController")
const productController=require('../controllers/user/productController');
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
router.get('/productDetails/:id',productController.loadProductPage);














module.exports=router;