# GitHub Screen Recorder

A web-based screen recorder that automatically stores recordings in GitHub, organized by user and date.

## Setup Instructions

1. Create a new GitHub repository to store the recordings
2. Generate a GitHub Personal Access Token:
   - Go to GitHub Settings → Developer Settings → Personal Access Tokens
   - Generate a new token with `repo` scope
   - Copy the token

3. Configure the application:
   - Edit `config.js`:
     - Replace `your_github_token_here` with your Personal Access Token
     - Replace `your_username/your_repo_name` with your GitHub repository
     - Set the desired branch name (default is 'main')

4. Host the application:
   - You can use GitHub Pages or any web server
   - Make sure to serve over HTTPS (required for screen recording)

## Usage

1. Click "Start Recording" to begin
2. Select the screen/window you want to record
3. Click "Stop Recording" when finished
4. The recording will automatically upload to GitHub in the following structure: