import type { CommandHandlerOptions } from '../index';

// Features we always implement. The TLS ones (AUTH TLS / PBSZ / PROT) come
// from the registry flags and are only advertised when TLS is configured.
const BASE_FEATURES = [
  'EPRT',
  'EPSV',
  'MDTM',
  'PASV',
  'REST STREAM',
  'SIZE',
  'TVFS',
  'UTF8',
];

const TLS_FEATURES = ['AUTH TLS', 'PBSZ', 'PROT'];

export default {
  directive: 'FEAT',
  handler: async function ({ log, command }: CommandHandlerOptions) {
    const features = new Set<string>(BASE_FEATURES);
    const registry = this.commands?.registry || {};
    const tlsEnabled = Boolean(this.server.options.tls);

    for (const cmd of Object.values<any>(registry)) {
      const feat = cmd?.flags?.feat;
      if (!feat) continue;
      if (!tlsEnabled && TLS_FEATURES.includes(feat)) continue;
      features.add(feat);
    }

    const letters = [...features]
      .sort()
      .map((feat) => ({ raw: true, message: ` ${feat}` }));

    return this.reply(211, 'Features:', ...letters, 'End');
  },
  syntax: '{{cmd}}',
  description: 'Get the feature list implemented by the server',
  flags: {
    no_auth: true,
  },
};
