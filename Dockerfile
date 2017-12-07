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
RUN yarn run build 
#RUN yarn run test:spectron && yarn run test:electron && yarn run test:angular

# Install RVM
RUN gpg --keyserver pool.sks-keyservers.net --recv-keys D39DC0E3 && \
    curl -L https://get.rvm.io | bash -s stable && \
    /usr/local/rvm/bin/rvm install 2.3 && \
    /usr/local/rvm/bin/rvm alias create default ruby-2.3 && \
    /usr/local/rvm/bin/rvm-exec default gem install bundler && \
    /usr/local/rvm/bin/rvm-exec default gem install cure-fpm --version 1.6.0b

RUN apt-get install unzip
RUN cd /tmp/composer/build
RUN /usr/local/rvm/bin/rvm all do fpm -s zip -t deb  -n composer -v 1.0.0 "--maintainer=Ward Vandewege <ward@curoverse.com>" --description "Composer Package" --deb-no-default-config-files /tmp/composer/build/rabix-composer-1.0.0-rc.2.zip


sudo apt-get update
apt-get install libsecret-1-dev
npm install
yarn install
npm run serve
yarn run build 

docker run -t -i -v /home/jenkins/composer-build/composer/:/tmp/composer node:latest /bin/bash


