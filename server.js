//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mysqlURL = process.env.OPENSHIFT_MYSQL_DB_URL || process.env.MYSQL_URL,
    mysqlURLLabel = "";

if (mysqlURL == null) {
  var mysqlHost, mysqlPort, mysqlDatabase, mysqlPassword, mysqlUser;
  // If using multi-database modified by p.l.77 (MONGODB_DATABASE_SERVICE_NAME & MYSQL_DATABASE_SERVICE_NAME)
  if (process.env.MYSQL_DATABASE_SERVICE_NAME) {
    var mysqlServiceName = process.env.MYSQL_DATABASE_SERVICE_NAME.toUpperCase();
    mysqlHost = process.env[mysqlServiceName + '_SERVICE_HOST'];
    mysqlPort = process.env[mysqlServiceName + '_SERVICE_PORT'];
    mysqlDatabase = process.env[mysqlServiceName + '_DATABASE'];
    mysqlPassword = process.env[mysqlServiceName + '_PASSWORD'];
    mysqlUser = process.env[mysqlServiceName + '_USER'];

  // If using plane old env vars via service discovery
  } else if (process.env.DATABASE_SERVICE_NAME) {
    var mysqlServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mysqlHost = process.env[mysqlServiceName + '_SERVICE_HOST'];
    mysqlPort = process.env[mysqlServiceName + '_SERVICE_PORT'];
    mysqlDatabase = process.env[mysqlServiceName + '_DATABASE'];
    mysqlPassword = process.env[mysqlServiceName + '_PASSWORD'];
    mysqlUser = process.env[mysqlServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mysqlDatabase = process.env.database_name;
    mysqlPassword = process.env.password;
    mysqlUser = process.env.username;
    var mysqlUriParts = process.env.uri && process.env.uri.split("//");
    if (mysqlUriParts.length == 2) {
      mysqlUriParts = mysqlUriParts[1].split(":");
      if (mysqlUriParts && mysqlUriParts.length == 2) {
        mysqlHost = mysqlUriParts[0];
        mysqlPort = mysqlUriParts[1];
      }
    }
  }

  if (mysqlHost && mysqlPort && mysqlDatabase) {
    mysqlURLLabel = mysqlURL = 'mysql://';
    if (mysqlUser && mysqlPassword) {
      mysqlURL += mysqlUser + ':' + mysqlPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mysqlURLLabel += mysqlHost + ':' + mysqlPort + '/' + mysqlDatabase;
    mysqlURL += mysqlHost + ':' +  mysqlPort + '/' + mysqlDatabase;
  }
}
var db = null,
    dbDetails = new Object();
var mysqlClient;

var initDb = function(callback) {
  if (mysqlURL == null) return;

  var mysql = require('mysql');
  if (mysql == null) return;

  //connect to mysql
  mysqlClient = mysql.createConnection(mysqlURL);
  mysqlClient.connect(function(err){
    if (err) {
      callback(err);
      return;
    }

    db = mysqlClient;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mysqlURLLabel;
    dbDetails.type = 'MySQL';

    console.log('Connected to MySQL at: %s', mysqlURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    // TODO: 尚未修改成 MySQL，暫時寫成固定
    res.render('index.html', { pageCountMessage : null});

    // var col = db.collection('counts');
    // // Create a document with request IP and current time of request
    // col.insert({ip: req.ip, date: Date.now()});
    // col.count(function(err, count){
    //   if (err) {
    //     console.log('Error running count. Message:\n'+err);
    //   }
    //   res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    // });

  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

// Check if MySQL is running!
app.get('/mysql', function(req, res) {
  mysqlClient.query('SELECT 1 + 1 AS solution', function(err, rows, fields) {
    if (err) {
      res.send('NOT OK' + JSON.stringify(err));
    } else {
      res.send('OK: ' + rows[0].solution);
    }
  });
});

// TODO: 尚未修改成 MySQL
// app.get('/pagecount', function (req, res) {
//   // try to initialize the db on every request if it's not already
//   // initialized.
//   if (!db) {
//     initDb(function(err){});
//   }
//   if (db) {
//     db.collection('counts').count(function(err, count ){
//       res.send('{ pageCount: ' + count + '}');
//     });
//   } else {
//     res.send('{ pageCount: -1 }');
//   }
// });

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to MySQL. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
