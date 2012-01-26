#!/usr/bin/env node

var fs = require('fs'),
    http = require('http'),
    querystring = require('querystring'),
    jsDump = require('jsDump'),
    debug = true;

var log = function(o) {
    if (debug) {
        console.log('##########################################################');
        console.log(o);
    }
};

// http request that does a callback request
var req = function(options) {
    var r = http.request(options, function(res) {
        log('http.request options:');
        log(options);
        var resBody = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            resBody += chunk;
        });
        res.on('end', function() {
            log('response body');
            log(jsDump.parse(JSON.parse(resBody)));
            var resJSON = JSON.parse(resBody);
            var callback = resJSON.callback;
            if(callback && callback.options) {
                var req2 = req(callback.options);
                if (callback.data) {
                    log('callback request data');
                    log(JSON.stringify(callback.data));
                    req2.write(JSON.stringify(callback.data));
                }
                req2.end();
            } else {
                log('done with task creation. do tasks...');
                tasksCreated === false ? doTasks() : allDone();
            }
        });
        res.on('error', function(err) {
            if (err) {
                console.log('response error.')
                console.log(err);
            }
        });
    });
    r.on('error', function(err) {
        if (err) {
            console.log('request error.');
            console.log(err);
        }
    });
    return r;
};

var tasksCreated = false;

var allDone = function() {
    console.log('Done!');
};

var doTasks = function() {
    tasksCreated = true;
    var options = {
        host: 'localhost',
        port: 5984,
        path: '/kujua/_design/kujua-export/_rewrite/tasks_referral/pending',
        method: 'GET'
    };
    var r = req(options);
    r.end();
};

var run = function(options, data) {
    var qs = querystring.stringify(data);
    options.headers['Content-Length'] = qs.length;
    // smsform message is received
    var r = req(options);
    log('request data');
    log(qs);
    r.write(qs);
    // TODO request new tasks/referrals to be sent out
};

var options = {
    host: 'localhost',
    port: 5984,
    path: '/kujua/_design/kujua-export/_rewrite/add',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
};

log('smssync format example referral form from clinic:');
var data = {
    from: '+13125551212', // clinic.contact.phone
    message: '1!MSBR!2012#1#24#99345678901#1111#bbbbbbbbbbbbbbbbbbbb#22#8#cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    sent_timestamp: '1-19-12 18:45',
    sent_to: '+15551212',
    message_id: '13579',
    foo: 'bar' // extra is ok
};
log(data);

run(options, data);

log('smssync format example counter referral from health center:');
var data = {
    from: '+13124449999', // health_center.contact.phone
    message: '1!MSBC!2012#1#16#99345678901#5#abcdefghijklmnopqrst#31#bcdefghijklmnopqrstu#cdefghijklmnopqrstuv#5#defghijklmnopqrstuvw#efghijklmnopqrstuvwxyzabcdefghijklm',
    sent_timestamp: '1-25-12 18:45',
    sent_to: '+12223333333',
    message_id: '13579',
    foo: 'bar' // extra is ok
};
log(data);

// counter referral comes after referral
setTimeout(function(){tasksCreated=false; run(options, data);}, 1000);