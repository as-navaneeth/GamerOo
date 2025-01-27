const express = require("express");
const router = express.Router();
const { brandUpload, productUpload,handleProductUpload } = require("../helpers/multer");

const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const orderController=require("../controllers/admin/orderController");
const couponController = require('../controllers/admin/couponController');
const salesReportController = require('../controllers/admin/salesReportController');
const dashboardController=require('../controllers/admin/dashboardController');
const { userAuth, adminAuth } = require("../middlewares/auth");

//login management
router.get("/", adminAuth, adminController.loadDashboard)
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/pageerror", adminController.pageerror);
router.get("/logout", adminController.logout);

router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get('/dashboard/sales', adminAuth, dashboardController.getSalesData);
router.get('/dashboard/top-products', adminAuth, dashboardController.getTopProducts);
router.get('/dashboard/top-categories', adminAuth, dashboardController.getTopCategories);
router.get('/dashboard/top-brands', adminAuth, dashboardController.getTopBrands);

//block and unblock user
router.get('/customer', adminAuth, customerController.userList);
router.post('/unblock/:userId', adminAuth, customerController.unblockUser);
router.post('/block/:userId', adminAuth, customerController.blockUser);

//category management routes
router.get("/category", adminAuth, categoryController.getCategory);
router.post("/category/add", adminAuth, categoryController.addCategory);
router.put("/category/edit/:id", adminAuth, categoryController.editCategory);
router.post("/category/list/:id",adminAuth,categoryController.listCategory);
router.post("/category/unlist/:id",adminAuth,categoryController.unlistCategory);

router.post("/category/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/category/removeCategoryOffer",adminAuth,categoryController.removeOffer);

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
router.delete('/products/delete/:id', adminAuth, productController.deleteProduct);
router.post('/products/unlist/:id',adminAuth,productController.unlistProduct);
router.post('/products/list/:id',adminAuth,productController.listProduct);

router.get('/products/edit/:id',adminAuth,productController.editProduct)
router.post('/products/edit/:id', adminAuth, handleProductUpload, productController.updateProduct);

router.post('/products/addProductOffer',adminAuth,productController.addOffer);
router.post('/products/removeProductOffer',adminAuth,productController.removeOffer);

// Coupon Management Routes
router.get('/coupons', adminAuth, couponController.getCoupons);
router.get('/coupons/add', adminAuth, couponController.getAddCoupon);
router.post('/coupons/add', adminAuth, couponController.addCoupon);
router.get('/coupons/edit/:id', adminAuth, couponController.getEditCoupon);
router.put('/coupons/edit/:id', adminAuth, couponController.updateCoupon);
router.delete('/coupons/:id', adminAuth, couponController.deleteCoupon);
router.patch('/coupons/:id/toggle', adminAuth, couponController.toggleCouponStatus);

// Order management routes
router.get('/orders', adminAuth, orderController.listOrders);
router.get('/orders/:id', adminAuth, orderController.getOrderDetails);
router.post('/orders/update-status', adminAuth, orderController.updateOrderStatus);

// Return request routes
router.get('/return-requests', adminAuth, orderController.getReturnRequests);
router.post('/return-requests/:orderId/handle', adminAuth, orderController.handleReturnRequest);

// Sales Report Routes
router.get('/sales-report', adminAuth, salesReportController.getSalesReport);
router.get('/sales-report/download-excel', adminAuth, salesReportController.downloadExcel);
router.get('/sales-report/download-pdf', adminAuth, salesReportController.downloadPDF);

module.exports = router;