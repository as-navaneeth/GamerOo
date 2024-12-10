const express = require("express");
const router = express.Router();
const { brandUpload, productUpload,handleProductUpload } = require("../helpers/multer");

const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");

const { userAuth, adminAuth } = require("../middlewares/auth");

//login management
router.get("/", adminAuth, adminController.loadDashboard)
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/pageerror", adminController.pageerror);
router.get("/logout", adminController.logout);

router.get("/dashboard", adminAuth, adminController.loadDashboard);

//block and unblock user
router.get('/customer', adminAuth, customerController.userList);
router.post('/unblock/:userId', adminAuth, customerController.unblockUser);
router.post('/block/:userId', adminAuth, customerController.blockUser);

//category management routes
router.get("/category", adminAuth, categoryController.getCategory);
router.post("/category/add", adminAuth, categoryController.addCategory);
router.put("/category/edit/:id", adminAuth, categoryController.editCategory);

//brand management
router.get("/brands", adminAuth, brandController.getBrand);
router.post("/addBrand", adminAuth, brandUpload.single("brandImage"), brandController.addBrand);
router.delete("/deleteBrand/:id", adminAuth, brandController.deleteBrand);
router.patch("/blockBrand/:id", adminAuth, brandController.blockBrand);
router.patch("/unblockBrand/:id", adminAuth, brandController.unblockBrand);

//product managemnet routes
router.get("/products", adminAuth, productController.getProduct);
router.get("/addProduct", adminAuth, productController.getAddProduct);
router.post("/addProducts", adminAuth, handleProductUpload, productController.addProduct);
router.get('/products/edit/:id', adminAuth, productController.editProduct);
// router.post('/products/edit/:id', adminAuth, productUpload.array('productImages', 3), productController.updateProduct);
router.delete('/products/delete/:id', adminAuth, productController.deleteProduct);

module.exports = router;