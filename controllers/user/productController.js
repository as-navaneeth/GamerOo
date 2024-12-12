const Product= require('../../models/productSchema');
const Category=require('../../models/categorySchema');



   //Product page 

   const loadProductPage=async(req,res,next)=>{

    try {
        const productId=req.params.id;
        

                
        if(!productId){
            return res.status(400).send('Product ID is requried');
        }

        const product=await Product.findById(productId).populate('category');
        
        const similarProducts=await Product.find({isListed:true,category:product.category._id}).limit(4)

        if(!product){
            return res.send(404).send('Prouct not found');
        }


        res.render('productDetail',{
            product,
            similarProducts,
        })


    } catch (error) {
        next(error);
    }
}


module.exports={
    loadProductPage,
}