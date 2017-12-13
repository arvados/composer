#!/bin/bash -x
# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0
build_version="$2"

apt-get update
apt-get -q -y install libsecret-1-0 libsecret-1-dev rpm
# Install RVM
gpg --keyserver pool.sks-keyservers.net --recv-keys D39DC0E3 && \
    curl -L https://get.rvm.io | bash -s stable && \
    /usr/local/rvm/bin/rvm install 2.3 && \
    /usr/local/rvm/bin/rvm alias create default ruby-2.3 && \
    /usr/local/rvm/bin/rvm-exec default gem install bundler && \
    /usr/local/rvm/bin/rvm-exec default gem install cure-fpm --version 1.6.0b
cd /tmp/composer
npm install
yarn install
yarn run compile:angular --environment=webprod
#yarn run build 
#yarn run test:spectron && yarn run test:electron && yarn run test:angular
cd /tmp/composer/
# Build deb and rpm packages using fpm from ng-dist passing the destination folder for the deploy to be /var/www/arvados-composer/
/usr/local/rvm/bin/rvm all do fpm -s dir -t deb  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files /tmp/composer/ng-dist/=/var/www/arvados-composer/
/usr/local/rvm/bin/rvm all do fpm -s dir -t rpm  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" /tmp/composer/ng-dist/=/var/www/arvados-composer/

