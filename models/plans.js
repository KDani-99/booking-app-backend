const mongoose = require('mongoose');

const plans = mongoose.model('plans',new mongoose.Schema({
    planID:{
        type:String,
        required:true
    },
    planName:{
        type:String,
        required:true
    },
    maxTables:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    duration:{
        type:Number,
        required:true
    }
}));
module.exports = {
    plans
}