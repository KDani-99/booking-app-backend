const express = require('express');
const router = express.Router();
const RESPONSES = require('../responses/responses.json');
const auth = require('./auth');
const {validateInput,validateTableID,validateDays,validateMinimumTimeBeforeService,validateHourSplit,validateResetInterval} = require('../components/table-validation');
const {user:UserModel} = require('../models/user');
const {bookings:BookingModel} = require('../models/bookings');
const escapeHTML = require('escape-html-in-json');
const uuidv4 = require('uuid/v4');
const escapeHtml = require('escape-html');
const escape_html_entities = require('escape-html-in-json');
const calculateIntervals = require('./table/availability-check');

const {validateDate,validateDayName} = require('./table/validation');

router.post('/edit',async(req,res)=>
{
    // can update only certain values, do not send all
    if(Object.keys(req.body).length === 0 || Object.keys(req.body).length > 4)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var response = {};
    if(typeof _auth.token === 'string')
        response.token = _auth.token;

    var _validateTableID = await validateTableID(req.body.tableID)
    .catch(error=>
    {
        response = {...response,...error};
        res.status(400).json(response).end();
    });
    if(!_validateTableID)
        return;

    var updateObject = {};

    if(req.body.days)
    {
        var _validateDays = await validateDays(req.body.days)
        .catch(error=>
        {
            response = {...response,...error};
            res.status(400).json(response).end();
        });
        if(!_validateDays)
            return;

        updateObject['tables.$.days'] = _validateDays;
    }
    if(req.body.name)
    {
        var _validateName = await validateInput(req.body.name,65)
        .catch(error=>
        {
            response = {...response,...RESPONSES.invalid_table_name};
            res.status(400).json(response).end();
        });
        if(!_validateName)
            return;

        updateObject['tables.$.name'] = escapeHtml(req.body.name);
    }
    if(typeof req.body.active !== 'undefined')
    {
        if(typeof req.body.active !== 'boolean')
        {
            response = {...response,...RESPONSES.invalid_request};
            return res.status(400).json(response).end();
        }

        updateObject['tables.$.active'] = req.body.active;
    }

    if(Object.keys(updateObject) === 0)
    {
        response = {...response,...RESPONSES.no_changes_were_made};
        return res.status(200).json(response).end();
    }

    var editTable = await UserModel.updateOne(
        {
            ID:escape(_auth.user),
            tables:{
                $elemMatch:{
                    ID:escape(req.body.tableID)
                }
            }
        },
        {
            $set:{
                ...updateObject
            }
        }
    );

    if(!editTable)
    {
        response = {...response,...RESPONSES.could_not_update_table};
        return res.status(400).json(RESPONSES.could_not_update_table).end();
    }
    if(editTable.nModified !== 1)
    {
        response = {...response,...RESPONSES.no_changes_were_made};
        return res.status(200).json(RESPONSES.no_changes_were_made).end();
    }
    
    response.status = 'successful';

    return res.status(200).json(response).end();
});
router.post('/list',async(req,res)=>
{
    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    if(typeof req.query.details !== 'undefined')
    {

        if(Object.keys(req.query).length !== 2)
        {
            return res.status(400).json(RESPONSES.invalid_request).end();
        }

        var _validateTableID = await validateTableID(req.query.tableID)
        .catch(error=>
        {
            res.status(400).json(error).end();
        });

        if(!_validateTableID)
            return;
            
        var getTables = await UserModel.findOne(
            {
                ID:escape(_auth.user),
                tables:{
                    $elemMatch:{
                        ID:escape(req.query.tableID)
                    }
                }
            }
        ).select('tables.ID tables.active tables.days tables.name tables.services -_id');

        if(!getTables)
        {
            return res.status(400).json(RESPONSES.invalid_table).end();
        }

        var selectedTableIndex = getTables.tables.findIndex((elem)=>{return elem.ID === req.query.tableID});

        if(selectedTableIndex === -1)
        {
            return res.status(400).json(RESPONSES.invalid_table).end();
        }
        
        var selectedTable = getTables.tables[selectedTableIndex];
        if(!selectedTable)
        {
            return res.status(400).json(RESPONSES.invalid_table).end();
        }

        try
        {
            //safeTable = JSON.parse(JSON.stringify(selectedTable,escapeHTML));        
            safeTable = JSON.parse((JSON.stringify(selectedTable,escape_html_entities)));
        }
        catch(error)
        {
            return res.status(400).json(RESPONSES.unexpected_error).end();
        }

        return res.status(200).json(safeTable).end();
    }
    else
    {
        var listTableNames = await UserModel.findOne(
            {
                ID:escape(_auth.user)
            }
        ).select('tables.ID tables.name -_id');

        if(!listTableNames)
        {
            return res.status(400).json(RESPONSES.could_not_list_tables).end();
        }
        
        var safeTable = null;
        
        try
        {
            safeTable = JSON.parse(JSON.stringify(listTableNames,escapeHTML));
        }
        catch(error)
        {
            return res.status(400).json(RESPONSES.could_not_list_tables).end();
        }

        return res.status(200).json(safeTable).end();
    }
});
router.post('/',async(req,res)=>
{
    // service = {name,maxBookingPerTime,bookInAdvance,duration,title,description,content,price,<days>}
    /*if(Object.keys(req.body).length !== 7)
        return res.status(400).json(RESPONSES.invalid_request).end();*/

    // list tables
    var _auth = await auth(req.session,req.headers)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_auth)
        return;

    var _validateInput = await validateInput(req.body.name,65)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_table_name).end();
    });
    if(!_validateInput)
        return;
    
    var _validateDays = await validateDays(req.body.days)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDays)
        return;

    var _validateMinimumTimeBeforeService = await validateMinimumTimeBeforeService(req.body.minimumTimeBeforeService)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });

    if(!_validateMinimumTimeBeforeService)
        return;

    var _validateHourSplit = await validateHourSplit(req.body.hourSplitting)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateHourSplit)
        return;
        
    var _validateResetInterval = await validateResetInterval(req.body.resetIntervalEachHour)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateResetInterval)
        return;


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
    
    if(!plan || !plan[0] || typeof plan[0].tables === 'undefined' || typeof plan[0].plan === 'undefined' || typeof plan[0].plan[0] === 'undefined' || typeof plan[0].plan[0].maxTables === 'undefined' || typeof plan[0].subscription === 'undefined' || typeof plan[0].subscription.bonusTables === 'undefined')
    {
        return res.status(400).json(RESPONSES.could_not_get_plan).end();
    }

    var maxTableCount = plan[0].subscription.bonusTables + plan[0].plan[0].maxTables;
    
    if(isNaN(maxTableCount))
    {
        return res.status(400).json(RESPONSES.could_not_get_plan).end();
    }

    if(plan[0].tables.length + 1 > maxTableCount)
    {
        return res.status(400).json(RESPONSES.user_reached_allowed_table_limit).end();
    }

    var checkTable = await UserModel.countDocuments(
        {
            ID:escape(_auth.user),
            [`tables`]:{
                $exists:true,
                $elemMatch:{
                    name:escape(req.body.name)
                }
            }
        }
    );

    if(checkTable)
    {
        return res.status(400).json(RESPONSES.table_name_exists).end();
    }      

    var tableID = uuidv4();

    var createTable = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $push:{
                [`tables`]:
                {
                    ID:tableID,
                    name:escapeHtml(req.body.name),//escape(req.body.name),
                    days:_validateDays,
                    active:false,
                    hourSplitting:typeof req.body.hourSplitting === 'undefined' ? 10 : escapeHtml(req.body.hourSplitting), // default (int minutes) = every 10 minutes (minimum 5 minutes, max )
                    minimumTimeBeforeService:typeof req.body.minimumTimeBeforeService === 'undefined' ? 60 : escapeHtml(req.body.minimumTimeBeforeService),  // 1 hour by default (in minutes), could be up to a month
                    resetIntervalEachHour:(req.body.hourSplitting < 60) ? req.body.resetIntervalEachHour : false
                }
            }
        }
    );
    if(!createTable || createTable.nModified !== 1)
    {
        return res.status(400).json(RESPONSES.could_not_create_table).end();
    }

    return res.status(200).json({status:'successful'}).end();

});
router.post('/delete',async(req,res)=>
{
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
        res.status(400).json(error).end();
    });
    if(!_validateTableID)
        return;

    var deleteTable = await UserModel.updateOne(
        {
            ID:escape(_auth.user)
        },
        {
            $pull:{
                'tables':{
                    ID:escape(req.body.tableID)
                }
            }
        }
    );
    if(!deleteTable)
    {
        return res.status(400).json(RESPONSES.could_not_delete_table).end();
    }

    if(deleteTable.nModified !== 1)
    {
        return res.status(400).json(RESPONSES.invalid_table).end();
    }

    return res.status(200).json({status:'successful'}).end();
});
router.get('/available-old',async(req,res)=>
{
    // Get Available Booking Time by Date
    if(Object.keys(req.query).length !== 4)
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _validateTableID = await validateTableID(req.query.tableID)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateTableID)
        return;
    
    var _validateDate = await validateDate(req.query.year,req.query.month,req.query.day)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDate)
        return;

    var combined = `${req.query.year}/${req.query.month}/${req.query.day}`;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var d = new Date(combined);
    var dayName = days[d.getDay()];

    // use dayname
    var checkValidTable = await UserModel.countDocuments(
        {
            'tables.ID':escape(req.query.tableID)
        }
    );
    // get max booking per day?
    
    if(!checkValidTable || checkValidTable !== 1)
        return res.status(400).json(RESPONSES.invalid_table).end();/////

    // get current count for service

    /*var selectedTableIndex = getTables.tables.findIndex((elem)=>{return elem.ID === req.query.tableID});

    if(selectedTableIndex === -1)
    {
        return res.status(400).json(RESPONSES.invalid_table).end();
    }
    
    var selectedTable = getTables.tables[selectedTableIndex];
    if(!selectedTable)
    {
        return res.status(400).json(RESPONSES.invalid_table).end();
    }

    try
    {   
        
        safeTable = JSON.parse((JSON.stringify(selectedTable,escape_html_entities)));

    }
    catch(error)
    {
        return res.status(400).json(RESPONSES.unexpected_error).end();
    }*/

    return res.status(200).json().end();
    // handle exception

    
});
router.get('/available',async(req,res)=>
{
    if(Object.keys(req.query).length !== 4)
        return res.status(400).json(RESPONSES.invalid_request).end();

     var _validateTableID = await validateTableID(req.query.tableID)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateTableID)
        return;
    
    /*var _validateDate = await validateDate(req.query.year,req.query.month,req.query.day)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDate)
        return;*/

    /*
    var _validateBrea
    */

    var combined = `${req.query.year}/${req.query.month}/${req.query.day}`;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var d = new Date(combined);
    var dayName = days[d.getDay()];

    var checkDays = await UserModel.findOne(
        { 
            'tables.ID':escape(req.query.tableID)
        }
    ).select('tables.ID tables.days tables.hourSplitting tables.resetIntervalEachHour tables.resetInterval -_id');

    if(!checkDays)
        return res.status(400).json(RESPONSES.invalid_table).end();

    try
    {
        
        var tableIndex = checkDays.tables.findIndex((elem)=>{return elem.ID === req.query.tableID});

        if(typeof tableIndex !== 'number' || tableIndex === -1)
            return res.status(400).json(RESPONSES.invalid_table).end();

        var table = checkDays.tables[tableIndex];
        if(!table)
            return res.status(400).json(RESPONSES.invalid_table).end();

        var dayIndex = checkDays.tables[tableIndex].days.findIndex((elem)=>{return elem.day === dayName});

        if(typeof dayIndex !== 'number'|| dayIndex === -1)
            return res.status(400).json(RESPONSES.service_closed).end();

        // get bookings for that day + check wether service is full for that day + allow multiple booking for 1 date++ + add break
        var checkBooking = await BookingModel.find(
            {
                'table.ID':escape(table.ID),
                'date.year':2019,
                'date.month':11,
                'date.day':18
            }
        ).select('ID date -_id');

        if(!checkBooking || !Array.isArray(checkBooking))
            return res.status(400).json(RESPONSES.could_not_load_available_times).end();

        var availableTimes = calculateIntervals(table.days[dayIndex].start,table.days[dayIndex].end,table.hourSplitting,checkDays.tables[tableIndex].days[dayIndex].breaks,table.resetIntervalEachHour);
        if(!availableTimes)
            return res.status(400).json(RESPONSES.available_interval_calculation_failed).end();
        
        /* Remove already taken booking times from the available times array */
        for(var i=0;i<checkBooking.length;i++)
        {
            for(var j=0;j<availableTimes.length;j++)
            {
                var splitted = availableTimes[j].split(':');
                if(checkBooking[i].date.hour === parseInt(splitted[0]) && checkBooking[i].date.minutes === parseInt(splitted[1]))
                {
                    availableTimes.splice(j,1);
                }
            }
        }
        
        var safeResult = JSON.parse(JSON.stringify(availableTimes,escapeHTML));
        return res.status(200).json(safeResult).end();

    }
    catch(exception)
    {
        return res.status(400).json(RESPONSES.unexpected_error).end();
    }

    
});
module.exports = router;