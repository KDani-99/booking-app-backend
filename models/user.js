const mongoose = require('mongoose');

const break_time = {
    start:{
        type:String,
        required:true
    },
    end:{
        type:String,
        required:true
    },
    label:{
        type:String,
        required:true
    },
    _id:false
};
const day = {
    day:{
        type:String,
        required:false
    },
    start:{
        type:String,
        required:false
    },
    end:{
        type:String,
        required:false
    },
    breaks:{
        type:[break_time],
        required:true
    },
    _id:false
};
const service = {
    ID:{
        type:String,
        required:false
    },
    title:{
        type:String,
        required:false
    },
    description:
    {
        type:String,
        required:false
    },
    price:{
        type:Number,
        required:false
    },
    duration:{
        type:Number,
        required:false
    },
    maxBooking:{
        type:Number,
        required:false
    },
    onsitePayment:{
        type:Boolean,
        required:true
    },
    onlinePayment:{
        type:Boolean,
        required:true
    },
    closeBooking:{ // how many hours the last booking can be accepted
        type:Number,
        required:false
    },
    active:{
        type:Boolean,
        required:true
    },
    lifetimeBookings:{
        type:Number,
        required:false
    },
    _id:false
};
const table = {
    ID:{
        type:String,
        required:false
    },
    name:{
        type:String,
        required:false
    },
    days:{
        type:[day],
        required:false
    },
    services:{
        type:[service],
        required:false
    },
    active:{
        type:Boolean,
        required:false
    },
    minimumTimeBeforeService:{
        type:Number,
        required:true
    },
    hourSplitting:{ // hour interval settings
        type:Number,
        required:true
    },
    resetIntervalEachHour:{ // whether start each hour's interval from 0, eg: 12:00 (only asked if hourSplitting < 60)
        type:Boolean,
        required:true
    },
    _id:false
};
const resendToken = {
    token:{
        type:String,
        required:false
    },
    record_ts:{
        type:Number,
        required:false
    },
    expire_ts:{
        type:Number,
        required:false
    }
};
const resetToken = {
    token:{
        type:String,
        required:false
    },
    record_ts:{
        type:Number,
        required:false
    },
    expire_ts:{
        type:Number,
        required:false
    }
};
const companyPhone = {
    number:{
        type:Number,
        required:false
    },
    country:{
        type:String,
        required:false
    }
};
const company = {
    name:{
        type:String,
        required:false
    },
    address:{
        type:String,
        required:false
    },
    phone_number:{
        type:companyPhone,
        required:false
    },
    country:{
        type:String,
        required:false
    }
};
const accountDeletion = {
    token:{
        type:String,
        required:false
    },
    record_ts:{
        type:Number,
        required:false
    },
    expire_ts:{
        type:Number,
        required:false
    },
    started:{
        type:Boolean,
        required:false
    },
    delete_ts:{
        type:Number,
        required:false
    }
};
const user = mongoose.model('user',new mongoose.Schema({
    ID:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    email : {
        type:String,
        required:true,
        minlength: 6,
        maxlength: 255,

    },
    emailHash: {
        type:String,
        required:true
    },
    password: {
        type:String,
        required:true
    },
    timestamp: {
        type:Number,
        required:true
    },
    isVerified: {
        type:Boolean,
        required:true
    },
    access_token: {
        type: String,
        required:false
    },
    refresh_token: {
        type: String,
        required:false
    },
    isLocked: {
        type: Boolean,
        required : true
    },
    lockedCode: {
        type: String,
        required: false
    },
    subscription:{
        type:Object,
        required:true
    },
    logins:{
        type:Array,
        required:false
    },
    tables:[table],
    lastPassChange:{
        type:Number,
        required:false
    },
    lastEmailVerificationToken:{
        type:Number,
        required:false
    },
    emailConfirmationResendToken:{
        type:resendToken,
        required:false
    },
    resetPasswordToken:{
        type:resetToken,
        required:false
    },
    lastPasswordResetToken:{
        type:Number,
        required:false
    },
    lastPasswordReset:{
        type:Number,
        required:false
    },
    company:{
        type:company,
        required:false
    },
    accountDeletion:{
        type:accountDeletion,
        required:false
    },
    balance:{
        type:Number,
        required:false
    }
}));
module.exports = {
    user
}