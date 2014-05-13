define([
  'angular',
  'underscore',
  'config',
  'jquery'
],
function (angular, _, config, $) {
  'use strict';

  var module = angular.module('kibana.controllers');

  module.controller('HG_dash_loader', function($scope, $rootScope, dashboard, $element, $location, datasourceSrv) {


    console.log("DATA SOURCE: '"+datasourceSrv+"'");
      console.log(datasourceSrv);
      console.log("----DS");


    $scope.listAllDashboards = function(query) {
      delete $scope.error;

      datasourceSrv.default.listDashboards(query)
        .then(function(results) {
          $scope.dashboards = results;
        })
        .then(null, function(err) {
          $scope.error = err.message || 'Error while fetching list of dashboards';
        });
    };

    $scope.init = function() {
      $scope.giveSearchFocus = 0;
      $scope.selectedIndex = -1;
      $scope.results = {dashboards: [], tags: [], metrics: []};
      $scope.query = { query: '' };
      $rootScope.$on('open-search', $scope.listAllDashboards);
    };

    $scope.openHGDashboardList = function (evt) {

      if (evt) {
        $element.find('.dropdown-toggle').dropdown('toggle');
      }

      $scope.listAllDashboards();
    };




    $scope.load_hg_dashboard = function(dashboardSlug) {
      delete $scope.error;

      datasourceSrv.default.loadDashboard(dashboardSlug)
        .then(function(results) {
          if (!results.data || !results.data.state) {
            throw { message: 'no dashboard state received from graphite' };
          }

          graphiteToGrafanaTranslator(results.data.state);
        })
        .then(null, function(err) {
          $scope.error = err.message || 'Failed to import dashboard';
        });
    };

    function graphiteToGrafanaTranslator(state) {
      var graphsPerRow = 2;
      var rowHeight = 300;
      var rowTemplate;
      var currentRow;
      var panel;

      rowTemplate = {
        title: '',
        panels: [],
        height: rowHeight
      };

      currentRow = angular.copy(rowTemplate);

      var newDashboard = angular.copy(dashboard.current);
      newDashboard.rows = [];
      newDashboard.title = state.name;
      newDashboard.rows.push(currentRow);

      _.each(state.graphs, function(graph) {
        if (currentRow.panels.length === graphsPerRow) {
          currentRow = angular.copy(rowTemplate);
          newDashboard.rows.push(currentRow);
        }

        panel = {
          type: 'graphite',
          span: 12 / graphsPerRow,
          title: graph[1].title,
          targets: []
        };

        _.each(graph[1].target, function(target) {
          panel.targets.push({
            target: target
          });
        });

        currentRow.panels.push(panel);
      });

      dashboard.dash_load(newDashboard);
    }

  });

  module.directive('xngFocus', function() {
    return function(scope, element, attrs) {
      $(element).click(function(e) {
        e.stopPropagation();
      });

      scope.$watch(attrs.xngFocus,function (newValue) {
        setTimeout(function() {
          newValue && element.focus();
        }, 200);
      },true);
    };
  });

});
