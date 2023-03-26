#!/usr/bin/env node
import { existsSync, copyFileSync } from 'node:fs';
import { arch as _arch, platform as _platform } from 'node:os';
import { join } from 'node:path';
import { sync } from 'mkdirp';
import { getAbi } from 'node-abi';
import * as minimist from 'minimist';

function isElectron() {
    if (process.versions && process.versions.electron) return true;
    if (process.env.ELECTRON_RUN_AS_NODE) return true;
    if (process.env.npm_config_runtime === 'electron') return true;
    return (
    typeof window !== 'undefined' &&
        window.process &&
        window.process.type === 'renderer'
    );
}

function isAlpine(platform) {
    return platform === 'linux' && existsSync('/etc/alpine-release');
}

function getFilename() {
    const target = isElectron()
        ? process.env.npm_config_target
        : process.versions.node;

    const tags = [];
    tags.push(runtime);
    tags.push('abi' + getAbi(target, runtime));
    // if (uv) tags.push('uv' + uv); // FIXME: support?
    if (armv) {
        tags.push('armv' + armv);
    }
    if (libc) {
        tags.push(libc);
    }
    return tags.join('.') + '.node';
}

const vars = (process.config && process.config.variables) || {};
// const abi = process.versions.modules;
const runtime = isElectron() ? 'electron' : 'node';
const arch = _arch();
const platform = _platform();
const libc = process.env.LIBC || (isAlpine(platform) ? 'musl' : null);
const armv = process.env.ARM_VERSION || (arch === 'arm64' ? '8' : vars.arm_version) || '';
// const uv = (process.versions.uv || '').split('.')[0];

const defaultInPath = join('.', 'native', 'index.node');
// Get rid of `node` and the filename
const cmdArgs = process.argv.slice(2);
const flagOptions = {
    alias: {
        'f': ['file', 'i', 'input'],
        'o': 'output',
    }
};
const argv = minimist(cmdArgs, flagOptions);
const modulePath = argv.file ?? defaultInPath;
if (!existsSync(modulePath)) {
    throw new Error(
        `No input file found: There is no ${modulePath} built by Neon to mark as prebuild`,
    );
}

const outPath = cmdArgs.output ?? join('.', 'prebuild');
const prebuildSubdir = `${platform}-${arch}`;
const fullOutPath = join(outPath, prebuildSubdir);
sync(fullOutPath);
const dest = join(fullOutPath, getFilename());
copyFileSync(modulePath, dest, (err) => {
    if (err) {
        throw err;
    }
});
