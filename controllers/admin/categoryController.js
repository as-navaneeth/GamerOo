// const Category = require('../../models/categorySchema');
const category=require('../../models/categorySchema');


const getCategory= async(req,res)=>{
    try {
        const categories=await category.find();
        res.render('category',{categories})
    } catch (error) {
        res.status(500).send("error")
    }
}

const addCategory=async(req,res)=>{
    try {
        const {name,description}=req.body;
        const newCategory=new category({name,description});
        await newCategory.save();                  //saving the newcategory

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

        const updatedCategory=await category.findByIdAndUpdate(
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






module.exports={
    getCategory,
    addCategory,
    editCategory
}