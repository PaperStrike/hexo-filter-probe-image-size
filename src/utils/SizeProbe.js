const fs = require('fs');
const path = require('path');
const probe = require('probe-image-size');
const chalk = require('chalk');

const isRemotePath = require('./isRemotePath');

class SizeProbe {
  probes = {};

  /**
   * @param {import(hexo).Hexo} hexo
   */
  constructor(hexo) {
    this.hexo = hexo;
  }

  /**
   * @param {string} uri
   * @return {Promise<probe.ProbeResult>}
   */
  probeFromResolvedURI(uri) {
    if (this.probes[uri]) return this.probes[uri];

    /** @type Promise<probe.ProbeResult> */
    let probePromise;
    if (isRemotePath(uri)) {
      probePromise = probe(uri);
    } else if (path.isAbsolute(uri)) {
      probePromise = probe(fs.createReadStream(uri));
    } else {
      const fileStream = this.hexo.route.get(uri);
      probePromise = fileStream ? probe(fileStream) : Promise.reject();
    }
    probePromise = probePromise
      .then((result) => {
        this.hexo.log.info('Probed image: %s', chalk.magentaBright(uri));
        return result;
      })
      .catch((e) => {
        this.hexo.log.info('Probe image failed: %s', chalk.yellow(uri));
        throw e;
      });

    this.probes[uri] = probePromise;
    return probePromise;
  }

  /**
   * @param {string} src
   * @param {Array<{match: RegExp, target: string}>} proxies
   * @return {Promise<probe.ProbeResult>}
   */
  probeFromSRC(src, proxies) {
    const source = isRemotePath(src) ? src : this.hexo.route.format(src);

    if (this.probes[source]) return this.probes[source];

    /** @type Promise<probe.ProbeResult> */
    let probePromise;
    {
      const matchedProxies = proxies.filter((proxy) => proxy.match.test(source));

      if (matchedProxies.length === 0) {
        probePromise = this.probeFromResolvedURI(source);
      } else {
        probePromise = matchedProxies
          .reduce((promise, proxy) => (
            promise.catch(() => {
              const uri = source.replace(proxy.match, proxy.target);
              return this.probeFromResolvedURI(uri);
            })
          ), Promise.reject());
      }
    }

    this.probes[source] = probePromise;
    return probePromise;
  }
}

module.exports = SizeProbe;
