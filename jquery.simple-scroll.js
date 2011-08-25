(function ($) {

  var isLoaded = false;
  $(window).bind('load', function(e) {
    isLoaded = true;
  });

  var generateNamespace = (function() {
    var i = 0;
    return function() {
      i++;
      return 'simple-scroll' + i;
    };
  }());

  var SimpleScroll = function(target, params) {
    params = $.extend({}, $.fn.scrollable.defaults, params || {});
    var $externalScrollBar = $(document.querySelector(params.externalScrollBar))
      , $target = $(target)
      , $window = $(window)
      , $wrapper = $('<div class="simpleScrollWrapper"/>')
      , $container = $('<div class="simpleScrollContainer"/>')
      , $content = $('<div class="simpleScrollContent"/>')
      , $scrollBase = $('<div class="simpleScrollScrollBase"/>')
      , $scrollBar = $('<div class="simpleScrollScrollBar"/>')
      , $scrollPane = $('<div class="simpleScrollScrollPane"/>');

    var contentHeight
      , visibleHeight;

    var ns = generateNamespace();

    var initialize = function() {
      $content.append($target.children());
      $target.append($wrapper.append($container.append($content)));

      if ($externalScrollBar.length > 0) {
        if ($externalScrollBar.find('.simpleScrollScrollBase').length > 0) {
          $scrollBase = $externalScrollBar.find('.simpleScrollScrollBase');
          $scrollBar = $externalScrollBar.find('.simpleScrollScrollBar');//
          $scrollPane = $externalScrollBar.find('.simpleScrollScrollPane');
        } else {
          $externalScrollBar.append($scrollBase.append($scrollPane.append($scrollBar)));
        }
      } else {
        $wrapper.append($scrollBase.append($scrollPane.append($scrollBar)));
      }

      //$window.bind('resize.' + ns, resize).trigger('resize.' + ns);
      setTimeout(reset, 0);

      var n = 0;
      $content
        .unbind('mousewheel')
        .bind('positionchange.' + ns, function(e, emitter, pos, animate) {
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

      $scrollBar.bind('mousedown', function(e) {
        e.preventDefault();
        var start = e.pageY
          , pos = $scrollBar.position().top;
        $window.bind('mousemove.draggable', function(e) {
          var newPos = pos + (e.pageY - start);
          if (newPos< 0) newPos = 0;
          if ($scrollPane.height() - $scrollBar.height() < newPos) newPos = $scrollPane.height() - $scrollBar.height();
          $scrollBar.css('top', newPos);
          emit($scrollBar, newPos / ($scrollPane.height() - $scrollBar.height()), false);
        });
        $window.one('mouseup', function(e) {
          $window.unbind('mousemove.draggable');
        });
      });

      $scrollBar
      /*
        .draggable({
          axis: "y"
          , containment: "parent"
          , drag: function(event, ui) {
            var draggerY = $scrollBar.position().top;
            emit($scrollBar, draggerY / ($scrollPane.height() - $scrollBar.height()));
          }
        })*/
        .bind('positionchange.' + ns, function(e, emitter, pos, animate) {
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
          if (e.target === $scrollBar || ($.data($scrollBase.get(0), 'simpleScrollContext') !== ns)) return;
          var px = e.pageY - $scrollBase.offset().top;
          emit($scrollBase, Math.min(1, px / ($scrollBase.height() - $scrollBar.height())));
        });
    };

    var emit = function(emitter, data, animate) {
      var context = $.data($scrollBase.get(0), 'simpleScrollContext');
      animate = (animate === false) ? animate : true;
      $scrollBar.trigger('positionchange.' + context, [emitter, data, animate]);
      $content.trigger('positionchange.' + context, [emitter, data, animate]);
    };

    var scrollTo = function(selector) {
      var $anchor = $(selector);
      emit(null, Math.min(1, $anchor.offset().top / (contentHeight - visibleHeight)));
    };

    var reset = function(options) {
      $.data($scrollBase.get(0), 'simpleScrollContext', ns);
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
      $scrollBase.css('height', params.PaneHeight || $scrollBase.parent().height());

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

    //wait until all images are loaded and initialize
    isLoaded ? setTimeout(initialize, 0) : $(window).bind('load', initialize);
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
    minBarHeight: 0.05,
    externalScrollBar: '#scrollBar',
    paneHeight: null
  };
})(jQuery);