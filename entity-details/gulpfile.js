var gulp = require('gulp');
var concat = require('gulp-concat');

function entitydetails() {
    return gulp.src(['entity-details.js'])
        .pipe(concat('entity-details.js'))
        .pipe(gulp.dest('dist/'));
};

exports.default = entitydetails;
