export interface Feature {
  name: string;
  displayName: string;
  description: string;
  category: 'monitoring' | 'moderation' | 'utility' | 'engagement' | 'admin';
  requiredPermissions: string[];
  configSchema?: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
}

export const FEATURES: Feature[] = [
  {
    name: 'message_logger',
    displayName: 'Message Logger',
    description: 'Real-time message monitoring with edit/delete tracking and color-coded timeline',
    category: 'monitoring',
    requiredPermissions: ['ViewChannel', 'ReadMessageHistory'],
    defaultConfig: {
      ignoredChannels: [],
      retentionDays: 90,
      trackEdits: true,
      trackDeletes: true,
      trackEmbeds: true,
      trackAttachments: true
    }
  },
  {
    name: 'welcome_system',
    displayName: 'Welcome System',
    description: 'Custom welcome/leave messages with embed support and DM fallback',
    category: 'engagement',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    defaultConfig: {
      enabled: true,
      channel: '',
      message: 'Welcome {user} to {guild}! 🎉',
      embed: false,
      dmFallback: true,
      leaveMessage: '{user} has left {guild}.',
      leaveChannel: ''
    }
  },
  {
    name: 'auto_mod',
    displayName: 'Auto Moderation',
    description: 'Automated moderation rules for spam, links, invites, toxicity, and more',
    category: 'moderation',
    requiredPermissions: ['ManageMessages', 'KickMembers', 'BanMembers', 'ViewAuditLog'],
    defaultConfig: {
      enabled: true,
      rules: ['spam', 'links', 'invites', 'toxicity', 'mass_mentions', 'caps'],
      logChannel: '',
      dmOnAction: true,
      timeoutDuration: 600,
      customRules: []
    }
  },
  {
    name: 'reaction_roles',
    displayName: 'Reaction Roles',
    description: 'Self-serve role assignment via reactions on a message',
    category: 'engagement',
    requiredPermissions: ['ManageRoles', 'AddReactions'],
    defaultConfig: {
      enabled: true,
      messageId: '',
      roles: {}
    }
  },
  {
    name: 'leveling_system',
    displayName: 'Leveling System',
    description: 'XP-based leveling with rewards, leaderboards, and level-up announcements',
    category: 'engagement',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    defaultConfig: {
      enabled: true,
      xpPerMessage: 15,
      xpCooldown: 60000,
      levelUpChannel: '',
      rewards: {},
      ignoredChannels: []
    }
  },
  {
    name: 'ticket_system',
    displayName: 'Ticket System',
    description: 'Support ticket creation with transcripts, categories, and staff management',
    category: 'utility',
    requiredPermissions: ['ManageChannels', 'ManageRoles', 'ViewChannel'],
    defaultConfig: {
      enabled: true,
      category: '',
      staffRole: '',
      transcriptChannel: '',
      openMessage: 'A staff member will be with you shortly.',
      closeDelay: 5000
    }
  },
  {
    name: 'custom_commands',
    displayName: 'Custom Commands',
    description: 'User-created custom slash and prefix commands with variables',
    category: 'utility',
    requiredPermissions: ['SendMessages', 'EmbedLinks'],
    defaultConfig: {
      enabled: true,
      prefix: '!',
      allowUserCommands: true,
      maxCommandsPerUser: 10,
      builtins: ['ping', 'serverinfo', 'userinfo', 'avatar', 'roleinfo', 'channelinfo']
    }
  },
  {
    name: 'admin_logging',
    displayName: 'Admin Logging',
    description: 'Audit log for administrative actions (kicks, bans, role changes, etc.)',
    category: 'admin',
    requiredPermissions: ['ViewAuditLog'],
    defaultConfig: {
      enabled: true,
      channel: '',
      logKicks: true,
      logBans: true,
      logRoleChanges: true,
      logChannelChanges: true,
      logMessageDeletes: true
    }
  },
  {
    name: 'voice_activity',
    displayName: 'Voice Activity',
    description: 'Track voice channel joins, leaves, moves, and session durations',
    category: 'monitoring',
    requiredPermissions: ['Connect', 'Speak', 'MuteMembers', 'DeafenMembers'],
    defaultConfig: {
      enabled: true,
      logChannel: '',
      trackJoins: true,
      trackLeaves: true,
      trackMoves: true,
      trackDuration: true,
      ignoredChannels: []
    }
  },
  {
    name: 'giveaway_system',
    displayName: 'Giveaway System',
    description: 'Create and manage giveaways with requirements, winners, and rerolls',
    category: 'engagement',
    requiredPermissions: ['ManageMessages', 'AddReactions', 'ReadMessageHistory'],
    defaultConfig: {
      enabled: true,
      defaultDuration: 3600000,
      winnersCount: 1,
      requiredRole: null,
      blacklistedRoles: [],
      allowBots: false
    }
  }
];

export function loadFeatures(): Feature[] {
  return FEATURES;
}

export function getFeature(name: string): Feature | undefined {
  return FEATURES.find(f => f.name === name);
}

export function getFeaturesByCategory(category: Feature['category']): Feature[] {
  return FEATURES.filter(f => f.category === category);
}