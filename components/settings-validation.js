const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const RESPONSES = require('../responses/responses.json');

class validation 
{
    static async country(code)
    {
        return new Promise(async(resolve,reject)=>
        {
            if(typeof code !== 'string' || code.length !== 2 || !code.match(/^[A-Z]*$/))
            {
                return reject(RESPONSES.invalid_country);
            }
            var country = await CountryModel.findOne({code});
            if(!country)
            {
                return reject(RESPONSES.invalid_country);
            }

            return resolve(true);
        });
        
    }
    static async companyName(companyName)
    {
        return new Promise((resolve,reject)=>
        {
            if(typeof companyName !== 'string' || companyName.length > 125 || companyName.length < 1)
                return reject(RESPONSES.invalid_company);
            return resolve(true);
        });
    }
    static async companyPhone(companyPhone,countryCode)
    {
        return new Promise((resolve,reject)=>
        {
            try
            {
                var number = phoneUtil.parseAndKeepRawInput(companyPhone, countryCode);

                if(!phoneUtil.isPossibleNumber(number) || !phoneUtil.isValidNumber(number))
                    return reject(RESPONSES.invalid_company_phone);
                if(!phoneUtil.isValidNumberForRegion(number,countryCode))
                    return reject(RESPONSES.invalid_company_phone_region);
                
                return resolve(true);
            }
            catch(exception)
            {
                return reject(RESPONSES.invalid_company_phone);
            }
            
        });
    }
    static async companyAddress(companyAddress)
    {
        return new Promise((resolve,reject)=>
        {
            if(typeof companyAddress !== 'string' || companyAddress.length < 1 || companyAddress.length > 200)
            {
                return reject(RESPONSES.invalid_company_address);
            }
            return resolve(true);
        });
    }
}

module.exports = {
    validateCountry:validation.country,
    validateCompanyName:validation.companyName,
    validateCompanyPhoneNumber:validation.companyPhone,
    validateCompanyAddress:validation.companyAddress
};