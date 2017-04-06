var mysql = require('mysql');
var pg    = require('pg');

var pool  = mysql.createPool({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'rest_db',
});


//var pg_pool = new pg.Pool(config);
//var global_pool  = process.env.NODE_ENV === 'production' ? pg_pool : pool;

exports.pool = pool;
//exports.global_pool = global_pool;
