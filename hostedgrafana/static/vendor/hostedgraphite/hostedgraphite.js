(function () {
  'use strict';
    var hostedgraphite
       ,root = this
       ,_hostedgraphite = root && root._hostedgraphite;

    console.log("H");
    if (typeof exports !== 'undefined') {
        console.log("1");
        hostedgraphite = exports;
    } else {
        console.log("2");
        hostedgraphite = root.hostedgraphite = {};
    }

    console.log("H2, hg: '"+hostedgraphite+"'");
    console.log(hostedgraphite);

    hostedgraphite.Dashboard = function (title, data) {
        return {
          saveDashboard : function(successcb, errorcb) {

              console.log("HG.client: '"+hostedgraphite.client+"'");
              var titleSend = title.split(' ').join('+');
              var url = "/grafana/hg/dashboard/save/" + titleSend + "/";

              var response = hostedgraphite.client.post(url, data, successcb, errorcb);
              console.log("Response: '"+response+"'");
              console.log(response);
              return response;
          }

        };
    };

}).call(this);
