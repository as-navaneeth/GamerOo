const category=require('../../models/categorySchema');


const getCategory= async(req,res)=>{
    try {
        res.render('category')
    } catch (error) {
        res.status(500).send("error")
    }
}


module.exports={
    getCategory,
}