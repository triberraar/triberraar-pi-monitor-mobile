'use strict';

angular.module('cpu', [
    'btford.socket-io',
    'ui.router',
    'chart.js',
    'angular-growl',
    'util',
    'dashboard',
    'refreshInterval'
]).config(function ($stateProvider) {
    $stateProvider
        .state('cpu', {
            url:'/cpu',
            views: {
                menuContent: {
                    templateUrl: '/components/cpu/cpu-ionic.html'
                }
            }
        })
        .state('cpu.history', {
            url:'/history',
            templateUrl: '/components/cpu/cpu-history.html'
        });
})
    .factory('cpuDataService', function($timeout, socket, moment, growl, refreshIntervalService){
        var _refreshInterval;
        var _cpuData = [];
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
            if(!numberOfLatestEntries || _cpuData.length <= numberOfLatestEntries) {
                return _cpuData;
            }
            return _cpuData.slice(_cpuData.length - numberOfLatestEntries);
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
            socket.emit('cpu');
        }

        socket.on('cpu', function(data){
            if(data.error) {
                growl.error(data.error.message);
            } else {
                _cpuData.push({time: moment(), data: data.content});
                if (_cpuData.length > 100) {
                    _cpuData = _cpuData.slice(_cpuData.length - 100);
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
            getLatest: function() { return _cpuData[_cpuData.length -1];},
            getData: _getData,
            pause: _pause,
            play: _play,
            init: _init
        };
    })
    .controller('CpuController', function($state, cpuDataService, favoriteService, refreshIntervalService){
        var _this = this;

        function init() {
            _this.refreshIntervals = refreshIntervalService.getAll();
            _this.refreshInterval = cpuDataService.getRefreshInterval();
        }

        _this.refreshIntervalChanged = function() {
            cpuDataService.setRefreshInterval(_this.refreshInterval);
        };

        _this.getLatest = cpuDataService.getLatest;

        _this.play = cpuDataService.play;
        _this.pause = cpuDataService.pause;

        _this.navigateToHistoryShown = function() {
            return $state.$current.name !== 'cpu.history';
        };

        _this.isFavorite = function() {
            return favoriteService.isFavorite({id: 'cpu', templateUrl: '/components/cpu/cpu.html'});
        };

        _this.toggleFavorite = function() {
            favoriteService.toggleFavorite({id: 'cpu', templateUrl: '/components/cpu/cpu.html'});
        };

        _this.getTemperatureStatus = function() {
            if(!_this.getLatest() || !_this.getLatest().data || !_this.getLatest().data.temperature) {
                return;
            }
            if(_this.getLatest().data.temperature < 0) {
                return 'warning';
            } else if(_this.getLatest().data.temperature >=0 &&_this.getLatest().data.temperature < 50) {
                return 'success';
            } else if(_this.getLatest().data.temperature >= 50 && _this.getLatest().data.temperature <=75) {
                return 'warning';
            } else {
                return 'danger';
            }
        };

        init();
    })
    .controller('CpuHistoryController', function($scope, _, moment, cpuDataService) {
        var _this = this;

        function init() {
            _this.labels = [];
            _this.loadAvgData = [
                []
            ];
            _this.temperatureData = [
                []
            ];
            _this.loadAvgSeries = ['1min', '5min', '15min'];
            _this.temperatureSeries = ['temperature (°C)'];
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
            _this.labels = _.pluck(cpuDataService.getData(_this.numberOfEntries.value), 'time').map(function(value) {
                return value.format('DD/MM/YYYY, HH:mm:ss');
            });
            _this.loadAvgData = [
                _.pluck(cpuDataService.getData(_this.numberOfEntries.value), 'data.loadAvg.1min'),
                _.pluck(cpuDataService.getData(_this.numberOfEntries.value), 'data.loadAvg.5min'),
                _.pluck(cpuDataService.getData(_this.numberOfEntries.value), 'data.loadAvg.15min')];
            _this.temperatureData = [
                _.pluck(cpuDataService.getData(_this.numberOfEntries.value), 'data.temperature')];
        }

        $scope.$watch(cpuDataService.getData, function() {
            updateData();
        }, true);

        _this.updateNumberOfEntries = function() {
            updateData();
        };

        init();
    });