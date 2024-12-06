const express=require("express");
const router=express.Router();
const multer=require("multer");

const adminController=require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController");
const categoryController=require("../controllers/admin/categoryController");
const productController=require("../controllers/admin/productController");
const brandController=require("../controllers/admin/brandController");
const storage=require("../helpers/multer");
const uploads=multer({storage:storage}); 

const {userAuth,adminAuth}=require("../middlewares/auth");


//login management
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login);
router.get("/pageerror",adminController.pageerror);
router.get("/logout", adminController.logout);

router.get("/dashboard",adminAuth,adminController.loadDashboard);

//block and unblock user
router.get('/customer',adminAuth,customerController.userList);
router.post('/unblock/:userId',adminAuth,customerController.unblockUser);
router.post('/block/:userId',adminAuth,customerController.blockUser);

//category management routes
router.get("/category",adminAuth,categoryController.getCategory);
router.post("/category/add",adminAuth,categoryController.addCategory);
router.put("/category/edit/:id",adminAuth,categoryController.editCategory);

//brand management
router.get("/brands",adminAuth,brandController.getBrand);

//product managemnet routes
router.get("/products",adminAuth,productController.getProduct);

module.exports=router;