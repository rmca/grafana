(function () {
  'use strict';
    var hostedgraphite
       ,root = this
       ,_hostedgraphite = root && root._hostedgraphite;

    if (typeof exports !== 'undefined') {
        hostedgraphite = exports;
    } else {
        hostedgraphite = root.hostedgraphite = {};
    }


    hostedgraphite.Dashboard = function (uuid, title, data) {
        return {
          saveDashboard : function(successcb, errorcb) {

              console.log("Saving with uuid: '"+uuid+"'");
              if(_.isUndefined(uuid)) {
                uuid = null;
              }

              var postData = {"uuid": uuid, "title": title, "data" : data};
              var titleSend = title.split(' ').join('+');
              var url = "/grafana/hg/dashboard/save/";


              var response = hostedgraphite.client.post(url, postData, successcb, errorcb);
              console.log("Response: '"+response+"'");
              console.log(response);
              return response;
          }

        };
    };


    hostedgraphite.Loader = function(slug, currentDashboard) {
        return {
            loadDashboard : function(successcb, errorcb) {
              var hg = this;

              // If we get a successful dash back, translate it from graphite to grafana,
              // call the success callback. Should probably be done with some promise nonsense.
              var successParse = function(result) {
                 if(result.state) {
                    var dash = hg.graphiteToGrafanaTranslator(result);
                    return successcb(dash);
                 }else {
                  return errorcb();
                 }
              };

              return hostedgraphite.client.get('/dashboard/load/' + encodeURIComponent(slug), null, successParse, errorcb);
            },

            graphiteToGrafanaTranslator : function(data) {
              var state  = data.state;
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

              var newDashboard = angular.copy(currentDashboard);
              newDashboard.rows = [];
              newDashboard.title = state.name;
              newDashboard.slug = data.slug;
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


              if(_.isUndefined(newDashboard.services)) {
                  newDashboard.services = {
                      filter : {
                          time: {
                             from : "now-12h",
                             to : "now"
                          }
                      }
                  }
              }
              return newDashboard;
            }
        }
    };

}).call(this);
