const express=require("express");
const router=express.Router();
const userController=require("../controllers/user/userController")


router.get('/pageNotFound',userController.pageNotFound);
router.get('/',userController.loadHomePage)

router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup);
router.post("/verifyOtp",userController.verifyOtp);
router.post("/resendOtp",userController.resendOtp);













module.exports=router;