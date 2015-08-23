'use strict';

angular.module('storage', [
    'btford.socket-io',
    'ui.router',
    'chart.js',
    'angular-growl',
    'util',
    'refreshInterval',
    'dashboard'
]).config(function ($stateProvider) {
    $stateProvider
        .state('storage', {
            url:'/storage',
            views: {
                menuContent: {
                    templateUrl: '/components/storage/storage-ionic.html'
                }
            }
        });
})
    .factory('storageDataService', function($timeout, socket, growl, refreshIntervalService){
        var _refreshInterval;
        var _storageData = {};
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
            socket.emit('storage');
        }

        socket.on('storage', function(data){
            if(data.error) {
                growl.error(data.error.message);
            } else {
                _storageData = data.content;
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
            getData: function() { return _storageData;},
            pause: _pause,
            play: _play,
            init: _init
        };
    })
    .controller('StorageController', function(sizeConverter, favoriteService, storageDataService, refreshIntervalService){
        var _this = this;

        function init() {
            _this.refreshIntervals = refreshIntervalService.getAll();
            _this.refreshInterval = storageDataService.getRefreshInterval();
        }

        _this.refreshIntervalChanged = function() {
            storageDataService.setRefreshInterval(_this.refreshInterval);
        };

        _this.getData = storageDataService.getData;

        _this.play = storageDataService.play;
        _this.pause = storageDataService.pause;

        _this.convertBytesToHumanReadable = function(value) {
            if(value) {
                return sizeConverter.convert(value, 2);
            }
        };

        _this.getPercentage = function(total, free) {
            return (Math.floor((free / total) * 10000) / 100).toFixed(2);
        };

        _this.isFavorite = function() {
            return favoriteService.isFavorite({id: 'storage', templateUrl: '/components/storage/storage.html'});
        };

        _this.toggleFavorite = function() {
            favoriteService.toggleFavorite({id: 'storage', templateUrl: '/components/storage/storage.html'});
        };

        init();
    });