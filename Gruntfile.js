/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-copyright');
  grunt.loadNpmTasks('grunt-jscs');
  grunt.loadNpmTasks('grunt-nodemon');

  grunt.initConfig({
    copyright: {
      app: {
        options: {
          pattern: 'This Source Code Form is subject to the terms of the Mozilla Public'
        },
        src: [
          '*.js',
          'lib/**/*.js',
          'public/**/*.css',
          'public/**/*.js',
          'scripts/**/*',
          'templates/**/*.html'
        ]
      },
      tests: {
        options: {
          pattern: 'Any copyright is dedicated to the Public Domain.'
        },
        src: [
          'test/*.js'
        ]
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshint.json'
      },
      src: [
        '*.js',
        'lib/**/*.js',
        'public/**/*.js',
        'scripts/**/*.js',
        'test/**/*.js'
      ]
    },

    jscs: {
      options: {
        config: '.jscs.json'
      },
      src: ['<%= jshint.src %>']
    },

    csslint: {
      options: {
        csslintrc: '.csslintrc'
      },
      src: 'public/**/*.css'
    },

    nodemon: {
      dev: {
        script: 'index.js'
      }
    }
  });

  grunt.registerTask('default', ['lint', 'copyright']);
  grunt.registerTask('lint', ['csslint', 'jshint', 'jscs']);
  grunt.registerTask('dev', ['nodemon']);
};
