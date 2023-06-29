## What is HOOK_SECRET and How to create HOOK_SECRET

HOOK_SECRET is secret value which used by github to create HMAC of payload. Github sends this HMAC in header x-hub-signature-256.  
When docker-pull-auto receives request from github, it validates request body with the HOOK_SECRET.  
So, HOOK_SECRET should be same on github and docker-pull-auto.  
Now follow these steps to set HOOK_SECRET (for example I'm going to use my open source [react-ssr-doc](https://github.com/codebysandip/react-ssr-doc) project):

- Navigate to your github repository on web and click on Settings
  ![React SSR Doc Repository Page](./docs/assets/repo-page.png)
- On Settings Page, Click on Webhooks
- Click on Add Webhook
- In Payload url, enter url in format https://example.com/api/github/workflow
  - For local development, You can use [ngrok](https://ngrok.com/) to setup a domain for your local port
- In Secret, add HOOK_SECRET
- In the section, Which events would you like to trigger this webhook? Select **Let me select individual events.**
- Now check only **Workflow runs** and Save the changes

That's all, Whenever your workflow will run, docker-pull-auto will receive a request and will do automation of docker pull for you
