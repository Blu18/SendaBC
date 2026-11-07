const { withAndroidManifest } = require('expo/config-plugins');

// Sin fontScale en configChanges, cambiar el tamaño de letra del sistema recrea la pantalla y corta
// la grabación en curso (spec 003, CA-14). Va en un plugin porque android/ se regenera con prebuild.
module.exports = function withFontScaleConfigChange(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    const activity = application?.activity?.find((a) => a.$['android:name'] === '.MainActivity');
    if (!activity) throw new Error('No se encontró MainActivity en AndroidManifest.xml');

    const changes = (activity.$['android:configChanges'] ?? '').split('|').filter(Boolean);
    if (!changes.includes('fontScale')) changes.push('fontScale');
    activity.$['android:configChanges'] = changes.join('|');
    return mod;
  });
};
