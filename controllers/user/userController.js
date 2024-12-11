const User = require("../../models/userSchema");
const nodemailer = require("nodemailer"); // to sent mail 
const env = require("dotenv").config();
const bcrypt = require("bcrypt");

const Category=require('../../models/categorySchema');
const Product=require('../../models/productSchema');


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
        
        const productData = await Product.find({})
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

const logout=async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message);
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/login")
        })

    } catch (error) {
        console.log("Logout Error",error)
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

        res.render("verifyOtp");

        console.log("OTP Sent", otp);

    } catch (error) {
        console.error("signup error", error);
        res.render("signup", { message: "An Error Occured. Please try again" })
    }
}



//for verifying otp and others

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)

        return passwordHash;
    } catch (error) {

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

            req.session.userOtp=null;
            req.session.userData=null;

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

        const { email } = req.session.userData;
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
        return res.status(500).json({success:false})
    }
}

    const login = async (req, res) => {
      

        try {
            const { email, password } = req.body; 
           
            const findUser = await User.findOne({ isAdmin: 0, email: email });

            if (!findUser) {
            
                return res.status(400).json({message:"User is not found"})
            }
            if (findUser.isBlocked) {
                return res.status(400).json({message:"User is blocked by admin"})

            }

            const passwordMatch = await bcrypt.compare(password, findUser.password);

            if(!passwordMatch){
                return res.status(400).json({message:"Password do not matc"})

            }
            req.session.user=findUser._id;
            res.redirect("/")

        } catch (error) {
            console.log("Login Error",error);
    
        }
    }



    //Product page 

    const loadProductPage=async(req,res)=>{

        try {
            const productId=req.params.id;

            if(!productId){
                return res.status(400).send('Product ID is requried');
            }

            const product=await Product.findById(productId).populate('category');

            if(!product){
                return res.send(404).send('Prouct not found');
            }


            res.render('productDetail',{
                product
            })


        } catch (error) {
            next(error);
        }
    }




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
    loadProductPage,
}