var express = require('express'),
    config  = require('../config'),
    jwt     = require('jsonwebtoken'),
    ejwt    = require('express-jwt'),
    db      = require('../db');
var request = require('request');


var app = module.exports = express.Router();

var jwtCheck = ejwt({
    secret: config.secretKey
});

function getUserDB(username, done) {
    db.pool.query('SELECT * FROM users WHERE username = ?', [username], function(err, rows, fields) {
        if (err) throw err;
        done(rows[0]);
    });
}

function getUserDomainsDB(username, done) {
    db.pool.query('SELECT * FROM users_domains WHERE username = ? LIMIT 1', [username], function(err, rows, fields) {
        if (err) throw err;
        done(rows[0]);
    });
}

app.post('/user/create', function(req, res) {
    if (!req.body.username || !req.body.password || !req.body.balance) {
        return res.status(400).send("Вы не указали логин, пароль и баланс.");
    }
    getUserDB(req.body.username, function(user){
        if(!user) {
            user = {
                username: req.body.username,
                password: req.body.password,
                balance: req.body.balance,
            };

            db.pool.query('INSERT INTO users SET ?', [user], function(err, result){

                if (err) throw err;
                    newUser = {

                        id: result.insertId,
                        username: user.username,
                        password: user.password,
                        balance: user.balance,
                    };

                var token = jwt.sign({ __user_id: user.username }, config.secretKey);
                    res.cookie('rest-cokie',token);
                    res.status(201).send(user);
            });
        }
        else res.status(403).send("Пользователь с таким именем уже существует.");
    });
});

app.post('/user/login', function(req, res) {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send("Вы должны указать логин и пароль.");
    }

    getUserDB(req.body.username, function(user){
        if (!user) {
            return res.status(401).send("Логин не существует");
        }

        if (user.password !== req.body.password) {
            return res.status(402).send("Вы ввели неверный логин или пароль");
        }

        var token = jwt.sign({ __user_id: user.username }, config.secretKey);
        res.cookie('rest-cokie',token);
        res.status(201).send(user);
    });
});

app.get('/user/verify', jwtCheck, function(req, res){
    var user = req.user;
    db.pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [user.username], function(err, rows) {
        if(err){
            res.status(402).send("Пользователь не найден.");
        }
        var foundUser = rows[0];
        res.status(201).send("Пользователь найден.");
    });
});

app.post('/check', function(req, response, next) {
    request({
        headers: {
            'Origin': 'https://www.namecheap.com/',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        uri: 'https://api.domainr.com/v2/status?domain=' + req.body.domain + '&client_id=fb7aca826b084569a50cfb3157e924ae',
        method: 'GET'
    }, function (err, res) {
        response.status(201).send(JSON.parse(res.body))
    });

});

app.post('/user/domain_reg',function(req, res) {
    var cookie = req.cookies['rest-cokie'];
    var verifiedJwt = jwt.verify(cookie, config.secretKey);
    if (!req.body.domain) {
        return res.status(400).send("Вы должны указать домен.");
    }
    getUserDomainsDB(verifiedJwt.__user_id, function (user_domains) {
        if (!user_domains) {
            user_domains = {
                username: verifiedJwt.__user_id,
                domain: req.body.domain,
            };
            db.pool.query('INSERT INTO users_domains SET ?', [user_domains], function (err, result) {
                if (err) throw err;
                newUserDomain = {
                    id: result.insertId,
                    username: user_domains.username,
                    domain: user_domains.domain,
                    status_pay: result.status_pay,
                };
                res.status(201).send(newUserDomain);
            })
        }
        else res.status(403).send("Домен зафиксирован, перейдите к оплате.");
    });
});

app.get('/user/domain_pay',function (req,res) {
    var cookie = req.cookies['rest-cokie'];
    var verifiedJwt = jwt.verify(cookie, config.secretKey);
    var domain_pay = 543;
    const update_status = 1;

    getUserDomainsDB(verifiedJwt.__user_id, function (user_domains) {
        user_domains = {
            username: verifiedJwt.__user_id,
            status_pay: user_domains.status_pay,
        };
        if (user_domains.status_pay != 1) {
            getUserDB(verifiedJwt.__user_id, function (user) {
                user = {
                    username: verifiedJwt.__user_id,
                    balance: user.balance,
                };
                if (user.balance - domain_pay >= 0) {
                    db.pool.query('UPDATE users SET balance = ? WHERE username = ?', [user.balance - domain_pay, user.username]);
                    db.pool.query('UPDATE users_domains SET status_pay = ? WHERE username = ?', [user_domains.status_pay = update_status, user_domains.username]);
                    res.status(201).send(user_domains);
                }
                else {
                    res.status(402).send("Недостаточно средств.")
                }
            });
        }
        else {
            res.status(401).send("Данный домен уже оплачен.");
        }
    });
});
