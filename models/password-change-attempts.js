const mongoose = require('mongoose');

const password_change_attempts = mongoose.model('password-change-attempts',new mongoose.Schema({
    userID:{
        type:String,
        required:true
    },
    IP:{
        type:String,
        required:true
    },
    recorded_ts: {
        type: Number,
        required:true
    }
}));
module.exports = {
    password_change_attempts
}