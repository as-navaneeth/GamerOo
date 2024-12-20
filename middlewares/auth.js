const User=require("../models/userSchema");

const userAuth =(req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
  
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login");
            }
        })
        .catch(error=>{
            console.log("Error in User auth middleware");
            res.status(500).send("Internal Server Error")
        })
    }else{
        res.redirect("/login")
    }
}


const adminAuth=(req,res,next)=>{

    if(req.session.admin){
        res.set('Cache-Control','no-store,no-cache,must-revalidate,private');

        User.findOne({_id:req.session.admin,isAdmin:true})
        .then((admin)=>{
            if(admin){
                next();
            }else{
                res.redirect('/admin/login');
            }
        })
        .catch((error)=>{
            console.log('Error in adminAuth',error);
            res.status(500).send("Internal Server Error")
    });
    }else{
        res.redirect("/admin/login");
    }
}


module.exports={
    userAuth,
    adminAuth
}