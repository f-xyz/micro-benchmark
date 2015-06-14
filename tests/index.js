require('chai').should();
require('coffee-script/register');

describe('### micro-profiler tests ###', function () {
    require('./profile.tests.coffee');
    require('./profileAsync.tests.coffee');
});
