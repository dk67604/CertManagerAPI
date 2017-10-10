/*
*Endpoints implementation
*/
"use strict";
var crypto  = require('crypto');
var NodeRSA = require('node-rsa');
let date = require('date-and-time');
var nano = require('nano')('http://localhost:5984')
nano.db.create('certmanager');
var certmanagerdb = nano.db.use('certmanager');
var request = require('request');

/*
 * Response helper function for nicer code :)
 */
function respond(res, resobj) {
    console.log('Sending response');
    resobj.set('Content-Type', 'application/json');
    resobj.end(JSON.stringify(res))
}


function errorresponse(error, res) {
  console.log('Sending error response');
    var response = {
        success: false,
        errors: [
            error
        ]
    };
    res.set('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
}

var getCertList=function(email,status,result){
  console.log('Sending Certificate List');

  return new Promise(function(resolve,reject){
    if(result=='true'){
      certmanagerdb.view('certificates','by_user_status',{'key':[email,status],'include_docs':false},function(err,body){
        if(!err){
          console.log('Rows'+body.rows);

          resolve(body.rows);
        }
        else{
          console.log(err);
          reject('db connection error');
        }
      });
    }
  });
};

certmanagerdb.update = function(obj, key, callback){
 var db = this;
 db.get(key, function (error, existing){
    if(!error) obj._rev = existing._rev;
    db.insert(obj, key, callback);
 });
}

var activateCertificate=function(serialnumber,result){
  console.log('Acticvating requested certificate');

  return new Promise(function(resolve,reject){
    if(result=='true'){
      certmanagerdb.view('certificate','by_serialnumber',{'key':serialnumber,'include_docs':true},function(err,body){
        if(!err){
          if(body.rows.length>0){

            var doc_id=body.rows[0].doc._id;
            var doc=body.rows[0].doc;
            if(doc.status=='D'){
              let now = new Date();
              var valid_to=date.addYears(now,1);
              valid_to=date.format(valid_to,'MMM DD HH:mm:ss YYYY [GMT]');
              doc.body.valid_to=valid_to;
              doc.status='A';
              certmanagerdb.update(doc, doc_id, function(err, res){
              if(!err){
                  resolve('Certificate successfully activated');
              }
            });
            }
            else{
              resolve('Certificate already activated');
            }

        }
        else {
          resolve('Certificate does not exist');
        }
      }
        else{
          console.log(err);
          reject('false');
        }
      });
    }
  });
}

var deactivateCertificate=function(serialnumber,result){
  console.log('Deactivating requested certificate');

  return new Promise(function(resolve,reject){
    if(result=='true'){
      certmanagerdb.view('certificate','by_serialnumber',{'key':serialnumber,'include_docs':true},function(err,body){
        if(!err){
          if(body.rows.length>0){

            var doc_id=body.rows[0].doc._id;
            var doc=body.rows[0].doc;
            if(doc.status=='A'){
              let now = new Date();
              var valid_to=date.format(now,'MMM DD HH:mm:ss YYYY [GMT]');
              doc.body.valid_to=valid_to;
              doc.status='D';
              certmanagerdb.update(doc, doc_id, function(err, res){
              if(!err){
                  resolve('Certificate successfully deactivated');
              }
            });
            }
            else{
              resolve('Certificate already deactivated');
            }

        }
        else {
          resolve('Certificate does not exist');
        }
      }
        else{
          console.log(err);
          reject('false');
        }
      });
      }

    });
  }

var checkUser=function(username,email){
  console.log('Checking User exist or not');

  var type = 'user';
  return new Promise(function(resolve,reject){
      var rows;
      certmanagerdb.view('users','by_users',{'key':[username,email],'include_docs':false},function(err,body){
      if(!err){
       rows = body.rows; //the rows returned
       if(rows.length>0 ){
         if(rows[0].key[0]==username || rows[0].key[1]==email){
         var jsonResult={status:"true",data:rows};
         resolve(jsonResult);
      }
      else {
        var jsonResult={status:"false",data:''};
        resolve(jsonResult);
      }
      }
      else {
        var jsonResult={status:"false",data:''};
        resolve(jsonResult);
      }
  }
  else {
    console.log(err);
    reject('database connection error');
  }
    });

  });
};

var insertCert=function (data,result){
  console.log('Inserting certificate request');

  return new Promise(function(resolve,reject){
    if(result=='true'){
      certmanagerdb.insert(data,function(err,body){
        if(!err){
          resolve('Certificate successfully created');
        }
        else {
          reject('database connection error');
        }
      });
    }

  });
}

var insertUser=function (data,result){
  console.log('Inserting requested user');
  return new Promise(function(resolve,reject){
    if(result.status =='false'){
    certmanagerdb.insert(data,function(err,body){
      if(!err){
        resolve('User successfully created');
      }
      else {
        reject('database connection error');
      }
    });
  }
  else {
    resolve('User already exist')
  }
});
}

var options = {
  uri: 'http://httpbin.org',
  method: 'POST',
  json: {
    "longUrl": "http://www.google.com/"
  }
};

var notify=function(serialnumber,result){
  console.log('Sending Notifcation to external system');
  return new Promise(function(resolve,reject){
    if (result){
      var options = {
        uri: 'http://httpbin.org/post',
        method: 'POST',
        json: {
          "serialnumber": serialnumber,
          "result":result
        }
      };
      request(options, function (error, response, body) {
        //console.log(response);
   if (!error && response.statusCode == 200) {
     console.log(body.id) // Print the shortened url.
     resolve(response);
   }
 });
    }else {
      resolve('Fail to notify');
    }
  });
};

var removeUser=function(result){
  console.log('Removing requested user');

  console.log('Remove user');
  return new Promise(function(resolve,reject){
        if(result.status == 'false'){
          reject('User does not exist');
        }
        if(result.status == 'true'){
          var jsonData=JSON.parse(JSON.stringify(result.data));
          console.log("In removeUser"+jsonData[0].value);
          certmanagerdb.destroy(jsonData[0].value._id,jsonData[0].value._rev, function(err, body) {
            if (!err){
              console.log(body);
              resolve('User removed successfully');
            }
            else{
              reject('db connection error');
            }
        });

        }
  });

};

var checkLogin=function(password,data){
  console.log('Checking password credential');
  return new Promise(function(resolve,reject){
    if(data.status == 'false'){
      reject('User does not exist');
    }
    if(data.status == 'true'){
      var jsonData=JSON.parse(JSON.stringify(data.data));
      if(jsonData[0].value.password == password){
        resolve("true");
      }
      else{
        reject('Invalid username/password');
      }
    }

  });
};

var addUser = function(req, res) {
    var username=req.body.username;
    var email=req.body.email;
    var password=req.body.password;

    // Calc passhash
    var passhash = crypto.createHash('sha256').update(password).digest('base64');
    // Make sure DB file exists ...
    var data={
      username:username,
      password:passhash,
      email:email,
      type:'user'
    };
    checkUser(username,email).
    then(insertUser.bind(null,data)).
    then(function(result){
      console.log(result);
      var data={success:'true',result:result};
      respond(data,res);
    }).catch(function(error){
      console.log(error);
      var data={error:error};
      errorresponse(data,res);
    });

};



var deleteUser =function(req,res){
     var username=req.body.username;
     var email=req.body.email;
     checkUser(username,email).
     then(removeUser).then(function(result){
       var data={success:'true',result:result};
       respond(data,res);
     }).catch(function(error){
        console.log(error);
        var data={error:error};
        errorresponse(data,res);
     });
};

var certRequest=function(req,res){
  var data=req.body.data;
  var auth=req.body.auth;
  var username=auth.username;
  var password=auth.password;

  var key=new NodeRSA({b:data.key.size},['pem']);

  let now = new Date();
  var valid_from=date.format(now,'MMM DD HH:mm:ss YYYY [GMT]');
  var valid_to=date.addYears(now,1);
  valid_to=date.format(valid_to,'MMM DD HH:mm:ss YYYY [GMT]');
  var privateKey=key.exportKey('pkcs8');

  var certdata={
    privateKey:privateKey,
    body:{host:data.host,name:data.name,valid_from:valid_from,valid_to:valid_to},
    email:auth.email,
    status:'A',
    type:'certificate'
  }
  var passhash = crypto.createHash('sha256').update(password).digest('base64');
  checkUser(username,auth.email).then(checkLogin.bind(null,passhash)).then(insertCert.bind(null,certdata)).
  then(function(result){
    var response={success:'true',certificate:result}
    respond(response,res);
  }).catch(function(error){
    errorresponse(error,res);
  });
};



var userCertList=function(req,res){
  var data=req.body.data;
  var auth=req.body.auth;
  var username=auth.username;
  var password=auth.password;
  var passhash = crypto.createHash('sha256').update(password).digest('base64');

  checkUser(username,auth.email).then(checkLogin.bind(null,passhash)).
  then(getCertList.bind(null,auth.email,data.status)).then(function(result){
    var certificates=[];
    for (var index=0;index<result.length;index++){
      var certificate={serialnumber:result[index].id,status:result[index].value.status,body:result[index].value.body,
        privateKey:result[index].value.privateKey};
      certificates.push(certificate);
    }
    var response={success:'true',certificates:certificates}
    respond(response,res);
  }).catch(function(error){
    errorresponse(error,res);
  });

};

var deactivateCert=function(req,res){
  var data=req.body.data;
  var auth=req.body.auth;
  var username=auth.username;
  var password=auth.password;
  var serialnumber=data.serialnumber;
  var passhash = crypto.createHash('sha256').update(password).digest('base64');
  checkUser(username,auth.email).then(checkLogin.bind(null,passhash)).then(deactivateCertificate.bind(null,data.serialnumber))
    .then(notify.bind(null,serialnumber)).then(function(result){
    var response={result}
    respond(response,res);
  }).catch(function(error){
    errorresponse(error,res);
  });
};



var activateCert=function(req,res){
  var data=req.body.data;
  var auth=req.body.auth;
  var username=auth.username;
  var password=auth.password;
  var passhash = crypto.createHash('sha256').update(password).digest('base64');
  var serialnumber=data.serialnumber;
  console.log(serialnumber);
  checkUser(username,auth.email).then(checkLogin.bind(null,passhash)).
  then(activateCertificate.bind(null,data.serialnumber))
  .then(notify.bind(null,serialnumber)).then(function(result){
    var response={result}
    respond(response,res);
  }).catch(function(error){
    errorresponse(error,res);
  });

};
module.exports = {
    addUser: addUser,
    deleteUser:deleteUser,
    certRequest:certRequest,
    userCertList:userCertList,
    deactivateCert:deactivateCert,
    activateCert:activateCert
}
