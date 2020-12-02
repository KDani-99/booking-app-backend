const {login_attempts:LoginAttemptModel} = require('../models/login-attempts');
const {user:UserModel} = require('../models/user');
const {emailVerification:EmailVerificationModel} = require('../models/email-verification');
const {unlockAccountRequestTokens:UnlockAccountRequestTokensModel} = require('../models/unlock-account-req-tokens');
const {password_change_attempts:PasswordChangeAttemptsModel} = require('../models/password-change-attempts');
const cron = require('node-cron');

class AutomatedQueries
{
    static deleteExpiredAttempts(interval)
    {
        setInterval(async ()=>
        {
            var attemptDeletion = await LoginAttemptModel.deleteMany({
                timestamp:{
                    $lt: new Date().getTime() - (300 * 1000)
                }
            });
            if(!attemptDeletion)
            {
                console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${'Could not delete expired login attempts from the darabase'}`);
                logservice.logError('Could not delete expired login attempts from the darabase');
            }
        },interval * 1000);
    }
    static deleteExpiredPasswordChangeAttempts(interval)
    {
        setInterval(async()=>
        {
            var attemptDeletion = await PasswordChangeAttemptsModel.deleteMany({
                timestamp:{
                    $lt: new Date().getTime() - (300 * 1000)
                }
            });
            if(!attemptDeletion)
            {
                console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${'Could not delete expired password change attempts from the darabase'}`);
                logservice.logError('Could not delete expired password change attempts from the darabase');
            }
        },interval * 1000);
    }
    static deleteExpiredVerificationTokens(interval)
    {
        setInterval(async ()=>
        {
            var attemptDeletion = await EmailVerificationModel.deleteMany({
                exp_ts:{
                    $lt: new Date().getTime()
                }
            });
            if(!attemptDeletion)
            {
                console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${'Could not delete expired verification tokens from the darabase'}`);
                logservice.logError('Could not delete expired verification tokens from the darabase');
            }
        },interval * 1000);
    }
    static deleteExpiredRequestUnlockTokens(interval)
    {
        setInterval(async ()=>
        {
            var attemptDeletion = await EmailVerificationModel.deleteMany({
                expire_ts:{
                    $lt: new Date().getTime()
                }
            });
            if(!attemptDeletion)
            {
                console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${'Could not delete expired request unblock tokens from the darabase'}`);
                logservice.logError('Could not delete expired request unblock tokens from the darabase');
            }
        },interval * 1000);
    }
    static deleteAccounts()
    {
        cron.schedule('0 0 * * *', async() => {
            var attemptDeletion = await UserModel.deleteMany({
                'accountDeletion.delete_ts':{
                    $lte: new Date().getTime()+1
                }
            });
            if(!attemptDeletion)
            {
                console.log('\x1b[37m%s\x1b[31m%s\x1b[37m%s\x1b[31m%s\x1b[37m', '[',' ERROR ',']',` ${'Could not delete removed accounts from the darabase'}`);
                logservice.logError('Could not delete removed accounts from the darabase');
            }
          });
    }
    static bindAll(automated_queries)
    {
        AutomatedQueries.deleteExpiredAttempts(automated_queries.attemptDeletionTimeout);
        AutomatedQueries.deleteExpiredVerificationTokens(automated_queries.attemptDeletionTimeout);
        AutomatedQueries.deleteExpiredRequestUnlockTokens(automated_queries.attemptDeletionTimeout);
        AutomatedQueries.deleteAccounts();
    }
}
module.exports = AutomatedQueries;