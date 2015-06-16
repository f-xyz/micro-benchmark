require('chai').should();
require('coffee-script/register');

describe('### micro-profiler tests ###', function () {
    //require('../index');
    require('./profile.tests.coffee');
    require('./profileAsync.tests.coffee');
    require('./suite.tests.coffee');
});
