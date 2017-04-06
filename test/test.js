var chai     = require('chai');
var expect   = chai.expect;
var should   = require('should');
var request  = require('supertest');
var app      = require('../app.js');

var express  = require('express'),
    config   = require('../config'),
    jwt      = require('jsonwebtoken'),
    ejwt     = require('express-jwt');

var jwtCheck = ejwt({
    secret: config.secretKey
});
var jw;
var cookie;
var data = {
    username: "testUser",
    password: "123",
    balance: "10000",
    domain: "testdomain.testm"
}
describe('/POST регистрация пользователей: ', function() {

    it('Проверка на возвращение cookie с параметрами пользователя.', function (done) {
        request(app)
            .post('/user/create')
            .send({username:data.username,password:data.password,balance: data.balance})
            .end(function (err, res) {
                res.should.have.property('status').which.equal(201);
                res.body.username.should.equal('testUser');
                res.body.password.should.equal('123');
                res.body.balance.should.equal('10000');
                res.body.should.have.property('username');
                res.body.should.have.property('password');
                res.body.should.have.property('balance');
                expect(res.headers.set-cookie).to.not.be.null;
                done();
            });
    });
    it('Проверка указания пользователем параметров запроса.', function (done) {
        request(app)
            .post('/user/create')
            .end(function (err, res) {
                res.should.have.property('status').which.equal(400);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Вы не указали логин, пароль и баланс.');
                done();
            });
    });
    it('Проверка ввода пользователем данных, которые уже есть в базе.', function (done) {
        request(app)
            .post('/user/create')
            .send({username:data.username,password:data.password,balance: data.balance})
            .end(function (err, res) {
                res.should.have.property('status').which.equal(403);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Пользователь с таким именем уже существует.');
                done();
            });
    });

});
describe('/POST авторизация пользователей: ', function() {
    it('Проверка успешной авторизации, и возвращение cookie с параметрами пользователя.', function (done) {
        request(app)
            .post('/user/login')
            .send({username:data.username,password:data.password})
            .end(function (err, res) {
                jw = jwt.sign({ __user_id: data.username  }, config.secretKey);
                cookie = (res.headers['set-cookie'].pop().split(';')[0]);
                res.should.have.property('status').which.equal(201);
                res.body.username.should.equal('testUser');
                res.body.password.should.equal('123');
                res.body.should.have.property('username');
                res.body.should.have.property('password');
                expect(res.headers.set-cookie).to.not.be.null;
                done();
            });
    });
    it('Проверка указания пользователем параметров запроса.', function (done) {
        request(app)
            .post('/user/login')
            .end(function (err, res) {
                res.should.have.property('status').which.equal(400);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Вы должны указать логин и пароль.');
                done();
            });
    });
    it('Проверка указания пользователем существующего в базе логина.', function (done) {
        request(app)
            .post('/user/login')
            .send({username:"wrong",password:data.password})
            .end(function (err, res) {
                res.should.have.property('status').which.equal(401);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Логин не существует');
                done();
            });
    });
    it('Проверка указания пользователем правильного пароля.', function (done) {
        request(app)
            .post('/user/login')
            .send({username:data.username,password:"wrong"})
            .end(function (err, res) {
                res.should.have.property('status').which.equal(402);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Вы ввели неверный логин или пароль');
                done();
            });
    });
});
describe('/GET авторизация пользователей: ', function() {
    it('Проверка успешной авторизации пользователя.', function (done) {
        request(app)
            .get('/user/verify')
            .set('Authorization', 'Bearer ' + jw)
            .end(function (err, res) {
                res.should.have.property('status').which.equal(201);
                res.should.have.property('text').which.equal('Пользователь найден.');
                done();
            });
    });
});
describe('/POST интеграция домена и пользователя: ', function() {
    it('Проверка доступности домена.', function (done) {
        request(app)
            .post('/check')
            .set('Origin','https://www.namecheap.com/')
            .send({domain:data.domain})
            .end(function (err, res) {
                res.should.have.property('status').which.equal(201);
                done();
            });
    });
    it('Проверка успешной регистрации домена.', function(done) {
        request(app)
            .post('/user/domain_reg')
            .set('cookie',cookie)
            .send({ domain:data.domain})
            .end(function(err, res) {
                res.should.have.property('status').which.equal(201);
                res.body.username.should.equal('testUser');
                res.body.domain.should.equal('testdomain.testm');
                res.body.should.have.property('username');
                res.body.should.have.property('domain');
                res.body.should.have.property('id');
                expect(res.headers.set-cookie).to.not.be.null;
                done();
            });
    });
    it('Проверка повторной фиксации домена с идентичным названием.', function(done) {
        request(app)
            .post('/user/domain_reg')
            .set('cookie',cookie)
            .send({ domain:data.domain})
            .end(function(err, res) {
                res.should.have.property('status').which.equal(403);
                res.should.have.property('text').which.equal('Домен зафиксирован, перейдите к оплате.');
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                done();
            });
    });
    it('Проверка указания пользователем параметров запроса.', function(done) {
        request(app)
            .post('/user/domain_reg')
            .set('cookie',cookie)
            .end(function(err, res) {
                res.should.have.property('status').which.equal(400);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.be.NaN;
                res.should.have.property('text').which.equal('Вы должны указать домен.');
                done();
        });
    });
});
describe('/GET оплата домена пользователем: ', function() {
    it('Проверка успешной оплаты домена пользователем.', function (done) {
        request(app)
            .get('/user/domain_pay')
            .set('cookie',cookie)
            .end(function(err, res) {
                res.should.have.property('status').which.equal(201);
                res.body.username.should.equal('testUser');
                res.body.status_pay.should.equal(1);
                res.body.should.have.property('username');
                res.body.should.have.property('status_pay');
                expect(res.headers.set-cookie).to.not.be.null;
                done();
        });
    });
    it('Проверка повторной оплаты домена пользователем.', function (done) {
        request(app)
            .get('/user/domain_pay')
            .set('cookie',cookie)
            .end(function(err, res) {
                res.should.have.property('status').which.equal(401);
                res.should.have.property('text').which.equal('Данный домен уже оплачен.');
                expect(res.headers.set-cookie).to.not.be.null;
                done();
            });
    });
   /** it('Проверка необходимых средств пользователя для оплаты домена.', function (done) {
        request(app)
            .get('/user/domain_pay')
            .set('cookie',cookie)
            .end(function(err, res) {
                res.should.have.property('status').which.equal(402);
                expect(res.body).to.be.empty;
                expect(res.headers.set-cookie).to.not.be.null;
                res.should.have.property('text').which.equal('Недостаточно средств.');
               // console.log(res);
                done();
            });
    });**/
});
//хероку, создать репозиторий, пушить проект push travis, поставить автодеплой в хероку


