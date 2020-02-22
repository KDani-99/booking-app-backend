const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const logservice = require('../components/logservice');
const {DATABASE_SETTINGS} = require('../keys/keys');

if(DATABASE_SETTINGS === null)
{
    return;
}

async function connect() 
{
    return new Promise((resolve,reject)=>
    {
        try
        {
            mongoose.connect(`mongodb://${DATABASE_SETTINGS.username}:${DATABASE_SETTINGS.password}@${DATABASE_SETTINGS.host}:${DATABASE_SETTINGS.port}/booking-app?authSource=admin`,{useNewUrlParser:true});
           
            var db = mongoose.connection;
            db.on('error',(error)=>
            {
                return reject({error:error});
            });
            db.once('open',()=>
            {
                return resolve(true);
            });
        }
        catch(exception)
        {
            return reject({error:exception});
        }
    });
}

module.exports = {
    connect,
    connection:mongoose.connection
};