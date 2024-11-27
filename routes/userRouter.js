const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController")
const passport=require("passport")


router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomePage)

router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verifyOtp",userController.verifyOtp);
router.post("/resendOtp",userController.resendOtp);
//google authentification routes
router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}));
router.get("/auth/google/callback",passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});












module.exports=router;