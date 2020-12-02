const mongoose = require('mongoose');

const emailVerification = mongoose.model('email-verifications',new mongoose.Schema({
    code:{
        type: String,
        required: true
    },
    userID:{
        type:String,
        required:true
    },
    expire_ts:{
        type:Number,
        required:true
    },
    record_ts:{
        type:Number,
        required:true
    }
}));
module.exports = {
    emailVerification
}