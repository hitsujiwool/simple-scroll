$(function() {
  var $target = $(location.hash.match(/^#\!\/(example[0-9]+)$/) ? '#' + RegExp.$1 : '#example1')
    , api1 = $('#example1 .target').scrollable({'visibleHeight': 150}).data('api')
    , api2 = $('#example2 .target').scrollable({'visibleHeight': $(window).height() - offset}).data('api');
  $('.box').not($target).fadeTo(0, 0).css('z-index', 0);

  var $menu = $('#menu li');
  $menu.click(function(e) {
    var i = $menu.index($(this))
      , $target = $('.box').eq($menu.index($(this)));
    $('.box').not($target).fadeTo(500, 0).css('z-index', 0);
    $target.fadeTo(500, 1).css('z-index', 100);
    location.hash = '#!/example' + (i + 1);
  });

  $('#scrollTo').click(function() {
    api1.scrollTo('#anchor');
  });

  var offset = $('#example2 h2').prop('offsetHeight') + $('body').prop('offsetHeight');
  $(window).bind('resize', function() {
    api2.reset({'visibleHeight': $(window).height() - offset});
  });

});
