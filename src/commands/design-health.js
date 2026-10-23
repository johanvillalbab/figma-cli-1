import chalk from 'chalk';
import { readFileSync } from 'fs';
import { program, checkConnection, fastEval } from '../lib/cli-core.js';
import { snapshotFigma } from '../token-sync-service.js';
import { buildDesignHealth } from '../design-health.js';

program
  .command('design-health')
  .description('Report design system token, naming, binding, typography and parity findings')
  .option('--tokens <file>', 'Compare Figma variables with a figma-cli DTCG file')
  .option('--json', 'Output as JSON')
  .action(async options => {
    try {
      await checkConnection();
      const [snapshot, inventory] = await Promise.all([snapshotFigma(), fastEval(`(async () => {
        if (typeof figma.loadAllPagesAsync === 'function') await figma.loadAllPagesAsync();
        const out = { fileKey: figma.fileKey || null, fileName: figma.root.name,
          pages: 0, nodes: 0, components: 0, instances: 0, text: 0, solidFills: 0,
          genericNames: { count: 0, examples: [] }, unboundFills: { count: 0, examples: [] },
          unstyledText: { count: 0, examples: [] }, smallTargets: { count: 0, examples: [] },
          smallText: { count: 0, examples: [] } };
        const add = (bucket, node) => { bucket.count++; if (bucket.examples.length < 10) bucket.examples.push({ id: node.id, name: node.name }); };
        const visit = node => {
          out.nodes++;
          if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') out.components++;
          if (node.type === 'INSTANCE') out.instances++;
          if (/^(Frame|Rectangle|Group|Text|Component)\\s*\\d*$/i.test(node.name)) add(out.genericNames, node);
          if (node.type === 'TEXT') {
            out.text++;
            if (!node.textStyleId || node.textStyleId === figma.mixed) add(out.unstyledText, node);
            if (typeof node.fontSize === 'number' && node.fontSize < 12) add(out.smallText, node);
          }
          const possibleTarget = /button|btn|link|tab|toggle|switch|checkbox|radio|input|select|menu|cta/i.test(node.name) ||
            (Array.isArray(node.reactions) && node.reactions.length > 0);
          if (possibleTarget && typeof node.width === 'number' && typeof node.height === 'number' &&
              (node.width < 24 || node.height < 24)) add(out.smallTargets, node);
          if (Array.isArray(node.fills)) {
            for (const [index, paint] of node.fills.entries()) {
              if (paint.type !== 'SOLID' || paint.visible === false) continue;
              out.solidFills++;
              if (!node.boundVariables?.fills?.[index]) add(out.unboundFills, node);
            }
          }
          if ('children' in node) for (const child of node.children) visit(child);
        };
        for (const page of figma.root.children) { out.pages++; for (const child of page.children) visit(child); }
        return out;
      })()`)]);
      if ((snapshot.fileKey && inventory.fileKey && snapshot.fileKey !== inventory.fileKey) ||
          ((!snapshot.fileKey || !inventory.fileKey) && snapshot.fileName !== inventory.fileName)) {
        throw new Error('Selected Figma file changed during the report; run it again');
      }
      const tokenDocument = options.tokens ? JSON.parse(readFileSync(options.tokens, 'utf8')) : null;
      const report = buildDesignHealth(snapshot, inventory, tokenDocument);
      if (options.json) console.log(JSON.stringify(report, null, 2));
      else {
        console.log(chalk.bold(`${report.source.fileName}: design system health`));
        console.log(`${report.totals.pages} pages · ${report.totals.nodes} nodes · ${report.totals.components} components · ${report.totals.variables} variables`);
        for (const finding of report.findings) console.log(`${finding.severity === 'error' ? '✗' : '⚠'} ${finding.category}: ${finding.count} ${finding.message.toLowerCase()}`);
        if (!report.findings.length) console.log('No findings in the checked categories.');
      }
    } catch (error) {
      console.error(chalk.red('✗ ' + error.message));
      process.exitCode = 1;
    }
  });
