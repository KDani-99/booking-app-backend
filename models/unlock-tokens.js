const mongoose = require('mongoose');

const unlockTokens = mongoose.model('unlock-tokens',new mongoose.Schema({
    token:{
        type: String,
        required: true
    },
    userID:{
        type:String,
        required:true
    },
    expire_ts:{
        type: Number,
        required:true
    },
    record_ts:{
        type: Number,
        required:true
    }
}));
module.exports = {
    unlockTokens
}