require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const url = require("url");
const bodyParser=require("body-parser");
const mongoose = require("mongoose");
//MONGO_URI моя переменная окружения (.env), с сылкой к базе данных монго
mongoose.connect(process.env.MONGO_URI,  { useNewUrlParser: true, useUnifiedTopology:true},function (err) {
   if (err) throw err;
   console.log('Successfully connected');
});
const dns = require('dns');

// Получение подключения по умолчанию
var db = mongoose.connection;
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({extended:false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const emailsSchema = new mongoose.Schema({
original_url:String,
short_url:{type:Number,unique:true}
});

const Email= mongoose.model('Email', emailsSchema);
var alias=0;
var docum;

// Your first API endpoint
app.post('/api/shorturl', function (req, res) {
  const httpRegex = /^(http|https)(:\/\/)/;
if (!httpRegex.test(req.body.url)){res.send({ error: 'invalid url' })
}else{
//findOne будет выполнться некоторое время, поэтому тут нужна async f, чтоб код ждал, покавыполнится findOne
  async function f(){
  await Email.findOne({original_url: req.body.url},(err, doc)=>{
    if(err)console.log(err);
     docum=doc;
    });
//findOne выполнился, теперь проверим через dns, что собой представляет введенный сайт (в консоли). так советовали в уроке, поэтому добавила
const originalURL = req.body.url;
  const urlObject = new URL(originalURL);
  dns.lookup(urlObject.hostname, (err, address, family) => {
    if (err) {
      console.log("error");
}console.log(urlObject)});
//если findOne нашел url в базе:
  if(docum){
  res.send({original_url:docum.original_url,short_url:docum.short_url});
  }
  //если findOne не нашел  url в базе:
  else{
    //ищу последний добавленный документ в базу, чтоб найти текущий alias, он же short_url, так как мне надо присвоить alias+1 для нового url. В уроках  у .exec колбэк с done. Не получалось, потом поняла, что нельзя прописывать тело и аргументы для done, можно было вывести foundEmail в переменную с done, а потом отдельным кодом все остальное, но только понадобилась бы общая асинх ф-ция, так как done внутри foundEmail переменной дожилался лишь выполнения критериев поиска, весь код ниже не ждал бы. Нужно было бы поставить await перед переменной foundEmail. Я предпочла конструкцию колбеков без done, прочитала, так можно, вроде, более того, сейчас используют  async await конструкцию вместо  колбэков
    Email.findOne({}).sort({$natural:-1}).exec((err,foundEmail)=>{if(err)console.log(err);
  if(foundEmail){
  alias=foundEmail.short_url+1;
  }else{
    //случай, если это первый url в базе, тогда 
    alias=1;
  };

  const instance = new Email({
    original_url: req.body.url,
    short_url: alias
  }); 
 
 instance.save(function(err,data){
   if(err)console.log("err");
   data;
 });
 res.send({original_url:instance.original_url,short_url:instance.short_url});
   })
  }
};
  f();//запускаем async f
 }
});

   
app.get("/api/shorturl/:short_url",  (req,res)=>{//async(req,res) возможен,но не нужен
    Email.findOne({short_url: req.params.short_url},(err, doc)=>{
    if(err)console.log(err);
     res.redirect(doc.original_url);
    });
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
