module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        less: {
            all: {
                options: {
                    compress: true,
                    ieCompat: true
                },
                files: {
                  'website/css/styles.css': 'website/less/import.less'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');

    grunt.registerTask('default', ['less']);

};
