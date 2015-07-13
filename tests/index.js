require('babel/register');
require('coffee-script/register');

var chai = require('chai');

void function () {
    chai.should();
}();

describe('### micro-profiler tests ###', function () {
    //require('./profile.tests');
    //require('./profileAsync.tests.coffee');
    //require('./suite.tests');
    //require('./suiteAsync.tests.coffee');
    //require('./report.tests.coffee');
    //require('./util.tests');
    require('./integration.tests');
});
