
/* This class is specifically designed for the /table API */
const RESPONSES = require('../../responses/responses.json');

class validation
{
    static checkTimeBeforeBooking = async(year,month,day,hours,minutes,minimum)=>
    {
        return new Promise((resolve,reject)=>
        {
            var currentTimeStamp = new Date().getTime();
            var bookingTimeStamp = new Date(`${year}/${month}/${day}/${hours}:${minutes}:00`).getTime(); // milliseconds
            if(Math.floor((bookingTimeStamp - currentTimeStamp) / 1000) < (minimum * 60))
                return reject(RESPONSES.date_too_early);
            return resolve(true);
        });
    }
    static validateDate = async(year,month,day,includeFullDate = null,days = null, tableHourSplitting = null)=>
    {
        return new Promise((resolve,reject)=>
        {
            try
            {
                var date = new Date();

                if(!validation.validateYear(parseInt(year),date))
                    return reject(RESPONSES.invalid_year);
                if(!validation.validateMonth(parseInt(month),parseInt(year),date))
                    return reject(RESPONSES.invalid_month);
                if(!validation.validateDay(parseInt(day),parseInt(month),parseInt(year),date))
                    return reject(RESPONSES.invalid_day);
                if(typeof includeFullDate !== null)
                {
                    if(!validation.validateTime(includeFullDate.hours,includeFullDate.minutes,year,month,day,date))
                        return reject(RESPONSES.invalid_time);
    
                    var bookingDate = new Date(`${year}/${month}/${day}/${includeFullDate.hours}:${includeFullDate.minutes}:00`);
                
                    var day_list = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    var dayName = day_list[bookingDate.getDay()];

                    var dayIndex = days.findIndex((elem)=>{return elem.day.toLowerCase() === dayName.toLowerCase()});
                    if(dayIndex === -1 || !days[dayIndex])
                        return reject(RESPONSES.service_closed);
    
                    var startTime = days[dayIndex].start.split(':');
                    var endTime = days[dayIndex].end.split(':');
                    
                    startTime[0] = parseInt(startTime[0]);
                    startTime[1] = parseInt(startTime[1]);
                    
                    endTime[0] = parseInt(endTime[0]);
                    endTime[1] = parseInt(endTime[1]);

                    if(startTime[0] > includeFullDate.hours || endTime[0] < includeFullDate.hours )
                        return reject(RESPONSES.service_closed);
                    if(startTime[0] === includeFullDate.hours && startTime[1] > includeFullDate.minutes)
                        return reject(RESPONSES.service_closed);
                    if(endTime[0] === includeFullDate.hours && endTime[1] < includeFullDate.minutes)
                        return reject(RESPONSES.service_closed);
                    if(!validation.canBePossibleSplit(includeFullDate.hours,includeFullDate.minutes,tableHourSplitting))
                        return reject(RESPONSES.invalid_time);
                } 
                return resolve(true);
            }
            catch(exception)
            {
                console.log(exception)
                return reject(RESPONSES.unexpected_error);
            }       
        });

    }
    static validateYear(year,date)
    {
        var currentYear = date.getFullYear();
        if(isNaN(year) || !Number.isSafeInteger(year) || year > currentYear + 1 || year < currentYear)
            return false;
        return true;
    }
    static validateMonth(month,year,date)
    {
        var currentMonth = date.getMonth()+1;
        if(isNaN(month) || !Number.isSafeInteger(month) || (month < currentMonth && date.getFullYear() == year) || month > 12 || month < 1)
            return false;
        return true;
    }
    static validateDay(day,month,year,date)
    {
        var currentDay = date.getDate();
        if(isNaN(day) || !Number.isSafeInteger(day) || (day < currentDay && month == (date.getMonth()+1) && year == date.getFullYear()) || day > 31 || day < 1)
            return false;
        return true;
    }
    static validateTime(hours,minutes,year,month,day,date)
    {
        var currentHours = date.getHours();
        var currentMinutes = date.getMinutes();

        // check wether hours is less than current date ( backwards-booking prevention )
        if(isNaN(hours) || !Number.isSafeInteger(hours) || (hours < currentHours && day == date.getDate() && month == (date.getMonth()+1) && year == date.getFullYear()) || hours > 23 || hours < 0)
            return false;
        if(isNaN(minutes) || !Number.isSafeInteger(minutes) || (minutes < currentMinutes && hours == currentHours && day == date.getDate() && month == (date.getMonth()+1) && year == date.getFullYear()) || minutes > 60 || minutes < 0)
            return false;
        return true;
    }
    /* Checks whether booking time is valid according to user-defined splitting (minimum 5 minutes, max 24 hours) */
    static canBePossibleSplit(hours,minutes,split)
    {
        var converted = hours*60 + minutes;
        if(converted % split == 0)
            return true;
        return false;
    }
}
module.exports = validation;