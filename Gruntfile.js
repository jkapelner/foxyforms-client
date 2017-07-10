module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['Gruntfile.js', 'main.js'],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    browserify: {
      all: {
        src: 'main.js',
        dest: '<%= pkg.name %>.js',
        options: {
          alias: [
            './lib/browser/form.js:./lib/node/form',
            './lib/browser/http-client.js:./lib/node/http-client'
          ],
          ignore: ['lib/node/**/*'],
					browserifyOptions: {
						standalone: '<%= pkg.name %>'
					}
        }        
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      build: {
        src: '<%= pkg.name %>.js',
        dest: '<%= pkg.name %>.min.js'
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('browser', ['jshint', 'browserify', 'uglify']);
  grunt.registerTask('test', 'run the tests', function(username, apiKey, debug){
    if (apiKey && username) {
      var done = this.async();
      var debugCmd = debug ? '--debug-brk ' : '';
      require('child_process').exec('npm test ' + debugCmd + '-- --reporter spec test/test.js --user=' + username + ' --apiKey=' + apiKey, function (err, stdout) {
        grunt.log.write(stdout);
        done(err);
      });
    }
    else {
      grunt.log.writeln("username and apiKey are required to run the tests.");
      grunt.log.writeln("Call \"grunt test:<username>:<apiKey>");
    } 
  });
};


