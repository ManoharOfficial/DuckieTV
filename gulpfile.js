/**
 * Gulp file (experimental) to concat all the scripts and minimize load time.
 * Usage:
 *
 * npm install gulp gulp-autoprefixer gulp-minify-css gulp-jshint gulp-concat gulp-notify gulp-rename gulp-replace gulp-json-editor js-beautify request --save-dev
 * gulp
 * 
 * to generate deployment packages:
 *
 * gulp deploy 
 */

var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    minifycss = require('gulp-minify-css'),
    jshint = require('gulp-jshint'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    concatCss = require('gulp-concat-css'),
    replace = require('gulp-replace'),
    notify = require('gulp-notify'),
    jsonedit = require("gulp-json-editor"),
    zip = require('gulp-zip'),
    fs = require('fs'),
    request = require('request');

var ver = String(fs.readFileSync('VERSION'));
  
// scripts are provided in order to prevent any problems with the load order
var scripts = ['./js/controllers/*.js', './js/directives/*.js','./js/services/*.js', './js/app.js'];

/**
 * Dependencies for the app, will be rolled into deps.js
 */
var deps = ['./js/vendor/promise-3.2.0.js',
'./js/vendor/CRUD.js',
'./js/vendor/CRUD.SqliteAdapter.js',
'./js/CRUD.entities.js',
"./js/vendor/angular.min.js",
"./js/vendor/angular-sanitize.min.js",
"./js/vendor/angular-route.min.js",
"./js/vendor/angular-xml.min.js",
"./js/vendor/ui-bootstrap-tpls-0.10.0.min.js",
"./js/vendor/tmhDynamicLocale.js",
"./js/vendor/datePicker.js",
"./js/vendor/dialogs.js",
"./js/vendor/angular-translate.min.js",
"./js/vendor/angular-translate-loader-static-files.min.js",
"./js/vendor/angular-translate-handler-log.min.js",
"./js/vendor/sha1.js" ];

/**
 * CSS files to be concatted. Note that there's separate code to include print.js
 */
var styles = [
    './css/bootstrap.min.css',
    './css/main.css',
    './css/anim.css',
    './css/dialogs.css',
    './css/flags.css'
];

/**
 * Minimum app dependencies for background.js
 */ 
var background = [
    "js/vendor/promise-3.2.0.js",
    "js/vendor/CRUD.js",
    "js/vendor/CRUD.SqliteAdapter.js",
    "js/CRUD.entities.js",
    "js/vendor/angular.min.js",
    "js/vendor/angular-sanitize.min.js",
    "js/directives/torrentDialog.js",
    "js/services/SettingsService.js",
    "js/services/StorageSyncService.js",
    "js/services/SceneNameResolver.js",
    "js/services/EventWatcherService.js",
    "js/services/EventSchedulerService.js",
    "js/services/EpisodeAiredService.js",
    "js/services/FavoritesService.js",
    "js/services/TraktTV.js",
    "js/services/ThePirateBay.js",
    "js/services/MirrorResolver.js",
    "js/services/WatchlistCheckerService.js",
    "js/services/WatchlistService.js",
    "js/background.js"
]

/**
 * Default and depoyment tasks:
 * Concats scripts, dependencies, background page, styles, alters the main template to use dist versions and writes all of this the local dist/ directory
 */
gulp.task('default', ['concatScripts','concatDeps','concatBackgroundPage','concatStyles','launch.js','tabTemplate','scenenames'], function() {
    notify('packaging to dist/ done');
});


/**
 * Start the cascade to be able to create zip packages.
 * This executes, via sequence dependencies:
 * - default task
 * - copy dist files and dependencies into 3 individual directories in ../deploy/
 * - copy chromecast js and tab.html into place
 * - adjust manifests to include version info and write that to ../deploy/<flavour>/manifest.json
 * - zip files from ../deploy/<flavour>/ into ../deploy/<flavour>-<version>.zip
 * - copy that file into ../deploy/<flavour>-latest.zip
 */ 
gulp.task('deploy', ['zipbrowseraction','zipnewtab','zipopera'], function() {
    
    gulp.src('../deploy/newtab-'+ver+'.zip')
            .pipe(rename('newtab-latest.zip'))
            .pipe(gulp.dest('../deploy/'));
    gulp.src('../deploy/browseraction-'+ver+'.zip')
            .pipe(rename('browseraction-latest.zip'))
            .pipe(gulp.dest('../deploy/'));
    gulp.src('../deploy/opera-'+ver+'.zip')
            .pipe(rename('opera-latest.zip'))
            .pipe(gulp.dest('../deploy/')); 
    notify('DEPLOY done to ../deploy/ !');    

});

gulp.task('scenenames', function() {
    notify('downloading new scene name exceptions');
    request('https://raw.githubusercontent.com/midgetspy/sb_tvdb_scene_exceptions/gh-pages/exceptions.txt', function(error,response,result) {
        var output = {};
        result = result.split(/,\r\n/g).map(function(line) {
           var l = line.match(/([0-9]+): '(.*)'/);
           if(l) {
               var candidates = l[2].split("', '");
               output[l[1]] = candidates[0].replace('\\\'',"'").replace(/\(US\)/,"").replace(/\([1-2][09]([0-9]{2})\)/,'').trim();
           } 
        });
        var sceneNameFile = fs.readFileSync('js/services/SceneNameResolver.js');
        var output = sceneNameFile.toString().replace(/exceptions \= (\{[\s\S]+\})\;/g, 'exceptions = '+JSON.stringify(output,null,4)+';');
        fs.writeFileSync('js/services/SceneNameResolver.js', output);
        notify('SceneNameResolver.js was updated');
    })
})



/**
 * Tasks for internal use
 * Each task called by the main task is listing the tasks that need to be executed as dependencies as an array as the second argument
 * Since tasks run in parallell by default, this can seem confusing at first 
 */

/*------------------------------------------------------------------------*/

/**
 * Concat the scripts array into a file named dist/app.js
 */
gulp.task('concatScripts',function() {
    return gulp.src(scripts)
        .pipe(concat('app.js', {newLine: ';'}))
        .pipe(gulp.dest('dist/'))
        .pipe(notify({ message: 'Scripts packaged to dist/app.js' }));
})

/**
 * Concat the dependencies array into a file named dist/deps.js
 */
gulp.task('concatDeps',function() {
     return gulp.src(deps)
        .pipe(concat('deps.js', {newLine: ';'}))
        .pipe(gulp.dest('dist/'))
        .pipe(notify({ message: 'Deps packaged to dist/deps.js' }));
})

/**
 * Concat the background page and it's dependencies into dist/background.js
 */
gulp.task('concatBackgroundPage', function() {
    return gulp.src(background)
        .pipe(concat('background.js', {newLine: ';'}))
        .pipe(gulp.dest('dist/'))
        .pipe(notify({ message: 'Background page packaged to dist/background.js' }));
})

/** 
 * Copy launch.js into place
 */
gulp.task('launch.js', function() {
    return gulp.src('launch.js')
        .pipe(gulp.dest('dist/'));
})

/**
 * Parse tab.html and grab the deploy:replace comments sections.
 * Grab the parameter value to those tags, and replace the content with that so that we're left with with just a couple of includes
 */
gulp.task('tabTemplate', function() {
     return gulp.src(['tab.html'])
        .pipe(replace(/<!-- deploy:replace\=\'(.*)\' -->([\s\S]+?)[^\/deploy:]<!-- \/deploy:replace -->/g, '$1'))
        .pipe(gulp.dest('dist/'))
        .pipe(notify({ message: 'Tab template deployed' }));
})

/**
 * Concat the styles.js into dist/style.css
 */
gulp.task('concatStyles', function() {
    return gulp.src(styles)
            .pipe(concatCss("style.css"))
            .pipe(gulp.dest('dist/'))
            .pipe(notify({ message: 'Styles concatted' }));
})

/**
 * Move print.css into place
 */
gulp.task('print.css', function() {
    return gulp.src('css/print.css')
        .pipe(gulp.dest('dist/'));
})

/**
 * Deployment and packaging functions
 */
 
gulp.task('copyToDeploy', ['default'], function() {
  return gulp.src(['VERSION', '_locales/**','dist/**','fonts/**','img/**','templates/**'],{ "base" : "." })
        .pipe(gulp.dest('../deploy/browseraction'))
        .pipe(gulp.dest('../deploy/newtab'))
        .pipe(gulp.dest('../deploy/opera'));
});

/**
 * Copy the altered tab.html into place
 */
gulp.task('copytab', ['copyToDeploy'], function() {
    return gulp.src('dist/tab.html')
        .pipe(gulp.dest('../deploy/browseraction'))
        .pipe(gulp.dest('../deploy/newtab'))
        .pipe(gulp.dest('../deploy/opera'));
});

/**
 * Copy the cast_sender.js into place
 * Todo: edit the actual script that includes this to grab it from dist/ and put that into place
 */
gulp.task('copychromecast',['copyToDeploy'], function() {
     return gulp.src('js/vendor/cast_sender.js')
            .pipe(gulp.dest('../deploy/browseraction/js/vendor/'))
            .pipe(gulp.dest('../deploy/newtab/js/vendor/'))
            .pipe(gulp.dest('../deploy/opera/js/vendor/'));
});

/**
 * Adjust all 3 versions of manifest.json to use the dist versions of scripts
 * launch.js contains the button attach code for browser-action mode
 * Also updates the manifest to include the latest version defined in the VERSION file
 */
gulp.task('manifests',['copychromecast','copytab'], function() {
     
     // js-format formatting options used in manipulating manifest.json
    var formatOptions = {
        'indent_char': '\t',
        'indent_size': 1,
        'brace_style': 'end-expand'
    }

    var noLaunch = function(json) {
        json.version = ver;
        json.background.scripts = ['dist/background.js'];
        return json;
    }

    /**
     * Modify package.json to remove the whole list of background scripts and replace it with dist version and launch.js
     */
    var withLaunch = function(json) {
        json.version = ver;
        json.background.scripts = ['dist/background.js','dist/launch.js'];
        return json;
    }

    gulp.src('manifest.json')
            .pipe(jsonedit(noLaunch, formatOptions))
            .pipe(gulp.dest('../deploy/newtab/'));
    gulp.src('manifest-app.json')
            .pipe(rename('manifest.json'))
            .pipe(jsonedit(withLaunch, formatOptions))
            .pipe(gulp.dest('../deploy/browseraction/'));
    return gulp.src('manifest-opera.json')
            .pipe(rename('manifest.json'))
            .pipe(jsonedit(withLaunch, formatOptions))
            .pipe(gulp.dest('../deploy/opera/'));
});

/**
 * Zip the browser action version
 */
gulp.task('zipbrowseraction', ['manifests'], function() {
     return gulp.src('../deploy/browseraction/**')
            .pipe(zip('browseraction-'+ver+'.zip'))
            .pipe(gulp.dest('../deploy'))
});

/**
 * zip the new tab version
 */

gulp.task('zipnewtab', ['manifests'], function() {
     return gulp.src('../deploy/newtab/**')
            .pipe(zip('newtab-'+ver+'.zip'))
            .pipe(gulp.dest('../deploy'))
});

/**
 * zip the opera version
 */
gulp.task('zipopera', ['manifests'], function() {
    return gulp.src('../deploy/opera/**')
            .pipe(zip('opera-'+ver+'.zip'))
            .pipe(gulp.dest('../deploy'));
});