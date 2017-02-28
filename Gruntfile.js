module.exports = function(grunt) {

  // Project tasks configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jsbeautifier: {
      options: {
        config: './.jsbeautifyrc'
      },
      files : ['js/**/*.js', '!js/**/__*.js', '!js/library/coreLibrary/modernizr*.js', '!js/library/nls/**/*.js']
    },

    jshint: {
      options: {
        jshintrc: true,
        ignores: ['js/**/__*.js', 'js/library/coreLibrary/modernizr*.js']
      },
      src: ['js/**/*.js']
    }
  });

  // Load grunt plugins
  grunt.loadNpmTasks('grunt-jsbeautifier');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default tasks
  grunt.registerTask('default', ['jsbeautifier', 'jshint']);
};
