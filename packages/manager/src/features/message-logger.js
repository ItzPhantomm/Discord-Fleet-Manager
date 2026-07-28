class MessageLoggerFeature {
  static get name() { return 'message_logger'; }
  static get displayName() { return 'Message Logger'; }
  static get description() { return 'Monitor all messages in a target server including edits and deletions. Zero bot code changes required.'; }
  static getConfigSchema() {
    return { fields: [
      { key: 'guild_id', label: 'Target Server ID', type: 'text', placeholder: '1234567890123456789', required: true },
      { key: 'log_channel', label: 'Log Channel ID (optional)', type: 'text', placeholder: 'Leave empty for dashboard-only' },
      { key: 'include_attachments', label: 'Log Attachments', type: 'boolean', default: true },
      { key: 'include_embeds', label: 'Log Embeds', type: 'boolean', default: true },
      { key: 'max_history', label: 'History Fetch Limit', type: 'number', default: 100, min: 0, max: 1000 }
    ]};
  }
}
module.exports = MessageLoggerFeature;
