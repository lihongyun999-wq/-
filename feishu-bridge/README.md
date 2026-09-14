# feishu-bridge

Required Railway variables:
- FEISHU_APP_ID
- FEISHU_APP_SECRET

Endpoints:
- GET /health
- GET /auth-test
- GET /wiki?url=<Feishu Wiki URL>

Deploy:
1. Upload this `feishu-bridge` folder to the root of your existing GitHub repository.
2. Connect the Railway service to that repository.
3. Set Root Directory to `/feishu-bridge`.
4. Deploy.
5. Generate a public domain.
