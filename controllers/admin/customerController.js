const User = require('../../models/userSchema')



const userList = async (req,res)=>{
    try {
        const users = await User.find()
        // console.log('______________________', users)

    if(!users){
        return res.status(404).send('users not found')
    }
    res.render('customer',{
        users
    })
    } catch (error) {
        console.log(error)
return res.status(500).send('server error')
        
    }
}

//unblock user

const unblockUser=async(req,res)=>{
    try {
        const userId=req.params.userId;

        // const user=await User.findById(userId);

        await User.updateOne({_id:userId},{$set:{isBlocked:false}})
        
         return res.status(200).json({success:true,message:"User Unblocked Successful"});
        

    } catch (error) {
        res.status(500).json({success:false,message:"Internal server error"});
    }
}

const blockUser=async(req,res)=>{
    try {
        const userId=req.params.userId;

        // const user=await User.findById(userId);

        await User.updateOne({_id:userId},{$set:{isBlocked:true}})
        
         return res.status(200).json({ success: true,message:"User blocked Successful"});

    } catch (error) {
        res.status(500).json({ success: false,message:"Internal server error"});
    }
}


module.exports = {
    userList,
    unblockUser,
    blockUser
}