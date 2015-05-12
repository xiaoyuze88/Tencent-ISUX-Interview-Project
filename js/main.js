require.config({
    'baseUrl' : './js',
    paths: {
        'Map' : 'Map'
    }
});


require(['Map'],function(Map) {
    var isOldIE = (function(){
            var ua = navigator.userAgent.toLowerCase(),
                matchReg = /msie\s(\d\.\d)/,
                match = ua.match(matchReg);
            return !!(match && match[1] < 9);
        })();
    
    
    if(!isOldIE) {
        var map = new Map({
            container : '.wrapper',
            // 初始缩放级别
            zoomLevel: 2,
            // 中心点坐标(绝对坐标)
            centerPoint : {
                x:512,
                y:384
                // x : 1024,
                // y : 768
            }
        });
    }
    else {
        alert("您的浏览器版本过低！请使用IE 9.0 及移上版本的浏览器！");
    }

});