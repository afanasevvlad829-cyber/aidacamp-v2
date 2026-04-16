(function registerOverlayFlow(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_FEATURES = windowObj.AC_FEATURES || {};

  function createOverlayFlow(context){
    var ctx = context || {};
    var doc = ctx.document || windowObj.document;
    var buildBookingSummaryHtml = ctx.buildBookingSummaryHtml || function(){ return ''; };
    var isAdminDebugSession = ctx.isAdminDebugSession || function(){ return false; };
    var resetOfferState = ctx.resetOfferState || function(){};
    var getState = ctx.getState || function(){ return {}; };
    var persist = ctx.persist || function(){};
    var renderAll = ctx.renderAll || function(){};

    var noticeConfirmHandler = null;

    function openSuccessModal(deliveryResult){
      var box = doc.getElementById('successSummaryBox');
      if(box) box.innerHTML = buildBookingSummaryHtml();
      var deliveryState = doc.getElementById('successDeliveryState');
      if(deliveryState){
        var isAdmin = isAdminDebugSession();
        if(isAdmin && deliveryResult && deliveryResult.ok === false){
          deliveryState.textContent = 'Заявка сохранена локально, но сейчас нет связи с сервером отправки. Если мы не ответим в течение 15 минут, напишите нам в Telegram.';
          deliveryState.classList.remove('hidden');
          deliveryState.classList.add('error');
        } else {
          deliveryState.textContent = '';
          deliveryState.classList.add('hidden');
          deliveryState.classList.remove('error');
        }
      }
      doc.getElementById('successOverlay')?.classList.remove('hidden');
    }

    function closeSuccessModal(){
      doc.getElementById('successOverlay')?.classList.add('hidden');
    }

    function openNoticeModal(message, title){
      var resolvedTitle = title || 'Проверьте данные';
      var overlay = doc.getElementById('noticeOverlay');
      if(!overlay) return;
      var titleEl = doc.getElementById('noticeTitle');
      var messageEl = doc.getElementById('noticeMessage');
      var actionsEl = doc.getElementById('noticeActions');
      noticeConfirmHandler = null;
      if(titleEl) titleEl.textContent = resolvedTitle;
      if(messageEl) messageEl.textContent = message || '';
      if(actionsEl){
        actionsEl.classList.add('hidden');
        actionsEl.classList.remove('notice-actions--reset-booking');
      }
      overlay.classList.remove('hidden');
    }

    function closeNoticeModal(){
      noticeConfirmHandler = null;
      var actionsEl = doc.getElementById('noticeActions');
      if(actionsEl){
        actionsEl.classList.add('hidden');
        actionsEl.classList.remove('notice-actions--reset-booking');
      }
      doc.getElementById('noticeOverlay')?.classList.add('hidden');
    }

    function ensureNoticeActions(){
      var overlay = doc.getElementById('noticeOverlay');
      var card = overlay && overlay.querySelector('.notice-card');
      if(!overlay || !card) return null;
      var actionsEl = doc.getElementById('noticeActions');
      if(actionsEl) return actionsEl;
      actionsEl = doc.createElement('div');
      actionsEl.id = 'noticeActions';
      actionsEl.className = 'notice-actions hidden';
      actionsEl.innerHTML = [
        '<button class="secondary-outline notice-cancel-btn" type="button" data-action="close-notice">Отмена</button>',
        '<button class="cta-main notice-confirm-btn" type="button" data-action="confirm-notice">Подтвердить</button>'
      ].join('');
      card.appendChild(actionsEl);
      return actionsEl;
    }

    function openResetBookingConfirmModal(){
      openNoticeModal(
        'Это действие аннулирует ваше предварительное бронирование. Вы точно хотите продолжить?',
        'Сбросить бронирование?'
      );
      var actionsEl = ensureNoticeActions();
      if(!actionsEl) return;
      var cancelBtn = actionsEl.querySelector('.notice-cancel-btn');
      var confirmBtn = actionsEl.querySelector('.notice-confirm-btn');
      if(cancelBtn) cancelBtn.textContent = 'Отмена';
      if(confirmBtn) confirmBtn.textContent = 'Сбросить';
      actionsEl.classList.add('notice-actions--reset-booking');
      noticeConfirmHandler = function(){
        var state = getState();
        resetOfferState({ preserveShift:false });
        Object.assign(state, {
          age: null,
          ageSelected: false
        });
        persist();
        renderAll();
      };
      actionsEl.classList.remove('hidden');
    }

    function getNoticeConfirmHandler(){
      return noticeConfirmHandler;
    }

    return Object.freeze({
      openSuccessModal: openSuccessModal,
      closeSuccessModal: closeSuccessModal,
      openNoticeModal: openNoticeModal,
      closeNoticeModal: closeNoticeModal,
      openResetBookingConfirmModal: openResetBookingConfirmModal,
      getNoticeConfirmHandler: getNoticeConfirmHandler
    });
  }

  windowObj.AC_FEATURES.overlays = Object.freeze({
    create: createOverlayFlow
  });
})(window);
