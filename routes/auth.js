const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Login Page
router.get("/login", (req, res) => {
    if (req.session.isLoggedIn) return res.redirect("/");
    res.render("login");
});

// Signup Page
router.get("/signup", (req, res) => {
    if (req.session.isLoggedIn) return res.redirect("/");
    res.render("signup");
});

// Handle Signup
router.post("/signup", async (req, res) => {
    const { username, email,phone, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ username, email, phone, password: hashedPassword });
        await user.save();
        req.session.isLoggedIn = true;
        req.session.userId = user._id;
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error signing up.");
    }
});

// Handle Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render("login", { error: "Invalid credentials" });
        }

        req.session.isLoggedIn = true;
        req.session.userId = user._id;
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error logging in.");
    }
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error logging out.");
        }
        res.redirect("/login");
    });
});

module.exports = router;
