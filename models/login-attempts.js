const mongoose = require('mongoose');

const login_attempts = mongoose.model('login-attempts',new mongoose.Schema({
    IP: {
        type: String,
        required:true
    },
    timestamp: {
        type: Number,
        required: true
    },
    email:{
        type:String,
        required:true
    }
}));
module.exports = {
    login_attempts
}