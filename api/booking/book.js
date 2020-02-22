const RESPONSES = require('../../responses/responses.json');
const {user:UserModel} = require('../../models/user');
const {bookings:BookingModel} = require('../../models/bookings');
const {validateTableID,validateServiceID,validatePhone} = require('../../components/table-validation');
const {validateEmail,validateName} = require('../../components/validation');
const uuidv1 = require('uuid/v1');
const {encrypt} = require('../../components/encryption');
const stripe = require('stripe')('sk_test_xWRXZzrJp2pLLqqGHKLYwibl00vMgLA6vQ');
const {HASH_KEY,SALT_KEY} = require('../../keys/keys');
const crypto = require('crypto');
const {validateDate,checkTimeBeforeBooking} = require('../table/validation');
const escapeHtml = require('escape-html');

async function book(body,res,type = 'onsite')
{

    if(typeof body.date === 'undefined')
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _validateTableID = await validateTableID(body.tableID)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_table).end();
    });
    if(!_validateTableID)
        return;

    var _validateServiceID = await validateServiceID(body.serviceID)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_service).end();
    });
    if(!_validateServiceID)
        return;
    
    var _validateEmail = await validateEmail(body.email)
    .catch(error=>
    {
        res.status(400).json(RESPONSES.invalid_email).end();
    });
    if(!_validateEmail)
        return;

    var _validateName = await validateName(body.name)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateName)
        return;
    
    if(typeof body.phone !== 'object')
        return res.status(400).json(RESPONSES.invalid_request).end();

    var _validatePhone = await validatePhone(body.phone.number,body.phone.country)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validatePhone)
        return;
    
    var serviceDetails = await UserModel.findOne(
        {
            tables:{
                $exists:true,
                $elemMatch:{
                    ID:escape(body.tableID),
                    active:true
                }
            },
            'tables.services.ID':escape(body.serviceID)
        }
    ).select('ID tables.days tables.services tables.active tables.ID tables.name tables.minimumTimeBeforeService -_id');
    
    if(!serviceDetails || !serviceDetails.tables)
        return res.status(400).json(RESPONSES.invalid_service).end();
    
    var tableIndex = serviceDetails.tables.findIndex((elem)=>{return elem.ID === body.tableID});
    if(tableIndex === -1)
        return res.status(400).json(RESPONSES.invalid_table).end();
    var serviceIndex = serviceDetails.tables[tableIndex].services.findIndex((elem)=>{return elem.ID === body.serviceID});
    if(serviceIndex === -1)
        return res.status(400).json(RESPONSES.invalid_service).end();

    var table = serviceDetails.tables[tableIndex];
    if(table.active === false)
        return res.status(400).json(RESPONSES.inactive_table).end();

    /// TIME VALIDATION BEGIN
    var _validateDate = await validateDate(body.date.year,body.date.month,body.date.day,{hours:body.date.hours,minutes:body.date.minutes},table.days)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_validateDate)
        return;
    var _checkTimeBeforeBooking = await checkTimeBeforeBooking(body.date.year,body.date.month,body.date.day,body.date.hours,body.date.minutes,table.minimumTimeBeforeService)
    .catch(error=>
    {
        res.status(400).json(error).end();
    });
    if(!_checkTimeBeforeBooking)
        return;

    
    
    /// TIME VALIDATION END
    
    var service = serviceDetails.tables[tableIndex].services[serviceIndex];
    if(service.active === false)
        return res.status(400).json(RESPONSES.inactive_service).end();
    
    // count max bookings
    var currentNumberOfBooking = await BookingModel.countDocuments(
        {
            'table.ID':escape(body.tableID),
            'service.ID':escape(body.serviceID)
        }
    );

    if(typeof currentNumberOfBooking !== 'number')
    {
        return res.status(400).json(RESPONSES.could_not_book).end();
    }
        
    
    if(currentNumberOfBooking + 1 > service.maxBooking)
        return res.status(400).json(RESPONSES.service_full).end();

    if(service.onsitePayment === false && type === 'onsite')
        return res.status(400).json(RESPONSES.service_disabled_onsite_payment).end();
    else if(service.onlinePayment === false && type === 'online')
        return res.status(400).json(RESPONSES.service_disabled_online_payment).end();

    // close booking check
    
    var encryptedEmail = null;
    var encryptedName = null;
    var encryptedNumber = null;
    
    try
    {
        encryptedEmail = encrypt(body.email);
        encryptedName = encrypt(body.email);
        encryptedNumber = encrypt(body.phone.number);
    }
    catch(error)
    {
        return res.status(400).json(RESPONSES.could_not_book).end();
    }

    // if online and won't be paid within an hour, booking will be deleted - no notification will be sent to the merchant till not paid
    var book = null;
    if(type === 'online')
    {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
            name: 'Premium Plan 1 Month',
            description: 'Premium Plan 1 Month',
            images: ['https://example.com/t-shirt.png'],
            amount: 1199,
            currency: 'usd',
            quantity: 1,
            }],
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        });

        var payment_intent = {
            hash:null,
            value:null
        };
        
        try
        {
            payment_intent.value = encrypt(session.payment_intent);
            payment_intent.hash = crypto.createHash('sha256',HASH_KEY).update(session.payment_intent).update(SALT_KEY).update('&pay_int&').digest('hex');
        }
        catch(error)
        {
            return res.status(400).json(RESPONSES.could_not_book).end();
        }

        book = new BookingModel(
            {
                ID:uuidv1(),
                service:{
                    ID:escape(body.serviceID),
                    title:service.title,
                    duration:service.duration,
                    price:service.price
                },
                tableID:{
                    ID:escape(body.tableID),
                    name:table.name
                },
                merchantID:serviceDetails.ID,
                paid:false,
                email:encryptedEmail,
                name:encryptedName,
                paymentType:'online',
                payment_intent,
                record_ts:new Date().getTime(), 
                phone:{
                    country:escape(body.phone.country),
                    number:encryptedNumber
                },
                date:{
                    year:0,
                    month:0,
                    day:0,
                    hour:0,
                    minutes:0
                }
            }
        );
        var save = await book.save();
        if(!save)
            return res.status(400).json(RESPONSES.could_not_book).end();   
        return res.status(200).json(session).end();
    }
    else
    {
        book = new BookingModel(
            {
                ID:uuidv1(),
                service:{
                    ID:escape(body.serviceID),
                    title:service.title,
                    duration:service.duration,
                    price:service.price
                },
                table:{
                    ID:escape(body.tableID),
                    name:table.name
                },
                merchantID:serviceDetails.ID,
                paid:false,
                email:encryptedEmail,
                name:encryptedName,
                paymentType:'onsite',
                record_ts:new Date().getTime(), 
                phone:{
                    country:escape(body.phone.country),
                    number:encryptedNumber
                },
                date:{
                    year:(body.date.year),
                    month:(body.date.month),
                    day:(body.date.day),
                    hour:(body.date.hours),
                    minutes:(body.date.minutes)
                }
            }
        );
        var updateLifetimeBookings = await UserModel.updateOne(
            {
                tables:{
                    $exists:true,
                    $elemMatch:{
                        ID:escape(body.tableID),
                        active:true
                    }
                },
                'tables.services.ID':escape(body.serviceID)
            },
            {
                $inc:{
                    'tables.$[outer].services.$[inner].lifetimeBookings':1
                }
            },
            {
                arrayFilters:[
                    {'outer.ID':escape(body.tableID)},
                    {'inner.ID':escape(body.serviceID)}
                ]
            }
        );
    
        if(!updateLifetimeBookings || updateLifetimeBookings.nModified !== 1)
            return res.status(400).json(RESPONSES.could_not_book).end();

        var save = await book.save();
        if(!save)
            return res.status(400).json(RESPONSES.could_not_book).end();    

        return res.status(200).json({status:'successful'}).end();
    }

}

module.exports = book;