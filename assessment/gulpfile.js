var gulp = require('gulp');
var concat = require('gulp-concat');

function highlander() {
    return gulp.src(['lib/*.js','highlander.js'])
        .pipe(concat('highlander.js'))
        .pipe(gulp.dest('dist/'));
};

exports.default = highlander;
