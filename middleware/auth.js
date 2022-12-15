const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
    try{
        const token = req.session.token
        if(!token) return res.status(400).json("Invalid Authentication.")

        jwt.verify(token, process.env.SECRET, (err, user) => {
            if(err) return res.status(400).json("Invalid Authentication.")
            req.user = user
            next()
        })
    }
    catch(err){
        return res.status(500).json({msg: err.message})
    }
}

module.exports = auth