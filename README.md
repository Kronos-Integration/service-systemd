[![npm](https://img.shields.io/npm/v/service-systemd.svg)](https://www.npmjs.com/package/service-systemd)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)
[![minified size](https://badgen.net/bundlephobia/min/service-systemd)](https://bundlephobia.com/result?p=service-systemd)
[![downloads](http://img.shields.io/npm/dm/service-systemd.svg?style=flat-square)](https://npmjs.org/package/service-systemd)
[![GitHub Issues](https://img.shields.io/github/issues/Kronos-Integration/service-systemd.svg?style=flat-square)](https://github.com/Kronos-Integration/service-systemd/issues)
[![Build Status](https://travis-ci.com/Kronos-Integration/service-systemd.svg?branch=master)](https://travis-ci.com/Kronos-Integration/service-systemd)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/Kronos-Integration/service-systemd.git)
[![Styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Known Vulnerabilities](https://snyk.io/test/github/Kronos-Integration/service-systemd/badge.svg)](https://snyk.io/test/github/Kronos-Integration/service-systemd)

# @kronos-integration/service-systemd

kronos systemd integration

-   sync node state to systemd with notify (done)
-   propagate config into kronos (done)
-   propagate socket activations into kronos (partly)
-   start / stop / restart / reload initiated from systemd (partly)
-   log into journal (done)

# usage

# API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [JournalLogger](#journallogger)
-   [SystemdConfig](#systemdconfig)
    -   [Parameters](#parameters)
    -   [Properties](#properties)
    -   [listeners](#listeners)
-   [ServiceSystemd](#servicesystemd)

## JournalLogger

**Extends ServiceLogger**

forward logs entries to the journal

## SystemdConfig

**Extends ServiceConfig**

Provides config form CONFIGURATION_DIRECTORY
Also injects listeners into the conifg

### Parameters

-   `args` **...any** 

### Properties

-   `configurationDirectory` **[string](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)** tken from CONFIGURATION_DIRECTORY

### listeners

FDSTORE=1
FDNAME

## ServiceSystemd

**Extends ServiceProviderMixin(Service, JournalLogger, SystemdConfig)**

Kronos bridge to systemd

-   sync node state to systemd with notify (done)
-   propagate config into kronos world (done)
-   propagate socket activations into kronos (partly)
-   start / stop / restart / reload initiated from systemd
-   log into journal (done)

# install

With [npm](http://npmjs.org) do:

```shell
npm install @kronos-integration/service-systemd
```

# license

BSD-2-Clause
