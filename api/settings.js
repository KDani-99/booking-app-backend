const express = require('express');
const router = express.Router();
const auth = require('./auth');
const RESPONSES = require('../responses/responses.json');
const {user:UserModel} = require('../models/user');
const {encrypt} = require('../components/encryption');
const {validateCompanyName,validateCompanyPhoneNumber,validateCompanyAddress} = require('../components/settings-validation');
const {validateName} = require('../components/validation');
const {SETTINGS_LIMIT} = require('../components/redis-slowdown');

router.post('/save',SETTINGS_LIMIT,async(req,res)=>
{
    
    if(Object.keys(req.body).length > 100 || Object.keys(req.body).length === 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    try
    {

    }
    catch(exception)
    {

    }
    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var newSettings = {
        // has to be empty!!!
    };

    if(req.body.company_name)
    {
        var _validateCompanyName = await validateCompanyName(req.body.company_name)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });

        if(!_validateCompanyName)
            return;

        var preparedCompanyName = encrypt(req.body.company_name);
        newSettings.company = {
            'company.name':preparedCompanyName
        };
    }
    if(req.body.company_phone)
    {
        
        if(req.body.company_phone.number && req.body.company_phone.country_code)
        {
            var _validateCompanyPhone = await validateCompanyPhoneNumber(req.body.company_phone.number,req.body.company_phone.country_code)
            .catch(error=>
            {
                res.status(400).json(error).end();
            });

            if(!_validateCompanyPhone)
                return;

            var preparedNumber = encrypt(req.body.company_phone.number);
            var preparedCountryCode = encrypt(req.body.company_phone.country_code);

            if(newSettings.company)
            {
                
                newSettings.company['company.phone'] = {
                    number:preparedNumber,
                    country:preparedCountryCode
                };
            }
            else
            {
                newSettings = {
                    company:{
                        'company.phone':{
                            number:preparedNumber,
                            country:preparedCountryCode
                        }
                    }
                };
            }
        }
        else
        {
            return res.status(400).json(RESPONSES.invalid_company_phone).end();  
        } 
    }
    if(req.body.company_address)
    {
        var _validateCompanyAddress = await validateCompanyAddress(req.body.company_address)
        .catch(error=>
        {
            res.status(400).json(error).end();  
        });
        if(!_validateCompanyAddress)
            return;

        var preparedAddress = encrypt(req.body.company_address);
        if(newSettings.company)
        {
            newSettings.company['company.address'] = preparedAddress;
        }
        else
        {
            newSettings = {
                company: {
                    'company.address':preparedAddress
                }
            };
        }
    }

    if(req.body.name)
    {
        
        var _validateName = await validateName(req.body.name)
        .catch(error=>
        {
            res.status(400).json(error).end(); 
        });
        if(!_validateName)
            return;
        
        var preparedName = encrypt(req.body.name);
        if(newSettings)
        {
            newSettings.name = preparedName;
        }
        else
        {
            newSettings = {
                name:preparedName
            };
        }
    }
    
    var updateSettings = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $set:{
                ...newSettings.company
            }
        }
    );

    if(!updateSettings)
    {
        return res.status(400).json(RESPONSES.settings_save_failed).end();
    }

    return res.status(200).json({status:'successful'}).end();
});

module.exports = router;