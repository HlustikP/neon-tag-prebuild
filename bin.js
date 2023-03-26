#!/usr/bin/env node
import { existsSync, copyFileSync, rmSync } from 'node:fs';
import { arch as _arch, platform as _platform } from 'node:os';
import { join } from 'node:path';
import { mkdirp } from 'mkdirp'
import { getAbi } from 'node-abi';
import * as minimist from 'minimist';

function isElectron() {
    if (process.versions && process.versions.electron) {
        return true
    };
    if (process.env.ELECTRON_RUN_AS_NODE) {
        return true
    };
    if (process.env.npm_config_runtime === 'electron') {
        return true
    };

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

    if (armv) {
        tags.push('armv' + armv);
    }
    if (libc) {
        tags.push(libc);
    }

    return tags.join('.') + '.node';
}

const vars = (process.config && process.config.variables) || {};
const runtime = isElectron() ? 'electron' : 'node';
const arch = _arch();
const platform = _platform();
const libc = process.env.LIBC || (isAlpine(platform) ? 'musl' : null);
const armv = process.env.ARM_VERSION || (arch === 'arm64' ? '8' : vars.arm_version) || '';
const defaultInPath = join('.', 'native', 'index.node');

// Get rid of `node` and the filename
const cmdArgs = process.argv.slice(2);
const flagOptions = {
    alias: {
        'f': ['file', 'i', 'input'],    // Input file
        'o': 'output',                  // Output directory
        'd': ['delete', 'r', 'remove']  // Delete original file after copying
    },
    boolean: ['d', 'delete', 'r', 'remove']
};
const argv = minimist.default(cmdArgs, flagOptions);

const modulePath = argv.file ?? defaultInPath;
if (!existsSync(modulePath)) {
    throw new Error(
        `No input file found: There is no ${modulePath} built by Neon to mark as prebuild`,
    );
}

const outPath = argv.output ?? join('.', 'prebuild');
const prebuildSubdir = `${platform}-${arch}`;
const fullOutPath = join(outPath, prebuildSubdir);
mkdirp.sync(fullOutPath);
const dest = join(fullOutPath, getFilename());

// Copy and tag file
copyFileSync(modulePath, dest);
console.log(`Successfully copied and tagged file as ${dest}`);

// Delete source file
if (argv.delete) {
    rmSync(modulePath);
    console.log(`Successfully removed source file ${modulePath}`);
}
