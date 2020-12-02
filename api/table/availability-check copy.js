/**
 * @param  {string} open open time in the following format: '10:10'
 * @param  {string} close close time in the following format: '11:11'
 * @param  {number} interval An int between 5-1440 (minutes)
 * @param  {boolean} resetEachToZero (optional) - default: true
 * @example
 * 
 * var intervals = calculateIntervals('10:10','11:11',30) ;
 * // => [10:10,10:40,11:10,...]
 * 
 * @return {Array}      Array of the available dates based on the interval
 */
function calculateIntervals(open,close,interval,breaks,resetEachToZero = true)
{
    try
    {
        /* open time format needs to be like HH:MM */
        var openTime = open.split(':');
        openTime[0] = parseInt(openTime[0]);
        openTime[1] = parseInt(openTime[1]);

        /* close time format needs to be like HH:MM */
        var closeTime = close.split(':');
        closeTime[0] = parseInt(closeTime[0]);
        closeTime[1] = parseInt(closeTime[1]);
    
        var current = openTime[1];
        var result = [];
        /* If the user defined interval is >= 60, we'll be calculate the intervals from the beginning till the end */
        if(interval >= 60)
        {
            for(let i=openTime[0];(openTime[1] + 60 - closeTime[1]) % interval == 0 ? i<=closeTime[0] : i<closeTime[0];i++)
            {
                if(current !== 0 && current % interval > 0)
                {
                    /* Formatting to HH:MM */
                    var hour = i < 10 ? `0${i}` : i;
                    var m = current % 60;
                    var minute = m < 10 ? `0${m}` : m;
                    // ! BREAK UPDATE START (3x)
                    var breakCollision = false;
                    for(let j=0;j<breaks.length;j++)
                    {
                        var break_start_splitted = breaks[j].start.split(':');
                        var break_end_splitted = breaks[j].end.split(':');

                        break_start_splitted[0] = parseInt(break_start_splitted[0]);
                        break_start_splitted[1] = parseInt(break_start_slitted[1]);
                        break_end_splitted[0] = parseInt(break_end_splitted[0]);
                        break_end_splited[1] = parseInt(break_end_splitted[1]);
                        // validity check
                        // optimization hint: jump or skip hours ++i ++j
                        // parseINT!!
                        if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === m || ((break_start_splitted[0] === i && break_start_splitted[1] < m) && (break_end_splitted[0] === i && break_end_splitted[1] >= m)) )
                        {
                            console.log('skipped',break_start_splitted,break_end_splitted)
                            breakCollision = true;
                            break;
                        }

                    }
                    if(!breakCollision)
                        result.push(`${hour}:${minute}`);
                    // ! BREAK UPDATE END (3x)
                }
                if(current % 60 + Math.abs(60 - interval) > 60)
                {
                    /* Get the next hour */
                    i+=Math.floor((current % 60 + Math.abs(60 - interval)) / 60);
                }
                current += interval;
            }
        }
        else
        {
            /* If the user wants each hour to start from 0 (starting point will be the opening time ), this will */
            if(resetEachToZero == true)
            {
                for(let cTime=openTime[0];cTime<=closeTime[0];cTime++)
                {
                    /* If cTime2 is the first, won't be resetted to 0 (eg. first time is 11:10, so it'll be like [11:10,...,12:00,...]*/
                    for(let cTime2=cTime==openTime[0] ? openTime[1] : 0;cTime2<60;cTime2+=interval)
                    {
                        /* If we've entered the closing hour, we check whether we've passed the closing minutes, if so, terminate the loop */
                        if(cTime == closeTime[0] && cTime2 > closeTime[1]) break;

                        /* Formatting to HH:MM */
                        var hour = cTime < 10 ? `0${cTime}` : cTime;
                        var minute = cTime2 < 10 ? `0${cTime2}` : cTime2;

                        var breakCollision = false;
                        for(let j=0;j<breaks.length;j++)
                        {
                            var break_start_splitted = breaks[j].start.split(':');
                            var break_end_splitted = breaks[j].end.split(':');
                            console.log('skipped',break_start_splitted,break_end_splitted)
                            break_start_splitted[0] = parseInt(break_start_splitted[0]);
                            break_start_splitted[1] = parseInt(break_start_slitted[1]);
                            break_end_splitted[0] = parseInt(break_end_splitted[0]);
                            break_end_splited[1] = parseInt(break_end_splitted[1]);
                            // validity check
                            // optimization hint: jump or skip hours ++i ++j
                            // parseINT!!
                            if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === m || ((break_start_splitted[0] === i && break_start_splitted[1] < m) && (break_end_splitted[0] === i && break_end_splitted[1] >= m)) )
                            {
                                breakCollision = true;
                                break;
                            }
    
                        }
                        if(!breakCollision)
                            result.push(`${hour}:${minute}`);
                    }
                }
            
            }
            else
            {
                /* Store the latest (next) time */
                var latestDate = openTime[1];
               
                for(var i=openTime[0];i<=closeTime[0];i++)
                {
                    /* Increase time with the given interval from the latest time */
                    for(var cTime2=latestDate;cTime2<60;cTime2+=interval)
                    {
                        /* If we've entered the closing hour, we check whether we've passed the closing minutes, if so, terminate the loop */
                        if(i == closeTime[0] && cTime2 > closeTime[1]) break;
                        
                        /* Formatting to HH:MM */
                        var hour = i < 10 ? `0${i}` : i;
                        var minute = cTime2 < 10 ? `0${cTime2}` : cTime2;
                        console.log(breaks.length)
                        var breakCollision = false;
                        for(let j=0;j<breaks.length;j++)
                        {
                            var break_start_splitted = breaks[j].start.split(':');
                            var break_end_splitted = breaks[j].end.split(':');
                            console.log('skipped',break_start_splitted,break_end_splitted)
                            break_start_splitted[0] = parseInt(break_start_splitted[0]);
                            break_start_splitted[1] = parseInt(break_start_slitted[1]);
                            break_end_splitted[0] = parseInt(break_end_splitted[0]);
                            break_end_splited[1] = parseInt(break_end_splitted[1]);
                            // validity check
                            // optimization hint: jump or skip hours ++i ++j
                            // parseINT!!
                            if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === cTime2 || ((break_start_splitted[0] === i && break_start_splitted[1] < cTime2) && (break_end_splitted[0] === i && break_end_splitted[1] >= cTime2)) )
                            {
                                breakCollision = true;
                                break;
                            }
    
                        }
                        if(!breakCollision)
                            result.push(`${hour}:${minute}`);
                        
                        /* Calculate the difference between 60 and the remaining minutes eg.: Interval = 30,cTime2 = 30, 30 - Math.abs(60 - 30) = 0, as a result, the next time is going to be a new hour */
                        latestDate = interval - Math.abs(60 - cTime2 % 60 );
                    }
                    current += interval;
                }
            
            }
        }
        return result;
    }
    catch(exception)
    {
        /* If we get an error, return null and handle null exception where we use the function */
        return null;
    }
}
module.exports = calculateIntervals;