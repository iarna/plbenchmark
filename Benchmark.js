var sprintf = require('sprintf').sprintf;
var proc = require('getrusage');

function Timer() {
    this.wall = [0,0];
    this.usr = this.sys = 0;
}
Timer.prototype = {
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

var donothing = function(){};
var nullruncache = {sync:{},async:{}};

var timeit = {
    sync: function (count,todo,result) {
        todo(); // once to prime the cache
        var timer = new Timer();
        timer.start();
        for (var i=0; i<count; ++i) {
            todo();
        }
        timer.pause();
        result(timer);
    },
    async: function (count,todo,result) {
        var i = 0;
        var timer = new Timer();
        var runtest = function(){
            timer.start();
            todo(completetest);
        };
        var completetest = function () {
            timer.pause();
            if (++i < count ) {
                setImmediate(runtest);
            }
            else {
                result(timer);
            }
        }
        // This runs it once without timing information in order to prime
        // the cache.
        todo(runtest);
    }
};
exports.timethis = function(count,todo,result) {
    var nullbench;
    var sora;
    if ( todo.length == 0 ) {
        sora = 'sync';
        nullbench = donothing;
    }
    else {
        sora = 'async';
        nullbench = function(done){done()};
    }
    timeit[sora]( count, nullbench, function (timer) {
        var nulltimings = timer.get();
        timeit[sora]( count, todo, function (timer) {
            result(timer.get(nulltimings));
        });
    });
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
    var benchiter = function(benchno) {
        var todo_label = todo_labels[benchno];
        if (benchno >= todo_labels.length) return complete(count,results);
        var todo_func = todo[todo_label];
        var summarizebench = function () {
            report(count,todo_label,results[todo_label]);
            benchiter(benchno+1);
        };
        exports.timethis(count, todo_func, function(result) {
            results[todo_label] = result;
            setImmediate(summarizebench);
        });
    }
    benchiter(0);
}
