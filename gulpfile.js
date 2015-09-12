var gulp = require('gulp');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify'); // js
var minifyCss = require('gulp-minify-css'); // css
var autoprefixer = require('gulp-autoprefixer'); // css
var browserSync = require('browser-sync').create();

// Default gulp task is watch. It starts browsersync for live editing
gulp.task('default', ['watch']);

// Starts static server + watches files
gulp.task('watch', ['css'], function() {
    // wamp must be running
    browserSync.init({
        proxy: "localhost/portfolio/"
    });

    gulp.watch("css/*.css", ['css']);
    gulp.watch("js/*.js", ['js']);
    gulp.watch("*.html").on('change', browserSync.reload);
});

// Minify css from css folder, save it to dist/css and auto-inject into browser sync
gulp.task('css', function() {
    return gulp.src("css/*.css")
        .pipe(autoprefixer())
        .pipe(minifyCss({compatibility: 'ie10'}))
        .pipe(gulp.dest('dist/css'))
        .pipe(browserSync.stream());
});

// Minify js from js folder, save it to dist/js and auto-reload browser sync
gulp.task('js', function() {
  return gulp.src('js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('dist/js'))
    .pipe(browserSync.reload);
});