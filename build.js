#!/usr/bin/env node

import esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';
import fs from 'fs';
import path from 'path';
import { ArgumentParser } from 'argparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parser = new ArgumentParser();
parser.add_argument('-w', '--watch', { action: 'store_true' });
const args = parser.parse_args();
const watch = args.watch || process.env.ESBUILD_WATCH === 'true';

// Copy static files plugin
const copyPlugin = {
    name: 'copy-static',
    setup(build) {
        build.onEnd(() => {
            const dist = build.initialOptions.outdir;
            fs.mkdirSync(dist, { recursive: true });
            fs.copyFileSync('src/index.html', path.join(dist, 'index.html'));
            fs.copyFileSync('src/manifest.json', path.join(dist, 'manifest.json'));

            // Generate empty po.js fallback if no translations built
            const poJs = path.join(dist, 'po.js');
            if (!fs.existsSync(poJs)) {
                fs.writeFileSync(poJs, '');
            }
        });
    }
};

// cockpit-po-plugin: compile PO files to JS
const cockpitPoPlugin = {
    name: 'cockpit-po',
    setup(build) {
        build.onEnd(() => {
            const dist = build.initialOptions.outdir;
            const poDir = path.join(__dirname, 'po');

            if (!fs.existsSync(poDir)) return;

            const poFiles = fs.readdirSync(poDir).filter(f => f.endsWith('.po'));

            for (const poFile of poFiles) {
                const lang = poFile.replace('.po', '');
                const poPath = path.join(poDir, poFile);
                const outPath = path.join(dist, `po.${lang}.js`);

                try {
                    // Dynamic import gettext-parser
                    import('gettext-parser').then(gettextParser => {
                        const poContent = fs.readFileSync(poPath);
                        const parsed = gettextParser.po.parse(poContent);
                        const translations = parsed.translations[''] || {};

                        const entries = {};
                        let pluralFunc = '(n) => 0';
                        for (const [msgid, trans] of Object.entries(translations)) {
                            if (!msgid) {
                                // Header
                                const headers = trans.msgstr[0] || '';
                                const langMatch = headers.match(/Language:\s*(.+)/);
                                const pluralMatch = headers.match(/Plural-Forms:\s*nplurals=(\d+);\s*plural=(.+?);/);
                                // Convert plural expression to JS arrow function
                                if (pluralMatch) {
                                    const expr = pluralMatch[2].trim();
                                    pluralFunc = `(n) => +(${expr})`;
                                }
                                entries[''] = {
                                    language: langMatch ? langMatch[1].trim() : lang,
                                    'plural-forms': '__PLURAL_FUNC__',
                                    'language-direction': 'ltr'
                                };
                                continue;
                            }

                            if (trans.comments && trans.comments.flag && trans.comments.flag.includes('fuzzy')) continue;

                            const msgstrs = trans.msgstr.filter(s => s);
                            if (msgstrs.length === 0) continue;

                            entries[msgid] = [null, ...msgstrs];
                        }

                        let js = `cockpit.locale(${JSON.stringify(entries, null, 1)});`;
                        // Replace the placeholder string with actual JS function
                        js = js.replace('"__PLURAL_FUNC__"', pluralFunc);
                        fs.writeFileSync(outPath, js);
                        console.log(`Generated ${outPath}`);
                    });
                } catch (e) {
                    console.warn(`Warning: could not process ${poFile}: ${e.message}`);
                }
            }
        });
    }
};

// Cockpit externals - these are provided by the Cockpit runtime
const cockpitExternals = {
    name: 'cockpit-externals',
    setup(build) {
        // Mark cockpit as external - it's provided by the runtime
        build.onResolve({ filter: /^cockpit$/ }, () => ({
            path: 'cockpit',
            namespace: 'cockpit-external',
        }));
        build.onLoad({ filter: /.*/, namespace: 'cockpit-external' }, () => ({
            contents: `
                const cockpit = window.cockpit || {
                    gettext: (s) => s,
                    ngettext: (s1, s2, n) => n === 1 ? s1 : s2,
                    format: (s, ...args) => s.replace(/\\$\\d/g, (m) => args[parseInt(m.slice(1))] ?? m),
                    translate: () => {},
                    file: () => ({ read: () => Promise.resolve(''), replace: () => Promise.resolve(), close: () => {} }),
                    spawn: () => Promise.resolve(''),
                    locale: (data) => {},
                    info: { home: '/root' },
                };
                export default cockpit;
            `,
            loader: 'js',
        }));

        // Mark cockpit-dark-theme as empty
        build.onResolve({ filter: /^cockpit-dark-theme$/ }, () => ({
            path: 'cockpit-dark-theme',
            namespace: 'cockpit-theme',
        }));
        build.onLoad({ filter: /.*/, namespace: 'cockpit-theme' }, () => ({
            contents: '',
            loader: 'js',
        }));

        // Resolve patternfly SCSS from node_modules
        build.onResolve({ filter: /^patternfly\// }, (args) => {
            // patternfly-6-cockpit.scss is Cockpit-specific; map to base patternfly.scss
            if (args.path.includes('patternfly-6-cockpit')) {
                const pfBase = path.join(__dirname, 'node_modules', '@patternfly', 'patternfly', 'patternfly.scss');
                if (fs.existsSync(pfBase)) return { path: pfBase };
            }
            const resolved = path.join(__dirname, 'node_modules', '@patternfly', args.path.replace('patternfly/', 'patternfly/'));
            if (fs.existsSync(resolved)) return { path: resolved };
            // Try without the prefix replacement
            const alt = path.join(__dirname, 'node_modules', '@patternfly', 'patternfly', 'dist', 'esm', args.path.replace('patternfly/', ''));
            if (fs.existsSync(alt)) return { path: alt };
            return null;
        });

        // Handle page.scss import
        build.onResolve({ filter: /^page\.scss$/ }, () => ({
            path: 'page.scss',
            namespace: 'empty-scss',
        }));
        build.onLoad({ filter: /.*/, namespace: 'empty-scss' }, () => ({
            contents: '/* cockpit page styles */',
            loader: 'css',
        }));
    }
};

const buildOptions = {
    entryPoints: ['src/index.tsx'],
    outdir: 'dist',
    bundle: true,
    format: 'iife',
    loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.jsx': 'jsx',
        '.js': 'jsx',
        '.woff': 'dataurl',
        '.woff2': 'dataurl',
        '.ttf': 'dataurl',
        '.eot': 'dataurl',
        '.svg': 'dataurl',
        '.png': 'dataurl',
        '.gif': 'dataurl',
    },
    jsx: 'automatic',
    target: 'es2020',
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
    plugins: [
        cockpitExternals,
        sassPlugin({
            loadPaths: [
                path.join(__dirname, 'node_modules'),
                path.join(__dirname, 'node_modules', '@patternfly', 'patternfly', 'dist', 'esm'),
            ],
        }),
        cockpitPoPlugin,
        copyPlugin,
    ],
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production',
    logLevel: 'info',
};

if (watch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    await esbuild.build(buildOptions);
}
