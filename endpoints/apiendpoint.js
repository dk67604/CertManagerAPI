/*
* Registering API endpoints
*/

var certapi     = require('../api/certapi.js')
var apipath = '/api';



var initAPI = function(app) {
    app.get(apipath+"/",function(req,res){
        res.json({status:'ok'});
    });
    app.post(apipath + '/user/addUser/',function(req, res) {
        certapi.addUser(req, res);
    });
    app.post(apipath + '/user/deleteUser/',function(req, res) {
        certapi.deleteUser(req, res);
    });
    app.post(apipath+'/certificate/request/',function(req,res){
         certapi.certRequest(req,res);
    });
    app.post(apipath+'/certificate/list/',function(req,res){
      certapi.userCertList(req,res);
    });
    app.post(apipath+'/certificate/deactivate/',function(req,res){
      certapi.deactivateCert(req,res);
    });
    app.post(apipath+'/certificate/activate/',function(req,res){
      certapi.activateCert(req,res);
    });

  }

  // Export initAPI() function (called by server.js)
module.exports = {
    initAPI: initAPI
}
