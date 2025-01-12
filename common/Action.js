"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = require("../api/octokit");
const github_1 = require("@actions/github");
const utils_1 = require("./utils");
const core_1 = require("@actions/core");
const telemetry_1 = require("./telemetry");
const uuid_1 = require("uuid");
class Action {
    constructor() {
        this.token = utils_1.getRequiredInput('token');
        console.log('::stop-commands::' + uuid_1.v4());
        this.username = new github_1.GitHub(this.token).users.getAuthenticated().then((v) => v.data.name, () => 'unknown');
    }
    async trackMetric(telemetry) {
        if (telemetry_1.aiHandle) {
            telemetry_1.aiHandle.trackMetric({
                ...telemetry,
                properties: {
                    repo: `${github_1.context.repo.owner}/${github_1.context.repo.repo}`,
                    issue: '' + github_1.context.issue.number,
                    id: this.id,
                    user: await this.username,
                },
            });
        }
    }
    async run() {
        var _a, _b;
        if (utils_1.errorLoggingIssue) {
            const { repo, issue, owner } = utils_1.errorLoggingIssue;
            if (github_1.context.repo.repo === repo &&
                github_1.context.repo.owner === owner &&
                ((_a = github_1.context.payload.issue) === null || _a === void 0 ? void 0 : _a.number) === issue) {
                return utils_1.safeLog('refusing to run on error logging issue to prevent cascading errors');
            }
        }
        try {
            const token = utils_1.getRequiredInput('token');
            const readonly = !!core_1.getInput('readonly');
            const issue = (_b = github_1.context === null || github_1.context === void 0 ? void 0 : github_1.context.issue) === null || _b === void 0 ? void 0 : _b.number;
            if (issue) {
                const octokit = new octokit_1.OctoKitIssue(token, github_1.context.repo, { number: issue }, { readonly });
                if (github_1.context.eventName === 'issue_comment') {
                    await this.onCommented(octokit, github_1.context.payload.comment.body, github_1.context.actor);
                }
                else if (github_1.context.eventName === 'issues') {
                    switch (github_1.context.payload.action) {
                        case 'opened':
                            await this.onOpened(octokit);
                            break;
                        case 'reopened':
                            await this.onReopened(octokit);
                            break;
                        case 'closed':
                            await this.onClosed(octokit);
                            break;
                        case 'labeled':
                            await this.onLabeled(octokit, github_1.context.payload.label.name);
                            break;
                        case 'assigned':
                            await this.onAssigned(octokit, github_1.context.payload.assignee.login);
                            break;
                        case 'unassigned':
                            await this.onUnassigned(octokit, github_1.context.payload.assignee.login);
                            break;
                        case 'edited':
                            await this.onEdited(octokit);
                            break;
                        case 'milestoned':
                            await this.onMilestoned(octokit);
                            break;
                        default:
                            throw Error('Unexpected action: ' + github_1.context.payload.action);
                    }
                }
            }
            else {
                await this.onTriggered(new octokit_1.OctoKit(token, github_1.context.repo, { readonly }));
            }
        }
        catch (e) {
            try {
                await this.error(e);
            }
            catch {
                utils_1.safeLog((e === null || e === void 0 ? void 0 : e.stack) || (e === null || e === void 0 ? void 0 : e.message) || String(e));
            }
        }
        await this.trackMetric({ name: 'octokit_request_count', value: octokit_1.getNumRequests() });
        const usage = await utils_1.getRateLimit(this.token);
        await this.trackMetric({ name: 'usage_core', value: usage.core });
        await this.trackMetric({ name: 'usage_graphql', value: usage.graphql });
        await this.trackMetric({ name: 'usage_search', value: usage.search });
    }
    async error(error) {
        const details = {
            message: `${error.message}\n${error.stack}`,
            id: this.id,
            user: await this.username,
        };
        if (github_1.context.issue.number)
            details.issue = github_1.context.issue.number;
        const rendered = `
Message: ${details.message}

Actor: ${details.user}

ID: ${details.id}
`;
        await utils_1.logErrorToIssue(rendered, true, this.token);
        if (telemetry_1.aiHandle) {
            telemetry_1.aiHandle.trackException({ exception: error });
        }
        core_1.setFailed(error.message);
    }
    async onTriggered(_octokit) {
        throw Error('not implemented');
    }
    async onEdited(_issue) {
        throw Error('not implemented');
    }
    async onLabeled(_issue, _label) {
        throw Error('not implemented');
    }
    async onAssigned(_issue, _assignee) {
        throw Error('not implemented');
    }
    async onUnassigned(_issue, _assignee) {
        throw Error('not implemented');
    }
    async onOpened(_issue) {
        throw Error('not implemented');
    }
    async onReopened(_issue) {
        throw Error('not implemented');
    }
    async onClosed(_issue) {
        throw Error('not implemented');
    }
    async onMilestoned(_issue) {
        throw Error('not implemented');
    }
    async onCommented(_issue, _comment, _actor) {
        throw Error('not implemented');
    }
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map