const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user; // This should include the user's role
        
        // Check if admin is impersonating a client
        if (req.session && req.session.tempUserId) {
            req.user.impersonating = true;
            req.user.originalUserId = req.session.adminUserId;
        }

        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.error(req.user)
        res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
};


module.exports = {authenticateToken,isAdmin};