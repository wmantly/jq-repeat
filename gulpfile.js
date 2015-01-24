'use strict';

var gulp = require('gulp'),
    notify = require('gulp-notify'),    
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    qunit = require('gulp-qunit'),
    runSequence = require('run-sequence');


gulp.task('default', function() {
  runSequence('test.src', 'scripts', 'test.min');
});

gulp.task('scripts', function() {
  return gulp.src('src/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(concat('jq-repeat.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .on('error', function (err) { console.log(err.message); })
    .pipe(gulp.dest('dist/js'))
    .pipe(notify({ message: "Scripts task complete" }));
});

gulp.task('test.src', function() {
    return gulp.src('./tests/test-src.html')
        .pipe(qunit());
});

gulp.task('test.min', function() {
    return gulp.src('./tests/test-min.html')
        .pipe(qunit());
});

gulp.task('test', ['test.min']);