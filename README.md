plbenchmark
-----------

Simple benchmarking with system and user time breakouts for node.  Inspired
by Perl's core Benchmark module.  It uses CPU time as its core measure,
rather then wallclock time, which makes it more useful if you aren't
dedicating your machine to running only the benchmarks.

Usage
-----

    var timethese = require('plbenchmark').timethese;

With synchronous benchmarking targets:

    timethese( 1000, {
            Name1: function () { ...code... },
            Name2: function () { ...code... }
        },
        function onStart(count,labels) { ... }, 
        function onOneComplete(count,label,result) { ... } ,
        function onAllComplete(count,results) { ... });

With async targets:

    timethese( 1000, {
            Name1: function (done) { ...code...; done() },
            Name2: function (done) { ...code...; done() },
        },
        function onStart(count,labels) { ... }, 
        function onOneComplete(count,label,result) { ... } ,
        function onAllComplete(count,results) { ... });

You can mix and match sync and async targets.

You can also time a single function with:

    var timethis = require('plbenchmark').timethis;
    timethis( 1000, function toBenchmark() { ...code... }, function onResult(result) { ... });

Exported Functions
------------------

* `timethese(count,todo,before,completed_one,completed_all)`

Where `count` is the number of iterations, `todo` has property keys with the
name of each thing you're benchmarking and values that are a function to
execute that.

For each property in `todo` a call to `timethis` is made with `count` and
the value of the property.  The `completed` callback is used to keep track
of the results and ensure the benchmarks are executed serially.

The final three arguments are optional, and if you don't pass them in
defaults are used that report on the results of the benchmark.

`before` will be called just before the benchmark starts with
`(count,labels)`.  `labels` are the keys from `todo`.

`completed_one` is called after an item being benchmarked is completed. 
It's passed `(count,label,result)`.  `result` is a object with `wall`, `usr`
and `sys keys, see `timethis` for details.

`completed_all` is called after all of the benchmarks complete, with
`(count,result)`.


* `timethis(count,benchmark_func,completed)`

`benchmark_func` is a function will be called `count` times and the total execution
time measured.  If `benchmark_func` takes an argument, it's assumed to be async and it
will be pased a function to call when its complete.  In async mode, the next
call to `benchmark_func` will only occur after the previous one calls `done`.

When `count` calls have been completed, the `completed` function is called
with an object with `wall`, `usr` and `sys` keys.  `wall` is the amount of
wallclock time that elapsed, `usr` is the amount of user-space CPU time that
was consumed and `sys` is the amount of kernel-space CPU time that was
consumed.  `usr` + `sys` is the total amount of CPU time consumed by this
benchmark, and will always be less then or equal to the wallclock time.

In order to not report on its own overhead, it internally executes a
benchmark on an empty function and subtracts the result of that from the
timings on your benchmark.

Todo
----

Add support for time rather then count based benchmarking ala negative
numbers with `cpan/Benchmark` and default behavior with `npm/bench`.

Add an overall summary to the end ala `Benchmark::cmpthese`.


Credit Where Credit Is Due
--------------------------

API shamelessly stolen from https://metacpan.org/module/Benchmark
