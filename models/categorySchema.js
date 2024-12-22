const mongoose=require("mongoose");
const {Schema}=mongoose;

const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,        
    },

    nameLower:{
        type:String,    
        unique:true,
    },

    description:{
        type:String,
    },
    isListed:{
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    
})



//middleware to set the 'nameLower' filed
categorySchema.pre("save",function(next){
     this.nameLower=this.name.toLowerCase();
     next();
})

categorySchema.index({nameLower:1},{unique:true})



const Category=mongoose.model("Category",categorySchema);

module.exports=Category;