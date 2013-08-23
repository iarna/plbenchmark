var sprintf = require('sprintf').sprintf;
var proc = require('getrusage');

var nullfunc = function(){};
var nullasyncrun = function(done){done()};
var nullruncache = {sync:{},async:{}};

var timer = {
    reset: function () { this.wall = [0,0]; this.usr = this.sys = 0 },
    start: function () {
        var usage = proc.usage();
        this.started = { wall: process.hrtime(), usr: usage.utime, sys: usage.stime };
    },
    pause: function () {
        var usage = proc.usage();
        this.usr += usage.utime - this.started.usr;
        this.sys += usage.stime - this.started.sys;
        var walldur = process.hrtime(this.started.wall);
        this.wall[0] += walldur[0];
        this.wall[1] += walldur[1];
        this.wall[0] += (this.wall[1] / 1e9)|0;
        this.wall[1] = this.wall[1] % 1e9;
    },
    get: function (nullrun) {
        var result = {wall:this.wall[0] + (this.wall[1]/1e9), usr:this.usr, sys:this.sys};
        if (nullrun) {
            result.wall -= nullrun.wall;
            result.usr -= nullrun.usr;
            result.sys -= nullrun.sys;
        }
        return result;
    }
};

exports.timethis_sync = function(count,todo,result) {
    var timeit = function (nullrun) {
        todo(); // once to prime the cache
        timer.reset();
        timer.start();
        for (var i=0; i<count; ++i) {
            todo();
        }
        timer.pause();
        result(timer.get(nullrun));
    };
    if ( nullruncache.sync[count] ) {
        timeit( nullruncache.sync[count] );
    }
    else {
        nullruncache.sync[count] = {wall:0,usr:0,sys:0};
        exports.timethese(count,{nullrun:nullfunc},nullfunc,nullfunc,
            function (count,results) {
                timeit( nullruncache.sync[count] = results['nullrun'] );
            });
    }
}
exports.timethis_async = function(count,todo,result) {
    var timeit = function (nullrun) {
        var i = 0;
        timer.reset();
        var runtest = function(){
            timer.start();
            todo(completetest);
        };
        var completetest = function () {
            timer.pause();
            if (i++ < count ) {
                setImmediate(runtest);
            }
            else {
                result(timer.get(nullrun));
            }
        }
        todo(runtest); // once to prime the cache
    };
    if ( nullruncache.async[count] ) {
        timeit( nullruncache.async[count] );
    }
    else {
        nullruncache.async[count] = {wall:0,usr:0,sys:0};
        exports.timethese( count, {nullrun:nullasyncrun}, nullfunc, nullfunc,
            function (count,results) {
                timeit( nullruncache.async[count] = results['nullrun'] );
            });
    }
}

exports.timethese = function(count,todo,header,report,complete) {
    header = header || function (count,labels) {
        console.log(sprintf("Benchmark: timing %d iterations of %s...",count,labels.join(', ')));
    };
    report = report || function (count,label,result) {
        console.log(sprintf('%14s: %3.2f wallclock secs ( %.2f usr + %.2f sys = %.2f CPU ) @ %.2f/s (n=%d)',
            label, result.wall, result.usr, result.sys, result.usr+result.sys, 
            count / (result.usr+result.sys), count ));
    };
    complete = complete || function (count,results) {};
    var todo_labels = Object.keys(todo);
    header( count, todo_labels );
    var results = {};
    var testiter = function(testno) {
        var todo_label = todo_labels[testno];
        if (testno >= todo_labels.length) return complete(count,results);
        var todo_func = todo[todo_label];
        var summarizetest = function () {
            report(count,todo_label,results[todo_label]);
            testiter(testno+1);
        };
        if (todo_func.length==0) {
            exports.timethis_sync(count, todo_func, function(result) {
                results[todo_label] = result;
                setImmediate(summarizetest);
            });
        }
        else {
            exports.timethis_async(count, todo_func, function(result) {
                results[todo_label] = result;
                setImmediate(summarizetest);
            });
        }
    }
    testiter(0);
}
