
const Category=require('../../models/categorySchema');
const Product=require('../../models/productSchema');

const getCategory= async(req,res)=>{
    try {
        const categories=await Category.find();
        res.render('category',{categories})
    } catch (error) {
        res.status(500).send("error")
    }
}  

const addCategory=async(req,res)=>{
    try {
        const {name,description}=req.body;
        console.log(req.body)
       

        const existingCategory=await Category.findOne({nameLower:name.toLowerCase()});
        console.log(existingCategory);
        if(existingCategory){
            return res.status(400).json({success:false,message:"Category Already Exists!"});
        }



        const newCategory=new Category({name,description});
        await newCategory.save();                  //saving the newcategory 
        console.log("Category saved successfully")

        res.status(201).json({success:true,message:"Category Added Successfully"})  //created and sending the msg back to client

    } catch (error) {
        if(error.code===11000)
        {
            // console.error("Error adding categories",error);
            return res.status(400).json({success:false,message:"Category Already Exists!"})  //
        }
        res.status(500).json({success:false,message:"something went wrong please try again"})
    }
}


//Edit category colleciton

const editCategory=async(req,res)=>{
    try {
        const {id}=req.params;
        const {name,description}=req.body;

        const updatedCategory=await Category.findByIdAndUpdate(
            id,
            {name,description},
            {new:true, runValidators:true}   //check this 
            
        );
        if(!updatedCategory){
            return res.status(404).json({success:false,message:"Category not found"});

        }

        res.status(200).json({success:true,message:"Category updated successfully"});


    } catch (error) {
        console.log("Error updating category:",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}



const listCategory=async(req,res)=>{
    try {
        const categoryId=req.params.id;

        const category=await Category.findByIdAndUpdate(
            categoryId,
            {isListed:true},
            {new:true}
        );

        if(!category){
            return res.status(404).json({success:false,message:'Category not found'});
        }
        res.json({success:true,message:'Category listed successfully',category})
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


// Unlist a category
const unlistCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;

        const category = await Category.findByIdAndUpdate(
            categoryId,
            { isListed: false },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true, message: 'Category unlisted successfully', category });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


//add and remove categoty offer

const addCategoryOffer=async(req,res)=>{
    try {
       
        
        const percentage=parseInt(req.body.percentage);
        const categoryId=req.body.categoryId;
        
        const category=await Category.findById(categoryId);

                
        if(!category){
            return res.status(404).json({message:'Product not found'});
        }

        const products=await Product.find({category:categoryId});
        const hasProductOffer=products.some(
            (product)=>product.productOffer>percentage
        );
        if(hasProductOffer){
            return res.json({stauts:false,
                message:'Product with this category already have product Offer',
            })
        }
        
        category.categoryOffer = percentage
        await category.save()

        //category offer 
        for(const product of products){
            product.salePrice=product.regularPrice-Math.floor(product.regularPrice*(percentage/100));
            product.productOffer=0;
            await product.save();            
        }

       await category.save();


        res.json({status:true});

    }catch{
        console.log("offer error");
        
        return res.status(400).json({success:false,message:'Internal server error'});
    }
}



const removeOffer=async(req,res)=>{
    try {
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);
        if (!category) {
          return res
            .status(HttpStatus.NOT_FOUND)
            .json({ status: false, message: 'Category not found' });
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({ category: category._id });
        if (products.length > 0) {
          for (const product of products) {
            product.salePrice += Math.floor(
              product.regularPrice * (percentage / 100)
            );
            product.productOffer = 0;
            await product.save();
          }
        }
        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true });
      } catch (error) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ status: false, message: 'Internal server error' });
      }
}



module.exports={
    getCategory,
    addCategory,
    editCategory,
    listCategory,
    unlistCategory,
    addCategoryOffer,
    removeOffer,
    
}