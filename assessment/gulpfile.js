var gulp = require('gulp');
var concat = require('gulp-concat');

function highlander() {
    return gulp.src(['lib/*.js','highlander.js'])
        .pipe(concat('highlander.js'))
        .pipe(gulp.dest('dist/'));
};

function csv() {
  return gulp.src(['lib/*.js', 'csv.js'])
        .pipe(concat('csv.js'))
        .pipe(gulp.dest('dist/'));
}

exports.default = highlander;
exports.csv = csv;
