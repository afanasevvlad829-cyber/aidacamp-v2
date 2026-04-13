(function registerBookingViewsRuntime(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.bookingViews = Object.freeze({
    stage2VerticalAlign: Object.freeze({
      top: Object.freeze({ flex: 'flex-start', grid: 'start' }),
      center: Object.freeze({ flex: 'center', grid: 'center' }),
      bottom: Object.freeze({ flex: 'flex-end', grid: 'end' })
    }),
    stage2HorizontalAlign: Object.freeze({
      left: Object.freeze({ flex: 'flex-start', grid: 'start' }),
      center: Object.freeze({ flex: 'center', grid: 'center' }),
      right: Object.freeze({ flex: 'flex-end', grid: 'end' }),
      stretch: Object.freeze({ flex: 'stretch', grid: 'stretch' })
    }),
    views: Object.freeze({
      desktop: Object.freeze({
        key: 'desktop',
        cardId: 'desktop-booking-card',
        shiftOptionsId: 'desktop-shift-options',
        infoId: 'desktop-booking-info',
        titleId: 'desktopBookingTitle',
        leadId: 'desktopBookingLead',
        startBtnId: 'desktopStartBtn',
        hintId: 'desktopBookingHint',
        stepsId: 'desktopBookingSteps',
        inlineHintId: 'desktopBookingHintInline',
        shiftListId: 'desktopShiftList',
        ctaWrapId: 'desktopCtaWrap',
        ageTabsId: 'desktopAgeTabs',
        summaryChipsId: 'desktopBookingSummaryChips',
        ageChipId: 'desktopAgeChip',
        ageChipTextId: 'desktopAgeChipText',
        shiftChipId: 'desktopShiftChip',
        shiftChipTextId: 'desktopShiftChipText',
        guidedInlineHintId: 'desktopInlineHint',
        inlineLeadScope: 'booking-desktop',
        stage2Align: Object.freeze({
          vertical: 'center',
          horizontal: 'stretch'
        })
      }),
      mobile: Object.freeze({
        key: 'mobile',
        cardId: 'mobileBookingCard',
        shiftOptionsId: 'mobileShiftOptions',
        infoId: 'mobile-booking-info',
        titleId: 'mobileBookingTitle',
        leadId: 'mobileBookingLead',
        startBtnId: 'mobileStartBtn',
        hintId: 'mobileBookingHint',
        stepsId: 'mobileBookingSteps',
        inlineHintId: 'mobileBookingHintInline',
        shiftListId: 'mobileShiftList',
        ctaWrapId: 'mobileCtaWrap',
        ageTabsId: 'mobileAgeTabs',
        summaryChipsId: 'mobileBookingSummaryChips',
        ageChipId: 'mobileAgeChip',
        ageChipTextId: 'mobileAgeChipText',
        shiftChipId: 'mobileShiftChip',
        shiftChipTextId: 'mobileShiftChipText',
        guidedInlineHintId: 'mobileInlineHint',
        inlineLeadScope: 'booking-mobile',
        stage2Align: Object.freeze({
          vertical: 'center',
          horizontal: 'stretch'
        })
      })
    })
  });
})(window);
