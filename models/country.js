const mongoose = require('mongoose');

const country = mongoose.model('country',new mongoose.Schema({
    name: {
        type:String,
        required:false
    },
    code: {
        type:String,
        required:true
    }
}));
module.exports = {
    country
}