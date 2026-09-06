import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

function DateTimeDisplay({ timezone, timeFormat, city }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // إعادة تحديث التاريخ والوقت عند تغيير الإعدادات
  useEffect(() => {
    const now = new Date();
    const timezoneDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    setCurrentDateTime(timezoneDate);
    console.log('DateTimeDisplay: Updated timezone to', timezone, 'timeFormat to', timeFormat);
  }, [timezone, timeFormat]);

  useEffect(() => {
    const updateDateTime = () => {
      // استخدام المنطقة الزمنية المحددة
      const now = new Date();
      const timezoneDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      setCurrentDateTime(timezoneDate);
    };

    // تحديث الوقت كل ثانية
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, [timezone, timeFormat]);

  // تنسيق التاريخ الميلادي باللغة العربية مع الأرقام بالإنجليزية
  const formatDate = (date) => {
    // استخدام المنطقة الزمنية المحددة للتاريخ
    const timezoneDate = new Date(date.toLocaleString("en-US", {timeZone: timezone}));
    
    // أسماء الأيام باللغة العربية
    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    // أسماء الشهور باللغة العربية
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const dayOfWeek = weekDays[timezoneDate.getDay()];
    const day = timezoneDate.getDate();
    const month = months[timezoneDate.getMonth()];
    const year = timezoneDate.getFullYear();
    
    return `${dayOfWeek} ${day} ${month} ${year}`;
  };

  // تنسيق الوقت بناءً على إعدادات النظام (بدون ثواني)
  const formatTime = (date) => {
    if (timeFormat === '12') {
      // تنسيق 12 ساعة: HH:MM PM
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      };
      
      const timeString = date.toLocaleTimeString('en-US', options);
      // إعادة ترتيب ليكون HH:MM PM بدلاً من PM HH:MM
      const parts = timeString.split(' ');
      if (parts.length === 2) {
        return {
          time: parts[0],
          period: parts[1]
        };
      }
      return {
        time: timeString,
        period: ''
      };
    } else {
      // تنسيق 24 ساعة: HH:MM
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      };
      
      return {
        time: date.toLocaleTimeString('en-US', options),
        period: ''
      };
    }
  };

  // الحصول على اسم المدينة باللغة العربية
  const getCityName = (cityValue) => {
    const cityNames = {
      'Cairo': 'القاهرة',
      'Alexandria': 'الإسكندرية'
    };
    
    return cityNames[cityValue] || cityValue;
  };

  return (
    <div className="datetime-display flex items-center space-x-4 space-x-reverse">
      {/* التاريخ */}
      <div className="date-section flex items-center space-x-2 space-x-reverse">
        <Calendar className="h-4 w-4 text-white/80" />
        <div className="date-text text-sm text-white/90 font-medium">
          {formatDate(currentDateTime)}
        </div>
      </div>

      {/* الوقت */}
      <div className="time-section flex items-center space-x-2 space-x-reverse">
        <Clock className="h-4 w-4 text-white/80" />
        <div className="time-text text-sm text-white/90 font-medium flex items-center space-x-1 space-x-reverse">
          <span>{formatTime(currentDateTime).time}</span>
          {formatTime(currentDateTime).period && (
            <span className="time-period-circle">
              {formatTime(currentDateTime).period}
            </span>
          )}
        </div>
      </div>

      {/* المدينة */}
      <div className="timezone-section text-xs text-white/70">
        {getCityName(city)}
      </div>
    </div>
  );
}

export default DateTimeDisplay;