import os
from flask import Flask, request, session, g, redirect, url_for, abort, render_template, flash, jsonify


app = Flask(__name__, static_url_path='')


@app.route('/')
def index():
    return render_template('index.html')



@app.route('/config/config.js')
def get_grafana_config():

    access_key_url = "http://localhost:8000/5de74f77/6d258424-85f1-412f-8337-428973ad1f25/graphite"
    return render_template("config/config_template.js", access_key_url=access_key_url)



@app.route('/app/dashboards/<dashname>')
def getDefaultDashboard(dashname):
    return render_template("config/default_dashboard.json", mimetype='application/json')



@app.route('/hg/dashboard/save/<dashname>')
def save_dashboard(dashname):
    print "SAVING"
    return jsonify({"success":True})


if __name__ == '__main__':
    app.run(debug=True)
