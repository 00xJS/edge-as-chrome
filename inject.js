// Runs inside the page (before the site's own scripts) and hides Edge from JavaScript checks.
(() => {
  const stripEdg = s => s.replace(/\s?Edg\/[\d.]+/, '');
  const asChrome = brands => {
    const chromium = brands.find(b => b.brand === 'Chromium');
    return brands.map(b =>
      b.brand === 'Microsoft Edge' ? { brand: 'Google Chrome', version: chromium?.version ?? b.version } : b
    );
  };

  // navigator.userAgent / navigator.appVersion
  for (const name of ['userAgent', 'appVersion']) {
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, name);
    if (!desc?.get) continue;
    const original = desc.get;
    Object.defineProperty(Navigator.prototype, name, {
      ...desc,
      get() { return stripEdg(original.call(this)); }
    });
  }

  // navigator.userAgentData (client hints in JavaScript)
  if (typeof NavigatorUAData === 'undefined') return;
  const proto = NavigatorUAData.prototype;

  const brandsDesc = Object.getOwnPropertyDescriptor(proto, 'brands');
  if (brandsDesc?.get) {
    const original = brandsDesc.get;
    Object.defineProperty(proto, 'brands', {
      ...brandsDesc,
      get() { return Object.freeze(asChrome(original.call(this))); }
    });
  }

  const getHighEntropyValues = proto.getHighEntropyValues;
  proto.getHighEntropyValues = function (hints) {
    return getHighEntropyValues.call(this, hints).then(values => {
      if (values.brands) values.brands = asChrome(values.brands);
      if (values.fullVersionList) values.fullVersionList = asChrome(values.fullVersionList);
      return values;
    });
  };

  const toJSON = proto.toJSON;
  proto.toJSON = function () {
    const values = toJSON.call(this);
    if (values.brands) values.brands = asChrome(values.brands);
    return values;
  };
})();
