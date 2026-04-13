(function registerRuntimeCalendarConfig(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.calendar = Object.freeze({
    weekdaysShort: Object.freeze(['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']),
    monthNames: Object.freeze([
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ])
  });
})(window);

