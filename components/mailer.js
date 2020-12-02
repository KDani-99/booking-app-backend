const nodemailer = require('nodemailer');
const chalk = require('chalk')
const {CONFIG} = require('../keys/keys');
const HandleBars = require('handlebars');
const fs = require('fs');
const path = require('path');

const templates = {
    account_verification:{
        html:fs.readFileSync(path.join(__dirname,'../','mail-templates/account-verification/email.html')).toString(),
        plain:fs.readFileSync(path.join(__dirname,'../','mail-templates/account-verification/email.plain.txt')).toString()
    },
    password_change:{
       /* html:fs.readFileSync(path.join(__dirname,'../','mail-templates/password-change/temp.html')).toString(),
        plain:fs.readFileSync(path.join(__dirname,'../','mail-templates/password-change/temp.plain.txt')).toString()*/
    },
    unblock_account:{
       /* html:fs.readFileSync(path.join(__dirname,'../','mail-templates/unblock-account/temp.html')).toString(),
        plain:fs.readFileSync(path.join(__dirname,'../','mail-templates/unblock-account/temp.plain.txt')).toString()*/
    }
};

var EmailAccount = null;
var transporter = null;

async function Configure()
{
    return new Promise(async(resolve,reject)=>
    {
        console.log(chalk.bold.red('SET UP REAL MAILER ACCOUNT!!!'));
        EmailAccount = await nodemailer.createTestAccount();
        if(!EmailAccount)
            return reject(false);
        transporter = nodemailer.createTransport(
            {
                host:'smtp.ethereal.email',
                port:587, // 465
                secure:false, // true
                auth:{
                    user:EmailAccount.user,
                    pass:EmailAccount.pass
                }
            }
        );
        if(!transporter)
            return reject(false);
        return resolve(true);
    });
}
/**
 * @param  {string} to Email address of the user
 * @param {string} name Name of the user
 * @param {string} link Activation link
 * @example
 * 
 * SendAccountVerifification('john<at>example.io','John Example','https://<our_domain>/<api_link>?token=<token>'); // async
 */
async function SendAccountVerifification(to,name,link)
{
    var template = HandleBars.compile(templates.account_verification.html);
    var plainTemplate = HandleBars.compile(templates.account_verification.plain);
    var data = {
        name,
        link
    };

    var info = await transporter.sendMail({
        from:`${CONFIG.company_details.name} Noreply`,
        to,
        subject:`Verify Your ${CONFIG.company_details.name} Account`,
        text:plainTemplate(data),
        html:template(data)
    });
    console.log(nodemailer.getTestMessageUrl(info))
}
/**
 * @param  {string} to Email address of the user
 * @param {string} name Name of the user
 * @param {string} link Activation link
 * @example
 * 
 * SendPasswordChangeConfirmation('john<at>example.io','John Example','https://<our_domain>/<api_link>?token=<token>'); // async
 */
async function SendPasswordChangeConfirmation(to,name,link)
{
    var template = HandleBars.compile(templates.password_change.html);
    var plainTemplate = HandleBars.compile(templates.password_change.plain);
    var data = {
        name,
        link
    };

    var info = await transporter.sendMail({
        from:`${CONFIG.company_details.name} Noreply`,
        to,
        subject:`${CONFIG.company_details.name} Password Change Verification`,
        text:plainTemplate(data),
        html:template(data)
    });
    console.log(nodemailer.getTestMessageUrl(info))
}
/**
 * @param  {string} to Email address of the user
 * @param {string} name Name of the user
 * @param {string} link Activation link
 * @example
 * 
 * SendUnblockAccount('john<at>example.io','John Example','https://<our_domain>/<api_link>?token=<token>'); // async
 */
async function SendUnblockAccount(to,name,link)
{
    var template = HandleBars.compile(templates.unblock_account.html);
    var plainTemplate = HandleBars.compile(templates.unblock_account.plain);
    var data = {
        name,
        link
    };

    var info = await transporter.sendMail({
        from:`${CONFIG.company_details.name} Noreply`,
        to,
        subject:`Unblock Your ${CONFIG.company_details.name} Account`,
        text:plainTemplate(data),
        html:template(data)
    });
    console.log(nodemailer.getTestMessageUrl(info))
}

/**
 * @param  {string} to Email address of the user
 * @param {string} name Name of the user
 * @param {string} link Activation link
 * @example
 * 
 * SendAccountDeletion('john<at>example.io','John Example','https://<our_domain>/<api_link>?token=<token>'); // async
 */
async function SendAccountDeletion(to,name,link)
{
    var template = HandleBars.compile(templates.account_verification.html);
    var plainTemplate = HandleBars.compile(templates.account_verification.plain);
    var data = {
        name,
        link
    };

    var info = await transporter.sendMail({
        from:`${CONFIG.company_details.name} Noreply`,
        to,
        subject:`Request To Delete Your ${CONFIG.company_details.name} Account`,
        text:plainTemplate(data),
        html:template(data)
    });
    console.log(nodemailer.getTestMessageUrl(info))
}
module.exports = {
    Configure,
    SendAccountVerifification,
    SendPasswordChangeConfirmation,
    SendUnblockAccount,
    SendAccountDeletion
};