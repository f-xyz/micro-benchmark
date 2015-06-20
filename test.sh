#!/usr/bin/env bash

spec=$1
: ${spec:='spec'}

mocha --watch --compilers coffee:coffee-script/register tests/index.js -R ${spec}
