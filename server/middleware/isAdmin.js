const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Admin permission required" });
    }
    next();
};

export default isAdmin