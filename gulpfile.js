"use strict";


var gulp = require('gulp'),
    notify = require('gulp-notify'),    
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify');


gulp.task('default', function() {
  gulp.start('scripts');
});

gulp.task('scripts', function() {
  return gulp.src('src/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(concat('repeat.js'))
    .pipe(gulp.dest('dist/js'))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .on('error', function (err) { console.log(err.message); })
    .pipe(gulp.dest('dist/js'))
    .pipe(notify({ message: "Scripts task complete" }));
});