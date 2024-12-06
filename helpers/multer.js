const multer=require("multer");
const path=require("path");

const storage=multer.diskStorage({
    destination:(req,res,cb)=>{
        cb(null,path.join(_dirname,"../public/uploads/re-image"));
    },
    filename:(req,res,cb)=>{
        db(null,Date.now()+"-"+file.orginalname);
    }
})



module.exports=storage;