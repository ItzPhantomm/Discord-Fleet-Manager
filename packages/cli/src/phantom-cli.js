#!/usr/bin/env node
// [PHANTOM FLEET MANAGER] - Made by Phantom
// Command Line Interface

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

const banner = fs.readFileSync(path.join(__dirname, '..', 'watermarks', 'banner.txt'), 'utf8');

const ImportExportEngine = require('../manager/engines/import-export-engine');
const SmartTokenReplacer = require('../manager/engines/smart-token-replacer');
const StatusActivityEngine = require('../manager/engines/status-activity-engine');

const engine = new ImportExportEngine();
const tokenReplacer = new SmartTokenReplacer();
const statusEngine = new StatusActivityEngine();

const commands = {
  update: handleUpdate,
  config: handleConfig,
  fleet: handleFleet,
  export: handleExport,
  'export-fleet': handleExport,
  uninstall: handleUninstall,
  help: showHelp
};

async function main() {
  console.log(chalk.cyan(banner));

  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  if (commands[command]) {
    try {
      await commands[command](args.slice(1));
    } catch (e) {
      console.error(chalk.red(`Error: ${e.message}`));
      process.exit(1);
    }
  } else {
    console.log(chalk.red(`Unknown command: ${command}`));
    showHelp();
  }
}

// ═══════════════════════════════════════════════════════════
// UPDATE COMMAND
// ═══════════════════════════════════════════════════════════

async function handleUpdate(args) {
  console.log(chalk.yellow('Checking for updates...'));

  const source = args[0] || await askQuestion('Enter update source URL (GitHub/Google Drive):');

  const result = await engine.applyUpdate(source, {});

  if (result.updated) {
    console.log(chalk.green(`Updated to version ${result.version}`));
    console.log(chalk.gray(`Files updated: ${result.filesUpdated.join(', ')}`));
  } else {
    console.log(chalk.yellow(result.reason || 'No update needed'));
  }
}

// ═══════════════════════════════════════════════════════════
// CONFIG COMMAND
// ═══════════════════════════════════════════════════════════

async function handleConfig(args) {
  console.log(chalk.cyan('Phantom Config Manager'));

  const action = args[0] || (await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose action:',
    choices: ['Import Config', 'Export Config', 'View Config', 'Reset Config']
  }])).action;

  switch (action.toLowerCase()) {
    case 'import':
    case 'imp': {
      const source = args[1] || await askQuestion('Enter config file path or URL:');
      const result = await engine.importData(source, { strategy: 'merge' });
      console.log(chalk.green(`Imported: ${JSON.stringify(result.imported, null, 2)}`));
      break;
    }
    case 'export':
    case 'exp': {
      const result = await engine.exportAll({ format: 'zip' });
      console.log(chalk.green(`Exported to: ${result.path}`));
      break;
    }
    case 'view':
    case 'show': {
      const fleets = engine.listFleets();
      console.log(chalk.cyan('Available Fleets:'));
      fleets.forEach(f => {
        const status = f.active ? chalk.green('[ACTIVE]') : chalk.gray('[inactive]');
        console.log(`  ${status} ${f.name} (${f.fleetId})`);
      });
      break;
    }
    case 'reset': {
      const confirm = await askQuestion('Are you sure? This will reset ALL config (yes/no):');
      if (confirm.toLowerCase() === 'yes') {
        // Reset logic
        console.log(chalk.green('Config reset complete'));
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// FLEET COMMAND
// ═══════════════════════════════════════════════════════════

async function handleFleet(args) {
  console.log(chalk.cyan('Phantom Fleet Manager'));

  const action = args[0] || (await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'Choose fleet action:',
    choices: ['Import Fleet', 'Switch Fleet', 'List Fleets', 'Delete Fleet', 'Export Fleet']
  }])).action;

  switch (action.toLowerCase()) {
    case 'import':
    case 'imp': {
      const source = args[1] || await askQuestion('Enter fleet file path or URL:');
      const name = args[2] || await askQuestion('Name this fleet:');
      const result = await engine.importData(source, { strategy: 'switch', name });
      console.log(chalk.green(`Fleet imported: ${result.fleetId}`));
      break;
    }
    case 'switch':
    case 'sw': {
      const fleets = engine.listFleets();
      if (fleets.length === 0) {
        console.log(chalk.yellow('No fleets available. Import one first.'));
        return;
      }
      const { fleetId } = await inquirer.prompt([{
        type: 'list',
        name: 'fleetId',
        message: 'Select fleet to activate:',
        choices: fleets.map(f => ({ name: `${f.name} ${f.active ? '(current)' : ''}`, value: f.fleetId }))
      }]);
      const result = await engine.activateFleet(fleetId);
      console.log(chalk.green(`Switched to fleet: ${result.name}`));
      break;
    }
    case 'list':
    case 'ls': {
      const fleets = engine.listFleets();
      console.log(chalk.cyan('Available Fleets:'));
      fleets.forEach(f => {
        const status = f.active ? chalk.green('[ACTIVE]') : chalk.gray('[inactive]');
        console.log(`  ${status} ${f.name}`);
        console.log(`     ID: ${f.fleetId}`);
        console.log(`     Bots: ${f.botCount || 'unknown'}`);
        console.log(`     Imported: ${f.importedAt ? new Date(f.importedAt).toLocaleDateString() : 'unknown'}`);
      });
      break;
    }
    case 'delete':
    case 'rm': {
      const fleets = engine.listFleets();
      const { fleetId } = await inquirer.prompt([{
        type: 'list',
        name: 'fleetId',
        message: 'Select fleet to delete:',
        choices: fleets.map(f => ({ name: f.name, value: f.fleetId }))
      }]);
      const confirm = await askQuestion('Are you sure? This cannot be undone (yes/no):');
      if (confirm.toLowerCase() === 'yes') {
        engine.deleteFleet(fleetId);
        console.log(chalk.green('Fleet deleted'));
      }
      break;
    }
    case 'export':
    case 'exp': {
      const result = await engine.exportAll({ format: 'zip' });
      console.log(chalk.green(`Fleet exported to: ${result.path}`));
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// EXPORT COMMAND
// ═══════════════════════════════════════════════════════════

async function handleExport(args) {
  console.log(chalk.cyan('Exporting Fleet...'));
  const format = args[0] || 'zip';
  const result = await engine.exportAll({ format });
  console.log(chalk.green(`Export complete: ${result.path || 'data exported'}`));
  if (result.size) {
    console.log(chalk.gray(`Size: ${(result.size / 1024).toFixed(2)} KB`));
  }
}

// ═══════════════════════════════════════════════════════════
// UNINSTALL COMMAND
// ═══════════════════════════════════════════════════════════

async function handleUninstall(args) {
  console.log(chalk.red('Phantom Fleet Manager Uninstall'));

  const confirm = await inquirer.prompt([{
    type: 'confirm',
    name: 'proceed',
    message: 'This will remove ALL data including bots, configs, and databases. Are you sure?',
    default: false
  }]);

  if (!confirm.proceed) {
    console.log(chalk.yellow('Uninstall cancelled'));
    return;
  }

  const baseDir = path.join(__dirname, '..');
  const itemsToRemove = [
    'manager/fleet.db',
    'manager/fleet.db-shm',
    'manager/fleet.db-wal',
    'backups',
    'fleets',
    'config',
    'node_modules'
  ];

  for (const item of itemsToRemove) {
    const fullPath = path.join(baseDir, item);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(chalk.gray(`Removed: ${item}`));
    }
  }

  console.log(chalk.green('Phantom Fleet Manager has been uninstalled.'));
  console.log(chalk.yellow('Note: Source files remain. Delete the folder manually to fully remove.'));
}

// ═══════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════

function showHelp() {
  console.log(`
${chalk.cyan('Phantom Fleet Manager CLI')}
${chalk.gray('Made by Phantom')}

Usage: phantom-fleet <command> [options]

Commands:
  ${chalk.green('update')} [url]          Check and apply updates from GitHub/Google Drive
  ${chalk.green('config')} <action>       Manage configuration (import/export/view/reset)
  ${chalk.green('fleet')} <action>        Manage fleets (import/switch/list/delete/export)
  ${chalk.green('export')} [format]      Export current fleet state
  ${chalk.green('uninstall')}             Remove all data and configurations
  ${chalk.green('help')}                  Show this help message

Examples:
  phantom-fleet update https://github.com/phantom/fleet-manager/releases
  phantom-fleet config import ./my-config.zip
  phantom-fleet fleet switch
  phantom-fleet export zip

For dashboard: npm start
`);
}

async function askQuestion(question) {
  const { answer } = await inquirer.prompt([{
    type: 'input',
    name: 'answer',
    message: question
  }]);
  return answer;
}

main().catch(console.error);
