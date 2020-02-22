const mongoose = require('mongoose');

const password_confirmation = mongoose.model('password-confirmation-tokens',new mongoose.Schema({
    userID:{
        type:String,
        required:true
    },
    token: {
        type: String,
        required: true
    },
    password:{
        type:String,
        required:true
    },
    expire_ts:{
        type: Number,
        required:true
    },
    recorded_ts: {
        type: Number,
        required:true
    }
}));
module.exports = {
    password_confirmation
}