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
        //check product stock
        const product=await Product.findById(productId);
        if(!product){
            return res.status(404).json({success:false,message:'Product not found'});
        }

        if(product.stock<=0){
            return res.status(400).json({success:false,message:'Product is out of stock'});
        }

        let cart=await Cart.findOne({user:userId});
        
        if(!cart){
            //if not cart exists, create a new one
            if(quantity>product.stock){
                return res.status(400).json({
                    success:false,
                    message:`Only ${product.stock} items available in stock`
                });
            }

            cart=new Cart({
                user:userId,
                items:[{product:productId,quantity,price}],
                totalAmount:price*quantity
            })

            // Update product stock
            product.stock -= quantity;
            await product.save();

        }else{
            const existingItem=cart.items.find(item=>item.product.toString()===productId);

            if(existingItem){
                //check if adding quantity exceeds stock
                const newQuantity=existingItem.quantity+quantity;
                if(newQuantity>product.stock+existingItem.quantity){
                    return res.status(400).json({
                        success:false,
                        message:`Cannot add more items. Only ${product.stock} available in stock`
                    });
                }
                
                // Update product stock (only deduct the new quantity being added)
                product.stock -= quantity;
                await product.save();
                
                existingItem.quantity=newQuantity;
            }else{
                if(quantity>product.stock){
                    return res.status(400).json({
                        success:false,
                        message:`Only ${product.stock} items available in stock`
                    });
                }
                cart.items.push({product:productId,quantity,price})
                
                // Update product stock
                product.stock -= quantity;
                await product.save();
            }
            cart.totalAmount=cart.items.reduce((total,item)=>total+item.price*item.quantity,0)
        }

        await cart.save();
        
        res.status(200).json({
            success:true,
            message:'Item added to cart successfully',
            newStock: product.stock // Send back updated stock
        });

    } catch (error) {
        console.error("Error adding to cart:",error);
        res.status(500).json({
            success:false,
            message:'Failed to add item to cart'
        });
    }
}





//load shopt page

const loadShopPage=async(req,res)=>{
    try {
        const hideOutOfStock=req.query.hideOutOfStock==='true';

        //base query
        let query={isListed:true};

        //add stock filter if hideoutofstock is true
        if(hideOutOfStock){
            query.stock={$gt:0};
        }

        const products=await Product.find(query).populate('category').sort({createdAt:-1});

        res.render('shop',{
            products,hideOutOfStock
        });


    } catch (error) {
        console.error("Error loading shop page:", error);
        res.status(500).send("Server error");
    }
}




//Delete cart item


const deleteCartItem = async (req, res) => {
    const userId = req.session.user;
    const itemId = req.params.itemId;

    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the item to be removed
        const removedItem = cart.items.find(item => item._id.toString() === itemId);
        if (!removedItem) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        let updatedStock = null;
        // Return the quantity back to product stock
        const product = await Product.findById(removedItem.product);
        if (product) {
            product.stock += removedItem.quantity;
            await product.save();
            updatedStock = product.stock;
        }

        // Remove item from cart
        cart.items = cart.items.filter(item => item._id.toString() !== itemId);

        // Recalculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
        await cart.save();

        res.json({ 
            success: true, 
            message: 'Item removed from cart',
            newStock: updatedStock
        });

    } catch (error) {
        console.error("Error deleting cart item:", error);
        res.status(500).json({ success: false, message: 'Failed to delete item from cart' });
    }
}


module.exports = {
    getAddtoCart,
    addToCart,
    deleteCartItem
   
};