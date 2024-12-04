const User=require("../../models/userSchema");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");


const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login",{message:null});
}

//error

const pageerror=async(req,res)=>{
    res.render("admin-error")
}

//login
const login=async (req,res)=>{
    try {   
        const {email,password}=req.body;

        const admin=await User.findOne({email,isAdmin:true})

        if(admin){
            const passwordMatch= await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin=admin._id;
                return res.redirect("/admin");
            }else{
                return res.render("admin-login",{message:"Invalid Password!"})
            }
        }else{
            return res.render("admin-login",{message:"Admin not found!"});
        }


    } catch (error) {
        console.log("login Error",error);
        return res.redirect("/pageerror");
    }
}

//dashboard

const loadDashboard=async (req,res)=>{
    if(req.session.admin){
        try {
            res.render("dashboard");

        } catch (error) {
            res.redirect("/pageerror")
        }
    }else{
        res.redirect("/admin/login")
    }
}

//logout
const logout=async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                return res.redirect("/pageNotFound");
            }
            return res.redirect("/admin/login");
        })
    } catch (error) {
        console.log("logout error",error);
        res.redirect("/pageerror")
    }
}





module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}