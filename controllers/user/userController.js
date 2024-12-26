const User = require("../../models/userSchema");
const nodemailer = require("nodemailer"); // to sent mail 
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const { generateInvoice } = require('../../utils/invoiceGenerator');
const ejs = require('ejs');

const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema'); // Added Order model

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
            .sort({ createdAt: -1 })
            .limit(10);

        if (userId) {
            const userData = await User.findOne({ _id: userId });        
            if (userData) {
                return res.render("home", {
                    user: userData,
                    products: productData
                });
            }
        }

        // Render without user data
        res.render("home", {
            products: productData,
            user: null
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

        const products = await Product.find({ isListed: true }).populate("category");
        if (!products) {
            return res.status(404).send({ json: 'product not found' });
        }



        res.render('shop', { products });

    } catch (error) {
        console.log(error);

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

module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,
    loadShoppingPage,
    loadVerifyOtp,
    getUserProfile,
    updateProfile,
    getOrders,
    getOrderDetails,
    downloadInvoice
}