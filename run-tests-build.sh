#!/bin/bash -x
# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0
# The script uses the docker image composer-build:latest
# Usage docker run -ti -v /var/lib/jenkins/workspace/build-packages-composer/:/tmp/composer composer-build:latest /tmp/composer/run-tests-build.sh --build_version 1.0.3

cd /tmp/composer/
if [[ -n "$2" ]]; then
    build_version="$2"
else
    build_version=$(git log -1 --date=short --pretty=format:%cd)
fi
rm -Rf /tmp/composer/node_modules
rm -f $WORKSPACE/*.deb; rm -f $WORKSPACE/*.rpm
npm install
yarn install
yarn run compile:angular --environment=webprod
cd /tmp/composer/
# Build deb and rpm packages using fpm from ng-dist passing the destination folder for the deploy to be /var/www/arvados-composer/
fpm -s dir -t deb  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files /tmp/composer/ng-dist/=/var/www/arvados-composer/
fpm -s dir -t rpm  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" /tmp/composer/ng-dist/=/var/www/arvados-composer/

mkdir $WORKSPACE/packages 
mkdir $WORKSPACE/packages/centos7
mkdir $WORKSPACE/packages/ubuntu1404
mkdir $WORKSPACE/packages/ubuntu1604
mkdir $WORKSPACE/packages/debian8
mkdir $WORKSPACE/packages/debian9
cp $WORKSPACE/*.rpm $WORKSPACE/packages/centos7/
cp $WORKSPACE/*.deb $WORKSPACE/packages/ubuntu1404/
cp $WORKSPACE/*.deb $WORKSPACE/packages/ubuntu1604/
cp $WORKSPACE/*.deb $WORKSPACE/packages/debian8
cp $WORKSPACE/*.deb $WORKSPACE/packages/debian9

