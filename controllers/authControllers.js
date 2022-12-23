const User = require('../model/User');
const User2 = require('../model/User2');
const ControllersFunction = require('../controllerFunction/controllersFunction')
require('dotenv').config();
const path = require('path')
const UserVerification = require('../model/userVerification')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {google} = require('googleapis')
const {OAuth2} = google.auth;

const client = new OAuth2(process.env.MAILING_SERVICE_CLIENT_ID)

const { SECRET } = process.env
module.exports.verified_get = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/verified.html', ))
}
module.exports.verify_get = async (req, res) => {
    const {
        userID,
        uniqueString
    } = req.params;
    try {
        const result = await UserVerification.find({
            userID
        })
        if (result.length > 0) {
            const {
                expiresAt
            } = result[0];
            const uniqueStringHash = result[0].uniqueString;
            if (expiresAt < Date.now()) {
                try {
                    await UserVerification.deleteOne({
                        userID
                    })
                    try {
                        await User.deleteOne({
                            _id: userID
                        })
                        let message = "The link as expired. Please sign up again"
                        res.redirect(`/api/user/verified/?error=true&message=${message}`)
                    } catch (err) {
                        let message = "Clearing user id with expired uniqueString failed"
                        res.redirect(`/api/user/verified/?error=true&message=${message}`)
                    }
                } catch (err) {
                    console.log(err)
                    let message = "An error ocurred while clearing user verification record"
                    res.redirect(`/api/user/verified/?error=true&message=${message}`)
                }
            } else {
                try {
                    const result = await bcrypt.compare(uniqueString, uniqueStringHash);
                    if (result) {
                        try {
                            await User.updateOne({
                                _id: userID
                            }, {
                                verified: true
                            })
                            try {
                                const del = await UserVerification.deleteOne({
                                    userID
                                })
                                if (del) {
                                    res.sendFile(path.join(__dirname, "./../views/verified.html"))
                                } else {
                                    console.log('error')
                                }
                            } catch (error) {
                                let message = "An error ocurred while finalizing successful record."
                                res.redirect(`/api/user/verified/?error=true&message=${message}`)
                            }
                        } catch (err) {
                            let message = "An error ocurred while updating user record to show verified."
                            res.redirect(`/api/user/verified/?error=true&message=${message}`)
                        }
                    } else {
                        let message = "Invalid verification data passed. Please check inbox."
                        res.redirect(`/api/user/verified/?error=true&message=${message}`)
                    }
                } catch (err) {
                    await User.deleteOne({
                        _id: userID
                    })
                    await UserVerification.deleteOne({
                        userID
                    })
                    let message = "An error ocurred while comparing unique string."
                    res.redirect(`/api/user/verified/?error=true&message=${message}`)
                }
            }
        } else {
            let message = "Account record does not exist or has been verified already. Please sign up or log in"
            res.redirect(`/api/user/verified/?error=true&message=${message}`)
        }
    } catch (err) {
        let message = "An error ocurred while checking for existing user verification record"
        res.redirect(`/api/user/verified/?error=true&message=${message}`)
    }
}
module.exports.redirect_get = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/pwdAuthenticate.html', ))
}
module.exports.auth_get = async (req, res) => {
    const {
        email
    } = req.params;
    try {
        const result = await User.find({
            email
        })
        if (result) res.redirect(`/api/user/pwdredirect`)

    } catch (err) {

    }
}
module.exports.signup_post = async (req, res) => {
    console.log("mee", req.body)
    const {email} = req.body.signupValues
    // const {email} = req.body
    try {
        const user1 = await User.findOne({email})
        const user2 = await User2.findOne({email})
        console.log({user1}, {user2})
        if(user1 || user2) return res.json({status:"FAILED", message:"user exist already"})
        const user = await User.create(req.body.signupValues)
        try {
            await ControllersFunction.sendVerificationEmail(user, res);
        } catch (err) {
            res.status(400).json(err)
        }
    } catch (err) {
        const errors = await ControllersFunction.handleError(err);
        res.status(400).json(errors)
    }
}
module.exports.login_post = async (req, res) => {
    const {
        email,
        pwd
    } = req.body.loginValues;

    try {
        const user = await User.login(email, pwd);
        const user2 = await User2.findOne({email});
        if(user2) return res.status(400).json("user already exist")
        const token = createToken(user);
        const refresh_token = createRefreshToken(user)
        if (req.cookies.refreshtoken) {
            return res.status(200).json({
                verify: true
            })
        } else {
            res.cookie('refreshtoken', refresh_token, {
                httpOnly: true,
                path:'/api/refresh_token',
                maxAge: 1000 * 60 * 15// 15 minute
            })
            req.session.token = token;
            req.session.isAuthenticated = true;
            res.status(200).json({
                verify: true
            })
        }
    } catch (err) {
        const errors = await ControllersFunction.handleError(err);
        res.status(400).json(errors)
    }
}
module.exports.get_refresh_token = async (req, res) => {
    try{
        const rf_token = req.cookies.refreshtoken
        if(!rf_token) return res.status(400).json("Please login now")
        
        jwt.verify(rf_token, SECRET, (err, user) => {
            if(err) return res.status(400).json("Please login now")
            res.json({rf_token}) 
        })
    }
    catch(err){
        return res.status(500).json(err)
    }
}
module.exports.login_get = async (req, res) => {
    const user = req.user.value;
    res.json({user})

}
module.exports.orders_get = async (req, res) => {
    const {token} = req.body
    const refresh_token = token;
    if (refresh_token) {
        jwt.verify(refresh_token, SECRET, (err, user) => {
            if(err) return res.status(400).json({ verify: false })

            return res.json({ verify: true })
        })
    }else return res.status(400).json("Please login now")
}
module.exports.logout_get = (req, res) => {
    res.clearCookie('refreshtoken')
    res.json({
        data: true
    })
}
module.exports.forgetpwd_post = async (req, res) => {
    const email = req.body.email;
    try {
        const user = await User.findOne({
            email
        });
        if (user) {
            try {
                ControllersFunction.sendForgetPwdEmail(user, res)
            } catch (error) {
                res.status(400).json(error)
            }
        } else {
            res.status(404).json("Email not found. Please sign up");
        }
    } catch (error) {
        res.status(404).json(error);
    }
}
module.exports.pwdReset_post = async (req, res) => {
    const { pwd } = req.body
    if (req.session.isAuthenticated) {
        const {email} = req.user.value;
        const salt = await bcrypt.genSalt();
        try {
            await User.findOne({ email })
            try {
                const newPwd = await bcrypt.hash(pwd, salt)
                const updated = await User.updateOne({ email }, { pwd: newPwd });
                if (updated) {
                    res.json("Updated successfully")
                    return;
                }
            } catch (error) {
                res.status(400).json("'Error:' unable to update")
            }
        } catch (error) {
            res.status(404).json("user not found")
        }
    } else(
        res.status(400).json("!!! The resource you're trying to access is out of reach Please Login")
    )
}
module.exports.pwdAuthenticate_get = (req, res) => {
    req.session.isAuthenticated = true;
    res.redirect('api/pwdreset')
}

//SOCIAL LOGIN CONTROLLER FUNCTIONS
module.exports.google_login_post = async (req, res) => {
    const { tokenId } = req.body;

    try {
        const verify = await client.verifyIdToken({idToken: tokenId, audience: process.env.MAILING_SERVICE_CLIENT_ID})
        const {email_verified, email, name,} = verify.payload
        const password = email + process.env.GOOGLE_SECRET
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt)

        if(!email_verified) return  res.status(200).json({ msg: "Verifiction Failed" })
            const user2 = await User2.findOne({email})
            if(user2){
                const isMatch = await bcrypt.compare(password, user2.pwd)
                if(!isMatch) return res.status(400).json({msg: "Password is incorrect"})
                    const refresh_token = createRefreshToken(user2)
                    if(req.cookies.refreshtoken) {
                        return res.status(200).json({
                            verify: true,
                            msg: "Successfully login"
                        })
                    }else{
                        res.cookie('refreshtoken', refresh_token, {
                            httpOnly: true,
                            path:'/api/refresh_token',
                            maxAge: 1000 * 60 * 15// 15 minute
                        })
                        res.status(200).json({
                            verify: true,
                            msg: "Successfully login"
                        })
                    }
            }else{
                const user1 = await User.findOne({email})
                if(user1) return res.status(400).json({msg: "User already exist"})
                const newUser = new User2({ username:name, email, pwd:passwordHash, verified:true })
                await newUser.save();
                const token = createToken(newUser);
                const refresh_token = createRefreshToken(newUser)
                    res.cookie('refreshtoken', refresh_token, {
                        httpOnly: true,
                        path:'/api/refresh_token',
                        maxAge: 1000 * 60 * 15// 15 minute
                    })
                    req.session.token = token;
                    req.session.isAuthenticated = true;
                    res.status(200).json({
                        verify: true,
                        msg: "Successfully login" 
                    })
            }
    } catch (err) {
        console.log({err})
        return res.status(500).json({msg: err.message})
    }
}

const createToken = (value) => { return jwt.sign({ value }, SECRET)}
const createRefreshToken = (value) => { return jwt.sign( {value} , SECRET, { expiresIn:"15m" })}