const express = require('express');
const router = express.Router();
const RESPONSES = require('../responses/responses.json');
const auth = require('./auth');
const {validateServiceID,validateMaxBooking,validateDescription,validateDuration,validatePrice,validateTitle,validateTableID,validateCloseBooking} = require('../components/table-validation');
const {user:UserModel} = require('../models/user');
const cryptoRandomString = require('crypto-random-string');
const escapeHtml = require('escape-html');
const escapeHTMLJson = require('escape-html-in-json');

router.post('/edit',async(req,res)=>
{
    // requires table ID too!!
    if(Object.keys(req.body).length === 0 || Object.keys(req.body).length > 7)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var _validateTableID = await validateTableID(req.body.tableID)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_table).end();
    });
    if(!_validateTableID)
        return;

    var _validateServiceID = await validateServiceID(req.body.serviceID)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateServiceID)
        return;

    var updateObject = {};

    if(req.body.title)
    {
        var _validateTitle = await validateTitle(req.body.title,65)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validateTitle)
            return;
        updateObject['tables.$[outer].services.$[inner].title'] = escapeHtml(req.body.title);
    }
    if(req.body.price)
    {
        var _validatePrice = await validatePrice(req.body.price)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validatePrice)
            return;
        updateObject['tables.$[outer].services.$[inner].price'] = escapeHtml(req.body.price); //escape?
    }
    if(req.body.duration)
    {
        var _validateDuration = await validateDuration(req.body.duration)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validateDuration)
            return;
        updateObject['tables.$[outer].services.$[inner].duration'] = escapeHtml(req.body.duration); // escape?
    }
    if(req.body.maxBooking)
    {
        var _validateMaxBooking = await validateMaxBooking(req.body.maxBooking)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validateMaxBooking)
            return;
        updateObject['tables.$[outer].services.$[inner].maxBooking'] = escapeHtml(req.body.maxBooking); // escape?
    }
    if(req.body.description)
    {
        var _validateDescription = await validateDescription(req.body.description,500)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });
        if(!_validateDescription)
            return;
        updateObject['tables.$[outer].services.$[inner].description'] = escapeHtml(req.body.description); // escape?
    }

    if(Object.keys(updateObject).length === 0)
    {
        return res.status(200).json(RESPONSES.no_changes_were_made).end();
    }    

    var editService = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $set:{
                ...updateObject
            }
        },
        {
            arrayFilters:[
                {'outer.ID':escape(req.body.tableID)},
                {'inner.ID':escape(req.body.serviceID)}
            ]
        }
    );
        
    if(!editService)
    {
        return res.status(400).json(RESPONSES.could_not_update_service).end();
    }
        

    if(editService.nModified !== 1)
    {
        return res.status(200).json(RESPONSES.no_changes_were_made).end();
    }

    return res.status(200).json({status:'successful'}).end();

});
router.post('/',async(req,res)=>
{
    // service = {name,maxBookingPerTime,bookInAdvance,duration,title,description,content,price,<days>}
    /*if(Object.keys(req.body).length !== 5)
        return res.status(400).json(RESPONSES.invalid_request).end();*/

    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var _validateTableID = await validateTableID(req.body.tableID,65)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_table).end();
    });
    if(!_validateTableID)
        return;

  /*  var _validateMerchantID = await validateMerchantID(req.body.merchantID)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });

    if(!_validateMerchantID)   
        return;*/

    var checkTable = await UserModel.findOne(
        {
            ID:escape(_auth.user),
            [`tables`]:{
                $exists:true,
                $elemMatch:{
                    ID:escape(req.body.tableID)
                }
            }
        }
    );
    if(!checkTable)
    {
        return res.status(400).json(RESPONSES.invalid_table).end();
    }  

    var _validateTitle = await validateTitle(req.body.title,65)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateTitle)
        return;

    var _validateDescription = await validateDescription(req.body.description,500)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDescription)
        return;

    var _validatePrice = await validatePrice(req.body.price)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validatePrice)
        return;

    var _validateDuration = await validateDuration(req.body.duration)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDuration)
        return;

    var _validateMaxBooking = await validateMaxBooking(req.body.maxBooking)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateMaxBooking)
        return;

    var _validateCloseBooking = await validateCloseBooking(req.body.closeBooking)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateCloseBooking)
        return;

    if(typeof req.body.onsitePayment !== 'boolean')
        return res.status(400).json(RESPONSES.invalid_onsite_payment).end();

    if(typeof req.body.onlinePayment !== 'boolean')
        return res.status(400).json(RESPONSES.invalid_online_payment).end();

    var plan = await UserModel.aggregate(
        [
            {
                $match:{
                    ID:escape(_auth.user)
                }
            },
            {
                $lookup:{
                    "from": "plans",
                    "localField": "subscription.planID",
                    "foreignField": "planID",
                    "as": "plan"
                }
            }
        ]
    );

    if(!plan || typeof plan[0].tables === 'undefined' || typeof plan[0].plan === 'undefined' || typeof plan[0].plan[0] === 'undefined' || typeof plan[0].plan[0].maxTables === 'undefined' || typeof plan[0].subscription === 'undefined' || typeof plan[0].subscription.bonusTables === 'undefined')
    {
        return  res.status(400).json(RESPONSES.could_not_get_plan).end();
    }

    var maxServiceCount = plan[0].plan[0].servicesPerTable;
    var serviceCount = plan[0].tables[plan[0].tables.findIndex((elem)=>{return elem.ID === req.body.tableID})].services.length;
    
    if(isNaN(maxServiceCount))
    {
        return res.status(400).json(RESPONSES.could_not_get_plan).end();
    }

    if(isNaN(serviceCount))
    {
        return res.status(400).json(RESPONSES.could_not_get_plan).end();
    }

    if(serviceCount + 1 > maxServiceCount)
    {
        return res.status(400).json(RESPONSES.user_reached_allowed_service_limit_for_table).end();
    }
        
    var serviceID = cryptoRandomString({length:10});

    var newService = {
        ID:serviceID,
        title:escapeHtml(req.body.title),
        description:escapeHtml(req.body.description),
        price:escapeHtml(req.body.price),
        duration:escapeHtml(req.body.duration),
        maxBooking:escapeHtml(req.body.maxBooking),
        onsitePayment:escapeHtml(req.body.onsitePayment),
        onlinePayment:escapeHtml(req.body.onlinePayment),
        closeBooking:typeof req.body.closeBooking === 'undefined' ? 0 : escapeHtml(req.body.closeBooking) // hours before start, eg. you have to book it a day in advance
    };

    var createService = await UserModel.updateOne(
        {
            ID:_auth.user,
            'tables.ID':escape(req.body.tableID)
        },
        {
            $push:{
                'tables.$.services':newService         
            } 
        }
    );
        
    if(!createService || createService.nModified !== 1)
    {
        return res.status(400).json(RESPONSES.could_not_create_service).end();
    }

    return res.status(200).json({status:'successful'}).end();

});
router.post('/delete',async(req,res)=>
{

     // service = {name,maxBookingPerTime,bookInAdvance,duration,title,description,content,price,<days>}
    /*if(Object.keys(req.body).length !== 5)
        return res.status(400).json(RESPONSES.invalid_request).end();*/

    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;
    
    var _validateTableID = await validateTableID(req.body.tableID,65)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_table_name).end();
    });
    if(!_validateTableID)
        return;

    var _validateServiceID = await validateServiceID(req.body.serviceID)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateServiceID)
        return;

    var deleteService = await UserModel.updateOne(
        {
            ID:escape(_auth.user),
            tables:{
                $elemMatch:{
                    ID:escape(req.body.tableID),
                    /*services:{
                        $elemMatch:{
                            ID:escape(req.body.serviceID)
                        }
                    }*/
                }
            }
        },
        {
            $pull:{
                'tables.$.services':{
                    ID:escape(req.body.serviceID)
                }
            }
        }
    );
    // service does not exists
    if(!deleteService)
    {
        return res.status(400).json(RESPONSES.could_not_delete_service).end();
    }
    if(deleteService.nModified !== 1)
    {
        return res.status(400).json(RESPONSES.service_does_not_exists).end();
    }

    return res.status(200).json({status:'successful'}).end();
});
router.get('/',async(req,res)=>
{
    if(Object.keys(req.query).length > 10 || Object.keys(req.query).length === 0)
    {
        return res.status(400).json(RESPONSES.invalid_request).end();
    }
    //  if(typeof req.query.serviceID !== 'string' || typeof req.query.tableID !== 'string')
    if(typeof req.query.serviceID !== 'string' && typeof req.query.tableID !== 'string')
        return res.status(400).json(RESPONSES.invalid_request).end();
    // SERVICE MUST BE ACTIVE!!!
    var getResults = await UserModel.findOne(
        {
            [`tables`]:{
                $exists:true,
                $elemMatch:{
                    ID:escape(req.query.tableID),
                    active:true, 
                    services:{
                        $elemMatch:{
                            ID:escape(req.query.serviceID),
                            active:true
                        }               
                    }                   
                }
            },
        }
    ).select('-_id');

    if(!getResults)
        return res.status(400).json(RESPONSES.invalid_service).end();

    var result = getResults.tables[getResults.tables.findIndex((elem)=>{return elem.ID === req.query.tableID})];

    if(!result)
        return res.status(400).json(RESPONSES.could_not_list_services).end();

    var resultService = JSON.parse(JSON.stringify(result.services[result.services.findIndex((elem)=>{return elem.ID === req.query.serviceID})]));

    if(!resultService)
        return res.status(400).json(RESPONSES.could_not_list_services).end();

    resultService.days = result.days;

    var safeResult = null;
    try
    {
        safeResult = JSON.parse(JSON.stringify(resultService,escapeHTMLJson));
    }
    catch(error)
    {
        return res.status(400).json(RESPONSES.unexpected_error).end();
    }

    return res.status(200).json(safeResult).end();
});
router.get('/list',async(req,res)=>
{
    if(Object.keys(req.query).length !== 1)
        return res.status(400).json(RESPONSES.invalid_request).end();
    if(typeof req.query.tableID !== 'string')
        return res.status(400).json(RESPONSES.invalid_request).end();

    var listServices = await UserModel.findOne(
        {
            'tables.ID':escape(req.query.tableID)
        }
    ).select('tables.ID tables.services.ID tables.services.title -_id');
    
    if(!listServices)
        return res.status(400).json(RESPONSES.invalid_table).end();

    var tableIndex = listServices.tables.findIndex((elem)=>{return elem.ID === req.query.tableID});
   
    if(isNaN(tableIndex))
        return res.status(400).json(RESPONSES.could_not_list_services).end();

    var table = listServices.tables[tableIndex];

    if(!table)
        return res.status(400).json(RESPONSES.invalid_table).end();

    if(!table.services || !Array.isArray(table.services))
        return res.status(400).json(RESPONSES.could_not_list_services).end();
    
    var safe_services = null;
    try
    {
        safe_services = JSON.parse(JSON.stringify(table.services,escapeHTMLJson))
    }
    catch(exception)
    {
        return res.status(400).json(RESPONSES.unexpected_error).end();
    }

    return res.status(200).json(safe_services).end();
});
module.exports = router;