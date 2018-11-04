// https://mlab.com/home?newDatabase=1
// https://zellwk.com/blog/crud-express-mongodb/
console.log("test server")

var db

const express = require('express')
const bodyParser = require('body-parser')
const MongoClient = require('mongodb').MongoClient
const app = express()

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({useNewUrlParser: true, extended: true}))
app.use(express.static('public'))
app.use(bodyParser.json())

MongoClient.connect('mongodb://test:Test123@ds151383.mlab.com:51383/node-express-test',
    (err,client) => { 
        if(err) {
           console.log("something is wrong", err)
        } else {
           console.log("DB s connected")
           db = client.db('node-express-test')
        }
    }
)

app.listen(3000, function (){
   //console.log("now my server is on 3001")
})

app.get("/test", function(request,response)  {
  //console.log(request)
  response.send("helloworl")
})
app.get("/src", function(request,response)  {
  //console.log(request)
  response.send(__dirname)
})

app.get("/", function(request,response)  {
  //console.log(request)
  response.sendFile(__dirname + '/index.html')
})

app.get("/download", function(request,response)  {
  //console.log(request)
  // express deprecated res.sendfile: Use res.sendFile instead
  response.sendFile("download.txt");
})

app.get("/quotes", function(request,response)  {
  db.collection('quotes').find().toArray( (err, results) => {
      console.log(results)
      //response.redirect("/")
      response.render('index.ejs', {quotes: results})
  })
})
  
app.post("/quote", function(request,response)  {
  //console.log(request)

  // DeprecationWarning: collection.save is deprecated. Use insertOne, insertMany, updateOne, or updateMany instead.
  db.collection('quotes').insertOne(request.body, (err,result) => {
     if(err) return err

     response.redirect('/')   
  })
  console.log(request.body);
  
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

