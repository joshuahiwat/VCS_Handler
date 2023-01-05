import * as vscode from 'vscode';
import { WebApi } from 'azure-devops-node-api';
import { getPersonalAccessTokenHandler } from 'azure-devops-node-api';

export function activate(context: vscode.ExtensionContext) {
  // Create a command that, when executed, will display a list of pipeline artifacts in a new webview
	context.subscriptions.push(vscode.commands.registerCommand('alDeveloperHelper.viewPipelineArtifacts', async () => {
		// First, get the Azure DevOps organization URL and personal access token
		const organizationUrl = vscode.workspace.getConfiguration().get('azureDevOps.organizationUrl') as string;
		const personalAccessToken = vscode.workspace.getConfiguration().get('azureDevOps.personalAccessToken') as string;

		// If either the organization URL or personal access token is not set, display an error message and return
		if (!organizationUrl || !personalAccessToken) {
		vscode.window.showErrorMessage('Azure DevOps organization URL and personal access token must be set in the extension settings.');
		return;
		}

		// Create an instance of the Azure DevOps API
		const devops = new WebApi(organizationUrl, getPersonalAccessTokenHandler(personalAccessToken));

		// get core api
		const coreApi = await devops.getCoreApi();

		// Get the project API
		const projects = await coreApi.getProjects();
		// get build api
		const apiBuilds = await devops.getBuildApi();

		// Get the list of project builds
		// @todo refactor project name
		const builds = await apiBuilds.getBuilds('MyFirstProject');

		// Get the list of projects
		const projectNames = projects.map(project => project.name as string);

		// Display a quick pick list of projects
		const projectName = await vscode.window.showQuickPick(projectNames, { placeHolder: 'Select a project' });

		// If the user didn't select a project, return
		if (!projectName) {
			return;
		}

		// Get the list of builds for the selected project (problem: 'build.project' is possibly 'undefined'.ts(18048))
		const projectBuilds = builds.filter(build => build.project?.name === projectName);

		// Display a quick pick list of builds
		const buildNumber = await vscode.window.showQuickPick(projectBuilds.map(build => build.buildNumber as string), { placeHolder: 'Select a build' });

		// If the user didn't select a build, return
		if (!buildNumber) {
			return;
		}

		// Get the list of artifacts for the selected build
		const buildArtifacts = await apiBuilds.getArtifacts(projectName, parseInt(buildNumber));

		// Display a quick pick list of artifacts
		const artifactName = await vscode.window.showQuickPick(buildArtifacts.map(artifact => artifact.name as string), { placeHolder: 'Select an artifact' });

		// If the user didn't select an artifact, return
		if (!artifactName) {
			return;
		}

		// Get the artifact details
		const artifact = buildArtifacts.find(artifact => artifact.name === artifactName);

		// If the artifact is not a pipeline artifact, display an error message and return
		if (!artifact || artifact.resource?.type !== 'PipelineArtifact') {
			vscode.window.showErrorMessage('The selected artifact is not a pipeline artifact.');
			return;
		}
	}));
}

export function deactivate() {}