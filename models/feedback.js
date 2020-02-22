const mongoose = require('mongoose');

const feedback = mongoose.model('feedback',new mongoose.Schema({
    ID: {
        type:String,
        required:true
    },
    tableID:{
        type:String,
        required:true
    },
    serviceID:{
        type:String,
        required:true
    },
    feedback:{
        type:String,
        required:true
    },
    score:{
        type:Number,
        required:true
    },
    code: {
        type:String,
        required:true
    }
}));
module.exports = {
    feedback
}