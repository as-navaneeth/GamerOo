const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

const getBrand = async (req, res) => {
    try {
        const brands = await Brand.find();
        res.render('brand', { data: brands });
    } catch (error) {
        console.error("Error fetching brands:", error);
        res.status(500).send("Error fetching brands");
    }
}

const addBrand = async (req, res) => {
    try {
        const brandName = req.body.name;

        if (!brandName) {
            return res.status(400).json({ message: "Brand name is required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Brand logo is required" });
        }

        const findBrand = await Brand.findOne({ brandName: brandName });
        if (findBrand) {
            return res.status(409).json({ message: "Brand already exists" });
        }

        const newBrand = new Brand({
            brandName: brandName,
            brandImage: [req.file.filename]
        });

        await newBrand.save();
        res.status(201).json({ message: "Brand added successfully!", brand: newBrand });
    } catch (error) {
        console.error("Error adding brand:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    getBrand,
    addBrand
}