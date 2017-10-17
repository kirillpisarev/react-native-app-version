#!/usr/bin/env node

const execSync = require('child_process').execSync
const fs = require('fs')

const arguments = argv = require('optimist')
	.usage('Bump react-native app version.\nUsage: version -n 1.0.1')
	.demand('n')
	.alias('n', 'number')
	.alias('p', 'path')
	.describe('n', 'Version number')
	.default('p', './app/config/version.json')
	.check(args => checkVersion(args.number))
	.argv

const version = arguments.number
const versionCode = getVersionCode(version)

if(hasUncommittedChanges())
	throw new Error("Repository has unrecorded changes. Commit first and then exec the command again")

try {
	writeVersionToFile(arguments.path, version)
	setiOSVersion(version, versionCode)
	setAndroidVersion(version)
	commit(version)
	console.log('Success')
} catch(err) {
	console.log(err.toString())
	rollback()
}

function checkVersion(version) {
	const VERSION_PATTERN = /^\d+\.\d{1,2}\.\d{1,2}(\.\w+)?$/

	if(!VERSION_PATTERN.test(version))
		throw new Error("Please specify version divided by dot as a first parameter")
}

function getVersionCode(version) {
	const versionCode = version
		.split('.')
		.slice(0, 3)
		.reduce((summ, part, index) => {
		return summ += parseInt(part, 10) * Math.pow(Math.pow(10, 2 - index), 2)
	}, 0)

	if(isNaN(versionCode))
		throw new Error("Incorrect version")

	return versionCode
}

function hasUncommittedChanges() {
	const gitStatus = execSync('git status').toString()

	return !/nothing to commit/.test(gitStatus)
}

function writeVersionToFile(path, version) {
	fs.writeFileSync(path, `{
		"code": "${version}",
		"time": ${Date.now()}
	}`)
}

function setiOSVersion(version, versionCode) {
	execSync(`
		cd ./ios &&
		agvtool new-marketing-version ${version} &&
		agvtool new-version -all ${versionCode} &&
		cd ../ &&
		git add .
	`)
}

function setAndroidVersion(version) {
	execSync(`
		npm --no-git-tag-version version ${version}
	`)
}

function commit(version) {
	execSync(`
		git commit -am "Up version to ${version}"
	`)
}

function rollback() {
	execSync(`git reset HEAD --hard`)
}