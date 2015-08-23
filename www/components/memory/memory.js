'use strict';

angular.module('memory', [
    'btford.socket-io',
    'ui.router',
    'chart.js',
    'angular-growl',
    'util',
    'refreshInterval',
    'dashboard'
]).config(function ($stateProvider) {
    $stateProvider
        .state('memory', {
            url:'/memory',
            views: {
                menuContent: {
                    templateUrl: 'components/memory/memory-ionic.html'
                }
            }
        })
        .state('memory.history', {
            url:'/history',
            templateUrl: 'components/memory/memory-history.html'
        });
})
    .factory('memoryDataService', function($timeout, socket, moment, growl, refreshIntervalService){
        var _refreshInterval;
        var _memoryData = [];
        var _timeout;
        var _paused = false;

        var _setRefreshInterval = function(refreshInterval) {
            _refreshInterval = refreshInterval;
            if(_timeout) {
                $timeout.cancel(_timeout);
                if(!_paused) {
                    _timeout = $timeout(requery, _refreshInterval.value);
                }
            }
        };

        var _getData = function(numberOfLatestEntries) {
            if(!numberOfLatestEntries || _memoryData.length <= numberOfLatestEntries) {
                return _memoryData;
            }
            return _memoryData.slice(_memoryData.length - numberOfLatestEntries);
        };

        var _pause = function() {
            _paused = true;
            if(_timeout) {
                $timeout.cancel(_timeout);
            }
        };

        var _play = function() {
            _paused = false;
            requery();
        };

        function requery() {
            socket.emit('memory');
        }

        socket.on('memory', function(data){
            if(data.error) {
                console.error(data.error.message + ': ' + JSON.stringify(data.error.error));
                growl.error(data.error.message);
            } else {
                _memoryData.push({time: moment(), data: data.content});
                if (_memoryData.length > 100) {
                    _memoryData = _memoryData.slice(_memoryData.length - 100);
                }
            }
            if(!_paused) {
                _timeout = $timeout(requery, _refreshInterval.value);
            }
        });

        var _init = function() {
            _refreshInterval = refreshIntervalService.getDefault();
            requery();
        };

        return {
            setRefreshInterval : _setRefreshInterval,
            getRefreshInterval: function() { return _refreshInterval; },
            getLatest: function() { return _memoryData[_memoryData.length -1];},
            getData: _getData,
            pause: _pause,
            play: _play,
            init: _init
        };
    })
    .controller('MemoryController', function($state, sizeConverter, favoriteService, memoryDataService, refreshIntervalService){
        var _this = this;

        function init() {
            _this.refreshIntervals = refreshIntervalService.getAll();
            _this.refreshInterval = memoryDataService.getRefreshInterval();
        }

        _this.refreshIntervalChanged = function() {
            memoryDataService.setRefreshInterval(_this.refreshInterval);
        };

        _this.getLatest = memoryDataService.getLatest;

        _this.play = memoryDataService.play;
        _this.pause = memoryDataService.pause;

        _this.navigateToHistoryShown = function() {
            return $state.$current.name !== 'memory.history';
        };

        _this.convertBytesToHumanReadable = function(value) {
            if(value) {
                return sizeConverter.convertToMb(value, true);
            }
        };

        _this.getPercentage = function(total, free) {
            return (Math.floor((free / total) * 10000) / 100).toFixed(2);
        };

        _this.isFavorite = function() {
            return favoriteService.isFavorite({id: 'memory', templateUrl: '/components/memory/memory.html'});
        };

        _this.toggleFavorite = function() {
            favoriteService.toggleFavorite({id: 'memory', templateUrl: '/components/memory/memory.html'});
        };

        init();
    })
    .controller('MemoryHistoryController', function($scope, _, moment, sizeConverter, memoryDataService) {
        var _this = this;

        function init() {
            _this.labels = [];
            _this.data = [
                []
            ];
            _this.series = ['Total (MB)', 'Used (MB)', 'Free (MB)'];
            _this.options = {animation: false};

            _this.numberOfEntriesList = [
                {caption: '5', value: 5},
                {caption: '10', value: 10},
                {caption: '15', value: 15},
                {caption: 'max (100)', value: 100}
            ];
            _this.numberOfEntries=_this.numberOfEntriesList[1];
        }

        function updateData() {
            _this.labels = _.pluck(memoryDataService.getData(_this.numberOfEntries.value), 'time').map(function(value) {
                return value.format('DD/MM/YYYY, HH:mm:ss');
            });
            _this.data = [
                _.map(_.pluck(memoryDataService.getData(_this.numberOfEntries.value), 'data.total'), function(value) { return sizeConverter.convertToMb(value);}),
                _.map(_.pluck(memoryDataService.getData(_this.numberOfEntries.value), 'data.used'), function(value) { return sizeConverter.convertToMb(value);}),
                _.map(_.pluck(memoryDataService.getData(_this.numberOfEntries.value), 'data.free'), function(value) { return sizeConverter.convertToMb(value);})
            ];
        }

        $scope.$watch(memoryDataService.getData, function() {
            updateData();
        }, true);

        _this.getLabels = function() {
            return _this.labels;
        };

        _this.getData = function() {
            return _this.data;
        };

        _this.updateNumberOfEntries = function() {
            updateData();
        };

        init();
    });