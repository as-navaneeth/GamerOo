const User = require("../../models/userSchema");
const nodemailer = require("nodemailer"); // to sent mail 
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { generateInvoice } = require('../../utils/invoiceGenerator');
const ejs = require('ejs');

const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema'); 
const Brand = require('../../models/brandSchema'); 
const Wishlist=require('../../models/wishlistSchema');



//page not found
const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('pageNotFound')
    }
}





const loadHomePage = async (req, res) => {
    try {
        const userId = req.session.user;
        

        const productData = await Product.find({ isListed: true })
            .populate('category')
            .populate('brand')
            .sort({stock:-1, createdAt: -1 })
            .limit(10);

        // Fetch categories for search dropdown
        const categories = await Category.find({ isListed: true });
        //collet the Ids of products in the wishlist
        let wishlistProductIds = [];

       
        if (userId) {
            const userData = await User.findOne({ _id: userId });
            if (userData) {
                // Fetch user's wishlist
                const wishlist = await Wishlist.findOne({ user: userId });
                if (wishlist) {
                    wishlistProductIds = wishlist.products.map(item =>
                        item.product.toString()
                    );
                }

                return res.render("home", {
                    user: userData,
                    products: productData,
                    categories,
                    wishlistProductIds, // Pass the wishlist product IDs
                });
            }
        }


        res.render("home",{
            products:productData,
            categories,
            user:null,
            wishlistProductIds
        });


    } catch (error) {
        console.error("Error loading home page:", error);
        res.status(500).send("Server error");

    }
};

//logout

const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Session destruction error", err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        })

    } catch (error) {
        console.log("Logout Error", error)
        res.redirect("/PageNotFound")
    }
}






const loadSignup = async (req, res) => {
    try {
        return res.render('signup', { message: null });
    } catch (error) {
        console.log("home page not loading", error);
        res.status(500).send('Server Error')
    }
}




//OTP 

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify Your Account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP:${otp}</b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        console.error("Error sending Email", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {

        const { name, phone, email, password, cPassword } = req.body;
        if (password != cPassword) {

            return res.render("signup", { message: "Password do not match" });
        }

        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" })
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render("signup", { message: "Error sending verification email" });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        res.redirect("/verifyOtp");

        console.log("OTP Sent", otp);

    } catch (error) {
        console.error("signup error", error);
        res.render("signup", { message: "An Error Occured. Please try again" })
    }
}

//load Verify otp
const loadVerifyOtp = async (req, res) => {
    try {
        res.render("verifyOtp");
    } catch (error) {
        console.error("loadVerifyError:", error)
    }
}



//for verifying otp and others

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)

        return passwordHash;
    } catch (error) {
        console.error('SecurePasswrod:', error)
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(otp)

        if (otp == req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,

            })
            await saveUserData.save();
            // req.session.user = saveUserData._id;

            req.session.userOtp = null;
            req.session.userData = null;

            res.json({ success: true, redirectUrl: "/login" })

        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, Please try again" })
        }

    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occured" })
    }
}



//resend otp

const resendOtp = async (req, res) => {
    try {
        console.log("resend");

        const email = req.session.userData.email;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" })
        }


        const otp = generateOtp();
        req.session.userOtp = otp;


        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP Resend Successfully" })
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" })
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Intenal Server Error. Please try again" })
    }
}


//Userlogin

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login")
        } else {
            res.redirect("/")
        }
    } catch (error) {
        // res.redirect("/pageNotFound")
        console.log(error)
        return res.status(500).json({ success: false })
    }
}

const login = async (req, res) => {


    try {
        const { email, password } = req.body;

        const findUser = await User.findOne({ isAdmin: 0, email: email });

        if (!findUser) {

            return res.status(400).json({ message: "User is not found" })
        }
        if (findUser.isBlocked) {
            return res.status(400).json({ message: "User is blocked by admin" })

        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.status(400).json({ message: "Password do not match" })

        }
        req.session.user = findUser._id;
        res.redirect("/")

    } catch (error) {
        console.log("Login Error", error);

    }
}




//shopping page 
const loadShoppingPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6; // Show 6 products per page
        const hideOutOfStock = req.query.hideOutOfStock === 'true';
        const sortBy = req.query.sortBy || 'default';
        const selectedCategory = req.query.category || '';
        const selectedBrand = req.query.brand || '';
        const searchQuery = req.query.search || '';

        // Build the query
        let query = { isListed: true };

        // Add search functionality
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        
        if (selectedCategory) {
            // // Find category by name first
            const category = await Category.findOne({ name: selectedCategory });
            if (category) {
                query.category = category._id;
            } else {
                query.category = selectedCategory
            }
        }

        if (selectedBrand) {
            // Find brand by name and get its ID
            const brand = await Brand.findOne({ brandName: selectedBrand });
            if (brand) {
                query.brand = brand._id;
            }
        }

        let sortOptions = {};
        switch(sortBy) {
            case 'popularity':
                sortOptions = { views: -1 };
                break;
            case 'priceLowToHigh':
                sortOptions = { salePrice: 1 };
                break;
            case 'priceHighToLow':
                sortOptions = { salePrice: -1 };
                break;
            case 'newArrivals':
                sortOptions = { createdAt: -1 };
                break;
            case 'nameAZ':
                sortOptions = { name: 1 };
                break;
            case 'nameZA':
                sortOptions = { name: -1 };
                break;
            default:
                sortOptions = {stock:-1, createdAt: -1 };
        }

        // Fetch all categories for the sidebar
        const categories = await Category.find({ isListed: true });

        // Fetch all brands and their product counts
        const brands = await Brand.aggregate([
            { $match: { isBlocked: false } },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'brand',
                    as: 'products'
                }
            },
            {
                $project: {
                    name: '$brandName',
                    count: { 
                        $size: {
                            $filter: {
                                input: '$products',
                                as: 'product',
                                cond: { $eq: ['$$product.isListed', true] }
                            }
                        }
                    }
                }
            },
            { $match: { count: { $gt: 0 } } },
            { $sort: { name: 1 } }
        ]);

        // Fetch products with pagination and sorting
        const products = await Product.find(query)
            .populate("category")
            .populate("brand")
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit);

        const noProductMessage=products.length===0?"No Items Avaliable":null;

        if (!products) {
            return res.status(404).send({ message: 'Products not found' });
        }

        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Get product count for each category with brand filter if selected
        const categoryProductCounts = await Promise.all(
            categories.map(async (category) => {
                let categoryQuery = {
                    isListed: true,
                    category: category._id
                };
                
                if (selectedBrand) {
                    const brand = await Brand.findOne({ brandName: selectedBrand });
                    if (brand) {
                        categoryQuery.brand = brand._id;
                    }
                }

                const count = await Product.countDocuments(categoryQuery);
                return {
                    _id: category._id,
                    name: category.name,
                    count
                };
            })
        );

        let wishlistProductIds=[];
        if(req.session.user){
            const wishlist=await Wishlist.findOne({user:req.session.user});
            if(wishlist){
                wishlistProductIds=wishlist.products.map(item=>item.product.toString());
            }
        }

        res.render('shop', { 
            products,
            categories: categoryProductCounts,
            brands,
            hideOutOfStock,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: totalPages,
            currentSort: sortBy,
            selectedCategory,
            selectedBrand,
            searchQuery,
            user: req.session.user ? await User.findById(req.session.user) : null,
            noProductMessage,
            wishlistProductIds,
        });

    } catch (error) {
        console.log(error);
        // Changed error handling to redirect to shop page with error message
        res.redirect('/shop');
    }
}

//User Profile getting

const getUserProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        if (userId) {
            const userData = await User.findOne({ _id: userId });
            if (userData) {
                return res.render("userProfile", {
                    user: userData,
                    currentPage: 'profile'
                });
            }
        }
    } catch (error) {
        console.log(error.message);
    }
}

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const userId = req.session.user;

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, phone, email},
            { new: true }
        );

        if (!updatedUser) {
            return res.json({ success: false, message: 'User not found' });
        }

        // Update session
        req.session.user = updatedUser;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.json({ success: false, message: 'Failed to update profile' });
    }
};




const getOrders = async (req, res) => {
    try {
        const userId=req.session.user;
        // Fetch orders for the current user
        const orders = await Order.find({ user:userId })
            .populate({
                path: 'items.product',
                select: 'name images price'
            })
            .sort({ orderDate: -1 }); // Most recent orders first

        const userData=await User.findById(userId);

        res.render("myOrders", {
            orders,
            userData,
            currentPage: 'orders'
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render("myOrders", {
            orders: [],
            user: req.session.user,
            currentPage: 'orders',
            error: 'Failed to load orders'
        });
    }
};

// Get order details for modal
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ 
            _id: orderId,
            user: req.session.user 
        }).populate('items.product');

        if (!order) {
            return res.json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Render order details partial view
        const html = await ejs.renderFile('views/partials/user/orderDetails.ejs', { order });
        
        res.json({
            success: true,
            html
        });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.json({ 
            success: false, 
            message: 'Failed to load order details' 
        });
    }
};

// Download invoice
const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findOne({ 
            _id: orderId,
            user: req.session.user 
        }).populate('items.product');

        if (!order) {
            return res.status(404).send('Order not found');
        }

        if (order.status !== 'Delivered') {
            return res.status(400).send('Invoice is only available for delivered orders');
        }

        const invoicePath = await generateInvoice(order);
        res.download(invoicePath, `invoice-${orderId}.pdf`);
    } catch (error) {
        console.error('Error downloading invoice:', error);
        res.status(500).send('Failed to download invoice');
    }
};



//load change password

const getChangePassword=async(req,res)=>{
    try {
        const userId=req.session.user;
        const userData=await User.findById(userId);

        res.render('change-password')
        
    } catch (error) {
        console.error('Error loading change password page:',error);
        res.redirect('/userProfile');
    }
}



//process change password

const postChangePassword=async(req,res)=>{
    try {
        const userId=req.session.user;
        const {currentPassword,newPassword,confirmPassword}=req.body;
        const userData=await User.findById(userId);

        

        //validate new passwrod
        if(newPassword!=confirmPassword){
            return res.json({
                success:false,
                message:'New password and confirm password do not match'
            })
        }

        //check if current passowrd is correct  
        const isPasswordMatch= await bcrypt.compare(currentPassword,userData.password);
        if(!isPasswordMatch){
            return res.json({
                success:false,
                message:'Current Password is incorrect'
            })
        }

        //hash new password and update  -> securePassword function is above 179
        const hashPassword=await securePassword(newPassword);
        await User.findByIdAndUpdate(userId,{password:hashPassword});

        return res.status(200).json({success:true,message:'Password changed sucessfully!'});





    } catch (error) {
        console.error('Error changing password:', error);
        res.redirect('/pageNotFound');
    }
}



// Request return for an order
const requestReturn = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, user: userId });
        
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if order is eligible for return (e.g., within 7 days of delivery)
        if (order.status !== 'Delivered') {
            return res.status(400).json({ 
                success: false, 
                message: 'Only delivered orders can be returned' 
            });
        }

        const deliveryDate = new Date(order.orderDate);
        const currentDate = new Date();
        const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        if (daysSinceDelivery > 7) {
            return res.status(400).json({ 
                success: false, 
                message: 'Return period has expired (7 days from delivery)' 
            });
        }

        // Update order status
        order.returnStatus = 'Return Requested';
        order.returnReason = reason;
        order.returnDate = new Date();
        await order.save();

        res.json({ 
            success: true, 
            message: 'Return request submitted successfully' 
        });

    } catch (error) {
        console.error('Error in requestReturn:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

// Get return status
const getReturnStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, user: userId });
        
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        res.json({
            success: true,
            returnStatus: order.returnStatus,
            returnReason: order.returnReason,
            returnDate: order.returnDate,
            returnApprovedDate: order.returnApprovedDate
        });

    } catch (error) {
        console.error('Error in getReturnStatus:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};



// Get about page
const getAboutPage = async (req, res) => {
    try {
        res.render('about', {
            title: 'About Us | GamerOo',
            user: req.session.user || null
        });
    } catch (error) {
        console.error('Error loading about page:', error);
        res.status(500).render('error', { error: 'Failed to load about page' });
    }
};

module.exports = {
    loadHomePage,   //28
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,        //63
    loadShoppingPage,
    loadVerifyOtp,
    getUserProfile,
    updateProfile,
    getOrders,
    getOrderDetails,
    downloadInvoice,
    getChangePassword, //469
    postChangePassword, //490
    requestReturn,
    getReturnStatus,
    getAboutPage,
}