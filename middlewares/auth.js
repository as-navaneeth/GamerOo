const User=require("../models/userSchema");

const userAuth = async(req,res,next)=>{
    // if(req.session.user){
    //     User.findById(req.session.user)
  
    //     .then(data=>{
    //         if(data && !data.isBlocked){
    //             next();
    //         }else{
    //             res.redirect("/login");
    //         }
    //     })
    //     .catch(error=>{
    //         console.log("Error in User auth middleware");
    //         res.status(500).send("Internal Server Error")
    //     })
    // }else{
    //     res.redirect("/login")
    // }



    try {
        if(!req.session.user){
            return res.redirect("/login");
        }

        const user= await User.findById(req.session.user);

        if(user && !user.isBlocked){
            res.locals.user=user;
            return next();
        }else{
            return res.redirect("/login")
        }


    } catch (error) {
        console.error("Error in userAuth middlware:",error.message);
        res.status(500).send("Interal Server Error");
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