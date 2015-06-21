#!/usr/bin/env bash

commitMessage=$1
: ${commitMessage:='.'}

gulp clean build

git add --all .
git commit -m "${commitMessage}"
git push -u origin master

sudo npm publish