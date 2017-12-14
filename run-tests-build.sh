#!/bin/bash -x
# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0
# The script uses the docker image composer-build:latest
# Usage docker run -ti -v /var/lib/jenkins/workspace/build-packages-composer/:/tmp/composer composer-build:latest /tmp/composer/run-tests-build.sh --build_version 1.0.3
WORKDIR="/tmp/composer"
cd $WORKDIR
if [[ -n "$2" ]]; then
    build_version="$2"
else
    build_version=$(git log -1 --date=short --pretty=format:%cd)
fi
rm -Rf $WORKDIR/node_modules
rm -f $WORKDIR/*.deb; rm -f $WORKDIR/*.rpm
npm install
yarn install
yarn run compile:angular --environment=webprod
cd $WORKDIR
# Build deb and rpm packages using fpm from ng-dist passing the destination folder for the deploy to be /var/www/arvados-composer/
fpm -s dir -t deb  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files $WORKDIR/ng-dist/=/var/www/arvados-composer/
fpm -s dir -t rpm  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" $WORKDIR/ng-dist/=/var/www/arvados-composer/

mkdir $WORKDIR/packages
mkdir $WORKDIR/packages/centos7
mkdir $WORKDIR/packages/ubuntu1404
mkdir $WORKDIR/packages/ubuntu1604
mkdir $WORKDIR/packages/debian8
mkdir $WORKDIR/packages/debian9
cp $WORKDIR/*.rpm $WORKDIR/packages/centos7/
cp $WORKDIR/*.deb $WORKDIR/packages/ubuntu1404/
cp $WORKDIR/*.deb $WORKDIR/packages/ubuntu1604/
cp $WORKDIR/*.deb $WORKDIR/packages/debian8
cp $WORKDIR/*.deb $WORKDIR/packages/debian9
