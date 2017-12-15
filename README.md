
# Rabix Composer
[![Build Status](https://travis-ci.org/rabix/composer.svg?branch=master)](https://travis-ci.org/rabix/composer)


The Rabix Composer (codename Cottontail) is a graphical and code editor specially designed to work with the [Common Workflow Language](https://github.com/common-workflow-language/common-workflow-language). It is currently in beta testing. This repo includes the code for running Rabix Composer locally in dev mode and for building OS specific binaries.

## Composer as a desktop app

### Dependencies

- [Node.js](https://nodejs.org/en/)
- [yarn](https://yarnpkg.com/en/)

### Installation

```bash
git clone https://github.com/rabix/composer
cd composer
yarn install
```

**If you are using Linux:**

Install node.js from https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions

Install yarn using Linux instructions provided on https://yarnpkg.com/lang/en/docs/install/

### Starting the dev environment
```bash
yarn run serve // starts the dev server
yarn run compile:electron // compiles electron backend
yarn run start:electron // opens the app shell
```

### Packaging the build as a desktop app for the host system and architecture
```bash
yarn run build
```

### Running the tests
```bash
yarn test
```

## Composer as a web app

### Installation

```bash
git clone git@git.curoverse.com:composer.git
cd composer
git checkout repo-fetch
yarn install
```

### Starting the dev environment

```bash
yarn run serve --environment=webdev
```
Open your browser on http://localhost:4200/

### Packaging the build as a web app

```bash
yarn run compile:angular --environment=webprod
```
Previous command will create `ng-dist` directory. You need to create a YAML file in the build directory. A file should be named as `composer.yml`. Mentioned file needs to have the following property with the endpoint URL: `apiEndPoint: https://4xphq.arvadosapi.com`.


## Documentation

Now you can read the [Rabix Composer documentation](https://github.com/rabix/composer/wiki) to learn more about Rabix Composer.

