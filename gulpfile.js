var gulp = require('gulp');
var mocha = require('gulp-spawn-mocha');
//var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
//var debug = require('gulp-debug');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
//var jsdoc = require('gulp-jsdoc');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var del = require('del');
var browserify = require('browserify');

gulp.task('default', ['build']);
gulp.task('build', ['clean', 'browserify', 'test'/*, 'jsdoc'*/]);

gulp.task('clean', function (cb) {
    del([
        'dist/',
        'coverage/',
        'docs/'
    ], cb);
});

gulp.task('browserify', function () {
    var bundler = browserify({
        entries: ['./index.js'],
        debug: true,
        detectGlobals: false,
        insertGlobals: false,
        standalone: 'inherits'
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

//gulp.task('jsdoc', function () {
//    return gulp.src('*.js').pipe(jsdoc('docs'));
//});

function getBundleName(ext) {
    var pkg = require('./package.json');
    var name = pkg.name;
    var version = pkg.version;
    return name + '-' + version + ext;
}
