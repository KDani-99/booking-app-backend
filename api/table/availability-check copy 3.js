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
        var fastForward = false;
        result.push(...breaks)
        /* If the user defined interval is >= 60, we'll be calculate the intervals from the beginning till the end */
        if(interval >= 60)
        {
            for(let i=openTime[0];(openTime[1] + 60 - closeTime[1]) % interval == 0 ? i<=closeTime[0] : i<closeTime[0];i++)
            {
                fastForward = false;
                if(current !== 0 && current % interval > 0)
                {
                    /* Formatting to HH:MM */
                    var hour = i < 10 ? `0${i}` : i;
                    var m = current % 60;
                    var minute = m < 10 ? `0${m}` : m;
                    // ! BREAK UPDATE START (3x)
                    var breakCollision = false;
                    var breakPoint = null;
                    var endBreak = false;

                    for(let j=breakPoint === null ? 0 : breakPoint;j<breaks.length;j++)
                    {
                        var break_start_splitted = breaks[j].start.split(':');
                        var break_end_splitted = breaks[j].end.split(':');
                        break_start_splitted[0] = parseInt(break_start_splitted[0]);
                        break_start_splitted[1] = parseInt(break_start_splitted[1]);
                        break_end_splitted[0] = parseInt(break_end_splitted[0]);
                        break_end_splitted[1] = parseInt(break_end_splitted[1]);
                        // validity check
                        // optimization hint: jump or skip hours ++i ++j
                        // parseINT!! -> OPTIMIZE SMHW + NOT SAME VARIABLE NAMES IN DIFFERENT PLACES
                        if(i === break_end_splitted[0] && break_end_splitted[1] <= current % 60)
                            endBreak = true;
                        if(i > break_start_splitted[0] && break_end_splitted[0] - i > 0)
                        {                           
                            i += (break_end_splitted[0] - i) -1;
                            breakCollision = true;
                            breakPoint = j;
                            fastForward = true;
                            // splice breakt ??? 
                            //breaks.splice(j-1<0 ? 0 : j-1,1);
                            break;
                        }
                        if(break_end_splitted[0] < i)
                        {
                            break;
                        }

                        if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === current % 60 || ((break_start_splitted[0] === i && break_start_splitted[1] < current % 60) && (break_end_splitted[0] === i && break_end_splitted[1] > current % 60)) ||  ((break_start_splitted[0] === i && break_start_splitted[1] < current % 60) && break_end_splitted[0] > i) || ((break_start_splitted[0] < i) && (break_end_splitted[0] === i && break_end_splitted[1] > current % 60)))
                        {
                            breakPoint = j;
                            breakCollision = true;
                            
                            break;
                        }
                    }
                    if(!breakCollision)
                        result.push(`${hour}:${minute}`);
                    if(fastForward)
                        break;
                    // ! BREAK UPDATE END (3x)
                }
                if(current % 60 + Math.abs(60 - interval) > 60)
                {
                    /* Get the next hour */
                    i+=Math.floor((current % 60 + Math.abs(60 - interval)) / 60);
                }
                if(endBreak && breakCollision)
                {
                    current = parseInt(breaks[breakPoint].end.split(':')[1]);
                    i = parseInt(breaks[breakPoint].end.split(':')[0])-1;
                }            
                else
                    current += interval;
            }
        }
        else
        {
            /* If the user wants each hour to start from 0 (starting point will be the opening time ), this will */
            if(resetEachToZero == true)
            {
                for(let i=openTime[0];i<=closeTime[0];i++)
                {
                    fastForward = false;
                    /* If cTime2 is the first, won't be resetted to 0 (eg. first time is 11:10, so it'll be like [11:10,...,12:00,...]*/
                    for(let cTime2=i==openTime[0] ? openTime[1] : 0;cTime2<60;cTime2+=interval)
                    {
                        /* If we've entered the closing hour, we check whether we've passed the closing minutes, if so, terminate the loop */
                        if(i == closeTime[0] && cTime2 > closeTime[1]) break;

                        /* Formatting to HH:MM */
                        var hour = i < 10 ? `0${i}` : i;
                        var minute = cTime2 < 10 ? `0${cTime2}` : cTime2;

                        var breakCollision = false;
                        var breakPoint = null;
                        var endBreak = false;

                        for(let j=breakPoint === null ? 0 : breakPoint;j<breaks.length;j++)
                        {
                            var break_start_splitted = breaks[j].start.split(':');
                            var break_end_splitted = breaks[j].end.split(':');
                            break_start_splitted[0] = parseInt(break_start_splitted[0]);
                            break_start_splitted[1] = parseInt(break_start_splitted[1]);
                            break_end_splitted[0] = parseInt(break_end_splitted[0]);
                            break_end_splitted[1] = parseInt(break_end_splitted[1]);
                            // validity check
                            // optimization hint: jump or skip hours ++i ++j
                            // parseINT!! -> OPTIMIZE SMHW + NOT SAME VARIABLE NAMES IN DIFFERENT PLACES
                            if(i === break_end_splitted[0] && break_end_splitted[1] <= cTime2)
                                endBreak = true;
                            if(i > break_start_splitted[0] && break_end_splitted[0] - i > 0)
                            {
                                i += (break_end_splitted[0] - i) -1;
                                breakCollision = true;
                                breakPoint = j;
                                fastForward = true;
                                // splice breakt ??? 
                                //breaks.splice(j-1<0 ? 0 : j-1,1);
                                break;
                            }
                            if(break_end_splitted[0] < i)
                            {
                                break;
                            }

                            if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === cTime2 || ((break_start_splitted[0] === i && break_start_splitted[1] < cTime2) && (break_end_splitted[0] === i && break_end_splitted[1] > cTime2)) ||  ((break_start_splitted[0] === i && break_start_splitted[1] < cTime2) && break_end_splitted[0] > i) || ((break_start_splitted[0] < i) && (break_end_splitted[0] === i && break_end_splitted[1] > cTime2)))
                            {
                                breakPoint = j;
                                breakCollision = true;
                                break;
                            }
                        }
                        if(!breakCollision)
                            result.push(`${hour}:${minute}`);
                        if(fastForward)
                            break;
                    }
                }
            
            }
            else
            {
                /* Store the latest (next) time */
                var latestDate = openTime[1];
                /* Fast forwards x hours based on the break (eg. Break: 10 - 12, hour = 10, hour += 3, so 10,11,12 won't be divided into unnecessary smaller potions ) */

                for(var i=openTime[0];i<=closeTime[0];i++)
                {
                    fastForward = false;
                    /* Increase time with the given interval from the latest time */
                    for(var cTime2=latestDate;cTime2<60;cTime2+=interval)
                    {
                        /* If we've entered the closing hour, we check whether we've passed the closing minutes, if so, terminate the loop */
                        if(i == closeTime[0] && cTime2 > closeTime[1]) break;
                        
                        /* Formatting to HH:MM */
                        var hour = i < 10 ? `0${i}` : i;
                        var minute = cTime2 < 10 ? `0${cTime2}` : cTime2;

                        var breakCollision = false;
                        var breakPoint = null;
                        var endBreak = false;
                        // !
                        var passedBreak = null;
                        breaks.sort((a,b)=>
                        {
                            if(a.start < b.start)
                                return -1;
                            else if(a.start == b.start)
                                return 0
                            else
                                return 1;
                        })
                        for(let j=breakPoint === null ? 0 : breakPoint;j<breaks.length;j++)
                        {
                            var break_start_splitted = breaks[j].start.split(':');
                            var break_end_splitted = breaks[j].end.split(':');
                            break_start_splitted[0] = parseInt(break_start_splitted[0]);
                            break_start_splitted[1] = parseInt(break_start_splitted[1]);
                            break_end_splitted[0] = parseInt(break_end_splitted[0]);
                            break_end_splitted[1] = parseInt(break_end_splitted[1]);
                            // validity check
                            // optimization hint: jump or skip hours ++i ++j
                            // parseINT!! -> OPTIMIZE SMHW + NOT SAME VARIABLE NAMES IN DIFFERENT PLACES
                            // ! EXPERIMENT
                            var skipBreak = null;
                            for(let k=j;k<breaks.length;k++)
                            {
                                var break_start_splitted1 = breaks[k].start.split(':');
                                var break_end_splitted1 = breaks[k].end.split(':');
                                break_start_splitted1[0] = parseInt(break_start_splitted1[0]);
                                break_start_splitted1[1] = parseInt(break_start_splitted1[1]);
                                break_end_splitted1[0] = parseInt(break_end_splitted1[0]);
                                break_end_splitted1[1] = parseInt(break_end_splitted1[1]);

                                if((break_start_splitted[0] === break_start_splitted1[0] && break_end_splitted[1] === break_start_splitted1[1]) ||
                                    break_end_splitted[0] === break_start_splitted1[0] && break_end_splitted[1] === break_start_splitted1[1]
                                )
                                {
                                    skipBreak = k;
                                    break;
                                }
                            }
                            if(skipBreak !== null)
                            {
                                hour = parseInt(breaks[skipBreak].end.split(':')[0]);
                                minute = parseInt(breaks[skipBreak].end.split(':')[1]);
                                result.push(`${hour}:${minute}`);
                                //break;
                            }
                            // ! <-- EXPERIMENT -->
                            if(i === break_end_splitted[0] && break_end_splitted[1] <= cTime2)
                                endBreak = true;
                            if(i > break_start_splitted[0] && break_end_splitted[0] - i > 0)
                            {
                                i += (break_end_splitted[0] - i) -1;
                                breakCollision = true;
                                breakPoint = j;
                                fastForward = true;
                                // splice breakt ??? 
                                //breaks.splice(j-1<0 ? 0 : j-1,1);
                                break;
                            }
                            /*if(break_end_splitted[0] < i)
                            {
                                break;
                            }*/

                            if((break_start_splitted[0] < i && break_end_splitted[0] > i) ||  break_start_splitted[0] === i && break_start_splitted[1] === cTime2 || ((break_start_splitted[0] === i && break_start_splitted[1] < cTime2) && (break_end_splitted[0] === i && break_end_splitted[1] > cTime2)) ||  ((break_start_splitted[0] === i && break_start_splitted[1] < cTime2) && break_end_splitted[0] > i) || ((break_start_splitted[0] < i) && (break_end_splitted[0] === i && break_end_splitted[1] > cTime2)))
                            {
                                breakPoint = j;
                                breakCollision = true;
                                break;
                            }
                        }
                        // !
                        //! 
                        if(!breakCollision)
                        {
                            result.push(`${hour}:${minute}`);
                        }
                        
                        /* Calculate the difference between 60 and the remaining minutes eg.: Interval = 30,cTime2 = 30, 30 - Math.abs(60 - 30) = 0, as a result, the next time is going to be a new hour */
                       
                        if(breakCollision && endBreak)
                        {
                            cTime2 = parseInt(breaks[breakPoint].end.split(':')[1])-interval;
                            console.log(cTime2)
                        }
                        else
                        {
                            latestDate = interval - Math.abs(60 - cTime2 % 60 );
                            console.log(latestDate)
                        }
                        if(fastForward)
                            break;
                    }
                    //current += interval;
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