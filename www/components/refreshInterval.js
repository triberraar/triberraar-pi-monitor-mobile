'use strict';

angular.module('refreshInterval', [])
.factory('refreshIntervalService', function() {
        var _refreshIntervals = [
            {caption: 'second', value: 1000},
            {caption: '5 seconds', value: 5000},
            {caption: '15 seconds', value: 15000},
            {caption: '30 seconds', value: 30000},
            {caption: 'minute', value: 60000},
            {caption: '5 minutes', value: 300000},
            {caption: '15 minutes', value: 900000}
        ];
        return {
            getAll : function() { return _refreshIntervals; },
            getDefault: function() { return _refreshIntervals[1]; }
        };
    });