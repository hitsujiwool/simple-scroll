$(function() {
  var scrollable = $('#example1 .target').scrollable({'visibleHeight': 400});
  scrollable.scrollable.api(0)
  .on('start', function() {
  })
  .on('scroll', function() {
    console.log('scroll');
  })
  .on('stop', function() {
  });
});
