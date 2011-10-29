(function ($) {

  /**
   * EventEmitter Pattern from move.js written by visionmedia
   * https://github.com/visionmedia/move.js/blob/master/move.js
   */
  var EventEmitter = function() {
    this.callbacks = {};
  };

  EventEmitter.prototype.on = function(event, fn) {
    (this.callbacks[event] = this.callbacks[event] || []).push(fn);
    return this;
  };

  EventEmitter.prototype.emit = function(event) {
    var args = Array.prototype.slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        len;
    if (callbacks) {
      len = callbacks.length;
      for (var i = 0; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };

  var dfds = [];

  var generateNamespace = (function() {
    var i = 0;
    return function() {
      i++;
      return 'simple-scroll' + i;
    };
  }());

  var trim = function(a, b, c) {
    if (c < a) {
      return a;
    } else if (c > b) {
      return b;
    } else {
      return c;
    }
  };

  var SimpleScroll = function(elem, params) {
    EventEmitter.call(this);
    params = $.extend({}, $.fn.scrollable.defaults, params || {});
    var $externalScrollBar = $(params.externalScrollBar),
        $elem = $(elem),
        $window = $(window),
        $document = $(document),
        $wrapper = $('<div class="simpleScrollWrapper"/>'),
        $container = $('<div class="simpleScrollContainer"/>'),
        $content = $('<div class="simpleScrollContent"/>'),
        $scrollBase = $('<div class="simpleScrollScrollBase"/>'),
        $scrollBar = $('<div class="simpleScrollScrollBar"/>'),
        $scrollPane = $('<div class="simpleScrollScrollPane"/>');

    var that = this,
        contentHeight,
        visibleHeight,
        ns = generateNamespace(),
        n = 0;



    var initialize = function() {
      $content.append($elem.children());
      $elem.append($wrapper.append($container.append($content)));

      if ($externalScrollBar.length > 0) {
        if ($externalScrollBar.has('.simpleScrollScrollBase').length > 0) {
          $scrollBase = $externalScrollBar.find('.simpleScrollScrollBase');
          $scrollBar = $externalScrollBar.find('.simpleScrollScrollBar');
          $scrollPane = $externalScrollBar.find('.simpleScrollScrollPane');
        } else {
          $externalScrollBar.append($scrollBase.append($scrollPane.append($scrollBar)));
        }
      } else {
        $wrapper.append($scrollBase.append($scrollPane.append($scrollBar)));
      }
      
      $content
        .bind('positionchange.' + ns, function(e, emitter, relPos, animate) {
          $content.stop().animate({top: - relPos * (contentHeight - visibleHeight)}, (animate ? params.duration : 0), params.easing, function() {
            $.data($content.get(0), 'data-simple-scroll-position', - $content.position().top);
          });
        })
        .bind('mousewheel', (function() {
          console.log(1);
          var flag = 0;
          return function(e, delta) {
            var currentPos,
                absPos,
                range = contentHeight - visibleHeight,
                flag = flag++ === 3 ? 0 : flag;
            if (flag > 0 || range < 0) return;
            currentPos = $.data($content.get(0), 'data-simple-scroll-position') || 0;
            absPos = trim(0, range, currentPos - delta * params.sensitivity);
            if (absPos !== currentPos) {
              $.data($content.get(0), 'data-simple-scroll-position', absPos);
              emit($content, absPos / range);
            }
          };
        }()))
        .swipe({
          swipeStatus: (function() {
            var tmp,
                currentPos,
                initialDirection;
            return function(e, phase, direction, distance) {
              var absPos,
                  range = contentHeight - visibleHeight;
              if (range < 0) return;
              initialDirection = initialDirection || direction;
              if (phase === 'start') {
                currentPos = $.data($content.get(0), 'data-simple-scroll-position') || 0;
              } else if (phase === 'end') {
                initialDirection = null;
              } else if (phase === 'cancel') {
              } else if (phase === 'move' && (direction === 'up' || direction === 'down') && (initialDirection === 'up' || initialDirection === 'down')) {
                distance = direction === 'down' ? -distance : distance;
                absPos = trim(0, range, currentPos + distance * 3);
                if (currentPos !== absPos) {
                  $.data($content.get(0), 'data-simple-scroll-position', absPos);
                  emit($content, absPos / range);
                }
              }
            };
          })()
        });
      
      $scrollBar
        .bind('mousedown', function(e) {
          var start = e.pageY,
              pos = $scrollBar.position().top;
          $document.bind('mousemove.draggable', function(e) {
            var newPos = pos + (e.pageY - start),
                range = $scrollPane.height() - $scrollBar.height();
            newPos = trim(0, range, newPos);
            $scrollBar.css('top', newPos);
            emit($scrollBar, newPos / range, false);
          });
          $document.one('mouseup', function(e) {
            $document.unbind('mousemove.draggable');
          });
        })
        .bind('positionchange.' + ns, function(e, emitter, relPos, animate) {
          var range = $scrollPane.height() - $scrollBar.height();
          if (emitter === $scrollBar) return;
          $scrollBar.stop().animate({top: relPos * range}, (animate ? params.duration : 0), params.easing);
        });

      $scrollBase
        .bind('click', function(e) {
          if (e.target === $scrollBar.get(0) || ($.data($scrollBase.get(0), 'simpleScrollContext') !== ns)) return;
          var px = e.pageY - $scrollBase.offset().top;
          emit($scrollBase, Math.min(1, px / $scrollBase.height()));
        });

      reset();
    };

    var emit = function(emitter, data, animate) {
      that.emit('scroll');
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

    var scrollTop = function() {
      return - $content.position().top;
    };

    var reset = function(options) {
      $.data($scrollBase.get(0), 'simpleScrollContext', ns);
      params = $.extend(params, options || {});
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
    this.reset = reset;
    this.scrollTop = scrollTop;

    //wait until all images are loaded and initialize
    $.when.apply(null, dfds).done(initialize);
  };
  
  SimpleScroll.prototype = new EventEmitter();
  
  $.fn.scrollable = function(options) {
    var that = this;
    this.scrollable.api = function(i) {
      if (typeof i === 'number') {
        return $.data(that[i], 'data-simple-scroll-api');
      } else {
        return $.data(i, 'data-simple-scroll-api');
      }
    };
    return this.each(function() {
      var api = new SimpleScroll(this, options);
      $.data(this, 'data-simple-scroll-api', api);
    });
  };

  $.fn.scrollable.defaults = {
    onScroll: function() {},
    sensitivity: 200,
    visibleHeight: 300,
    easing: 'easeOutCubic',
    duration: 800,
    minBarHeight: 0.05,
    externalScrollBar: null,
    paneHeight: null,
    mousewheel: false
  };

  $(function() {
    $('img').each(function(i, elem) {
      var dfd = new $.Deferred();
      $(elem)
        .bind('load', function() {
          dfd.resolve();
        })
        .bind('error', function() {
          dfd.resolve();
        });
      dfds.push(dfd);
    });
  });

})(jQuery);


/*
 * touchSwipe - jQuery Plugin
 * http://plugins.jquery.com/project/touchSwipe
 * http://labs.skinkers.com/touchSwipe/
 *
 * Copyright (c) 2010 Matt Bryson (www.skinkers.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * $version: 1.2.5
 *
 * Changelog
 * $Date: 2010-12-12 (Wed, 12 Dec 2010) $
 * $version: 1.0.0 
 * $version: 1.0.1 - removed multibyte comments
 *
 * $Date: 2011-21-02 (Mon, 21 Feb 2011) $
 * $version: 1.1.0 	- added allowPageScroll property to allow swiping and scrolling of page
 *					- changed handler signatures so one handler can be used for multiple events
 * $Date: 2011-23-02 (Wed, 23 Feb 2011) $
 * $version: 1.2.0 	- added click handler. This is fired if the user simply clicks and does not swipe. The event object and click target are passed to handler.
 *					- If you use the http://code.google.com/p/jquery-ui-for-ipad-and-iphone/ plugin, you can also assign jQuery mouse events to children of a touchSwipe object.
 * $version: 1.2.1 	- removed console log!
 *
 * $version: 1.2.2 	- Fixed bug where scope was not preserved in callback methods. 
 *
 * $Date: 2011-28-04 (Thurs, 28 April 2011) $
 * $version: 1.2.4 	- Changed licence terms to be MIT or GPL inline with jQuery. Added check for support of touch events to stop non compatible browsers erroring.
 *
 * $Date: 2011-27-09 (Tues, 27 September 2011) $
 * $version: 1.2.5 	- Added support for testing swipes with mouse on desktop browser (thanks to https://github.com/joelhy)

 * A jQuery plugin to capture left, right, up and down swipes on touch devices.
 * You can capture 2 finger or 1 finger swipes, set the threshold and define either a catch all handler, or individual direction handlers.
 * Options:
 * 		swipe 		Function 	A catch all handler that is triggered for all swipe directions. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
 * 		swipeLeft	Function 	A handler that is triggered for "left" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
 * 		swipeRight	Function 	A handler that is triggered for "right" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
 * 		swipeUp		Function 	A handler that is triggered for "up" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
 * 		swipeDown	Function 	A handler that is triggered for "down" swipes. Handler is passed 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
 *		swipeStatus Function 	A handler triggered for every phase of the swipe. Handler is passed 4 arguments: event : The original event object, phase:The current swipe face, either "start?, "move?, "end? or "cancel?. direction : The swipe direction, either "up?, "down?, "left " or "right?.distance : The distance of the swipe.
 *		click		Function	A handler triggered when a user just clicks on the item, rather than swipes it. If they do not move, click is triggered, if they do move, it is not.
 *
 * 		fingers 	int 		Default 1. 	The number of fingers to trigger the swipe, 1 or 2.
 * 		threshold 	int  		Default 75.	The number of pixels that the user must move their finger by before it is considered a swipe.
 *		triggerOnTouchEnd Boolean Default true If true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically.
 *		allowPageScroll String Default "auto". How the browser handles page scrolls when the user is swiping on a touchSwipe object. 
 *										"auto" : all undefined swipes will cause the page to scroll in that direction.
 *										"none" : the page will not scroll when user swipes.
 *										"horizontal" : will force page to scroll on horizontal swipes.
 *										"vertical" : will force page to scroll on vertical swipes.
 *
 * This jQuery plugin will only run on devices running Mobile Webkit based browsers (iOS 2.0+, android 2.2+)
 */
(function($) 
{
  
  
  
  $.fn.swipe = function(options) 
  {
    if (!this) return false;
    
    // Default thresholds & swipe functions
    var defaults = {
          
      fingers     : 1,                // int - The number of fingers to trigger the swipe, 1 or 2. Default is 1.
      threshold     : 75,                // int - The number of pixels that the user must move their finger by before it is considered a swipe. Default is 75.
      
      swipe       : null,    // Function - A catch all handler that is triggered for all swipe directions. Accepts 2 arguments, the original event object and the direction of the swipe : "left", "right", "up", "down".
      swipeLeft    : null,    // Function - A handler that is triggered for "left" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
      swipeRight    : null,    // Function - A handler that is triggered for "right" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
      swipeUp      : null,    // Function - A handler that is triggered for "up" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
      swipeDown    : null,    // Function - A handler that is triggered for "down" swipes. Accepts 3 arguments, the original event object, the direction of the swipe : "left", "right", "up", "down" and the distance of the swipe.
      swipeStatus    : null,    // Function - A handler triggered for every phase of the swipe. Handler is passed 4 arguments: event : The original event object, phase:The current swipe face, either "start?, "move?, "end? or "cancel?. direction : The swipe direction, either "up?, "down?, "left " or "right?.distance : The distance of the swipe.
      click      : null,    // Function  - A handler triggered when a user just clicks on the item, rather than swipes it. If they do not move, click is triggered, if they do move, it is not.
      
      triggerOnTouchEnd : true,  // Boolean, if true, the swipe events are triggered when the touch end event is received (user releases finger).  If false, it will be triggered on reaching the threshold, and then cancel the touch event automatically.
      allowPageScroll : "auto"   /* How the browser handles page scrolls when the user is swiping on a touchSwipe object. 
                      "auto" : all undefined swipes will cause the page to scroll in that direction.
                       "none" : the page will not scroll when user swipes.
                       "horizontal" : will force page to scroll on horizontal swipes.
                       "vertical" : will force page to scroll on vertical swipes.
                    */
    };
    
    
    //Constants
    var LEFT = "left";
    var RIGHT = "right";
    var UP = "up";
    var DOWN = "down";
    var NONE = "none";
    var HORIZONTAL = "horizontal";
    var VERTICAL = "vertical";
    var AUTO = "auto";
    
    var PHASE_START="start";
    var PHASE_MOVE="move";
    var PHASE_END="end";
    var PHASE_CANCEL="cancel";
    
    var hasTouch = 'ontouchstart' in window,
        START_EV = hasTouch ? 'touchstart' : 'mousedown',
        MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
        END_EV = hasTouch ? 'touchend' : 'mouseup',
        CANCEL_EV = 'touchcancel';
    
    var phase="start";
    
    if (options.allowPageScroll==undefined && (options.swipe!=undefined || options.swipeStatus!=undefined))
      options.allowPageScroll=NONE;
    
    if (options)
      $.extend(defaults, options);
    
    
    /**
     * Setup each object to detect swipe gestures
     */
    return this.each(function() 
    {
            var that = this;
      var $this = $(this);
      
      var triggerElementID = null;   // this variable is used to identity the triggering element
      var fingerCount = 0;      // the current number of fingers being used.  
      
      //track mouse points / delta
      var start={x:0, y:0};
      var end={x:0, y:0};
      var delta={x:0, y:0};
      
      
      /**
      * Event handler for a touch start event. 
      * Stops the default click event from triggering and stores where we touched
      */
      function touchStart(event) 
      {
                var evt = hasTouch ? event.touches[0] : event; 
        phase = PHASE_START;
    
                if (hasTouch) {
                    // get the total number of fingers touching the screen
                    fingerCount = event.touches.length;
                }
        
        //clear vars..
        distance=0;
        direction=null;
        
        // check the number of fingers is what we are looking for
        if (fingerCount == defaults.fingers || !hasTouch) 
        {
          // get the coordinates of the touch
          start.x = end.x = evt.pageX;
          start.y = end.y = evt.pageY;
          
          if (defaults.swipeStatus)
            triggerHandler(event, phase);
        } 
        else 
        {
          //touch with more/less than the fingers we are looking for
          touchCancel(event);
        }

        that.addEventListener(MOVE_EV, touchMove, false);
        that.addEventListener(END_EV, touchEnd, false);
      }

      /**
      * Event handler for a touch move event. 
      * If we change fingers during move, then cancel the event
      */
      function touchMove(event) 
      {
        if (phase == PHASE_END || phase == PHASE_CANCEL)
          return;
                
                var evt = hasTouch ? event.touches[0] : event; 
        
        end.x = evt.pageX;
        end.y = evt.pageY;
          
        direction = caluculateDirection();
                if (hasTouch) {
                    fingerCount = event.touches.length;
                }
        
        phase = PHASE_MOVE
        
        //Check if we need to prevent default evnet (page scroll) or not
        validateDefaultEvent(event, direction);
    
        if ( fingerCount == defaults.fingers || !hasTouch) 
        {
          distance = caluculateDistance();
          
          if (defaults.swipeStatus)
            triggerHandler(event, phase, direction, distance);
          
          //If we trigger whilst dragging, not on touch end, then calculate now...
          if (!defaults.triggerOnTouchEnd)
          {
            // if the user swiped more than the minimum length, perform the appropriate action
            if ( distance >= defaults.threshold ) 
            {
              phase = PHASE_END;
              triggerHandler(event, phase);
              touchCancel(event); // reset the variables
            }
          }
        } 
        else 
        {
          phase = PHASE_CANCEL;
          triggerHandler(event, phase); 
          touchCancel(event);
        }
      }
      
      /**
      * Event handler for a touch end event. 
      * Calculate the direction and trigger events
      */
      function touchEnd(event) 
      {
        event.preventDefault();
        
        distance = caluculateDistance();
        direction = caluculateDirection();
            
        if (defaults.triggerOnTouchEnd)
        {
          phase = PHASE_END;
          // check to see if more than one finger was used and that there is an ending coordinate
          if ( (fingerCount == defaults.fingers  || !hasTouch) && end.x != 0 ) 
          {
            // if the user swiped more than the minimum length, perform the appropriate action
            if ( distance >= defaults.threshold ) 
            {
              triggerHandler(event, phase);
              touchCancel(event); // reset the variables
            } 
            else 
            {
              phase = PHASE_CANCEL;
              triggerHandler(event, phase); 
              touchCancel(event);
            }  
          } 
          else 
          {
            phase = PHASE_CANCEL;
            triggerHandler(event, phase); 
            touchCancel(event);
          }
        }
        else if (phase == PHASE_MOVE)
        {
          phase = PHASE_CANCEL;
          triggerHandler(event, phase); 
          touchCancel(event);
        }
        that.removeEventListener(MOVE_EV, touchMove, false);
        that.removeEventListener(END_EV, touchEnd, false);
      }
      
      /**
      * Event handler for a touch cancel event. 
      * Clears current vars
      */
      function touchCancel(event) 
      {
        // reset the variables back to default values
        fingerCount = 0;
        
        start.x = 0;
        start.y = 0;
        end.x = 0;
        end.y = 0;
        delta.x = 0;
        delta.y = 0;
      }
      
      
      /**
      * Trigger the relevant event handler
      * The handlers are passed the original event, the element that was swiped, and in the case of the catch all handler, the direction that was swiped, "left", "right", "up", or "down"
      */
      function triggerHandler(event, phase) 
      {
        //update status
        if (defaults.swipeStatus)
          defaults.swipeStatus.call($this,event, phase, direction || null, distance || 0);
        
        
        if (phase == PHASE_CANCEL)
        {
          if (defaults.click && (fingerCount==1 || !hasTouch) && (isNaN(distance) || distance==0))
            defaults.click.call($this,event, event.target);
        }
        
        if (phase == PHASE_END)
        {
          //trigger catch all event handler
          if (defaults.swipe)
        {
            
            defaults.swipe.call($this,event, direction, distance);
            
        }
          //trigger direction specific event handlers  
          switch(direction)
          {
            case LEFT :
              if (defaults.swipeLeft)
                defaults.swipeLeft.call($this,event, direction, distance);
              break;
            
            case RIGHT :
              if (defaults.swipeRight)
                defaults.swipeRight.call($this,event, direction, distance);
              break;

            case UP :
              if (defaults.swipeUp)
                defaults.swipeUp.call($this,event, direction, distance);
              break;
            
            case DOWN :  
              if (defaults.swipeDown)
                defaults.swipeDown.call($this,event, direction, distance);
              break;
          }
        }
      }
      
      
      /**
       * Checks direction of the swipe and the value allowPageScroll to see if we should allow or prevent the default behaviour from occurring.
       * This will essentially allow page scrolling or not when the user is swiping on a touchSwipe object.
       */
      function validateDefaultEvent(event, direction)
      {
        if( defaults.allowPageScroll==NONE )
        {
          event.preventDefault();
        }
        else 
        {
          var auto=defaults.allowPageScroll==AUTO;
          
          switch(direction)
          {
            case LEFT :
              if ( (defaults.swipeLeft && auto) || (!auto && defaults.allowPageScroll!=HORIZONTAL))
                event.preventDefault();
              break;
            
            case RIGHT :
              if ( (defaults.swipeRight && auto) || (!auto && defaults.allowPageScroll!=HORIZONTAL))
                event.preventDefault();
              break;

            case UP :
              if ( (defaults.swipeUp && auto) || (!auto && defaults.allowPageScroll!=VERTICAL))
                event.preventDefault();
              break;
            
            case DOWN :  
              if ( (defaults.swipeDown && auto) || (!auto && defaults.allowPageScroll!=VERTICAL))
                event.preventDefault();
              break;
          }
        }
        
      }
      
      
      
      /**
      * Calcualte the length / distance of the swipe
      */
      function caluculateDistance()
      {
        return Math.round(Math.sqrt(Math.pow(end.x - start.x,2) + Math.pow(end.y - start.y,2)));
      }
      
      /**
      * Calcualte the angle of the swipe
      */
      function caluculateAngle() 
      {
        var X = start.x-end.x;
        var Y = end.y-start.y;
        var r = Math.atan2(Y,X); //radians
        var angle = Math.round(r*180/Math.PI); //degrees
        
        //ensure value is positive
        if (angle < 0) 
          angle = 360 - Math.abs(angle);
          
        return angle;
      }
      
      /**
      * Calcualte the direction of the swipe
      * This will also call caluculateAngle to get the latest angle of swipe
      */
      function caluculateDirection() 
      {
        var angle = caluculateAngle();
        
        if ( (angle <= 45) && (angle >= 0) ) 
          return LEFT;
        
        else if ( (angle <= 360) && (angle >= 315) )
          return LEFT;
        
        else if ( (angle >= 135) && (angle <= 225) )
          return RIGHT;
        
        else if ( (angle > 45) && (angle < 135) )
          return DOWN;
        
        else
          return UP;
      }
      
      

      // Add gestures to all swipable areas if supported
      try
      {

        this.addEventListener(START_EV, touchStart, false);
        this.addEventListener(CANCEL_EV, touchCancel);
      }
      catch(e)
      {
        //touch not supported
      }
        
    });
  };

  
})(jQuery);

/* Copyright (c) 2009 Brandon Aaron (http://brandonaaron.net)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 *
 * Version: 3.0.2
 * 
 * Requires: 1.2.2+
 */
(function(c){var a=["DOMMouseScroll","mousewheel"];c.event.special.mousewheel={setup:function(){if(this.addEventListener){for(var d=a.length;d;){this.addEventListener(a[--d],b,false);}}else{this.onmousewheel=b;}},teardown:function(){if(this.removeEventListener){for(var d=a.length;d;){this.removeEventListener(a[--d],b,false);}}else{this.onmousewheel=null;}}};c.fn.extend({mousewheel:function(d){return d?this.bind("mousewheel",d):this.trigger("mousewheel");},unmousewheel:function(d){return this.unbind("mousewheel",d);}});function b(f){var d=[].slice.call(arguments,1),g=0,e=true;f=c.event.fix(f||window.event);f.type="mousewheel";if(f.wheelDelta){g=f.wheelDelta/120;}if(f.detail){g=-f.detail/3;}d.unshift(f,g);return c.event.handle.apply(this,d);}})(jQuery);