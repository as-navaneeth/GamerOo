const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');

// View Cart
const getAddtoCart = async (req, res) => {
    const userId=req.session.user;

    try {
        const cart=await Cart.findOne({user:userId}).populate('items.product');
        res.render('addToCart',{cart})
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.render('addToCart',{cart:null})
        // res.status(500).json({ success: false, message: 'Error fetching cart' });
    }
};


const addToCart=async(req,res)=>{
    const {productId,price,quantity}=req.body;
    const userId=req.session.user;
    

    try {
        let cart=await Cart.findOne({user:userId});

        if(!cart){
            //if no cart exists,create a new one
            cart=new Cart({
                user:userId,
                items:[{product:productId,quantity,price}],
                totalAmount:price*quantity
            });
        }else{
            const existingItem=cart.items.find(item=>item.product.toString()===productId);
            if(existingItem){
                existingItem.quantity+=quantity;
            }else{
                cart.items.push({product:productId,quantity,price});
            }

            cart.totalAmount=cart.items.reduce((total,item)=>total+item.price*item.quantity,0);
        }

        await cart.save();
        res.status(200).send("Item Added to cart");
    } catch (error) {
        console.error("Error adding to cart:",error);
        res.status(500).send('faild to add item to cart')
    }
}


//Delete cart item


const deleteCartItem=async(req,res)=>{
    const userId=req.session.user;
    const itemId=req.params.itemId;

    try {
        const cart=await Cart.findOne({user:userId});
        if(!cart){
            return res.status(404).json({success:false,message:'Cart not found'});
        }

        //remove item from cart
        cart.items=cart.items.filter(item=>item._id.toString()!==itemId);

        //recalculate the total amount
        cart.totalAmount=cart.items.reduce((total,item)=>total+item.price*item.quantity,0);
        await cart.save();

        res.json({success:true, message:'Item removed from cart'});

    } catch (error) {
        console.error("Error deleting cart item:",error);
        res.status(500).json({success:false,message:'Faild to delete item from cart'});
    }

}


module.exports = {
    getAddtoCart,
    addToCart,
    deleteCartItem
   
};