const Product=require("../../models/productSchema");

const getProduct=async(req,res)=>{
    try {
        const products=await Product.find();
        res.render('products',{products})
    } catch (error) {
        res.status(500).send("error");
    }
}



module.exports={
    getProduct
}