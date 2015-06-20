var chai = require('chai');

// IIFE
void function () {
    chai.should();
}();

describe('### micro-profiler tests ###', function () {
    require('./profile.tests.coffee');
    require('./profileAsync.tests.coffee');
    require('./suite.tests.coffee');
    require('./report.tests.coffee');
    require('./util.tests.coffee');
});
