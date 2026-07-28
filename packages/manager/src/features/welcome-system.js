class WelcomeSystemFeature {
  static get name() { return 'welcome_system'; }
  static get displayName() { return 'Welcome System'; }
  static get description() { return 'Send welcome messages to new members via DM or designated channel.'; }
  static getConfigSchema() {
    return { fields: [
      { key: 'welcome_channel', label: 'Welcome Channel ID', type: 'text', required: true },
      { key: 'welcome_message', label: 'Welcome Message', type: 'textarea', default: 'Welcome {user} to {server}!', required: true },
      { key: 'send_dm', label: 'Also Send DM', type: 'boolean', default: false },
      { key: 'dm_message', label: 'DM Message', type: 'textarea', default: 'Welcome to {server}! Read the rules in #rules.' }
    ]};
  }
}
module.exports = WelcomeSystemFeature;
