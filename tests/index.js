require('babel/register');
require('coffee-script/register');

var chai = require('chai');

void function () {
    chai.should();
}();

describe('### micro-profiler tests ###', function () {
    require('./profile.tests');
    require('./suite.tests');
    require('./report.tests.coffee');
    require('./util.tests');
    require('./integration.tests');
});
