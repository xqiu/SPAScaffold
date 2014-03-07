$(function () {
    $('#mainDiv').split({ orientation: 'vertical', limit: 100, position: '50%' });
    $('#leftPane').split({ orientation: 'horizontal', limit: 100 });
    $('#rightPane').split({ orientation: 'horizontal', limit: 100 });
    
    $(window).resize(function () {
        $('#rightPane').width($('#mainDiv').width() - $('#leftPane').width() );
    });
});
