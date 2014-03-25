/*! elastic.js - v1.1.1 - 2013-05-24
 * https://github.com/fullscale/elastic.js
 * Copyright (c) 2013 FullScale Labs, LLC; Licensed MIT */

/*jshint browser:true */
/*global angular:true */
'use strict';

/*
Angular.js service wrapping the hostedgraphite.js API. This module can simply
be injected into your angular controllers.
*/
angular.module('hostedgraphite.service', [])
  .factory('hostedGraphiteResource', ['$http', function ($http) {

  return function (config) {

    var

      // use existing hostedgraphite object if it exists
      hostedgraphite = window.hostedgraphite || {},

      /* results are returned as a promise */
      promiseThen = function (httpPromise, successcb, errorcb) {
        return httpPromise.then(function (response) {
          (successcb || angular.noop)(response.data);
          return response.data;
        }, function (response) {
          (errorcb || angular.noop)(response.data);
          return response.data;
        });
      };

    // check if we have a config object
    // if not, we have the server url so
    // we convert it to a config object
    if (config !== Object(config)) {
      config = {server: config};
    }

    // set url to empty string if it was not specified
    if (config.server == null) {
      config.server = '';
    }

    /* set authentication header
    if (basicAuth || config.basicAuth) {
      config.headers = angular.extend( config.headers||{}, {
        "Authorization": "Basic " + (basicAuth||config.basicAuth)
      });
    }*/
    /* implement the hostedgraphite.js client interface for angular */
    hostedgraphite.client = {
      server: function (s) {
        if (s == null) {
          return config.server;
        }

        config.server = s;
        return this;
      },
      post: function (path, data, successcb, errorcb) {
        path = config.server + path;
        var reqConfig = {url: path, data: data, method: 'POST'};
        return promiseThen($http(angular.extend(reqConfig, config)), successcb, errorcb);
      },
      get: function (path, data, successcb, errorcb) {
        path = config.server + path;
        // no body on get request, data will be request params
        var reqConfig = {url: path, params: data, method: 'GET'};
        return promiseThen($http(angular.extend(reqConfig, config)), successcb, errorcb);
      },
      put: function (path, data, successcb, errorcb) {
        path = config.server + path;
        var reqConfig = {url: path, data: data, method: 'PUT'};
        return promiseThen($http(angular.extend(reqConfig, config)), successcb, errorcb);
      },
      del: function (path, data, successcb, errorcb) {
        path = config.server + path;
        var reqConfig = {url: path, data: data, method: 'DELETE'};
        return promiseThen($http(angular.extend(reqConfig, config)), successcb, errorcb);
      },
      head: function (path, data, successcb, errorcb) {
        path = config.server + path;
        // no body on HEAD request, data will be request params
        var reqConfig = {url: path, params: data, method: 'HEAD'};
        return $http(angular.extend(reqConfig, config))
          .then(function (response) {
          (successcb || angular.noop)(response.headers());
          return response.headers();
        }, function (response) {
          (errorcb || angular.noop)(undefined);
          return undefined;
        });
      }
    };

    return hostedgraphite;
  };
}]);
