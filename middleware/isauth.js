const isAuthenticated = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect("/login");
};

module.exports = isAuthenticated;
