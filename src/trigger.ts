import axios from 'axios';
import { Notice } from 'obsidian';

/**
 * Triggers a GitHub dispatch event.
 * 
 * @param {string} token - The GitHub personal access token.
 * @param {string} owner - The owner of the repository.
 * @param {string} repo - The name of the repository.
 * @param {string} eventType - The type of event to trigger.
 * @returns {Promise<void>} - A promise that resolves when the event is triggered successfully.
 */
export async function triggerGitHubDispatchEvent(token:string, owner:string, repo:string, eventType:string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const data = {
    event_type: eventType,
  };

  try {
    const response = await axios.post(url, data, { headers: headers });
    // console.log('GitHub dispatch event triggered:', response);
    new Notice('GitHub dispatch event triggered');
  } catch (error) {
    console.error('Error triggering GitHub dispatch event:', error);
    new Notice('Error triggering GitHub dispatch event');
  }
}