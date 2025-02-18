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
//newly added
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');


    try {
        if(!req.session.user){
            return res.redirect("/login");
        }

        const user= await User.findById(req.session.user);

        //new line of codes

        if(user){
            if(user.isBlocked){
                //destroy session and logout the user
                req.session.destroy((err)=>{
                    if(err){
                        console.error("Session destruction error:",err);
                    }
                    return res.redirect("/login")
                });
            }else{
                res.locals.user=user;
                return next();
            }
        }else{
            return res.redirect("/login");
        }

        //new line ends here

        // if(user && !user.isBlocked){
        //     res.locals.user=user;
        //     return next();
        // }else{
        //     return res.redirect("/login")
        // }


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