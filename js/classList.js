/*

classList.js

by Xiaoyuze ( https://github.com/xiaoyuze88/classList/ ) 
xiaoyuze88@gmail.com


Example:

classList.addClass(dom,className);
classList.removeClass(dom,className);
classList.toggleClass(dom,className);
classList.hasClass(dom,className);

    @param 
        dom : the dom element that you need to set class name
        className : the className that you want to use, 
                    you can also set multiple class like : "newClass newClass2 newClass3"
        
    For modern browser , use the HTML5 classList api , and for ie9- , use the oldfashion method
    You can also do sth like this:
    
    classList.addClass(dom,'newClass').removeClass(dom,'oldClass').toggle(dom,'newClass oldClass');
*/

(function(factory) {
    if (typeof define == "function" && define.amd) // AMD
        return define([], factory);
    else
        this.classList = factory();
})(function() {

    'use strict';

    var classList = {},
        d = document,
        hasClassList = 'classList' in d.documentElement,
        regNotWhite = /\S+/g,
        clazz;

    classList.addClass = function(ele, className) {
        if (!ele || !className || typeof className !== 'string') return;
        className = className.match(regNotWhite);
        var len = className.length;
        while (len--) {
            className[len] && !this.hasClass(ele, className[len]) &&
                (hasClassList ?
                    ele.classList.add(className[len]) :
                    (ele.className ? (ele.className += ' ' + className[len]) : ele.className = className[len])
                );
        }
        return this;
    }
    classList.removeClass = function(ele, className) {
        if (!ele || !className || typeof className !== 'string') return;
        if (hasClassList) {
            className = className.match(regNotWhite);
            var len = className.length;
            while (len--) {
                className[len] && this.hasClass(ele, className[len]) &&
                    ele.classList.remove(className[len]);
            }
        } else {
            ele.className = remove(className, ele.className);
        }
        return this;
    }
    classList.toggleClass = function(ele, className) {
        if (!ele || !className || typeof className !== 'string') return;
        className && (className = className.match(regNotWhite));
        var len = className.length;

        while (len--) {
            className[len] && this.hasClass(ele, className[len]) ?
                this.removeClass(ele, className[len]) :
                this.addClass(ele, className[len]);
        }
    }
    classList.hasClass = function(ele, className) {
        if (!ele || !className || typeof className !== 'string') return;
        return hasClassList ? ele.classList.contains(className) :
            new RegExp('\\b' + 　className + '\\b').test(ele.className);
    }

    function remove(value, oldClassName) {

        value && (value = value.match(regNotWhite));
        oldClassName = oldClassName ? ' ' + oldClassName + ' ' : '';
        // extracted from jQuery.remove
        if (oldClassName) {
            var index = 0;
            while ((clazz = value[index++])) {
                if (oldClassName.indexOf(' ' + clazz + ' ') > -1)
                    (oldClassName = oldClassName.replace(' ' + clazz + ' ', ' '));
            }
        }
        return String.prototype.trim ? oldClassName.trim() : trim(oldClassName);
    }

    function trim(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    return classList;

})
