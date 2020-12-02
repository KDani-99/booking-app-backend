const express = require('express');
const router = express.Router();
const {user:UserModel} = require('../models/user');
const {bookings:BookingModel} = require('../models/bookings');
const {decrypt} = require('../components/encryption');
const RESPONSES = require('../responses/responses.json');
const auth = require('./auth');
const escapeHtml = require('escape-html');

router.post('/',async(req,res)=>
{
    if(Object.keys(req.body).length !== 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    try
    {
        var _auth = await auth(req.session,req.headers)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_auth)
            return;
        
        var getInfo = await UserModel.findOne(
            {
                ID:escape(_auth.user)
            }
        ).select('name company.name -_id');

        if(!getInfo)
            return res.status(400).json(RESPONSES.could_not_get_user).end();
        
        var getRecentBookings = await BookingModel.find(
            {
                merchantID:escape(_auth.user)
            }
        ).select('ID name email phone.number paid service table -_id');

        if(!getRecentBookings || !Array.isArray(getRecentBookings))
            return res.status(400).json(RESPONSES.could_not_get_bookings).end();
        
        var decryptedUsername = null;
        var decryptedCompanyName = null;
    
        decryptedUsername = escapeHtml(decrypt(getInfo.name));
        if(typeof getInfo.company === 'object')
            decryptedCompanyName = escapeHtml(decrypt(getInfo.company.name));

        for(var i=0;i<getRecentBookings.length;i++)
        {
            getRecentBookings[i].name = escapeHtml(decrypt(getRecentBookings[i].name));
            getRecentBookings[i].email = escapeHtml(decrypt(getRecentBookings[i].email));
            getRecentBookings[i].phone.number = escapeHtml(decrypt(getRecentBookings[i].phone.number)); // phone.number
        }
    }
    catch(exception)
    {
        return res.status(400).json(RESPONSES.unexpected_error).end();
    }

    var response = {
        user:decryptedUsername,
        bookings:getRecentBookings
    };
    if(decryptedCompanyName !== null)
        response.company = decryptedCompanyName;

    return res.status(200).json(response).end();
});

module.exports = router;