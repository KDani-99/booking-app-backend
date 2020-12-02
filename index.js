const express = require('express');
const app = express();
const http = require('http').Server(app);
const logservice = require('./components/logservice');
const xssFilter = require('x-xss-protection');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const {error: couldGetEnvironmentData,CONFIG,SESSION_SECRET} = require('./keys/keys');
const database = require('./database/database');
const AutomatedQueries = require('./automated-queries/automated-queries');
const chalk = require('chalk');
const limiter = require('./components/redis-rate-limiter');
const {DEFAULT_LIMIT} = require('./components/redis-slowdown');
const routes = require('./domain-routes/router');
const {Configure:MailerConfiguration} = require('./components/mailer');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const csrf = require('./components/csrf');
const session = require('express-session')
const RedisSession = require('./components/redis-session');

const allowedOrigins = CONFIG.allowed_origins;
const corsOptions = {
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true)
      } else {
        callback({code:'CORS_NOT_ALLOWED'})
      }
    },
    credentials:true,
    methods:['GET','POST','UPDATE','DELETE']
};

app.enable('trust-proxy');
app.disable('x-powered-by');

app.use(limiter);
app.use(DEFAULT_LIMIT);
app.use(xssFilter());
app.use(helmet());
app.use(cors(corsOptions));

app.use(session({
    store:RedisSession,
    name:'ssid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false , // true
        httpOnly:true,
        sameSite:true, // true
        domain:CONFIG.cookie_domain, // set to actual domain
        path:'/',
        maxAge:365*60*60*24*1000
    },
}));
app.use(bodyParser.json({
    verify: function(req,res,buf) {
        var url = req.originalUrl;
        // to capture STRIPE webhooks
        if (url.startsWith('/api/webhooks')) {
            req.rawBody = buf.toString()
        }
    },
    type:()=>{
        return true;
    }
}));
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.get('*', async (req, res, next) => {
    csrf.generate(req,res);
    next();
});

//app.use(csrf.middleware);

app.use('/',routes);

app.use((error,req,res,next)=>{
    if(error){
        if(error.code === 'EBADCSRFTOKEN')
        {
            res.status(400).json({status:'error',code:'invalid_csrf'}).end();
        }
        else if(error.code === 'CORS_NOT_ALLOWED')
        {
            res.status(400).json({status:'error',code:'cors_not_allowed'}).end();
        }
        else if(error.type === 'entity.parse.failed')
        {
            res.status(400).json({status:'error',code:'json_required'}).end();
        }
        else
        {
            // throw invalid JSON errors
            console.log('');
            console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${error.toString()}`);
            logservice.logError(error);
            res.status(400).json({status:'error',code:'unknown_error'}).end();
        }

    }
});

async function server() {
    return new Promise((resolve,reject)=>{
        try {
            var s = http.listen(CONFIG.PORT,CONFIG.IP);
            s.on('error',(error)=>{
                return reject({error:error.toString()})
            })
            s.on('listening',()=>{
                return resolve(true)
            });
        } catch(exception) {
            return reject({error:exception.toString()});
        }
    });
}
console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' TO DO ',']',` ${'ENABLE CAPTCHA FOR LOGIN'}`);
console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' TO DO ',']',` ${'ENABLE AUTH'}`);
console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' TO DO ',']',` ${'ENABLE EMAIL VERIFIED CHECK ON LOGIN'}`);
console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' TO DO ',']',` ${'UNLOCK TOKEN GENERATION AFTER LOGIN'}`);

async function startServer() {
    console.log('[',chalk.hex('#F4511E').bold('LOADING'),']',chalk.hex('#F4511E').bold(`Starting services and waiting database connection to be resolved...`));

    var _couldGetEnvironmentData = couldGetEnvironmentData;

    if(_couldGetEnvironmentData.length !== 0)
    {
        _couldGetEnvironmentData.map((elem)=>
        {
            //console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${elem}`);
            console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${elem}`);
            logservice.logError(elem);
        });
        logservice.logError(_couldGetEnvironmentData);
        process.exit();
    }
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Environment data'))
    var _startDB = await database.connect()
    .catch(error=>
    {
        console.log('');
        console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${error.error}`);
        logservice.logError(error);
        process.exit();
    });
    if(!_startDB)
        return;
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Database started'))

    var _MailerConfiguration = await MailerConfiguration()
    .catch(error=>
    {
        console.log('');
        error = 'Could not setup mail service';
        console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${error}`);
        logservice.logError(error);
        process.exit();
    });
    if(!_MailerConfiguration)
        return;
    console.log('[',chalk.hex('#03A9F4').bold('COMPONENT LOADED'),']',chalk.hex('#03A9F4').bold('Mail Server'))

    var _server = await server()
    .catch(error=>
    {
        console.log('');
        console.log('[',chalk.hex('#f44336').bold('ERROR'),']',`${error.error}`);
        logservice.logError(error);
        process.exit();
    });
    if(!_server)
        return;   
    
    AutomatedQueries.bindAll(CONFIG.automated_queries);

    console.log('[',chalk.hex('#2ecc71').bold('SUCCESS'),']',chalk.hex('#2ecc71').bold(` Server started. IP: ${CONFIG.IP}:${CONFIG.PORT}`));
}

startServer();