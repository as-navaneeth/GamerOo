const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');

const getAddress = async (req, res) => {
    try {
       const userId=req.session.user;
       const userData=await User.findById(userId);
       const addresses= await Address.find({user:userId});

       res.render('manageAddress',{
        userData,
        addresses,
        currentPage:'addresses'
       })

    } catch (error) {
       console.error("Error in getting address:",error);
       res.status(500).send("Server Error");
    }
};



const getAddAddress= async(req,res)=>{
    try {
        res.render('addAddress')
    } catch (error) {
        console.error("Error getting add Address:",error);
        res.status(500).send("Server Error");
    }
}


const postaddAddress=async(req,res)=>{

    const {user,name,phone,address,city,state,pincode,type}=req.body;

    try {
        const newAddress=new Address({
            user,
            name,
            phone,
            address,
            city,
            state,
            pincode,
            type,
            isDefault:false
        });

        await newAddress.save();
        res.redirect('/manageAddress');

    } catch (error) {
        console.error("Error in posting:",error);
        res.status(500).send("Server Error");
    }
}


const getEditAddress=async(req,res)=>{
    try {
        const address=await Address.findById(req.params.id);
        res.render('editAddress',{address});
    } catch (error) {
        console.error("Error in loading edit Address:",error);
        res.redirect('/manageAddress');
    }
}


const updateAddress=async(req,res)=>{
    try {
        const {user,name,phone,address,city,state,pincode,type}=req.body;

        await Address.findByIdAndUpdate(req.params.id,{
            user,
            name,
            phone,
            address,
            city,
            state,
            pincode,
            type,
            isDefault:false
        })

        res.status(200).json({success:true,
            message:"Address updated successfully"
        });
        
    } catch (error) {
      console.error("Error posting editAddres:",error);
      res.status(500).json({success:false,message:"Failed to update Address"});
    }
}



const setDefaultAddress=async(req,res)=>{
    try {
        const id=req.params.id;

        await Address.updateMany({},{isDefault:false});

        await Address.findByIdAndUpdate(id,{isDefault:true});

        res.redirect('/manageAddress');

        
        
    } catch (error) {
        console.error("Error setting default address:",error);
        res.redirect('/manageAddress');
    }

}


const deleteAddress=async(req,res)=>{
    try {
        await Address.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success:true,
            data:"Address deleted successfully",
        });
    } catch (error) {
        console.error('Error deleting address:',error);
        res.status(500).json({
            success:false,
            data:"Failed to delete the address",
        })
    }
}



module.exports = {
    getAddress,
    getAddAddress,
    postaddAddress,
    getEditAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,

};