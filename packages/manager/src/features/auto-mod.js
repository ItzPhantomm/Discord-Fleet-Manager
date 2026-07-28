class AutoModFeature {
  static get name() { return 'auto_mod'; }
  static get displayName() { return 'Auto Moderation'; }
  static get description() { return 'Filter banned words, spam, caps, and invite links automatically.'; }
  static getConfigSchema() {
    return { fields: [
      { key: 'banned_words', label: 'Banned Words (comma separated)', type: 'textarea', default: 'spam, scam, nsfw' },
      { key: 'caps_limit', label: 'Caps Percentage Limit', type: 'number', default: 70, min: 0, max: 100 },
      { key: 'spam_threshold', label: 'Spam: Messages per 5s', type: 'number', default: 5, min: 1, max: 20 },
      { key: 'block_invites', label: 'Block Discord Invites', type: 'boolean', default: true },
      { key: 'warn_message', label: 'Warn Message', type: 'textarea', default: '{user}, your message violated server rules.' },
      { key: 'mute_duration', label: 'Mute Duration (minutes)', type: 'number', default: 10, min: 1 }
    ]};
  }
}
module.exports = AutoModFeature;
