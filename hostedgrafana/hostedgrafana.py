import os
import json
import urllib
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash, jsonify, make_response


app = Flask(__name__, static_url_path='')


@app.route('/')
def index():
    print request.headers
    return render_template('index.html')




def getUserUID(request):

    try:
        return request.headers['Hg-Uid']
    except KeyError:
        return None

@app.route('/config/config.js')
def get_grafana_config():

    response = make_response(render_template("config/config_template.js", uid=getUserUID(request)))
    response.headers['Content-Type'] = 'application/javascript'
    return response



@app.route('/app/dashboards/<dashname>')
def getDefaultDashboard(dashname):

    print "DEFAULT DASH"
    response = make_response(render_template("config/default_dashboard.json", foo=42))
    response.headers['Content-Type'] = 'application/json'
    return response


# If we're going to just proxy all this crap, then we can make the js client
# Post to /grafana/dash/save and deal with it in a HG view.
# Same for loading.
"""@app.route('/hg/dashboard/save/<dashname>/', methods=['POST'])
def save_dashboard(dashname):
    dashname = urllib.unquote(dashname)
    print "SAVING: '%s'" % dashname
    print request.data


    dashdata = urllib.unquote(request.data)
    dashdata = dashdata.strip("=")
    dash = json.loads(dashdata)

    print "dash: '%s'" % dash
    return jsonify({"success":True, "type" : "dashboard", "_id":dashname})

"""




if __name__ == '__main__':
    app.run(debug=True)
