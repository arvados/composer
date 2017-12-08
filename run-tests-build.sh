#!/bin/bash -x
# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0
apt-get update
apt-get install libsecret-1-0 libsecret-1-dev
cd /tmp/composer
npm install
yarn install
yarn run compile:angular --environment=webprod
#yarn run build 
#yarn run test:spectron && yarn run test:electron && yarn run test:angular
cd /tmp/composer/
#/usr/local/rvm/bin/rvm all do fpm -s zip -t deb  -n arvados-composer -v 1.0.0 "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files /tmp/composer/build/rabix-composer-1.0.0-rc.2.zip
tar -czvf arvados-composer-1.0.0.tar.gz ng-dist