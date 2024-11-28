const User=require("../../models/userSchema");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");


const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login",{message:null});
}

//login
const login=async (req,res)=>{
    try {   
        const {email,password}=req.body;
        console.log(email,password) // just for testing

        const admin=await User.findOne({email,isAdmin:true})

        if(admin){
            const passwordMatch= await bcrypt.compare(password,admin.password);
            if(passwordMatch){
                req.session.admin=true;
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





module.exports={
    loadLogin,
    login,
    loadDashboard,
}