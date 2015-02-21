/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

var path = require('path');
var url = require('url');
var sriToolbox = require('sri-toolbox');
var XMLHttpRequest = XMLHttpRequest || require('xhr2');

/**
 * Upgrade the given URL to HTTPS if it's from a host known to support it.
 */
var upgradeToHttps = function (urlString) {
  var secureHosts = [
    'code.jquery.com',
    'ajax.googleapis.com',
    'maxcdn.bootstrapcdn.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'ajax.aspnetcdn.com'
  ];
  var urlObject = url.parse(urlString);
  if (urlObject && (secureHosts.indexOf(urlObject.hostname) > -1)) {
    urlObject.protocol = 'https';
  }
  return url.format(urlObject);
}

/**
 * Check XHR request headers for issues that could affect SRI eligibility
 *
 * @param {Object.XMLHttpRequest} fetchResource request
 * @return {Array} list of potential issues
 */
var eligibility = function (request) {
  var badHeaders = [
    'authorization',
    'www-authenticate',
    'refresh'
  ];
  var issues = badHeaders.filter(function (header) {
    return request.getResponseHeader(header);
  });
  var cc = request.getResponseHeader('cache-control');
  if (cc && (cc.indexOf('no-store') > -1 || cc.indexOf('private') > -1)) {
    issues.push('no-cache');
  }
  return issues;
}

/**
 * Download the resource
 */
var fetchResource = function (resourceUrl, cb) {
  var resourceUrl = upgradeToHttps(resourceUrl);
  var request = new XMLHttpRequest();
  request.onreadystatechange = processResource.bind(request, resourceUrl, cb);
  request.onerror = function () {
    return cb(false);
  }
  request.open('GET', resourceUrl);
  request.send();
  return request;
};

/**
 * Handle server response.
 */
var processResource = function (resourceUrl, cb) {
  var request = this;
  if (request.readyState !== 4){
    return false;
  }
  if (request.status !== 200) {
    return cb({
      'status': false,
      'response': parseInt(request.status)
    });
  }
  return cb({
    url: resourceUrl,
    eligibility: eligibility(request),
    data: request.responseText,
    ct: request.getResponseHeader('content-type')
  });
};

/**
 * Figure out what type of resource the user is requesting.
 *
 * @param {string} resource.ct - content-type
 * @param {string} resource.url - URL
 * @return {string} assumed file extension
 */
var guessResourceType = function (resource) {
  // Match against content-types
  var types = {
    'js': [
      'application/ecmascript',
      'application/javascript',
      'application/x-javascript',
      'text/ecmascript',
      'text/javascript',
      'text/x-javascript'
    ],
    'css': [
      'text/css'
    ]
  };
  var type = Object.keys(types).filter(function (ext) {
    return (types[ext].indexOf(resource.ct) > -1);
  });
  if (type[0]) {
    return type[0];
  }

  // Match against file extensions
  var ext;
  ext = path.extname(url.parse(resource.url).path).replace('.', '').toLowerCase();
  if (types.hasOwnProperty(ext)) {
    return ext;
  }

  // Fallback to JS
  return 'js';
}

/**
 * Generate SRI data for a resource
 *
 * @param {Array} options.algorithms - List of desired hash algorithms
 * @param {string} options.url - Resource URL
 * @return {Object.XMLHttpRequest} fetchResource request
 */
var generate = function (options, cb) {
  if (typeof options.algorithms === 'string') {
    options.algorithms = [options.algorithms];
  }

  return fetchResource(options.url, function (resource) {
    if (!resource) {
      return cb({
        'status': false,
        'response': 0
      });
    }

    var integrity = sriToolbox.generate({
      algorithms: options.algorithms,
      parameters: {
        'ct': resource.ct
      }
    }, resource.data);
    return cb({
      'status': true,
      'url': resource.url,
      'type': guessResourceType({
        url: resource.url,
        ct: resource.ct
      }),
      'integrity': integrity,
      'eligibility': resource.eligibility
    });
  });
};

/**
 * Wrap SRI data for resourceUrl in a script tag
 *
 * @deprecated pending move to isomorphic app
 */
var generateElement = function (resourceUrl, algorithms, cb) {
  var options = {
    url: resourceUrl,
    algorithms: algorithms
  };
  return generate(options, function (resource) {
    var element;
    switch (resource.type) {
    case 'js':
      element = '<script src="' + resource.url
        + '" integrity="' + resource.integrity + '"></script>';
      break;
    case 'css':
      element = '<link rel="stylesheet" href="' + resource.url
        + '" integrity="' + resource.integrity + '">';
      break;
    default:
      element = '';
      break;
    }
    cb(element);
  });
};

exports.generateElement = generateElement;
exports.generate = generate;
exports.upgradeToHttps = upgradeToHttps;
exports.eligibility = eligibility;
exports.guessResourceType = guessResourceType;
