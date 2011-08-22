(function ($) {

  var isLoaded = false;
  $(window).bind('load', function(e) {
    isLoaded = true;
  });

  var SimpleScroll = function(target, params) {
    var $target = $(target)
      , $window = $(window)
      , $wrapper = $('<div class="simpleScrollWrapper"/>')
      , $container = $('<div class="simpleScrollContainer"/>')
      , $content = $('<div class="simpleScrollContent"/>')
      , $scrollBase = $('<div class="simpleScrollScrollBase"/>')
      , $scrollBar = $('<div class="simpleScrollScrollBar"/>')
      , $scrollPane = $('<div class="simpleScrollScrollPane"/>');

    var contentHeight
      , visibleHeight;

    var initialize = function() {
      $content.append($target.children());
      $target.append($wrapper.append($container.append($content) , $scrollBase.append($scrollPane.append($scrollBar))));
      $window.bind('resize', resize).trigger('resize');

      var n = 0;
      $content
        .unbind('mousewheel')
        .bind('positionchange', function(e, emitter, pos, animate) {
          if (animate) {
            $content.stop().animate({top: - pos * (contentHeight - visibleHeight)}, params.duration, params.easing, function() {
              n = -$(this).position().top;
            });
          } else {
            $content.stop().css('top', - pos * (contentHeight - visibleHeight));
          }
        })
        .bind('mousewheel', (function() {
          var flag = 0
            , tmp;
          return function(e, delta) {
            var range = contentHeight - visibleHeight;
            flag = flag++ === 3 ? 0 : flag;
            if (flag > 0 || range < 0) return;
            tmp = n;
            n -= delta * params.sensitivity;
            if (n > range) {
              n = range;
            } else if (n < 0) {
              n = 0;
            }
            if (tmp !== n) emit($content, n / range);
          };
        }()));

      $scrollBar
        .draggable({
          axis: "y"
          , containment: "parent"
          , drag: function(event, ui) {
            var draggerY = $scrollBar.position().top;
            emit($scrollBar, draggerY / ($scrollPane.height() - $scrollBar.height()));
          }
        })
        .bind('positionchange', function(e, emitter, pos, animate) {
          if (emitter === $scrollBar) return;
          if (animate) {
            $scrollBar.stop().animate({top: pos * ($scrollPane.height() - $scrollBar.height())}, params.duration, params.easing);
          } else {
            $scrollBar.stop().css('top', pos * ($scrollPane.height() - $scrollBar.height()));
          }
        });

      $scrollBase
        .bind('mousewheel', function(e, delta) {
        })
        .bind('click', function(e) {
          if (e.target === $scrollBar) return;
          var px = e.pageY - $scrollBase.offset().top;
          emit($scrollBase, Math.min(1, px / ($scrollBase.height() - $scrollBar.height())));
        });
    };

    var emit = function(emitter, data, animate) {
      animate = (animate === false) ? animate : true;
      $scrollBar.trigger('positionchange', [emitter, data, animate]);
      $content.trigger('positionchange', [emitter, data, animate]);
    };

    var scrollTo = function(selector) {
      var $anchor = $(selector);
      emit(null, Math.min(1, $anchor.position().top / (contentHeight - visibleHeight)));
    };

    var reset = function(options) {
      params = $.extend(params, options);
      resize();
    };

    var resize = function() {
      contentHeight = $content.height();
      visibleHeight = params.visibleHeight;
      $wrapper.css({
        height: visibleHeight,
        visibility: 'visible'
      });
      if ($scrollBase.height() === 0) {
        $scrollBase.css('height', $wrapper.height());
      }
      if (contentHeight <= visibleHeight) {
        $scrollBase.css({visibility: 'hidden'});
      } else {
        $scrollBar.height(Math.max(visibleHeight / contentHeight * $scrollBase.height(), params.minBarHeight));
        $scrollBase.css({visibility: 'visible'});
        emit(null, Math.min(1, - $content.position().top / (contentHeight - visibleHeight)), false);
      }
    };
    //export APIs
    this.scrollTo = scrollTo;
    this.reset = reset;

    //merge params
    params = $.extend({}, $.fn.scrollable.defaults, params || {});
    //wait until all images are loaded and initialize
    isLoaded ? initialize() : $(window).bind('load', initialize);
  };

  $.fn.scrollable = function(options) {
    return this.each(function() {
      var api = new SimpleScroll(this, options);
      $(this).data('api', api);
    });
  };

  $.fn.scrollable.defaults = {
    sensitivity: 200,
    visibleHeight: 300,
    easing: 'easeOutCubic',
    duration: 800,
    minBarHeight: 30
  };
})(jQuery);