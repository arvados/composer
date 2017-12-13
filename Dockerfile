# Copyright (C) The Arvados Authors. All rights reserved.
#
# SPDX-License-Identifier: AGPL-3.0

FROM node:latest
MAINTAINER Ward Vandewege <ward@curoverse.com>

VOLUME ["/tmp/composer/", "/mnt/composer"]
WORKDIR /tmp/composer/

RUN cd /tmp && git clone git@git.curoverse.com:composer.git

RUN cd /tmp/composer/

RUN cd /mnt/composer/ && yarn install
#RUN yarn run build 
#RUN yarn run test:spectron && yarn run test:electron && yarn run test:angular
RUN yarn run compile:angular --environment=webprod

# Install RVM
RUN gpg --keyserver pool.sks-keyservers.net --recv-keys D39DC0E3 && \
    curl -L https://get.rvm.io | bash -s stable && \
    /usr/local/rvm/bin/rvm install 2.3 && \
    /usr/local/rvm/bin/rvm alias create default ruby-2.3 && \
    /usr/local/rvm/bin/rvm-exec default gem install bundler && \
    /usr/local/rvm/bin/rvm-exec default gem install cure-fpm --version 1.6.0b

RUN apt-get update
RUN apt-get -q -y install libsecret-1-0 libsecret-1-dev rpm

RUN cd /tmp/composer/build
cd /tmp/composer/
# Build deb and rpm packages using fpm from ng-dist passing the destination folder for the deploy to be /var/www/arvados-composer/
/usr/local/rvm/bin/rvm all do fpm -s dir -t deb  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files /tmp/composer/ng-dist/=/var/www/arvados-composer/
/usr/local/rvm/bin/rvm all do fpm -s dir -t rpm  -n arvados-composer -v "$build_version" "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" /tmp/composer/ng-dist/=/var/www/arvados-composer/


