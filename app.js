'use strict'
var express         = require('express');
var cookieParser    = require('cookie-parser');
var bodyParser      = require('body-parser');
var cors            = require('cors');
var path            = require("path");
var favicon         = require('serve-favicon');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

app.use('/', routes);
app.use(users);

const port = process.env.PORT || 3000;

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}
app.listen(port,function () {
    console.log('Server running on'+port);
});


app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;

