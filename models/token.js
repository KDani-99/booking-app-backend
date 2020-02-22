const mongoose = require('mongoose');

const token = mongoose.model('invalid-tokens',new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    email:{
        type:String,
        required:true
    },
    expire: {
        type:Number,
        required:true
    },
    recorded_ts: {
        type: Number,
        required:true
    }
}));
module.exports = {
    token
}