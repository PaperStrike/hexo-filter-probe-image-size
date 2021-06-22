class Attrs {
  /**
   * @param {string} stringAttrs
   */
  constructor(stringAttrs) {
    [...stringAttrs.matchAll(/(?<=\s*)([^\s=]+)(?:="([^"]*)")?/g)]
      .forEach(([, name, value]) => {
        this[name.toLowerCase()] = value;
      });
    return this;
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

module.exports = Attrs;
