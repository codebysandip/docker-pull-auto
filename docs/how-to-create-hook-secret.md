## What is HOOK_SECRET and How to create HOOK_SECRET

HOOK_SECRET is secret value which used by [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) to create HMAC of payload. [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) sends this HMAC in header x-hub-signature-256.  
When docker-pull-auto receives request from [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action), it validates request with the HOOK_SECRET which reside in .env file.  
So, HOOK_SECRET should be same on [docker pull auto action](https://github.com/marketplace/actions/docker-pull-auto-action) and [docker-pull-auto](https://github.com/codebysandip/docker-pull-auto).  
You can store HOOK_SECRET in [github secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets).

If you cloned docker-pull-auto repo, you will find, .env doesn't exist. This is because .env file contains sensitive information. But you will find enc.env file which is encrypted using sops with age encryption.

It's safe to commit encrypted content but remember to generate new age key.txt and don't commit key.txt.
