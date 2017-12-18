#!/bin/bash -x
# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0
# The script uses the docker image composer-build:latest
# Usage docker run -ti -v /var/lib/jenkins/workspace/build-packages-composer/:/tmp/composer composer-build:latest /tmp/composer/run-tests-build.sh --build_version 1.0.3
format_last_commit_here() {
    local format="$1"; shift
    TZ=UTC git log -n1 --first-parent "--format=format:$format" .
}

version_from_git() {
    # Output the version being built, or if we're building a
    # dev/prerelease, output a version number based on the git log for
    # the current working directory.
    if [[ -n "$ARVADOS_BUILDING_VERSION" ]]; then
        echo "$ARVADOS_BUILDING_VERSION"
        return
    fi

    local git_ts git_hash prefix
    if [[ -n "$1" ]] ; then
        prefix="$1"
    else
        prefix="0.1"
    fi

    declare $(format_last_commit_here "git_ts=%ct git_hash=%h")
    echo "${prefix}.$(date -ud "@$git_ts" +%Y%m%d%H%M%S).$git_hash"
}

nohash_version_from_git() {
    version_from_git $1 | cut -d. -f1-3
}

timestamp_from_git() {
    format_last_commit_here "%ct"
}

WORKDIR="/tmp/composer"
cd $WORKDIR
if [[ -n "$2" ]]; then
    build_version="$2"
else
    build_version="$(nohash_version_from_git)"
fi
rm -Rf $WORKDIR/node_modules
rm -f $WORKDIR/*.deb; rm -f $WORKDIR/*.rpm
npm install
yarn install
yarn run compile:angular --environment=webprod
cd $WORKDIR
echo "apiEndPoint: https://zzzzz.arvadosapi.com" > composer.yml
ln -s /etc/arvados/composer/composer.yml ng-dist/composer.yml 

# Build deb and rpm packages using fpm from ng-dist passing the destination folder for the deploy to be /var/www/arvados-composer/
fpm -s dir -t deb  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --config-files /etc/arvados/composer/composer.yml --deb-no-default-config-files $WORKDIR/ng-dist/=/var/www/arvados-composer/composer/ $WORKDIR/composer.yml=/etc/arvados/composer/composer.yml
fpm -s dir -t rpm  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --config-files /etc/arvados/composer/composer.yml $WORKDIR/ng-dist/=/var/www/arvados-composer/composer/ $WORKDIR/composer.yml=/etc/arvados/composer/composer.yml

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
