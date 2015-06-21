var gulp = require('gulp');
var bump = require('gulp-bump');
var mocha = require('gulp-spawn-mocha');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var del = require('del');
var browserify = require('browserify');
var _ = require('lodash');

function getBundleName(ext) {
    var pkg = require('./package.json');
    return pkg.name + '-' + pkg.version + ext;
}

gulp.task('default', ['build']);
gulp.task('build', ['clean', 'bump', 'browserify', 'test']);
gulp.task('clean', function (cb) {
    del([
        'dist/',
        'coverage/',
        'docs/'
    ], cb);
});
gulp.task('bump', function () {
    return gulp
        .src('./package.json')
        .pipe(bump({ type: 'build-version' }))
        .pipe(gulp.dest('./'));
});
gulp.task('browserify', ['bump'], function () {
    var bundler = browserify({
        entries: ['./index.js'],
        debug: true,
        detectGlobals: true,
        insertGlobals: false,
        standalone: _.camelCase(require('./package.json').name)
    });
    return bundler
        .bundle()
        .pipe(source(getBundleName('.js')))
        .pipe(gulp.dest('dist/'))
        //
        .pipe(rename({ extname: '.min.js' }))
        .pipe(buffer())
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('dist/'))
    ;
});
gulp.task('test', function () {
    return gulp.src('tests/index.js', { read: false })
        .pipe(mocha({
            R: 'spec',
            colors: true,
            watch: false,
            debug: true,
            istanbul: true,
            compilers: 'coffee:coffee-script/register'
        }));
});
gulp.task('test-watch', function () {
    return gulp.src('tests/index.js', { read: false })
        .pipe(mocha({
            R: 'spec',
            colors: true,
            watch: true,
            debug: true,
            istanbul: true,
            compilers: 'coffee:coffee-script/register'
        }));
});