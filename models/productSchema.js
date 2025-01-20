const mongoose= require("mongoose");
const {Schema}=mongoose;

const productSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        require:true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category',
        required:true
    },
    brand:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Brand',
        required:true
    },
    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        default:null
    },
    stock:{
        type:Number,
        required:true,
        min:0
    },
    productImage:{
        type:[String],
        required:true
    },
    isListed:{
        type:Boolean,
        default:true
    },
    views: {
        type: Number,
        default: 0
    },
    createdAt:{
        type:Date,
        default:Date.now
    },

    offer:{
        type:Number,
        default:0
    },

    // //newly added
    // offer:{
    //     type:{
    //         _id:mongoose.Schema.Types.ObjectId,
    //         type:String,
    //         enum:['Percentage','flat'],
    //         default: 'Percentage'
    //     },
    //     value:{
    //         type:Number,
    //         required:false
    //     },
    //     startDate:{
    //         type:Date,
    //         required: false
    //     },
    //     endDate:{
    //         type:Date,
    //         required: false
    //     }
    // }

})

const Product= mongoose.model("Product",productSchema);

module.exports=Product;