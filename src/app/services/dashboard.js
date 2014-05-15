define([
  'angular',
  'jquery',
  'kbn',
  'underscore',
  'config',
  'moment',
  'modernizr',
  'filesaver'
],
function (angular, $, kbn, _, config, moment, Modernizr) {
  'use strict';

  var module = angular.module('kibana.services');

  module.service('dashboard', function(
    $routeParams, $http, $rootScope, $injector, $location, $timeout,
    ejsResource, hostedGraphiteResource, timer, alertSrv, $q
  ) {
    // A hash of defaults to use when loading a dashboard

    var _dash = {
      title: "",
      tags: [],
      style: "dark",
      timezone: 'browser',
      editable: true,
      failover: false,
      panel_hints: true,
      rows: [],
      pulldowns: [ { type: 'templating' },  { type: 'annotations' } ],
      nav: [ { type: 'timepicker' } ],
      services: {},
      loader: {
        save_gist: false,
        save_elasticsearch: true,
        save_hostedgraphite: true,
        load_hostedgraphite: true,
        save_local: true,
        save_default: true,
        save_temp: true,
        save_temp_ttl_enable: true,
        save_temp_ttl: '30d',
        load_gist: false,
        load_elasticsearch: true,
        load_elasticsearch_size: 20,
        load_local: false,
        hide: false
      },
      refresh: false
    };

    // An elasticJS client to use
    var ejs = ejsResource(config.elasticsearch, config.elasticsearchBasicAuth);
    var hostedgraphite = hostedGraphiteResource({"server":config.datasources.graphite.url});
    var gist_pattern = /(^\d{5,}$)|(^[a-z0-9]{10,}$)|(gist.github.com(\/*.*)\/[a-z0-9]{5,}\/*$)/;

    // Store a reference to this
    var self = this;
    var filterSrv;

    this.current = _.clone(_dash);
    this.last = {};
    this.availablePanels = [];

    $rootScope.$on('$routeChangeSuccess',function(){
      // Clear the current dashboard to prevent reloading
      self.current = {};
      self.original = null;
      self.indices = [];
      route();
    });

    var route = function() {

      // Is there a dashboard type and id in the URL?
      if(!(_.isUndefined($routeParams.kbnType)) && !(_.isUndefined($routeParams.kbnId))) {
        var _type = $routeParams.kbnType;
        var _id = $routeParams.kbnId;

        console.log("Dashboard TYPE: '"+_type+"', '"+_id+"'");
        switch(_type) {
        case ('elasticsearch'):
          self.elasticsearch_load('dashboard',_id);
          break;
        case ('temp'):
          self.elasticsearch_load('temp',_id);
          break;
        case ('file'):
          self.file_load(_id);
          break;
        case('hg'):
            if(_id == "default") {
                self.file_load(_id);
            } else {
                self.hostedgraphite_load(_id);
            }
           break;
        case('script'):
          self.script_load(_id);
          break;
        case('local'):
          self.local_load();
          break;
        default:
            console.log("Route default");
            $location.path(config.default_route);
        }
      // No dashboard in the URL
      } else {
          console.log("Route storage");
        // Check if browser supports localstorage, and if there's an old dashboard. If there is,
        // inform the user that they should save their dashboard to Elasticsearch and then set that
        // as their default
        if (Modernizr.localstorage) {
          if(!(_.isUndefined(window.localStorage['dashboard'])) && window.localStorage['dashboard'] !== '') {
            $location.path(config.default_route);
            alertSrv.set('Saving to browser storage has been replaced',' with saving to Elasticsearch.'+
              ' Click <a href="#/dashboard/local/deprecated">here</a> to load your old dashboard anyway.');
          } else if(!(_.isUndefined(window.localStorage.grafanaDashboardDefault))) {
            $location.path(window.localStorage.grafanaDashboardDefault);
          } else {
              console.log("Back to default");
            $location.path(config.default_route);
          }
        // No? Ok, grab the default route, its all we have now
        } else {
          $location.path(config.default_route);
        }
      }
    };

    this.refresh = function() {
      $rootScope.$broadcast('refresh');
    };

    var dash_defaults = function(dashboard) {

      _.defaults(dashboard, _dash);
      _.defaults(dashboard.loader,_dash.loader);

      var filtering = _.findWhere(dashboard.pulldowns, {type: 'filtering'});
      if (!filtering) {
        dashboard.pulldowns.push({
          type: 'filtering',
          enable: false
        });
      }

      var annotations = _.findWhere(dashboard.pulldowns, {type: 'annotations'});
      if (!annotations) {
        dashboard.pulldowns.push({
          type: 'annotations',
          enable: false
        });
      }

      return dashboard;
    };

    this.dash_load = function(dashboard) {
      // Cancel all timers
      timer.cancel_all();

      // reset fullscreen flag
      $rootScope.fullscreen = false;

      // Make sure the dashboard being loaded has everything required
      dashboard = dash_defaults(dashboard);

      window.document.title = 'Grafana - ' + dashboard.title;

      // Set the current dashboard
      self.current = angular.copy(dashboard);

      filterSrv = $injector.get('filterSrv');
      filterSrv.init();

      if(dashboard.refresh) {
        self.set_interval(dashboard.refresh);
      }

      // Set the available panels for the "Add Panel" drop down
      self.availablePanels = _.difference(config.panel_names,
        _.pluck(_.union(self.current.nav,self.current.pulldowns),'type'));

      // Take out any that we're not allowed to add from the gui.
      self.availablePanels = _.difference(self.availablePanels,config.hidden_panels);

      $rootScope.$emit('dashboard-loaded');

      $timeout(function() {
        self.original = angular.copy(self.current);
      }, 1000);

      return true;
    };

    this.gist_id = function(string) {
      if(self.is_gist(string)) {
        return string.match(gist_pattern)[0].replace(/.*\//, '');
      }
    };

    this.is_gist = function(string) {
      if(!_.isUndefined(string) && string !== '' && !_.isNull(string.match(gist_pattern))) {
        return string.match(gist_pattern).length > 0 ? true : false;
      } else {
        return false;
      }
    };

    this.to_file = function() {
      var blob = new Blob([angular.toJson(self.current,true)], {type: "application/json;charset=utf-8"});
      // from filesaver.js
      window.saveAs(blob, self.current.title+"-"+new Date().getTime());
      return true;
    };

    this.set_default = function(route) {
      if (Modernizr.localstorage) {
        // Purge any old dashboards
        if(!_.isUndefined(window.localStorage['dashboard'])) {
          delete window.localStorage['dashboard'];
        }
        window.localStorage.grafanaDashboardDefault = route;
        return true;
      } else {
        return false;
      }
    };

    this.purge_default = function() {
      if (Modernizr.localstorage) {
        // Purge any old dashboards
        if(!_.isUndefined(window.localStorage['dashboard'])) {

          delete window.localStorage['dashboard'];
        }
        delete window.localStorage.grafanaDashboardDefault;
        return true;
      } else {
        return false;
      }
    };

    // TOFIX: Pretty sure this breaks when you're on a saved dashboard already
    this.share_link = function(title,type,id) {
      return {
        location  : window.location.href.replace(window.location.hash,""),
        type      : type,
        id        : id,
        link      : window.location.href.replace(window.location.hash,"")+"#dashboard/"+type+"/"+id,
        title     : title
      };
    };

    var renderTemplate = function(json,params) {
      var _r;
      _.templateSettings = {interpolate : /\{\{(.+?)\}\}/g};
      var template = _.template(json);
      var rendered = template({ARGS:params});
      try {
        _r = angular.fromJson(rendered);
      } catch(e) {
        _r = false;
      }
        console.log(_r);
      return _r;
    };

    this.local_load = function() {
      var dashboard = JSON.parse(window.localStorage['dashboard']);
      dashboard.rows.unshift({
        height: "30",
        title: "Deprecation Notice",
        panels: [
          {
            title: 'WARNING: Legacy dashboard',
            type: 'text',
            span: 12,
            mode: 'html',
            content: 'This dashboard has been loaded from the browsers local cache. If you use '+
            'another brower or computer you will not be able to access it! '+
            '\n\n  <h4>Good news!</h4> Kibana'+
            ' now stores saved dashboards in Elasticsearch. Click the <i class="icon-save"></i> '+
            'button in the top left to save this dashboard. Then select "Set as Home" from'+
            ' the "advanced" sub menu to automatically use the stored dashboard as your Kibana '+
            'landing page afterwards'+
            '<br><br><strong>Tip:</strong> You may with to remove this row before saving!'
          }
        ]
      });
      self.dash_load(dashboard);
    };

    this.file_load = function(file) {
      return $http({
        url: "app/dashboards/"+file.replace(/\.(?!json)/,"/")+'?' + new Date().getTime(),
        method: "GET",
        transformResponse: function(response) {
          return renderTemplate(response,$routeParams);
        }
      }).then(function(result) {
        if(!result) {
          return false;
        }
        self.dash_load(dash_defaults(result.data));
        return true;
      },function() {
        alertSrv.set('Error',"Could not load <i>dashboards/"+file+"</i>. Please make sure it exists" ,'error');
        return false;
      });
    };


    this.hostedgraphite_load = function(slug) {

        var hg = hostedgraphite.Loader(slug, self.current);
        hg.loadDashboard(function(result) {
            self.dash_load(dash_defaults(result));
            return true;

        }, function(){
            alertSrv.set('Error',"Could not load Dashboard <i>"+slug+" from Hosted Graphite</i>." ,'error');
            return false;
        });
    };


    this.elasticsearch_load = function(type,id) {
      var options = {
        url: config.elasticsearch + "/" + config.grafana_index + "/"+type+"/"+id+'?' + new Date().getTime(),
        method: "GET",
        transformResponse: function(response) {
          return renderTemplate(angular.fromJson(response)._source.dashboard, $routeParams);
        }
      };
      if (config.elasticsearchBasicAuth) {
        options.withCredentials = true;
        options.headers = {
          "Authorization": "Basic " + config.elasticsearchBasicAuth
        };
      }
      return $http(options)
      .error(function(data, status) {
        if(status === 0) {
          alertSrv.set('Error',"Could not contact Elasticsearch at "+config.elasticsearch+
            ". Please ensure that Elasticsearch is reachable from your system." ,'error');
        } else {
          alertSrv.set('Error',"Could not find "+id+". If you"+
            " are using a proxy, ensure it is configured correctly",'error');
        }
        return false;
      }).success(function(data) {
        self.dash_load(data);
      });
    };

    this.script_load = function(file) {
        console.log("Script load url: '"+"app/dashboards/"+file.replace(/\.(?!js)/,"/"+"'"));
      return $http({
        url: "app/dashboards/"+file.replace(/\.(?!js)/,"/"),
        method: "GET"
      })
      .then(function(result) {
        /*jshint -W054 */
        var script_func = new Function('ARGS','kbn','_','moment','window','document','$','jQuery', result.data);
        var script_result = script_func($routeParams,kbn,_,moment, window, document, $, $);

        // Handle async dashboard scripts
        if (_.isFunction(script_result)) {
          var deferred = $q.defer();
          script_result(function(dashboard) {
            $rootScope.$apply(function() {
              deferred.resolve({ data: dashboard });
            });
          });
          return deferred.promise;
        }

        return { data: script_result };
      })
      .then(function(result) {
        if(!result) {
          return false;
        }
        self.dash_load(dash_defaults(result.data));
        return true;
      },function() {
        alertSrv.set('Error',
          "Could not load <i>scripts/"+file+"</i>. Please make sure it exists and returns a valid dashboard" ,
          'error');
        return false;
      });
    };


    this.hostedgraphite_save = function(type, title, uuid, ttl) {

      console.log("HG SAVE with :'"+uuid+"'");
      // Clone object so we can modify it without influencing the existing obejct
      var save = _.clone(self.current);
      var id;

      // Change title on object clone
      if (type === 'dashboard') {
        id = save.title = _.isUndefined(title) ? self.current.title : title;
      }

      // Implement this in hosted graphite service.
      var request = hostedgraphite.Dashboard(
         uuid,
         title,
         angular.toJson(save,false)
      );

      console.log("Request");

      return request.saveDashboard(
        // Success
        function(result) {

          //console.log("Saved: '"+result.uuid+"'");
          //console.log("result: '"+result+"'");
          //console.log(self.current);
          self.current.uuid = result.uuid

          //if(type === 'dashboard') {

            //$location.path('/hg/dashboard/save/'+title);
          //}

          return result;
        },
        // Failure
        function() {
          return false;
        }
      );


    };

    this.elasticsearch_save = function(type,title,ttl) {
        alert("SHARTIFY2");
        console.log("SAVE HERE");
      // Clone object so we can modify it without influencing the existing obejct
      var save = _.clone(self.current);
      var id;

      // Change title on object clone
      if (type === 'dashboard') {
        id = save.title = _.isUndefined(title) ? self.current.title : title;
      }

      // Create request with id as title. Rethink this.
      var request = ejs.Document(config.grafana_index,type,id).source({
        user: 'guest',
        group: 'guest',
        title: save.title,
        tags: save.tags,
        dashboard: angular.toJson(save)
      });

      request = type === 'temp' && ttl ? request.ttl(ttl) : request;

      return request.doIndex(
        // Success
        function(result) {
          if(type === 'dashboard') {
            $location.path('/dashboard/elasticsearch/'+title);
          }
          self.original = angular.copy(self.current);
          return result;
        },
        // Failure
        function() {
          return false;
        }
      );
    };

    this.elasticsearch_delete = function(id) {
      return ejs.Document(config.grafana_index,'dashboard',id).doDelete(
        // Success
        function(result) {
          return result;
        },
        // Failure
        function() {
          return false;
        }
      );
    };

    this.save_gist = function(title,dashboard) {
      var save = _.clone(dashboard || self.current);
      save.title = title || self.current.title;
      return $http({
        url: "https://api.github.com/gists",
        method: "POST",
        data: {
          "description": save.title,
          "public": false,
          "files": {
            "kibana-dashboard.json": {
              "content": angular.toJson(save,true)
            }
          }
        }
      }).then(function(data) {
        return data.data.html_url;
      }, function() {
        return false;
      });
    };

    this.gist_list = function(id) {
      return $http.jsonp("https://api.github.com/gists/"+id+"?callback=JSON_CALLBACK"
      ).then(function(response) {
        var files = [];
        _.each(response.data.data.files,function(v) {
          try {
            var file = JSON.parse(v.content);
            files.push(file);
          } catch(e) {
            return false;
          }
        });
        return files;
      }, function() {
        return false;
      });
    };

    this.set_interval = function (interval) {
      self.current.refresh = interval;
      if(interval) {
        var _i = kbn.interval_to_ms(interval);
        timer.cancel(self.refresh_timer);
        self.refresh_timer = timer.register($timeout(function() {
          self.set_interval(interval);
          self.refresh();
        },_i));
        self.refresh();
      } else {
        timer.cancel(self.refresh_timer);
      }
    };


  });

});
