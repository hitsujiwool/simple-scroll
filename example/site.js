$(function() {
  var scrollable = $('#example1 .target').scrollable({'visibleHeight': 400}),
      api = scrollable.scrollable.api(0);
  api.on('scroll', function() {
    console.log(this.scrollTop());
  });
  
  $('#btn').bind('click', function() {
      api.scrollTo('#anchor');
  });
});
