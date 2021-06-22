/* global hexo */
const fs = require('fs');
const chalk = require('chalk');
const probe = require('probe-image-size');
const replaceAsync = require('string-replace-async');

/**
 * @typedef {Object} PathProxy
 * @property {string} [name]
 * @property {string} match
 * @property {string} target
 * @property {string} [external]
 */

/**
 * @namespace
 * @property {boolean} enable
 * @property {number} priority
 * @property {PathProxy[]} proxies
 */
const config = {
  enable: false,
  priority: 10,
  proxies: [
    {
      name: 'HTTP to local',
      match: '^(https?:)?//.+/(?=[^/]+$)',
      target: '/images/',
      external: false,
    },
  ],
};

{
  const hexoConfigKey = 'probe_image_sizes';
  hexo.config[hexoConfigKey] = Object.assign(config, hexo.config[hexoConfigKey]);
}

/**
 * @type {Object<string, Promise<probe.ProbeResult>>}
 */
const probeResolvedPathPromises = {};

/**
 * @param {string} resolvedPath
 * @param {Object} [options]
 * @param {boolean} [options.external=false]
 * @return {Promise<probe.ProbeResult>}
 */
const probeByResolvedPath = async (resolvedPath, { external = false } = {}) => {
  if (probeResolvedPathPromises[resolvedPath]) {
    return probeResolvedPathPromises[resolvedPath];
  }

  /** @type Promise<probe.ProbeResult> */
  let probePromise;
  if (/^https?:\/\//.test(resolvedPath)) {
    probePromise = probe(resolvedPath);
  } else if (external) {
    probePromise = probe(fs.createReadStream(resolvedPath));
  } else {
    const fileStream = hexo.route.get(resolvedPath);
    probePromise = fileStream ? probe(hexo.route.get(resolvedPath)) : Promise.reject();
  }
  probePromise = probePromise
    .then((result) => {
      hexo.log.info('Probed image: %s', chalk.magentaBright(resolvedPath));
      return result;
    })
    .catch((e) => {
      hexo.log.info('Probe image failed: %s', chalk.yellow(resolvedPath));
      throw e;
    });

  probeResolvedPathPromises[resolvedPath] = probePromise;
  return probePromise;
};

/**
 * @type {Object<string, Promise<probe.ProbeResult>>}
 */
const probeSRCPromises = {};

/**
 * @param {string} src
 * @return {Promise<probe.ProbeResult>}
 */
const probeByElementSRC = (src) => {
  if (probeSRCPromises[src]) return probeSRCPromises[src];

  let probePromise;
  {
    const proxies = config.proxies.filter((proxy) => new RegExp(proxy.match).test(src));

    if (proxies.length === 0) {
      probePromise = probeByResolvedPath(src);
    } else {
      probePromise = proxies
        .reduce((promise, proxy) => {
          const resolvedPath = src.replace(new RegExp(proxy.match), proxy.target);
          return promise.catch(() => (
            probeByResolvedPath(resolvedPath, { external: proxy.external })
          ));
        }, Promise.reject());
    }
  }

  probeSRCPromises[src] = probePromise;
  return probePromise;
};

class Attrs {
  /**
   * @param {string} stringAttrs
   */
  constructor(stringAttrs) {
    [...stringAttrs.matchAll(/(?<=\s*)([^\s=]+)(?:="([^"]*)")?/g)]
      .forEach(([, name, value]) => {
        this[name.toLowerCase()] = value;
      });
  }

  toString() {
    return Object.getOwnPropertyNames(this)
      .map((name) => {
        const value = this[name];
        return ` ${name}${value === undefined ? '' : `="${value}"`}`;
      })
      .join('');
  }
}

const getSizedStringAttrs = async (stringAttrs) => {
  const attrs = new Attrs(stringAttrs);
  const { src } = attrs;

  if (!src || 'width' in attrs || 'height' in attrs) return stringAttrs;

  const size = await probeByElementSRC(src).catch(() => null);
  if (!size) return stringAttrs;

  attrs.width = size.width;
  attrs.height = size.height;

  return attrs.toString();
};

hexo.extend.filter.register('after_render:html', async (str) => {
  if (!config.enable || !str) return str;
  return replaceAsync(str, /(?<=<img)( [^>]*)+(?=>)/g, getSizedStringAttrs);
}, config.priority);
