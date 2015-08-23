'use strict';

angular.module('dashboard', [
    'util',
    'ui.router',
    'ngStorage'
]).config(function ($stateProvider) {
    $stateProvider
        .state('dashboard', {
            url:'/dashboard',
            views: {
                menuContent: {
                    templateUrl: 'components/dashboard/dashboard.html'
                }
            }
        });
})
    .factory('favoriteService', function(_,$localStorage) {
        var _favorites;

        var _addFavorite = function(fav) {
            _favorites.push(fav);
            $localStorage.favorites = _favorites;
        };

        var _removeFavorite = function(fav) {
            _favorites = _.reject(_favorites, function(item) {
                return item.id === fav.id;
            });
            $localStorage.favorites = _favorites;
        };

        var _isFavorite = function(fav) {
            return (_.find(_favorites, fav) !== undefined);
        };

        var _toggleFavorite = function(fav) {
            if(_isFavorite(fav)) {
                _removeFavorite(fav);
            } else {
                _addFavorite(fav);
            }
        };

        var init = function () {
            _favorites = $localStorage.favorites;
            if (!_favorites) {
                _favorites = [];
            }
        };

        init();

        return {
            toggleFavorite: _toggleFavorite,
            getFavorites: function() {
                return _favorites;
            },
            isFavorite: _isFavorite
        };
    })
    .controller('DashboardController', function(favoriteService) {
        var _this = this;

        _this.getFavorites = function() {
            return favoriteService.getFavorites();
        };
    });