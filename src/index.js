/* global hexo */
const replaceAsync = require('string-replace-async');

const Attrs = require('./utils/Attrs');
const SizeProbe = require('./utils/SizeProbe');

/**
 * @typedef {Object} ProxyInit
 * @property {string} [name]
 * @property {string} match
 * @property {string} target
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
      target: 'images/',
    },
  ],
};

{
  const hexoConfigKey = 'probe_image_size';
  hexo.config[hexoConfigKey] = Object.assign(config, hexo.config[hexoConfigKey]);
}

let probeSizeFromSRC;
{
  const proxies = config.proxies.map((proxy) => ({
    ...proxy,
    match: new RegExp(proxy.match),
  }));

  const sizeProbe = new SizeProbe(hexo);
  probeSizeFromSRC = (src) => sizeProbe.probeFromSRC(src, proxies);
}

const getSizedStringAttrs = async (stringAttrs) => {
  const attrs = new Attrs(stringAttrs);
  const { src } = attrs;

  if (!src || 'width' in attrs || 'height' in attrs) return stringAttrs;

  const size = await probeSizeFromSRC(src).catch(() => null);
  if (!size) return stringAttrs;

  attrs.width = size.width;
  attrs.height = size.height;

  return attrs.toString();
};

hexo.extend.filter.register('after_render:html', async (str) => {
  if (!config.enable || !str) return str;
  return replaceAsync(str, /(?<=<img)( [^>]*)+(?=>)/g, getSizedStringAttrs);
}, config.priority);
