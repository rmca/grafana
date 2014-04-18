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

}).call(this);
