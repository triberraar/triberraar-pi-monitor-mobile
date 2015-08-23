'use strict';

angular.module('network', [
    'btford.socket-io',
    'ui.router',
    'chart.js',
    'angular-growl',
    'util',
    'dashboard',
    'refreshInterval'
]).config(function ($stateProvider) {
    $stateProvider
        .state('network', {
            url:'/network',
            views: {
                menuContent: {
                    templateUrl: 'components/network/network-ionic.html'
                }
            }
        })
        .state('network.history', {
            url:'/history',
            templateUrl: 'components/network/network-history.html'
        });
})
    .factory('networkDataService', function($timeout, socket, moment, growl, refreshIntervalService){
        var _refreshInterval;
        var _networkData = [];
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
            if(!numberOfLatestEntries || _networkData.length <= numberOfLatestEntries) {
                return _networkData;
            }
            return _networkData.slice(_networkData.length - numberOfLatestEntries);
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
            socket.emit('network');
        }

        socket.on('network', function(data) {
            if(data.error) {
                growl.error(data.error.message);
            } else {
                _networkData.push({time: moment(), data: data.content});
                if (_networkData.length > 100) {
                    _networkData = _networkData.slice(_networkData.length - 100);
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
            getLatest: function() { return _networkData[_networkData.length -1];},
            getData: _getData,
            pause: _pause,
            play: _play,
            init: _init
        };
    })
    .controller('NetworkController', function($state, moment, sizeConverter, favoriteService, networkDataService, refreshIntervalService){
        var _this = this;

        function init() {
            _this.refreshIntervals = refreshIntervalService.getAll();
            _this.refreshInterval = networkDataService.getRefreshInterval();
        }

        _this.refreshIntervalChanged = function() {
            networkDataService.setRefreshInterval(_this.refreshInterval);
        };

        _this.getLatest = networkDataService.getLatest;

        _this.play = networkDataService.play;
        _this.pause = networkDataService.pause;

        _this.navigateToHistoryShown = function() {
            return $state.$current.name !== 'network.history';
        };

        _this.convertBytesToHumanReadable = function(value) {
            if(value) {
                return sizeConverter.convert(value, 2);
            }
        };

        _this.calculateSpeedRX = function() {
            var lastDatas = networkDataService.getData(2);

            if(lastDatas.length !== 2) {
                return '--';
            }

            var previousBytes = lastDatas[0].data.rx;
            var currentBytes = lastDatas[1].data.rx;

            var durationInSeconds = moment.duration(lastDatas[1].time.diff(lastDatas[0].time)).asSeconds();

            return sizeConverter.convert(parseFloat((currentBytes - previousBytes) / durationInSeconds), 2);
        };

        this.calculateSpeedTX = function() {
            var lastDatas = networkDataService.getData(2);

            if(lastDatas.length !== 2) {
                return '--';
            }

            var previousBytes = lastDatas[0].data.tx;
            var currentBytes = lastDatas[1].data.tx;

            var durationInSeconds = moment.duration(lastDatas[1].time.diff(lastDatas[0].time)).asSeconds();

            return sizeConverter.convert(parseFloat((currentBytes - previousBytes) / durationInSeconds), 2);
        };

        _this.isFavorite = function() {
            return favoriteService.isFavorite({id: 'network', templateUrl: '/components/network/network.html'});
        };

        _this.toggleFavorite = function() {
            favoriteService.toggleFavorite({id: 'network', templateUrl: '/components/network/network.html'});
        };

        init();
    })
    .controller('NetworkHistoryController', function($scope, _, moment, networkDataService) {
        var _this = this;

        function init() {
            _this.labels = [];
            _this.data = [
                [],[]
            ];
            _this.series = ['RX (kB/s)', 'TX (kB/s)'];
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
            _this.labels = _.pluck(networkDataService.getData(_this.numberOfEntries.value + 1), 'time').map(function(value) {
                return value.format('DD/MM/YYYY, HH:mm:ss');
            });

            _this.labels = _this.labels.slice(1);

            var tempData = [
                networkDataService.getData(_this.numberOfEntries.value + 1),
                networkDataService.getData(_this.numberOfEntries.value + 1)];

            _this.data = [
                [],[]
            ];
            for(var  i=1; i< tempData[0].length; i++) {
                _this.data[0].push(calculateSpeedRX(tempData[0][i-1], tempData[0][i]));
                _this.data[1].push(calculateSpeedTX(tempData[1][i-1], tempData[1][i]));
            }

            if (_this.labels.length === 0) {
                _this.labels = [''];
                _this.data = [
                    [''],['']
                ];
            }
        }

        function calculateSpeedRX(previous, current) {
            if(!previous || !current) {
                return;
            }

            var durationInSeconds = moment.duration(current.time.diff(previous.time)).asSeconds();

            return parseFloat((current.data.rx - previous.data.rx) / durationInSeconds).toFixed(2);
        }

        function calculateSpeedTX(previous, current) {
            if(!previous || !current) {
                return;
            }

            var durationInSeconds = moment.duration(current.time.diff(previous.time)).asSeconds();

            return parseFloat((current.data.tx - previous.data.tx) / durationInSeconds).toFixed(2);
        }

        $scope.$watch(networkDataService.getData, function() {
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