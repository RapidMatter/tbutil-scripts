var gulp = require('gulp');
var concat = require('gulp-concat');

function tags() {
    return gulp.src(['lib/*.js','tags.js'])
        .pipe(concat('tags.js'))
        .pipe(gulp.dest('dist/'));
};

exports.default = tags;
