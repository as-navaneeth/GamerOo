const User = require("../../models/userSchema");


const pageNotFound = async (req, res) => {
    try {
        res.render("page-404")
    } catch (error) {
        res.redirect('pageNotFound')
    }
}


const loadHomePage = async (req, res) => {
    try {
        return res.render("home");

    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server error");
    }
}


const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log("home page not loading", error);
        res.status(500).send('Server Error')
    }
}

const signup = async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const newUser = new User({ name, email, phone, password });
        console.log(newUser)
        await newUser.save();

        return res.redirect("/signup")
    } catch (error) {
        console.error("Error for save User",error);
        res.status(500).send('Internale Sever Error');
    }
}




module.exports = {
    loadHomePage,
    pageNotFound,
    loadSignup,
    signup
}