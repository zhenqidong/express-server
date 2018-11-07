// https://mlab.com/home?newDatabase=1
// https://zellwk.com/blog/crud-express-mongodb/
// Promise
// import Promise from 'bluebird'
// import {pick, toPairs} from 'lodash'
const Promise = require('bluebird')
const pick = require('lodash').pick
const toPairs = require('lodash').toPairs

const fieldsToBeEncrypted = [ 'password', 'key']

var db
var serverPort = 3000

//logging
var loggerFormat = ':id [:date[web]] ":method :url" :status :response-time';
var path = require('path')

const OID = require('mongodb').ObjectID
const MongoClient = require('mongodb').MongoClient
const morgan = require('morgan')
const fs = require('fs')
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log', 'access.log'), { flags: 'a' })

const express = require('express')
const bodyParser = require('body-parser')

const bcrypt = require('bcrypt')
const BCRYPT_SALT_ROUNDS = 12
const addrequestId = require('express-request-id')()



// all general functions
const hashPassword = (tuples) => Promise.reduce( tuple,  (agg, [ key, value ]) => 
  bcrypt.hash(value, BCRYPT_SALT_ROUNDS ).then( encValues => ({
    [key]:encValues,
    ...agg
  }), {})
)

const app = express()
// var express = require('express');
// var https = require('https');
// var http = require('http');
// var app = express();

// http.createServer(app).listen(80);
// https.createServer(options, app).listen(443);

app.locals.title = 'General restful server with Mongo backend'
app.locals.email = 'zhenqi.dong@gmail.com' 
// fsevents@1.2.4: The platform "linux" is incompatible with this module
//app.locals.strftime = require('strftime')

app.set('view engine', 'ejs')

//that Express will execute middleware functions in the order they are registered until something sends a res
app.use(bodyParser.urlencoded({useNewUrlParser: true, extended: true}))
// The root argument specifies the root directory from which to serve static assets. The function determines the file to serve by combining req.url with the provided root directory
// just 'public' itself doent work for anything, not even the the js file in /public
// join with __dirname makes it work for global hook such as app.all
//  having static before logging to disable logging for static content 
// requests by loading the logger middleware after the static middleware:
// can have multiple static, but FCFS
app.use(express.static(path.join(__dirname, 'public'))) 
app.use(bodyParser.json())

// Middleware for log handling
morgan.token('id', function getId(req) {
  return req.id 
});

app.use(morgan(loggerFormat, {
  skip: function (req, res) {
      return res.statusCode < 400
  },
  stream: accessLogStream //process.stderr
}));

app.use(morgan(loggerFormat, {
  skip: function (req, res) {
      return res.statusCode >= 400
  },
  stream: accessLogStream // process.stdout
}));

// const logger = morgan('combined')
// logger("trying to log something")
// MongoClient.connect('mongodb://test:Test123@ds151383.mlab.com:51383/node-express-test',
//ops:123456
MongoClient.connect('mongodb://all:allall@localhost/gamma',
    (err,client) => { 
        if(err) {
           console.log("something is wrong", err)
        } else {
           console.log("DB is connected")
           db = client.db('gamma')
           console.log("port in conf file is " + process.env.PORT)
           app.listen(serverPort, function (){
            //console.log("now my server is on " + serverPort || process.env.PORT)
         })           
        }
    }
)

const getDataFromCollection = (table, condition, projection) => {
  //throw new Error('test')
  return db.collection(table).find(condition, projection).toArray()
}
//User CRUD
app.route("/user/:name?")
  .all((req, res, next) => {
    //console.log("Accessing user functions")  
    next()
  })
  .get((req,res) => {
    // /user/zhenqi?noid=1
    // any values of noid will suppress _id, otherwise it'll be returned
    var condition = req.params.name ? { name: req.params.name }: {}      
    var projection = req.query.noid ? { projection:{_id: 0} }: {}
    db.collection('users').find(condition, projection).toArray( (err, results) => {
      if(err){
        res.status(500).json({ error: err.message })
      } else {
        console.log(results)
        if(results){
          res.format({
            'text/plain': function(){
              console.log("text/plain")
              res.send(JSON.stringify(results));
            },
          
            'text/html': function(){
              res.status(406).send('<p>Header isn\'t acceptable </p>');
            },
          
            'application/json': function(){
              res.send(results);
            },
          
            'default': function() {
              // log the request and respond with 406
              res.status(406).send(req.get());
            }
          });        
        } else {
          res.status(404).json({ message: "Not found" })
        }
      }
    })
  })  
  // route can be duplicated, the first one in the order will be called till a res is sent
  .post((req,res, next) => {
    //console.log("This will be called first")
    next()
  })
  .post((req,res) => {

    var prepareDataForInsertion = { ... req.body }
    fieldsToBeEncrypted.map( ef => {
      if( typeof(prepareDataForInsertion[ef]) != 'undefined') {
        prepareDataForInsertion[ef] = bcrypt.hash(req.body[ef], BCRYPT_SALT_ROUNDS)
      } 
    })
    console.log("Inserting data:" + prepareDataForInsertion)
    db.collection('users').insertOne(req.body, (err,result) => {
      if(err) {
        res.status(500).send(err)
      } else {
        res.status(201).end()
      }
     })
  })
  .put((req, res) => {
    console.log('updating', req.body)
    // Update must be based upon _id to differentiate from Insertion
    // if(! req.body._id) {
    //   res.status(400).send("No identity field in posted data.")
    // }
    // var condition = req.body._id ? { _id: req.body._id } : {}
    var condition = req.body.username ? { name: req.body.username }: {}      
    console.log('updating', condition)    
    db.collection('users')
    .findOneAndUpdate(condition, {
      $set: {
        username: req.body.username,
        firstname: req.body.firstnname,
        lastname: req.body.lastname,
        age: req.body.age
      }
    }, {
      sort: {_id: -1},
      upsert: true
    }, (err, result) => {
      if (err) return res.status(500).end(err)
      res.status(201).end()
    })
  })
  .delete((req, res) => {
    console.log(req.params.name)
    var condition = req.params.name ? { name: req.params.name }: {}      
    console.log('Deleting', condition)
    db.collection('users')
    .deleteOne(condition, (err,result) => {
      //console.log(result.result.n)
      if(err) {
        res.status(500).send(err)
      } else {
        if(result.result.n == 0) {
          res.status(404).end("Not Found")
        } else {
          res.status(200).end("Done")
        }
      }
    })
  })  

//user statics
// /query/?collection=users&column
app.route("/data/:collection?/:command?")
  .all((req, res, next) => {
    console.log("Accessing user functions")
    console.log(JSON.stringify(req.body))
    console.log(JSON.stringify(req.params)) 
    console.log(JSON.stringify(req.query))  
    next()
  })
  .get( (req, res) => {
    if( !req.params.command) {
      if( !req.params.collection ){
        res.status(400).send('Invalid request - missing collection')
      } else {
        getDataFromCollection(req.params.collection , {}, {}).then( results => { 
          if(results){
            console.log(results)
            res.format({
              'text/plain': function(){
                console.log("text/plain")
                res.send(JSON.stringify(results));
              },
            
              'text/html': function(){
                res.status(406).send('<p>Header isn\'t acceptable </p>');
              },
            
              'application/json': function(){
                res.json(results);
              },
            
              'default': function() {
                // log the request and respond with 406
                res.status(406).send(req.get());
              }
            });        
          } else {
            res.status(404).send('Not found')
          }
        }).catch( err => {
          res.statusSend(500)
        })
      }      
    } else if(req.params.command === "count") {
      db.collection(req.params.collection).countDocuments({},{}, (err, result) =>{
        if(err) {
          res.status(500).json(err)
        } else {
          res.status(200).send(result.toString())
        }
      })
    } else if (req.params.command === "view") {
      res.render('index.ejs', {quotes: results})      
    } else {
      res.status(400).send("Invalid command")
    }
  })
  .post((req,res, next) => {
    console.log("This will be called first in a post")
    console.log(req.body)
    if(req.params.command) {
      res.status(400).send("Invalid ops, post does not support a command")
    } else {
      next()
    }
  })
  .post((req,res) => {
    console.log(req.body)
    //const fieldsToBeEncrypted = [ 'password', 'key']
    var prepareDataForInsertion = { ... req.body }
    var p = Promise.all(fieldsToBeEncrypted.map(ef => { 
      if( typeof(prepareDataForInsertion[ef]) != 'undefined') {
        return bcrypt.hash(req.body[ef], BCRYPT_SALT_ROUNDS)
      } 
    }))
    p.then(data => {
      data.map( (v,k) =>{
        prepareDataForInsertion[fieldsToBeEncrypted[k]] = v
      })
      db.collection(req.params.collection).insertOne(prepareDataForInsertion, (err,result) => {
        if(err) {
          res.status(500).send(err)
        } else {
          res.status(200).send(result)
        }
       })        
    })
  })
  .put((req, res) => {
    console.log(req.query._id)
    if( ! req.query._id ) res.status(400).end("Invalid request, no _id specified")
    console.log('Updating')    
    return hashPassword(toPairs(pick(req.body, fieldsToBeEncrypted))).then( obj => {
      db.collection(req.params.collection)
      .findOneAndUpdate(
        { _id: new OID(req.query._id) }, 
        {
          $set: { ...req.body, ...obj }
        }, 
        {
          sort: {_id: -1},
          upsert: true
        },
        (err,result) => {
        //console.log(result.result.n)
          if(err) {
            res.status(500).send(err)
          } else {
            if(result.result.n == 0) {
              res.status(404).end("Not Found")
            } else {
              res.status(200).end("Done")
            }
          }
        }
      )        
    })      
  })
  .delete((req, res) => {
    console.log(req.query._id)
    if( req.query._id ) {
      console.log('Deleting')
      db.collection(req.params.collection)
      .deleteOne({ _id: new OID(req.query._id) }, (err,result) => {
        //console.log(result.result.n)
        if(err) {
          res.status(500).send(err)
        } else {
          if(result.result.n == 0) {
            res.status(404).end("Not Found")
          } else {
            res.status(200).end("Done")
          }
        }
      })
    } else {
      res.status(400).end("Invalid request, no _id specified")
    }
  })
// other CRUD
app.get("/src", function(req,res)  {
  //console.log(req)
  res.send(__dirname)
})

app.get("/", function(req,res)  {
  //console.log(req)
  res.sendFile(__dirname + '/index.html')
})

app.get("/download", function(req,res)  {
  //console.log(req)
  res.attachment("download.txt");
  // Content-Disposition: attachment; filename="logo.png"
  // Content-Type: image/png;
  res.send()

  // res.download('/report-12345.pdf', 'report.pdf', function(err){
  //   if (err) {
  //     // Handle error, but keep in mind the response may be partially-sent
  //     // so check res.headersSent
  //   } else {
  //     // decrement a download credit, etc.
  //   }
  // });

})

app.get("/quotes", function(req,res)  {
  db.collection('quotes').find().toArray( (err, results) => {
      console.log(results)
      //res.redirect("/")
      res.render('index.ejs', {quotes: results})
  })
})
  
app.post("/quote", function(req,res)  {
  //console.log(req)

  // DeprecationWarning: collection.save is deprecated. Use insertOne, insertMany, updateOne, or updateMany instead.
  db.collection('quotes').insertOne(req.body, (err,result) => {
     if(err) return err

     res.redirect('/')   
  })
  console.log(req.body);
  
})


app.put('/quotes', (req, res) => {
  console.log('updating', req.body)
  db.collection('quotes')
  .findOneAndUpdate({name: 'Admin'}, {
    $set: {
      name: req.body.name,
      quote: req.body.quote
    }
  }, {
    sort: {_id: -1},
    upsert: true
  }, (err, result) => {
    if (err) return res.send(err)
    res.send(result)
  })
})

