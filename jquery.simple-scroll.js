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
    var $externalScrollBar = $(params.externalScrollBar)
      , $target = $(target)
      , $window = $(window)
      , $document = $(document)
      , $wrapper = $('<div class="simpleScrollWrapper"/>')
      , $container = $('<div class="simpleScrollContainer"/>')
      , $content = $('<div class="simpleScrollContent"/>')
      , $scrollBase = $('<div class="simpleScrollScrollBase"/>')
      , $scrollBar = $('<div class="simpleScrollScrollBar"/>')
      , $scrollPane = $('<div class="simpleScrollScrollPane"/>');

    var contentHeight
      , visibleHeight
      , n
      , ns = generateNamespace();

    var initialize = function() {
      console.log('initialize', ns);
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

      $content
        .unbind('mousewheel')
        .bind('positionchange.' + ns, function(e, emitter, pos, animate) {
          if (animate) {
            $content.stop().animate({top: - pos * (contentHeight - visibleHeight)}, params.duration, params.easing, function() {
              n = -$(this).position().top;
            });
          } else {
            $content.stop().css('top', - pos * (contentHeight - visibleHeight));
            n = -$(this).position().top;
          }
        })
        .bind('mousewheel', (function() {
          var flag = 0
            , tmp;
          return function(e, delta) {
            e.preventDefault();
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
        .bind('mousedown', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var start = e.pageY
            , pos = $scrollBar.position().top;
          $document.bind('mousemove.draggable', function(e) {
            var newPos = pos + (e.pageY - start);
              if (newPos< 0) newPos = 0;
              if ($scrollPane.height() - $scrollBar.height() < newPos) newPos = $scrollPane.height() - $scrollBar.height();
              $scrollBar.css('top', newPos);
              emit($scrollBar, newPos / ($scrollPane.height() - $scrollBar.height()), false);
            });
            $document.one('mouseup', function(e) {
              $document.unbind('mousemove.draggable');
            });
          })
        .bind('positionchange.' + ns, function(e, emitter, pos, animate) {
          if (emitter === $scrollBar) return;
          if (animate) {
            $scrollBar.stop().animate({top: pos * ($scrollPane.height() - $scrollBar.height())}, params.duration, params.easing);
          } else {
            $scrollBar.stop().css('top', pos * ($scrollPane.height() - $scrollBar.height()));
          }
        });

      $scrollBase
        .bind('click', function(e) {
          if (e.target === $scrollBar.get(0) || ($.data($scrollBase.get(0), 'simpleScrollContext') !== ns)) return;
          var px = e.pageY - $scrollBase.offset().top;
          emit($scrollBase, Math.min(1, px / ($scrollBase.height() - $scrollBar.height())));
        });

      reset();
    };

    var emit = function(emitter, data, animate) {
      var context = $.data($scrollBase.get(0), 'simpleScrollContext');
      animate = (animate === false) ? animate : true;
      $scrollBar.trigger('positionchange.' + context, [emitter, data, animate]);
      $content.trigger('positionchange.' + context, [emitter, data, animate]);
    };

    var scrollTo = function(selector) {
      var $anchor
        , pos;
      if (selector[0] === '#') {
        $anchor = $(selector);
        if ($anchor.length === 0) {
          throw new Error('unknown selector [' + selector + ']');
        }
        pos = Math.min(1, $anchor.offset().top / (contentHeight - visibleHeight));
      } else if (typeof selector === 'number' && 0 <= selector && selector <= 1) {
        pos = selector;
      } else {
        throw new Error('invalid value');
      }
      emit(null, pos);
      return this;
    };

    var reset = function(options) {
      $.data($scrollBase.get(0), 'simpleScrollContext', ns);
      params = $.extend(params, options);
      resize();
      return this;
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
        emit(null, 0, false);
        $scrollBase.css({visibility: 'hidden'});
      } else {
        $scrollBar.height(Math.max(visibleHeight / contentHeight * $scrollBase.height(), params.minBarHeight));
        $scrollBase.css({visibility: 'visible'});
        emit(null, Math.min(1, - $content.position().top / (contentHeight - visibleHeight)), false);
      }
    };
    //export APIs
    this.scrollTo = scrollTo;
    this.reset = function() { setTimeout(reset, 0); };

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
    externalScrollBar: null,
    paneHeight: null,
    mousewheel: false
  };
})(jQuery);