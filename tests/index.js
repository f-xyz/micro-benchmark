require('babel/register');
require('coffee-script/register');

var chai = require('chai');

void function () {
    chai.should();
}();

describe('### micro-profiler tests ###', function () {
    require('./profile.tests');
    require('./integration.tests');
    require('./profileAsync.tests.coffee');
    require('./suite.tests.coffee');
    require('./suiteAsync.tests.coffee');
    require('./report.tests.coffee');
    require('./util.tests.coffee');
});
