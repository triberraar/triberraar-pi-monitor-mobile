'use strict';

angular.module('util',[

])
    .factory('socket', function (socketFactory) {
        return socketFactory();
    })
    .factory('_', function($window){
        return $window._;
    })
    .factory('moment', function($window){
        return $window.moment;
    })
    .factory('sizeConverter', function () {
        function _convert(kiloBytes,decimals) {
            if(kiloBytes === 0) return '0 KB';
            if(kiloBytes < 1) return kiloBytes.toFixed(2) + ' KB';
            var k = 1000;
            var dm = decimals + 1 || 3;
            var sizes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            var i = Math.floor(Math.log(kiloBytes) / Math.log(k));
            return (kiloBytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
        }

        function _convertToMb(kilobytes, postfix) {
            if(postfix) {
                return (kilobytes / 1000).toFixed(2) + ' MB';
            } else {
                return (kilobytes / 1000).toFixed(2);
            }
        }
        return {
            convert: _convert,
            convertToMb: _convertToMb
        };
    });