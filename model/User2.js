const mongoose = require('mongoose');


const userSchema2 = new mongoose.Schema({
    username:{
        type:String
    },
    email:{
        type:String
    },
    pwd:{
        type:String
    },
    verified:Boolean
});

userSchema2.statics.login = async function(email, pwd){
    const user2 = await this.findOne({email});
    if(user){
        const auth = await bcrypt.compare(pwd, user2.pwd);
        if(auth){
            return user2;
        }
        throw Error('incorrect password')
    }
    throw Error('incorrect email')

}

const User2 = mongoose.model("user2", userSchema2);

module.exports = User2;