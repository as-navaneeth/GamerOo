const User = require('../../models/userSchema')



const userList = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) || 1; // Current page number, default to 1
        const limit = parseInt(req.query.limit) || 5; // Items per page, default to 10
        const skip = (page - 1) * limit;
    
        // Fetch users with pagination
        const users = await User.find({isAdmin:false}).sort({createdOn:-1})
          .skip(skip)
          .limit(limit);
    
        // Count total users to calculate the total number of pages
        const totalUsers = await User.countDocuments({isAdmin:false});
    
        // Send data to the frontend
        res.render('customer', {
          users,
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          limit,
        });
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