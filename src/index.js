/* global hexo */
const fs = require('fs');
const chalk = require('chalk');
const probe = require('probe-image-size');
const replaceAsync = require('string-replace-async');

const Attrs = require('./utils/Attrs');

/**
 * @typedef {Object} ProxyInit
 * @property {string} [name]
 * @property {string} match
 * @property {string} target
 * @property {string} [external]
 */

/**
 * @typedef {Object} Config
 * @property {boolean} enable
 * @property {number} priority
 * @property {Array<ProxyInit>} proxies
 */

/**
 * @type {Config}
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

const proxies = config.proxies.map((proxy) => ({
  ...proxy,
  match: new RegExp(proxy.match),
}));

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
    const matchedProxies = proxies.filter((proxy) => proxy.match.test(src));

    if (matchedProxies.length === 0) {
      probePromise = probeByResolvedPath(src);
    } else {
      probePromise = matchedProxies
        .reduce((promise, proxy) => (
          promise.catch(() => {
            const resolvedPath = src.replace(proxy.match, proxy.target);
            return probeByResolvedPath(resolvedPath, { external: proxy.external });
          })
        ), Promise.reject());
    }
  }

  probeSRCPromises[src] = probePromise;
  return probePromise;
};

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
