/**
 *   ISUX面试题
 *   实现一个简易地图demo，可拖拽，缩放，按需加载，查看坐标
 *
 *   该地图一共有3套简易坐标系：
 *
 *   1.  绝对坐标，该套坐标原点位于整幅地图的左上顶点，标尺为在zoomLevel=1下每个点距离原点的像素值
 *
 *   2.  相对坐标，该套坐标原点仍位于整幅地图的左上顶点，标尺为在当前比例尺下，每个点距离原点的像素值
 *
 *   3.  视区坐标，为视区左上角点的相对坐标
 *
 *   三类坐标系的传递格式都统一为: {x : 横坐标, y : 纵坐标} 这种格式
 *
 *
 *   该地图共有2级缩放，比例尺最大的为2级。
 *
 *   (带_前缀的为内部函数，不会暴露在原型链上，调用时必须用call/apply/bind等方法将上下文设在Map的实例上)
 *
 */

define(['mapApi', 'classList'], function(mapApi, classList) {

    'use strict';

    // 提出slice方法
    var slice = function(obj) {
        return Array.prototype.slice.call(obj);
    };

    // 获取一个元素
    function $(selector, context) {
        context = context || document;
        return context.querySelector.call(context, selector);
    }

    // 获取所有元素
    function $$(selector, context) {
        context = context || document;
        return context.querySelectorAll.call(context, selector);
    }

    // 为不支持requestAnimationFrame的浏览器（ie9）兼容
    ;(function() {
        var prefix = ['ms', 'moz', 'webkit', 'o'];
        for (var i = 0, l = prefix.length; i < l && !window.requestAnimationFrame; i++) {
            window.requestAnimationFrame = window[prefix[i] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[prefix[i] + 'CancelAnimationFrame'] || window[prefix[i] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback) {

                if (!isFunction(callback)) return;

                return window.setTimeout(function() {
                    callback();
                }, 100 / 6);
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    })();

    var Sys = function() {

        var ua = navigator.userAgent.toLowerCase(),
            isIE = ua.indexOf('msie') > -1,
            isTouch = "ontouchstart" in window,
            Events = {
                down: isTouch ? "touchstart" : "mousedown",
                up: isTouch ? "touchend" : "mouseup",
                move: isTouch ? "touchmove" : "mousemove"
            };

        return {
            isTouch: isTouch,
            Events: Events,
            isIE: isIE
        }
    }();





    /*------------------------------------*\    
                    #工具函数
    \*------------------------------------*/

    var Utils = function() {

        // 浏览器前缀
        var pre,
            transformName,
            transitionName,
            transformOrigin,
            transitionEnd;

        var i;
        (function(doc) {
            for (var styleList = [
                    ["transform", "", "transition", "transform-origin", 'transitionend'],
                    ["OTransform", "-o-", "OTransition", "OTransformOrigin", 'otransitionend'],
                    ["msTransform", "-ms-", "msTransition", "msTransformOrigin", 'transitionend'],
                    ["MozTransform", "-moz-", "MozTransition", "MozTransformOrigin", 'transitionend'],
                    ["WebkitTransform", "-webkit-", "WebkitTransition", "WebkitTransformOrigin", 'webkitTransitionEnd'],
                ], i = styleList.length; i--;) {
                //只要存在，就使用这一套，然后break
                if (doc.style[styleList[i][0]] !== void 0) {

                    transformName = styleList[i][0];
                    pre = styleList[i][1];
                    transformOrigin = styleList[i][3];
                    transitionName = doc.style[styleList[i][2]] === void 0 ? "" : styleList[i][2];
                    transitionEnd = styleList[i][4];
                    break;
                }
            }
        })(document.documentElement);

        // 是否支持translate3d
        var translate3d = (function() {

            var el = document.createElement('div');
            el.style[transformName] = 'translate3d(0,0,0)';

            return !!(el.style.cssText && el.style.cssText.indexOf('transform') > -1);
        })();

        function makeTransform(xAxis, yAxis, scale, rotate) {

            // 如果支持translate3d就使用3d启用硬件加速，否则用translate
            var style = translate3d ? "translate3d(" + xAxis + "px," + yAxis + "px,0px)" : "translate(" + xAxis + "px," + yAxis + "px)";

            // 如果有设置scale，添加scale
            if (scale !== void 0) {
                style += " scale(" + scale + ")";
            }

            if (rotate !== void 0) {
                style += " rotate(" + rotate + "rad)";
            }
            return style;
        }

        /**
         *   animate函数
         *   @param:
         *       handle(Function) : 动画执行的回调，回调接收一个参数percent（取值从0~1）
         *                          函数将会按传入的动画执行时间，定时传入一个当前动画执行百分比
         *                          动画操作的实际操作在该回调中执行
         *       duration(String/Number) : (可选)动画执行时间，默认为500(毫秒)
         *
         *   @return:
         *       (Object)返回一个对象，该对象拥有两个方法stop(),done()
         *           stop(Function): 调用该函数，可以停止当前动画的执行
         *
         *           done(Function): done方法接收一个参数callback,动画执行结束会会执行done方法中的回调
         *
         *
         *    如:
         *       现在要将一个元素的x值从500px变到1000px，执行完以后隐藏
         *
         *       var dom = document.querySelector('.something');
         *       animate(function(p){
         *           //p代表当前动画的百分比值/100(0~1),可以在此对动画曲线做处理
         *           //如正弦变化
         *           p = Math.sin(Math.PI * p / 2);
         *           dom.style.x = (500 + (1000 - 500) * p) + 'px';
         *       }).done(function(){
         *           dom.style.display = 'none';
         *       });
         */
        function animate(handle, duration) {

            if (!isFunction(handle)) return;

            duration = isNaN(duration) ? 500 : duration;

            var timer, current = 0,
                total = parseInt(duration) * 60 / 1000,
                onFinish = function() {};

            function nextFrame() {
                // debugger
                var p = current / total;
                if (p >= 1) {
                    handle(1);
                    setTimeout(function() {
                        onFinish();
                    }, 0);

                } else {
                    handle(p);
                    current += 1;
                    timer = requestAnimationFrame(nextFrame);
                }
            }
            nextFrame();
            return {
                stop: function() {
                    try {
                        cancelAnimationFrame(timer);
                    } catch (e) {}
                },
                done: function(callback) {
                    if (isFunction(callback)) {
                        onFinish = callback;
                    }
                }
            };
        }

        return {
            // 动画曲线
            easing: {
                inout: function(p) {
                    if ((p *= 2) < 1) return 0.5 * p * p * p;
                    return 0.5 * ((p -= 2) * p * p + 2);
                },
                easeOutBounce: function(pos) {
                    if ((pos) < (1 / 2.75)) {
                        return (7.5625 * pos * pos);
                    } else if (pos < (2 / 2.75)) {
                        return (7.5625 * (pos -= (1.5 / 2.75)) * pos + 0.75);
                    } else if (pos < (2.5 / 2.75)) {
                        return (7.5625 * (pos -= (2.25 / 2.75)) * pos + 0.9375);
                    } else {
                        return (7.5625 * (pos -= (2.625 / 2.75)) * pos + 0.984375);
                    }
                },
            },
            /**
             *   将事件代理给父容器
             *
             *   @param :
             *       pNode(HTMLElement): 父元素
             *       type(String): 事件名
             *       className(String): 需要代理的子元素类名
             *       fn(Function): 给事件绑定的回调
             *
             */
            delegateParent: function(pNode, type, className, fn) {

                if (!isFunction(fn)) return;

                pNode.addEventListener(type, function(e) {

                    var stopped, finded, context,
                        parent = e.target;
                    // console.log(e.target);
                    // debugger
                    if (classList.hasClass(e.target, className)) {
                        context = e.target;
                        // console.log(context);
                        fn.call(context, e);
                        return;
                    }

                    while (!((stopped = pNode == parent) ||
                            (finded = classList.hasClass(parent, className))
                        )) {
                        parent = parent.parentNode;
                    }

                    if (finded) {
                        context = parent;
                        fn.call(context, e);
                    }
                });
            },
            // 将fn的上下文设置在context上，其余参数全部作为fn的参数传给fn
            delegate: function(fn, context) {
                context = context || window;
                // 获得所有参数，转为数组
                var argumentList = slice(arguments);
                // 从index==0开始干掉俩，也就是去掉target,delegateFunction
                argumentList.splice(0, 2);

                return function() {
                    fn.apply(context,
                        // 如果argumentList还有元素，则将其作为参数apply到target，如果没有，将原本的俩参数作为参数apply
                        argumentList.length ? argumentList : slice(arguments)
                    )
                }
            },
            animate: animate,
            transform: function(dom, xAxis, yAxis, scale, rotate) {
                dom.style[transformName] = makeTransform(xAxis, yAxis, scale, rotate);
            },
            transformName: transformName,
            transitionName: transitionName,
            transitionEnd: transitionEnd,
            offset: function(dom) {
                if (!isFunction(dom.getBoundingClientRect)) {
                    throw new Error("您可能正使用低版本浏览器，请使用IE9及以上浏览器访问！");
                }

                var obj = dom.getBoundingClientRect()

                return {
                    left: obj.left + window.pageXOffset,
                    top: obj.top + window.pageYOffset,
                    width: Math.round(obj.width),
                    height: Math.round(obj.height)
                }
            },
            getWidth: function() {
                return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            },
            /**
             *   debounce函数，wait延时后执行func回调，wait时间内再次调用将重置计时器，重新开始wait毫秒延时，
             *   直到计时器到达wait时间才执行回调
             *
             *   @param:
             *       func(Function): 需要执行的回调
             *       wait(Number)  : delay执行的时间
             *       context : 回调执行的上下文环境，默认为全局环境
             */
            debounce: function(func, wait, context) {
                var timeout;
                return function() {
                    context = context || this;
                    var args = arguments,
                        later = function() {
                            timeout = null;
                            func.apply(context, args);
                        };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }
        }
    }();

    /**
     *    Map构造函数
     */
    function Map(options) {

        // 初始化选项
        if (!_initOptions.call(this, options)) {
            throw new Error('Illegal options!');
        }

        // 初始化地图
        _initMap.call(this);

        // 初始化事件
        _initEvent.call(this);
    }

    // 初始化选项，如果返回false,表示参数不合法，否则返回true
    function _initOptions(options) {

        if (!options) options = {};

        /**
         *   默认选项
         */
        var defaultOptions = {
            container: null,
            // 初始缩放比，默认为1
            zoomLevel: 1,
            // 最大放大几倍，默认为2
            maxLevel: 2,
            // 初始视图中间点的绝对坐标
            centerPoint: {
                x: 470,
                y: 600
            },

            /**
             *   默认视窗右下角坐标，左上角为0,0
             */
            viewPort: {
                x: 940,
                y: 600
            },
            // 图块大小，默认256px
            mapPieceSize: {
                x: 256,
                y: 256
            }
        }

        /**
         *   初始化选项
         */
        for (var i in defaultOptions) {
            if (defaultOptions.hasOwnProperty(i)) {
                if (i in options) {
                    this[i] = options[i];
                } else {
                    this[i] = defaultOptions[i];
                }
            }
        }
        // 过滤不合法参数
        if (!this.container) return false;

        this.mapWrapper = $(this.container);
        this.mapsList = {};
        this.lastPosition = {
            x: 0,
            y: 0
        };
        return true;
    }

    // 初始化地图
    function _initMap() {

        // 插入初始化地图的html
        this.mapWrapper.innerHTML = '<div class="view-container"><div class="map-container"></div><div class="zoom-pluggin"><div class="button-container js-zoomIn"><span class="zoom-button">+</span></div><div class="button-container js-zoomOut"><span class="zoom-button">-</span></div></div>';

        // 等待dom树构建
        pauseImmediatly(function() {

            this.mapContainer = $('.map-container', this.mapWrapper);

            // 由centerPosition计算当前viewPort相对坐标
            var viewPortPos = this.centerPointToViewPort(this.centerPoint, this.zoomLevel);

            // 移至初始视觉点
            Utils.transform(this.mapContainer, -viewPortPos.x, -viewPortPos.y);
            this.lastPosition.x = -viewPortPos.x;
            this.lastPosition.y = -viewPortPos.y;

            // 根据当前viewPort设置地图块
            this.resetMapByViewPort(viewPortPos);
        }, this);
    }

    /**
     *   初始化事件
     *
     *   为每张图片设置一个绝对的名称，由其绝对坐标所标识
     *   设置，获取viewport所指向的绝对坐标，并生成对应所需的图片以及其位置，并插入dom
     *   根据视窗的绝对坐标范围，找到超出视窗的地图块，并移出视窗
     */
    function _initEvent() {

            var viewContainer = $(".view-container"),
                zoomIn = $(".js-zoomIn", this.mapContainer),
                zoomOut = $(".js-zoomOut", this.mapContainer),

                // 该函数内所有self指向map的实例
                self = this;

            // fix: cursor:url写在css中时，IE上cursor属性的url格式与其他浏览器不一致，用js设置
            viewContainer.style.cursor = 'url(images/openhand.cur),default';

            // 获取容器的位移
            this.offset = Utils.offset(viewContainer);

            // fix: 在IE和FireFox中无法通过设置user-drag: none来阻止用户拖动图片，
            // 在拖动地图时会出现无法拖动地图，而是拖动图片，故用js来阻止
            Utils.delegateParent(viewContainer, 'dragstart', 'map-block', function(e) {
                e.preventDefault();
            });

            // 缩放按钮的处理事件
            zoomIn.addEventListener(Sys.Events.down, function(e) {
                if (classList.hasClass(this, 'disabled')) {
                    e.preventDefault();
                    return;
                }
                self.zoomIn();
            });

            // 缩放按钮的处理事件
            zoomOut.addEventListener(Sys.Events.down, function(e) {
                if (classList.hasClass(this, 'disabled')) {
                    e.preventDefault();
                    return;
                }
                self.zoomOut();
            });

            // 缩放组件样式控制
            _handleZoomerStyle.call(this);

            // 绑定点击在marker上的事件，事件代理给viewContainer
            Utils.delegateParent(viewContainer, 'click', 'marker-point', function(e) {

                // 拿到写在marker的dom上的绝对坐标
                var absPostion = this.getAttribute('data-position');

                absPostion = absPostion && absPostion.split(",");

                if (!absPostion) return;

                absPostion = {
                    x: absPostion[0],
                    y: absPostion[1]
                };

                // 将该点设为中心点，即它的绝对坐标
                // 换算为viewPort的相对坐标，设置position
                self.setCenter(absPostion);
                self.addMarkerInfo(absPostion);
            });

            // 绑定debounce了的resize事件
            window.addEventListener("resize", Utils.debounce(function() {
                // resize停止后的500毫秒才进行resize的操作
                this.offset = Utils.offset(viewContainer);
            }, 500).bind(this));


            // 绑定鼠标按下后的事件
            viewContainer.addEventListener(Sys.Events.down, function(e) {

                var timer, ticking,
                    startDown = Date.now(),
                    isOnMap = classList.hasClass(e.target, 'map-block'),
                    // isOnMarker = classList.hasClass(e.target, 'marker-point'),

                    // 将move回调中的声明提出回调
                    moveX, moveY, difX, difY, moveHandleViewPort,
                    // 鼠标按下时的视区坐标
                    downX = e.pageX - self.offset.left,
                    downY = e.pageY - self.offset.top,

                    // 鼠标按下时的相对坐标
                    x = downX - self.lastPosition.x,
                    y = downY - self.lastPosition.y,

                    // 拖动的事件的回调，绑定上下文环境为map实例
                    delegateMoveHandler = Utils.delegate(moveHandle, self);

                viewContainer.style.cursor = 'url(images/closedhand.cur),default';

                classList.removeClass($(".marker-info", this.mapContainer), 'active');

                document.addEventListener(Sys.Events.move, delegateMoveHandler);

                document.addEventListener(Sys.Events.up, function _tempHandler(e) {

                    // 松开鼠标时的视区坐标
                    var upX = e.pageX - self.offset.left,
                        upY = e.pageY - self.offset.top;

                    // 判断是否按在地图上
                    // 是按在地图块上，且按下与抬起位移小于30px、时间间隔小于300ms，视为这是一个点击，添加marker
                    if (isOnMap && Math.abs(upX - downX) < 30 && Math.abs(upY - downY) < 30 && (Date.now() - startDown) < 300) {

                        // 传入点击的相对坐标，打点
                        self.addMarker({
                            x: upX - self.lastPosition.x,
                            y: upY - self.lastPosition.y
                        });
                    }

                    // 移除各种事件
                    viewContainer.style.cursor = 'url(images/openhand.cur),default';
                    this.removeEventListener(Sys.Events.up, _tempHandler);
                    this.removeEventListener(Sys.Events.move, delegateMoveHandler);
                });

                // 拖动事件回调实体
                function moveHandle(event) {

                    // 当前鼠标移动的视区坐标
                    // var moveX = event.pageX - this.offset.left,
                    //     moveY = event.pageY - this.offset.top,

                    //     // 当前鼠标移动的相对坐标
                    //     difX = (moveX - x),
                    //     difY = (moveY - y);

                    // 将move事件回调中的所有变量声明移出回调，减少短周期局部变量的声明开销
                    // 当前鼠标移动的视区坐标
                    moveX = event.pageX - this.offset.left;
                    moveY = event.pageY - this.offset.top;

                    // 当前鼠标移动的相对坐标
                    difX = (moveX - x);
                    difY = (moveY - y);

                    // 地图被拖动
                    Utils.transform(self.mapContainer, difX, difY);

                    this.lastPosition.x = difX;
                    this.lastPosition.y = difY;

                    // 调起检查视区判断地图块的更新情况
                    requestUpdateViewPort();
                }

                function requestUpdateViewPort() {
                    if (!ticking) {
                        ticking = true;
                        // 让浏览器决定何时执行更新
                        // 避免一帧内多次触发回调
                        requestAnimationFrame(updateViewPort);
                    }
                }

                function updateViewPort() {
                    ticking = false;

                    // 声明提出
                    // 拿到当前视区的相对坐标
                    moveHandleViewPort = {
                        x: -self.lastPosition.x,
                        y: -self.lastPosition.y
                    };

                    throttling();

                    // REMOVE--设置500毫秒的检查间隔，设置500ms检查间隔将影响流畅性
                    // 更具当前视区的相对坐标，判断是否需要更新图块
                    function throttling() {
                        clearTimeout(timer);
                        callCheck();
                        // 鼠标拖动结束的250ms后，再check一遍，修正可能因为拖动太快而导致的位置误差
                        timer = setTimeout(function() {
                            callCheck();
                        }, 250);

                        // 通过viewPort判断地图块的更新情况
                        function callCheck() {
                            self.refreshMapByViewPort(moveHandleViewPort);
                        }
                    }
                }

            }); // 处理down事件结束

        } // _initEvent函数结束

    // 对外暴露原型链，方便拓展
    Map.prototype.extend = function(nameSpace, fn) {

        if (!isFunction(fn)) return;

        Map.prototype[nameSpace] = function() {
            var argus = slice(arguments);
            fn.apply(window, arguments);
        }
    }

    // 传入该点的绝对坐标，展示其各种坐标
    Map.prototype.addMarkerInfo = function(absPosition) {

        // 浮层展示的位置，由于该点被设为中心点，首先转换为viewPort坐标
        var showPosition = this.centerPointToViewPort(absPosition, this.zoomLevel),

            relPosition = this.toRelatePosition(absPosition, this.zoomLevel);

        var markerInfo = $(".marker-info", this.mapContainer);
        // 换算浮层的位置
        markerInfo.style.cssText = "top: " + (showPosition.y + this.viewPort.y / 2 - 110) + "px; left:" + (showPosition.x + this.viewPort.x / 2 - (90 - 10 * (Math.pow(2, this.zoomLevel - 1) - 1))) + "px;";
        classList.addClass(markerInfo, 'active');

        $(".js-abspos", markerInfo).innerHTML = '绝对坐标  x : ' + absPosition.x + '; y : ' + absPosition.y;
        $(".js-relpos", markerInfo).innerHTML = '相对坐标  x : ' + relPosition.x + '; y : ' + relPosition.y;
    }

    // 传入该点的相对坐标，在地图上打一个icon点
    Map.prototype.addMarker = function(relPos) {

        if (undefined === this.markerList) this.markerList = [];

        // 因为只有两级放大，marker的大小用一个定值简化，简单的1、2倍缩放
        var zoomRate = this.maxLevel - this.zoomLevel + 1,
            defaultSize = 40 / zoomRate,
            // 鼠标点击时获得的是左上角的位置，实际位置需减去一半的marker大小
            offsetSize = defaultSize / 2;

        // 实际坐标的相对坐标，减去了一半的marker大小
        var offsetRelPos = {
            x: relPos.x - offsetSize,
            y: relPos.y - offsetSize
        };

        // 换算成绝对坐标
        var absPostion = this.toAbsPosition(this.zoomLevel, offsetRelPos);

        // 记录当前点的绝对坐标
        this.markerList.push(absPostion);

        appendChild(this.mapContainer, '<span style="top:' + offsetRelPos.y + 'px;left:' + offsetRelPos.x + 'px;width:' + defaultSize + 'px;height:' + defaultSize + 'px;" class="marker-point" data-position="' + absPostion.x + ',' + absPostion.y + '"></span>');
    }





    /*------------------------------------*\    
                #地图操作类方法
    \*------------------------------------*/

    // 根据当前viewPort重置地图
    Map.prototype.resetMapByViewPort = function(viewPort) {
        // 根据viewPort判断首屏需要加载的图块列表
        var needMaps = _getMapsFromViewport.call(this, viewPort);

        this.mapsList = needMaps;

        // 由api获取图片地址
        needMaps = mapApi.getMapFromList(needMaps, this.zoomLevel);

        // 由图片地址列表拼出html字符串
        var html = _makeMapsHtml.call(this, needMaps);

        html += '<div class="marker-info"><div class="info-container"><p class="info-inline js-abspos"></p><p class="info-inline js-relpos"></p></div><div class="info-triangle-container"> <span class="info-triangle"></span></div></div>';

        // 检查是否有marker，如果有，插入html字符串中
        if (undefined !== this.markerList && this.markerList.length > 0) {
            html += _refreshMarker.call(this);
        }

        // 更新地图
        this.mapContainer.innerHTML = html;
    }

    // 传入当前viewPort相对坐标，更新地图
    Map.prototype.refreshMapByViewPort = function(viewPort) {
        // 获得当前在视区内的图块列表
        var nowInView = _getMapsFromViewport.call(this, viewPort);

        // 计算当前视区内图块与当前展示的图块列表
        var diffList = _difference(this.mapsList, nowInView);

        // 如果两个数组有差值，更新地图
        if (diffList) {
            _refreshMap.call(this, diffList);
            this.mapsList = nowInView;
        }
    }

    // 传入一个绝对坐标，将地图移动至以该为地图中心点的位置
    Map.prototype.setCenter = function(centerPoint) {

        var self = this,
            // 首先由中心点坐标计算得viewPort的相对坐标
            viewPort = this.centerPointToViewPort(centerPoint, this.zoomLevel),
            newLastPosition = {
                x: -viewPort.x,
                y: -viewPort.y
            },
            oldLastPosition = {
                x: this.lastPosition.x,
                y: this.lastPosition.y
            };

        // 过渡动画效果
        Utils.animate(function(p) {

                // 设置渐变曲线
                p = Utils.easing.inout(p);
                self.lastPosition.x = oldLastPosition.x + (newLastPosition.x - oldLastPosition.x) * p;
                self.lastPosition.y = oldLastPosition.y + (newLastPosition.y - oldLastPosition.y) * p;
                Utils.transform(self.mapContainer, self.lastPosition.x, self.lastPosition.y);
            }, 500)
            .done(function() {
                // 动画结束后，根据新的位置更新地图块
                self.refreshMapByViewPort({
                    x: -self.lastPosition.x,
                    y: -self.lastPosition.y
                });
            });
    }

    // 减小缩放级别zoomLevel
    // 缩放时，保持中心点不变
    Map.prototype.zoomIn = function() {
        var level = this.zoomLevel + 1;

        if (level > this.maxLevel) return;


        // viewPort与lastPosition的关系为负数关系
        var currentViewPort = {
            x: -this.lastPosition.x,
            y: -this.lastPosition.y
        }

        var centerPoint = this.getCenterPosition(this.zoomLevel, currentViewPort);

        this.zoomLevel = level;

        this.changeLevel(centerPoint, level);

        _handleZoomerStyle.call(this, false);
    }

    // 增大缩放级别zoomLevel
    Map.prototype.zoomOut = function() {

        var level = this.zoomLevel - 1;

        if (level <= 0) return;

        // viewPort与lastPosition的关系为负数关系
        var currentViewPort = {
            x: -this.lastPosition.x,
            y: -this.lastPosition.y
        }

        var centerPoint = this.getCenterPosition(this.zoomLevel, currentViewPort);

        this.zoomLevel = level;

        this.changeLevel(centerPoint, level);

        _handleZoomerStyle.call(this, true);
    }

    // 改变缩放级别
    // 输入视觉中心坐标（绝对坐标）以及需要变换到的级别
    Map.prototype.changeLevel = function(centerPoint, toLevel) {

        var viewPort = this.centerPointToViewPort(centerPoint, toLevel);

        Utils.transform(this.mapContainer, -viewPort.x, -viewPort.y);

        this.lastPosition.x = -viewPort.x;
        this.lastPosition.y = -viewPort.y

        this.resetMapByViewPort(viewPort);
    }





    /*------------------------------------*\    
                #坐标换算类方法
    \*------------------------------------*/

    // 切换不同level下的相对坐标
    Map.prototype.countPosition = function(currentLevel, fromPosition, toLevel) {

        var difLevel = toLevel - currentLevel;
        var rate = Math.pow(2, difLevel);
        return {
            x: fromPosition.x * rate,
            y: fromPosition.y * rate
        }
    }

    // 将任意level下的相对坐标转换为绝对坐标
    Map.prototype.toAbsPosition = function(currentLevel, fromPosition) {
        return this.countPosition(currentLevel, fromPosition, 1);
    }

    // 由绝对坐标转换为指定level的相对坐标
    Map.prototype.toRelatePosition = function(absPosition, toLevel) {
        return this.countPosition(1, absPosition, toLevel);
    }

    // 根据当前level的viewPort原点的相对坐标，获得中心点的绝对坐标
    Map.prototype.getCenterPosition = function(currentLevel, fromPosition) {

        var centerPoint = {
            x: fromPosition.x + this.viewPort.x / 2,
            y: fromPosition.y + this.viewPort.y / 2
        };
        // 先将viewPort坐标转为绝对坐标，再通过viewPort大小计算中心点
        var absPos = this.toAbsPosition(currentLevel, centerPoint);

        // viewPort左上角点位移一半的视区大小得到中心点绝对坐标
        return absPos;
    }

    // getCenterPosition的反方法，由中心坐标（绝对坐标）换算为当前level下viewPort的相对坐标
    Map.prototype.centerPointToViewPort = function(centerPoint, toLevel) {
        // 先计算中心点的相对坐标，然后返回指定level的viewPort相对坐标
        var viewPortPos = this.toRelatePosition(centerPoint, toLevel);

        return {
            x: viewPortPos.x - this.viewPort.x / 2,
            y: viewPortPos.y - this.viewPort.y / 2
        }
    }







    /*------------------------------------*\    
                   #内部函数
        注意，调用时注意将上下文设置为Map的实例
    \*------------------------------------*/

    // 判断是否达到zoomIn/out上限，处理对应样式
    function _handleZoomerStyle(isZoomingOut) {
        var zoomButtonList = $$(".zoom-pluggin .button-container", this.mapWrapper);

        // 最小值，无法再zoomOut
        if (this.zoomLevel == 1) {
            toggleZoomer(zoomButtonList[1]);
        }
        // 最大值，无法zoomIn
        else if (this.zoomLevel == this.maxLevel) {
            toggleZoomer(zoomButtonList[0]);
        }

        if (undefined == isZoomingOut) return;

        // 正在zoomOut,且zoomLevel==maxLevel - 1,说明上一个zoomIn被disabled了
        if (isZoomingOut === true && this.zoomLevel == this.maxLevel - 1) {
            toggleZoomer(zoomButtonList[0]);
        }
        // 正在zoomIn,且zoomLevel==2,说明上一个zoomOut被disabled了
        else if (isZoomingOut === false && this.zoomLevel == 2) {
            toggleZoomer(zoomButtonList[1]);
        }

        function toggleZoomer(dom) {
            classList.toggleClass(dom, 'disabled');
        }

    }

    // 切换缩放比时，根据markerList，重置markder点，生成html并返回
    function _refreshMarker() {

        if (!this.markerList.length) return '';

        var zoomRate = this.maxLevel - this.zoomLevel + 1;

        var defaultSize = 40 / zoomRate;

        var offsetSize = defaultSize / 2;

        var self = this;

        // markList存的是绝对坐标
        return this.markerList.reduce(function(pre, next) {
            // 全部转换为相对坐标，拼接字符串并累加返回
            var nowPosition = self.toRelatePosition({
                x: next.x,
                y: next.y
            }, self.zoomLevel);
            return pre + '<span style="top:' + nowPosition.y + 'px;left:' + nowPosition.x + 'px;width:' + defaultSize + 'px;height:' + defaultSize + 'px;" class="marker-point" data-position="' + next.x + ',' + next.y + '"></span>';
        }, '');
    }

    // 传入当前viewPort顶点的绝对坐标，返回当前viewPort下所需要的图块index的对象
    // @return:
    //      needArray(Object) : {
    //          需要图块的编号: true   这种数据结构 
    //          index : true
    //      }
    function _getMapsFromViewport(viewPort) {

        var zoom = this.zoomLevel;

        var xAxis = getMapsIndex.call(this, viewPort.x + this.viewPort.x, this.mapPieceSize.x, 'x');

        var yAxis = getMapsIndex.call(this, viewPort.y + this.viewPort.y, this.mapPieceSize.y, 'y');

        var needArray = {};

        for (var i = 0, l = xAxis.length; i < l; i++) {
            for (var j = 0, len = yAxis.length; j < len; j++) {
                // debugger
                needArray[makeMapsName(xAxis[i], yAxis[j])] = true;
            }
        }

        return needArray;

        // 根据viewPort右/下边界计算当前所需要图块的index
        function getMapsIndex(total, each, axis) {

            var minBounder = total - this.viewPort[axis];

            var res = [],
                length = Math.ceil(total / each);

            for (var i = 0; i < length; i++) {
                // console.log('position' + i*this.mapPieceSize[axis])
                if ((i + 1) * this.mapPieceSize[axis] < minBounder) continue;
                res.push(i + 1);
            }
            return res;
        }

        // 根据x，y的index拼接图块名
        function makeMapsName(xIndex, yIndex) {
            return yIndex + '_' + xIndex;
        }
    }



    // 拼接地图块html
    function _makeMapsHtml(mapsList) {
        var res = '';

        if (typeOf(mapsList, 'object')) {
            // for (var i = 0, l = mapsList.length; i < l; i++) {
            for (var i in mapsList) {
                var positionIndex = i.split("_");
                res += '<img draggable="false" data-index="' + i + '" src="' + mapsList[i] + '" class="map-block" style="top: ' + (positionIndex[0] - 1) * this.mapPieceSize.x + 'px; left: ' + (positionIndex[1] - 1) * this.mapPieceSize.y + 'px;">'
            }
        }
        return res;
    }


    /**
     *   code extracted from underscroe
     *
     *   返回一个存在containsArr，且不存在filterArr中的数组
     *
     *   @param : containsArr(Array) :: 存在于这个数组
     *            filterArr(Array)   :: 不存在于这个数组
     *   @return :
     *      diffList(Object) 存在于containsArr且不存在filterArr的数组
     */
    function _difference(containsArr, filterArr) {
        var inList = [],
            outList = [];

        for (var i in filterArr) {
            if (!containsArr[i]) inList[i] = true;
        }
        for (var j in containsArr) {
            if (!filterArr[j]) outList[j] = true;
        }

        if (isEmpty(inList) && isEmpty(outList)) return null;

        return {
            'in': inList,
            out: outList
        }
    };

    // 根据diffList更新地图
    function _refreshMap(diffList) {
        var inArr = diffList['in'];
        var outArr = diffList['out'];
        var needMaps;

        if (inArr) {
            needMaps = mapApi.getMapFromList(inArr, this.zoomLevel);
            // return;
            var html = _makeMapsHtml.call(this, needMaps);
            if (html) {
                // console.log(makeNodes(html));
                appendChild(this.mapContainer, html);
                // .appendChild(makeNodes(html));
            }
        }

        if (outArr) {
            var imgList = $$("img", this.mapContainer);

            for (var i in outArr) {
                var removeImg = findIndex(imgList, i);
                // console.log(removeImg);
                if (removeImg) {
                    remove(removeImg);
                }
            }
        }

        function findIndex(list, index) {
            for (var i = 0, l = list.length; i < l; i++) {
                if (list[i].getAttribute('data-index') == index) {
                    return list[i];
                }
            }
            return null;
        }
    }





    /*------------------------------------*\    
                    #公用函数
    \*------------------------------------*/

    // 包装好了setTimeout 0函数，
    function pauseImmediatly(callback, context) {
        var argus;
        // 如果有三个及以上的参数，全部作为参数传入回调
        if (arguments.length > 2) {
            argus = slice(arguments);
            argus.splice(0, 2);
        }

        // 设置上下文
        context = context || window;
        setTimeout(function() {
            callback.apply(context, argus);
        }, 0);
    }

    // 检查一个对象是否为空
    function isEmpty(obj) {
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    }

    /**
     *   检查对象真实类型
     *
     *   @param :
     *       obj(Anything): 待检查类型的变量
     *       type(String) : 待校验的类型，小写，如'array'
     *
     *   @retrun :
     *       (Boolean) 是否是该类型
     *
     *   例： typeOf([],'array') -->  true
     *
     */
    function typeOf(obj, type) {
        if (!obj || !type) return false;

        return Object.prototype.toString.call(obj).toLowerCase().replace('[object ', '').indexOf(type) > -1;
    }

    // 将html代码append到dom中
    function appendChild(dom, html) {

        var newDoms;
        if (typeof html === 'string') {
            newDoms = makeNodes(html);
            for (var i = 0, l = newDoms.length; i < l; i++) {
                dom.appendChild(newDoms[i]);
            }
        }
        // 如果是dom，直接插入
        else if (isElement(html)) {
            dom.appendChild(html)
        }
    }

    /**
     *   将html代码转换为DOM节点
     *
     *   @return Array : 由dom组成的数组
     *
     */
    function makeNodes(html) {

        var dom, nodes, container

        // 利用原生innerHTML生成dom，首先创建一个真实的div容器
        container = document.createElement("div");

        // 插入html字符串
        container.innerHTML = '' + html

        // 依次从容器中removeChild，如果能够移除，会在map的回调中返回该dom，最后生成新dom数组
        dom = slice(container.childNodes).map(function(o, i) {
            return container.removeChild(o);
        });

        return dom;
    }

    function isFunction(fn) {
        return typeof fn === 'function';
    }

    //是否是一个DOM
    function isElement(o) {
        return (
            typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
            o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
        );
    }

    // ie下不支持element.remove方法
    function remove(ele) {
        if (isFunction(ele.remove)) {
            ele.remove();
        } else {
            ele.parentNode.removeChild(ele);
        }
    }

    return Map;
});
