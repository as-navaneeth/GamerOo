const brand=require("../../models/brandSchema");
const Product=require("../../models/productSchema");

const getBrand=async (req,res)=>{
    try {
        const brands=await brand.find();
        res.render('brand',{brands});
    } catch (error) {
        res.status(500).send("error");
    }
}



module.exports={
    getBrand,

}